import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Card, SectionLabel } from '@/components/Card';
import { API_BASE_URL } from '@/config/env';
import { healthCheck } from '@/services/api';
import { colors, RISK_COLORS } from '@/theme/colors';

export default function BackendStatus() {
    const [status, setStatus] = useState('checking'); // checking | online | offline
    const [error, setError] = useState(null);

    // Only sets state after the request finishes, so it is safe to call from an effect
    const runCheck = useCallback(
        () =>
            healthCheck()
                .then(() => {
                    setStatus('online');
                    setError(null);
                })
                .catch((e) => {
                    setStatus('offline');
                    setError(e.message);
                }),
        []
    );

    useEffect(() => {
        runCheck();
    }, [runCheck]);

    const retry = () => {
        setStatus('checking');
        runCheck();
    };

    return (
        <Card>
            <SectionLabel icon="server-outline">Backend</SectionLabel>
            <Text style={styles.url}>{API_BASE_URL}</Text>
            {status === 'checking' ? (
                <ActivityIndicator color={colors.primary} style={styles.row} />
            ) : (
                <Text style={[styles.row, { color: status === 'online' ? RISK_COLORS.Low : RISK_COLORS.Critical }]}>
                    {status === 'online' ? '● Connected' : `● Unreachable${error ? ` — ${error}` : ''}`}
                </Text>
            )}
            <Pressable onPress={retry} style={styles.button}>
                <Text style={styles.buttonText}>Retry</Text>
            </Pressable>
        </Card>
    );
}

const styles = StyleSheet.create({
    url: { color: colors.text, fontSize: 14 },
    row: { marginTop: 12 },
    button: { marginTop: 16, alignSelf: 'flex-start', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    buttonText: { color: colors.background, fontWeight: '600' },
});
