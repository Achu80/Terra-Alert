import { requireOptionalNativeModule } from 'expo';
import { useCallback, useEffect, useRef, useState } from 'react';

// expo-speech-recognition loads its native code as soon as it is imported, which throws in Expo Go
// (Expo Go only ships a fixed set of native modules). Only load it when the native part exists,
// i.e. in a development build.
const isNativeAvailable = requireOptionalNativeModule('ExpoSpeechRecognition') != null;
const Recognition = isNativeAvailable ? require('expo-speech-recognition').ExpoSpeechRecognitionModule : null;

const FRIENDLY_ERRORS = {
    'no-speech': "Didn't catch that - please try again.",
    'speech-timeout': "Didn't catch that - please try again.",
    'not-allowed': 'Microphone permission was denied. Enable it in the phone settings.',
    network: 'Speech recognition needs an internet connection.',
};

/**
 * Speech-to-text for the chat microphone (mobile version of the web SpeechRecognition code)
 * onTranscript(text) is called once with the final recognised sentence,
 * onError(message) with a user-friendly message when recognition fails.
 */
export function useVoiceInput({ onTranscript, onError, lang = 'en-IN' }) {
    const [listening, setListening] = useState(false);

    // Keep the newest callbacks without re-subscribing to the native events on every render
    const callbacksRef = useRef({ onTranscript, onError });
    useEffect(() => {
        callbacksRef.current = { onTranscript, onError };
    }, [onTranscript, onError]);

    useEffect(() => {
        if (!Recognition) return;

        const subscriptions = [
            Recognition.addListener('start', () => setListening(true)),
            Recognition.addListener('end', () => setListening(false)),
            Recognition.addListener('result', (event) => {
                const transcript = event.results?.[0]?.transcript?.trim();
                if (event.isFinal && transcript) callbacksRef.current.onTranscript?.(transcript);
            }),
            Recognition.addListener('error', (event) => {
                setListening(false);
                if (event.error === 'aborted') return; // we stopped it ourselves
                callbacksRef.current.onError?.(FRIENDLY_ERRORS[event.error] || event.message || 'Voice input failed.');
            }),
        ];

        return () => subscriptions.forEach((s) => s.remove());
    }, []);

    const start = useCallback(async () => {
        if (!Recognition) return;
        const permission = await Recognition.requestPermissionsAsync();
        if (!permission.granted) {
            callbacksRef.current.onError?.(FRIENDLY_ERRORS['not-allowed']);
            return;
        }
        Recognition.start({ lang, interimResults: false, continuous: false });
    }, [lang]);

    const stop = useCallback(() => {
        Recognition?.stop();
    }, []);

    return { available: isNativeAvailable, listening, start, stop };
}
