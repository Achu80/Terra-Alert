import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Screen from '@/components/Screen';
import { SettingsRow, SettingsSection } from '@/components/settings/SettingsList';
import { useSelectedLocation } from '@/context/LocationContext';
import { useSettings } from '@/context/SettingsContext';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { colors, RISK_COLORS } from '@/theme/colors';
import { withAlpha } from '@/utils/risk';

const STATUS = {
    checking: { label: 'Checking…', color: colors.textMuted },
    online: { label: 'Connected', color: RISK_COLORS.Low },
    offline: { label: 'Offline', color: RISK_COLORS.Critical },
};

export default function SettingsScreen() {
    const { thresholds, voiceReplies, setVoiceReplies } = useSettings();
    const { location } = useSelectedLocation();
    const backend = useBackendStatus();
    const status = STATUS[backend.status];
    const version = Constants.expoConfig?.version ?? '1.0.0';

    return (
        <Screen title="Settings">
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.hero}>
                    <View style={styles.heroIcon}>
                        <Ionicons name="earth" size={30} color={colors.primary} />
                    </View>
                    <View style={styles.heroText}>
                        <Text style={styles.heroTitle}>Terra Alert</Text>
                        <Text style={styles.heroSubtitle}>Landslide early warning · Himachal Pradesh</Text>
                        <View style={[styles.pill, { backgroundColor: withAlpha(status.color, 0.15) }]}>
                            <View style={[styles.pillDot, { backgroundColor: status.color }]} />
                            <Text style={[styles.pillText, { color: status.color }]}>{status.label}</Text>
                        </View>
                    </View>
                </View>

                <SettingsSection title="RISK & ALERTS">
                    <SettingsRow
                        icon="speedometer"
                        iconColor={RISK_COLORS.High}
                        title="Risk thresholds"
                        subtitle={`Critical ${thresholds.critical} · High ${thresholds.high} · Moderate ${thresholds.moderate}`}
                        onPress={() => router.push('/settings/thresholds')}
                    />
                </SettingsSection>

                <SettingsSection title="LOCATION">
                    <SettingsRow
                        icon="location"
                        iconColor={colors.primary}
                        title="Saved location"
                        value={location ? location.name : 'Not set'}
                        onPress={() => router.push('/settings/location')}
                    />
                </SettingsSection>

                <SettingsSection title="ASSISTANT" footer="The speaker button in the chat can still turn voice on or off for a single conversation.">
                    <SettingsRow
                        icon="volume-high"
                        iconColor="#a78bfa"
                        title="Read replies aloud"
                        right={
                            <Switch
                                value={voiceReplies}
                                onValueChange={setVoiceReplies}
                                trackColor={{ false: colors.border, true: withAlpha(colors.primary, 0.6) }}
                                thumbColor={voiceReplies ? colors.primary : '#cbd5e1'}
                            />
                        }
                    />
                </SettingsSection>

                <SettingsSection title="DATA & MODEL">
                    <SettingsRow
                        icon="hardware-chip"
                        iconColor={RISK_COLORS.Low}
                        title="Prediction model"
                        value="XGBoost v2"
                        onPress={() => router.push('/settings/model')}
                    />
                    <SettingsRow
                        icon="planet"
                        iconColor={colors.info}
                        title="Data sources"
                        value="Satellites & APIs"
                        onPress={() => router.push('/settings/sources')}
                    />
                </SettingsSection>

                <SettingsSection title="CONNECTION">
                    <SettingsRow
                        icon="server"
                        iconColor={status.color}
                        title="Backend server"
                        value={status.label}
                        valueColor={status.color}
                        onPress={() => router.push('/settings/backend')}
                    />
                </SettingsSection>

                <SettingsSection title="ABOUT">
                    <SettingsRow
                        icon="information-circle"
                        iconColor={colors.textMuted}
                        title="About Terra Alert"
                        value={`v${version}`}
                        onPress={() => router.push('/settings/about')}
                    />
                </SettingsSection>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    content: { gap: 22, paddingBottom: 32 },
    hero: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.3),
        backgroundColor: withAlpha(colors.primary, 0.08),
    },
    heroIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withAlpha(colors.primary, 0.15),
    },
    heroText: { flex: 1, gap: 2 },
    heroTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
    heroSubtitle: { color: colors.textMuted, fontSize: 12 },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 999,
        marginTop: 6,
    },
    pillDot: { width: 7, height: 7, borderRadius: 4 },
    pillText: { fontSize: 12, fontWeight: '600' },
});
