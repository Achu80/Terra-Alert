/**
 * App settings shared across tabs.
 * - thresholds: risk level cut-offs, loaded from and saved to the backend (/api/settings -> Supabase `settings` table)
 * - voiceReplies: whether the Assistant reads replies aloud; a per-device preference kept in AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { settingsAPI } from '@/services/api';
import { DEFAULT_THRESHOLDS, isValidThresholds } from '@/utils/risk';

const VOICE_KEY = 'terraalert:voiceReplies';

const SettingsContext = createContext(null);

const pickThresholds = (t) => ({ critical: Number(t.critical), high: Number(t.high), moderate: Number(t.moderate) });

export function SettingsProvider({ children }) {
    const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
    const [voiceReplies, setVoiceRepliesState] = useState(true);

    useEffect(() => {
        // If the backend is unreachable the defaults stay in place
        settingsAPI
            .get()
            .then((saved) => {
                if (saved?.thresholds && isValidThresholds(pickThresholds(saved.thresholds))) {
                    setThresholds(pickThresholds(saved.thresholds));
                }
            })
            .catch((e) => console.warn('Could not load settings from backend:', e.message));

        AsyncStorage.getItem(VOICE_KEY)
            .then((value) => {
                if (value != null) setVoiceRepliesState(value === 'true');
            })
            .catch(() => {});
    }, []);

    // Throws if the backend rejects the save, so the screen can show the error
    const saveThresholds = useCallback(async (next) => {
        const clean = pickThresholds(next);
        if (!isValidThresholds(clean)) throw new Error('Thresholds must be ordered: Moderate < High < Critical.');
        await settingsAPI.update({ thresholds: clean });
        setThresholds(clean);
    }, []);

    const setVoiceReplies = useCallback((value) => {
        setVoiceRepliesState(value);
        AsyncStorage.setItem(VOICE_KEY, String(value)).catch(() => {});
    }, []);

    const value = useMemo(
        () => ({ thresholds, saveThresholds, voiceReplies, setVoiceReplies }),
        [thresholds, saveThresholds, voiceReplies, setVoiceReplies]
    );

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
    return ctx;
}
