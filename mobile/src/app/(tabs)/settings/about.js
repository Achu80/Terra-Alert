import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SettingsRow, SettingsSection } from '@/components/settings/SettingsList';
import { colors, RISK_COLORS } from '@/theme/colors';
import { withAlpha } from '@/utils/risk';

export default function AboutScreen() {
    const config = Constants.expoConfig ?? {};

    return (
        <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.hero}>
                <View style={styles.logo}>
                    <Ionicons name="earth" size={40} color={colors.primary} />
                </View>
                <Text style={styles.name}>{config.name ?? 'Terra Alert'}</Text>
                <Text style={styles.tagline}>Satellite data and machine learning for landslide early warning in Himachal Pradesh</Text>
            </View>

            <SettingsSection title="APP">
                <SettingsRow icon="pricetag" iconColor={colors.primary} title="Version" value={config.version ?? '1.0.0'} />
                <SettingsRow icon="logo-react" iconColor={colors.info} title="Expo SDK" value={config.sdkVersion ?? '-'} />
            </SettingsSection>

            <SettingsSection title="EMERGENCY" footer="Terra Alert estimates risk - it does not replace official warnings. Follow instructions from local authorities.">
                <SettingsRow
                    icon="call"
                    iconColor={RISK_COLORS.Critical}
                    title="Emergency services"
                    value="112"
                    valueColor={RISK_COLORS.Critical}
                    onPress={() => Linking.openURL('tel:112')}
                />
                <SettingsRow
                    icon="medkit"
                    iconColor={RISK_COLORS.High}
                    title="Ambulance"
                    value="108"
                    valueColor={RISK_COLORS.High}
                    onPress={() => Linking.openURL('tel:108')}
                />
            </SettingsSection>

            <SettingsSection title="CREDITS">
                <SettingsRow icon="map" iconColor="#34d399" title="Map data" subtitle="© OpenStreetMap contributors" />
                <SettingsRow icon="globe" iconColor={colors.primary} title="Satellite processing" subtitle="Google Earth Engine" />
            </SettingsSection>

            <Text style={styles.footer}>Made with care for the hills ⛰️</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { padding: 16, gap: 22, paddingBottom: 40 },
    hero: { alignItems: 'center', gap: 6, paddingVertical: 12 },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withAlpha(colors.primary, 0.15),
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.3),
        marginBottom: 6,
    },
    name: { color: colors.text, fontSize: 24, fontWeight: '800' },
    tagline: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 12 },
    footer: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});
