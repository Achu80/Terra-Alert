import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AdminUnlockModal from '@/components/admin/AdminUnlockModal';
import { SettingsRow, SettingsSection } from '@/components/settings/SettingsList';
import { useAdmin } from '@/context/AdminContext';
import { colors, RISK_COLORS } from '@/theme/colors';
import { withAlpha } from '@/utils/risk';

// Hidden admin entry: tap "Version" this many times, each tap within TAP_GAP_MS of the previous one
const TAPS_TO_UNLOCK = 7;
const TAP_GAP_MS = 1500;

export default function AboutScreen() {
    const config = Constants.expoConfig ?? {};
    const { isAdmin } = useAdmin();
    const [unlockOpen, setUnlockOpen] = useState(false);
    const taps = useRef({ count: 0, last: 0 });

    const onVersionTap = () => {
        const now = Date.now();
        const count = now - taps.current.last < TAP_GAP_MS ? taps.current.count + 1 : 1;
        taps.current = { count, last: now };
        if (count < TAPS_TO_UNLOCK) return;

        taps.current = { count: 0, last: 0 };
        if (isAdmin) Alert.alert('Admin mode', 'Admin mode is already on for this phone.');
        else setUnlockOpen(true);
    };

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
                <Pressable onPress={onVersionTap}>
                    <SettingsRow icon="pricetag" iconColor={colors.primary} title="Version" value={config.version ?? '1.0.0'} />
                </Pressable>
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

            <AdminUnlockModal
                visible={unlockOpen}
                onClose={() => setUnlockOpen(false)}
                onUnlocked={() => Alert.alert('Admin mode on', 'Admin tools are now visible on this phone. Turn them off in Settings.')}
            />
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
