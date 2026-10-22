import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Markdown from '@/components/assistant/Markdown';
import { useVoiceInput } from '@/components/assistant/useVoiceInput';
import { useSettings } from '@/context/SettingsContext';
import { chatbotAPI } from '@/services/api';
import { colors, RISK_COLORS } from '@/theme/colors';
import { getRiskLevel, withAlpha } from '@/utils/risk';

// Strip markdown so text-to-speech doesn't read out symbols like * and #
const toSpeech = (text) =>
    text
        .replace(/^\s*[-*•]\s+/gm, '')
        .replace(/[#*_`>]/g, '')
        .trim();

/**
 * Mobile version of the web Chatbot: chat with the Gemini assistant, read replies aloud,
 * and speak questions through the microphone.
 */
export default function Chatbot({ prediction }) {
    const { thresholds, voiceReplies } = useSettings();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    // Starts from the Settings preference; the speaker button changes it for this chat only
    const [speechEnabled, setSpeechEnabled] = useState(voiceReplies);

    // The backend creates a session on the first message and returns its id; reuse it for chat memory
    const sessionIdRef = useRef(null);
    const nextIdRef = useRef(0);
    const listRef = useRef(null);

    const addMessage = (role, text) => {
        nextIdRef.current += 1;
        const id = String(nextIdRef.current);
        setMessages((prev) => [...prev, { id, role, text }]);
    };

    const speak = (text) => {
        if (!speechEnabled) return;
        Speech.stop();
        Speech.speak(toSpeech(text), { language: 'en-IN', rate: 1 });
    };

    const sendMessage = async (overrideText) => {
        const text = (overrideText ?? input).trim();
        if (!text || loading) return;

        addMessage('user', text);
        setInput('');
        setLoading(true);

        const context = prediction
            ? {
                  latitude: prediction.location.lat,
                  longitude: prediction.location.lon,
                  location_name: prediction.location.name || 'Selected location',
                  risk_score: prediction.prediction.score,
                  risk_level: getRiskLevel(prediction.prediction.score, thresholds),
              }
            : null;

        try {
            const data = await chatbotAPI.send(text, sessionIdRef.current, context);
            sessionIdRef.current = data.session_id;
            addMessage('assistant', data.reply);
            speak(data.reply);
        } catch {
            addMessage('assistant', 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Voice errors appear in the chat, like the web version does for unsupported browsers
    const voice = useVoiceInput({
        onTranscript: sendMessage,
        onError: (message) => addMessage('assistant', message),
    });

    // Stop talking when the user leaves the Assistant tab
    useFocusEffect(useCallback(() => () => Speech.stop(), []));

    const handleMicPress = () => {
        if (!voice.available) {
            Alert.alert(
                'Voice input needs a development build',
                "Expo Go can't load the speech-recognition module. Build the app once with a development build to use the microphone.\n\nFor now you can use the microphone key on your phone's keyboard."
            );
            return;
        }
        if (voice.listening) voice.stop();
        else voice.start();
    };

    const toggleSpeech = () => {
        setSpeechEnabled((prev) => {
            if (prev) Speech.stop();
            return !prev;
        });
    };

    const renderItem = ({ item }) => {
        const isUser = item.role === 'user';
        return (
            <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
                {isUser ? <Text style={styles.userText}>{item.text}</Text> : <Markdown text={item.text} />}
            </View>
        );
    };

    const micBusy = loading && !voice.listening;

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.title}>TerraAlert Assistant</Text>
                    <Pressable onPress={toggleSpeech} hitSlop={10} accessibilityLabel="Toggle voice replies">
                        <Ionicons
                            name={speechEnabled ? 'volume-high-outline' : 'volume-mute-outline'}
                            size={18}
                            color={colors.textMuted}
                        />
                    </Pressable>
                </View>
                {prediction ? (
                    <View style={styles.locationChip}>
                        <Ionicons name="location" size={12} color={colors.primary} />
                        <Text style={styles.locationText} numberOfLines={1}>
                            {prediction.location.name || 'Location set'}
                        </Text>
                    </View>
                ) : null}
            </View>

            <FlatList
                ref={listRef}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                ListEmptyComponent={
                    <Text style={styles.empty}>Ask about first aid, or get a risk assessment first for hospital/route info.</Text>
                }
                ListFooterComponent={loading ? <Text style={styles.typing}>Typing...</Text> : null}
            />

            {voice.listening ? <Text style={styles.listening}>Listening... speak now</Text> : null}

            <View style={styles.inputRow}>
                <TextInput
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={() => sendMessage()}
                    placeholder="Ask something..."
                    placeholderTextColor={colors.textMuted}
                    editable={!loading}
                    returnKeyType="send"
                    submitBehavior="submit"
                    style={styles.input}
                />
                <Pressable
                    onPress={handleMicPress}
                    disabled={micBusy}
                    style={[styles.iconButton, voice.listening && styles.micListening, micBusy && styles.disabled]}
                    accessibilityLabel={voice.listening ? 'Stop listening' : 'Speak a message'}
                >
                    {micBusy ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Ionicons name={voice.listening ? 'stop' : 'mic'} size={20} color={voice.listening ? '#fff' : colors.primary} />
                    )}
                </Pressable>
                <Pressable
                    onPress={() => sendMessage()}
                    disabled={loading}
                    style={[styles.sendButton, loading && styles.disabled]}
                >
                    <Text style={styles.sendText}>Send</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: colors.glass,
        borderColor: colors.glassBorder,
        borderTopColor: colors.glassHighlight,
        borderWidth: 1,
        borderRadius: 22,
        padding: 12,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { color: colors.text, fontSize: 14, fontWeight: '600' },
    locationChip: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
    locationText: { color: colors.primary, fontSize: 12, flexShrink: 1 },
    list: { flex: 1 },
    listContent: { gap: 8, paddingVertical: 4 },
    empty: { color: colors.textMuted, fontSize: 12 },
    bubble: { padding: 10, borderRadius: 12, maxWidth: '88%' },
    userBubble: { alignSelf: 'flex-end', backgroundColor: withAlpha(colors.primary, 0.2) },
    botBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.05)' },
    userText: { color: colors.text, fontSize: 14, lineHeight: 20 },
    typing: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
    listening: { color: RISK_COLORS.Critical, fontSize: 12, marginBottom: 6 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    input: {
        flex: 1,
        color: colors.text,
        fontSize: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    micListening: { backgroundColor: RISK_COLORS.Critical, borderColor: RISK_COLORS.Critical },
    sendButton: { height: 42, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.primary, justifyContent: 'center' },
    sendText: { color: colors.background, fontWeight: '700', fontSize: 14 },
    disabled: { opacity: 0.5 },
});
