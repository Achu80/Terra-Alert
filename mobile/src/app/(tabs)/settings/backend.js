import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminScreenGate } from '@/components/admin/AdminOnly';
import { SettingsRow, SettingsSection } from '@/components/settings/SettingsList';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { colors, RISK_COLORS } from '@/theme/colors';
import { withAlpha } from '@/utils/risk';

const STATUS = {
    checking: { label: 'Checking…', color: colors.textMuted, icon: 'sync' },
    online: { label: 'Connected', color: RISK_COLORS.Low, icon: 'checkmark-circle' },
    offline: { label: 'Unreachable', color: RISK_COLORS.Critical, icon: 'close-circle' },
};

const TIPS = [
    { icon: 'wifi', text: 'The phone and the computer running the backend must be on the same Wi-Fi network.' },
    { icon: 'terminal', text: 'Start the backend with "py app.py" - it listens on all network interfaces (0.0.0.0).' },
    {
        icon: 'document-text',
        text: 'The address in mobile/.env (EXPO_PUBLIC_API_URL) must be the computer\'s current IP. Check it with "ipconfig".',
    },
    { icon: 'shield-checkmark', text: 'Allow Python through Windows Firewall if Windows asks.' },
];

function BackendContent() {
    const backend = useBackendStatus();
    const status = STATUS[backend.status];

    return (
        <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.hero, { borderColor: withAlpha(status.color, 0.4), backgroundColor: withAlpha(status.color, 0.08) }]}>
                {backend.status === 'checking' ? (
                    <ActivityIndicator color={status.color} size="large" />
                ) : (
                    <Ionicons name={status.icon} size={44} color={status.color} />
                )}
                <Text style={[styles.heroTitle, { color: status.color }]}>{status.label}</Text>
                {backend.status === 'online' ? <Text style={styles.heroSub}>Responded in {backend.latencyMs} ms</Text> : null}
                {backend.status === 'offline' && backend.error ? <Text style={styles.heroSub}>{backend.error}</Text> : null}
            </View>

            <SettingsSection title="SERVER">
                <SettingsRow icon="link" iconColor={colors.primary} title="Address" subtitle={backend.url} />
                <SettingsRow icon="pulse" iconColor={colors.info} title="Health check" subtitle="GET /health" value={status.label} valueColor={status.color} />
            </SettingsSection>

            <Pressable
                onPress={backend.retry}
                disabled={backend.status === 'checking'}
                style={({ pressed }) => [styles.button, backend.status === 'checking' && styles.disabled, pressed && styles.pressed]}
            >
                <Ionicons name="refresh" size={18} color={colors.background} />
                <Text style={styles.buttonText}>Test connection</Text>
            </Pressable>

            {backend.status === 'offline' ? (
                <SettingsSection title="TROUBLESHOOTING">
                    {TIPS.map((tip) => (
                        <SettingsRow key={tip.icon} icon={tip.icon} iconColor={colors.textMuted} title={tip.text} />
                    ))}
                </SettingsSection>
            ) : null}
        </ScrollView>
    );
}

// Admin-only page: regular users see an "Admin only" notice instead
export default function BackendScreen() {
    return (
        <AdminScreenGate>
            <BackendContent />
        </AdminScreenGate>
    );
}

const styles = StyleSheet.create({
    content: { padding: 16, gap: 22, paddingBottom: 40 },
    hero: { alignItems: 'center', gap: 6, paddingVertical: 24, borderRadius: 20, borderWidth: 1 },
    heroTitle: { fontSize: 20, fontWeight: '800', marginTop: 4 },
    heroSub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 16 },
    button: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: 15,
    },
    buttonText: { color: colors.background, fontWeight: '700', fontSize: 15 },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.75 },
});
