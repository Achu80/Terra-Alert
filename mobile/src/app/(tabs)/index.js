import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '@/components/Screen';
import { API_BASE_URL } from '@/config/env';
import { healthCheck } from '@/services/api';
import { colors, RISK_COLORS } from '@/theme/colors';

export default function HomeScreen() {
    const [status, setStatus] = useState('checking'); // checking | online | offline
    const [error, setError] = useState(null);

    const check = useCallback(async () => {
        setStatus('checking');
        setError(null);
        try {
            await healthCheck();
            setStatus('online');
        } catch (e) {
            setStatus('offline');
            setError(e.message);
        }
    }, []);

    useEffect(() => {
        check();
    }, [check]);

    return (
        <Screen title="Terra Alert" subtitle="Landslide risk prediction">
            <View style={styles.card}>
                <Text style={styles.label}>Backend</Text>
                <Text style={styles.url}>{API_BASE_URL}</Text>
                {status === 'checking' ? (
                    <ActivityIndicator color={colors.primary} style={styles.row} />
                ) : (
                    <Text style={[styles.row, { color: status === 'online' ? RISK_COLORS.Low : RISK_COLORS.Critical }]}>
                        {status === 'online' ? '● Connected' : `● Unreachable${error ? ` — ${error}` : ''}`}
                    </Text>
                )}
                <Pressable onPress={check} style={styles.button}>
                    <Text style={styles.buttonText}>Retry</Text>
                </Pressable>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 16 },
    label: { color: colors.textMuted, fontSize: 12, textTransform: 'uppercase' },
    url: { color: colors.text, fontSize: 14, marginTop: 4 },
    row: { marginTop: 12 },
    button: { marginTop: 16, alignSelf: 'flex-start', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    buttonText: { color: colors.background, fontWeight: '600' },
});
