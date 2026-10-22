import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SettingsRow, SettingsSection } from '@/components/settings/SettingsList';
import { colors, RISK_COLORS } from '@/theme/colors';
import { withAlpha } from '@/utils/risk';

// The 20 model inputs, grouped (order and names follow backend/utils/data_processor.py FEATURE_ORDER)
const FEATURE_GROUPS = [
    { title: 'Terrain', icon: 'triangle', color: RISK_COLORS.High, items: ['Elevation', 'Slope angle', 'Terrain aspect'] },
    { title: 'Vegetation & moisture', icon: 'leaf', color: RISK_COLORS.Low, items: ['Vegetation index (NDVI)', 'Water / moisture index (NDWI)'] },
    { title: 'Soil', icon: 'layers', color: '#a16207', items: ['Soil texture class'] },
    { title: 'Rainfall', icon: 'rainy', color: colors.info, items: ['3-day rainfall', '7-day rainfall', '14-day rainfall', '30-day rainfall'] },
    {
        title: 'Derived signals',
        icon: 'git-merge',
        color: '#a78bfa',
        items: [
            'Rainfall ratios (3d/7d, 7d/14d, 14d/30d)',
            'Rainfall acceleration',
            'Heavy short-term rain flag',
            'Sustained heavy rain flag',
            'Slope × elevation',
            'Steep & low elevation flag',
            'North-facing slope flag',
            'Bare & steep slope flag',
        ],
    },
];

export default function ModelScreen() {
    return (
        <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.hero}>
                <View style={styles.heroIcon}>
                    <Ionicons name="hardware-chip" size={28} color={RISK_COLORS.Low} />
                </View>
                <Text style={styles.heroTitle}>XGBoost v2</Text>
                <Text style={styles.heroSubtitle}>Gradient-boosted decision trees · 20 inputs</Text>
            </View>

            <SettingsSection title="HOW IT WORKS">
                <SettingsRow icon="analytics" iconColor={colors.primary} title="Output" subtitle="Probability of a landslide × 100 = risk score (0–100)" />
                <SettingsRow icon="map" iconColor={colors.info} title="Trained on" subtitle="Recorded landslide and non-landslide points across North India" />
                <SettingsRow
                    icon="flag"
                    iconColor={RISK_COLORS.Moderate}
                    title="Plains rule"
                    subtitle="Below 800 m elevation with a slope under 15° the score is fixed at Low - outside the hill zone the model was built for"
                />
                <SettingsRow
                    icon="lock-closed"
                    iconColor={colors.textMuted}
                    title="Model weights"
                    subtitle="Learned during training and fixed - they can't be adjusted in the app"
                />
            </SettingsSection>

            <Text style={styles.groupHeading}>INPUTS (20)</Text>
            {FEATURE_GROUPS.map((g) => (
                <View key={g.title} style={styles.group}>
                    <View style={styles.groupHeader}>
                        <View style={[styles.groupIcon, { backgroundColor: withAlpha(g.color, 0.18) }]}>
                            <Ionicons name={g.icon} size={16} color={g.color} />
                        </View>
                        <Text style={styles.groupTitle}>{g.title}</Text>
                        <Text style={styles.groupCount}>{g.items.length}</Text>
                    </View>
                    <View style={styles.chips}>
                        {g.items.map((item) => (
                            <View key={item} style={styles.chip}>
                                <Text style={styles.chipText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { padding: 16, gap: 18, paddingBottom: 40 },
    hero: { alignItems: 'center', gap: 4, paddingVertical: 8 },
    heroIcon: {
        width: 64,
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withAlpha(RISK_COLORS.Low, 0.15),
        marginBottom: 6,
    },
    heroTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
    heroSubtitle: { color: colors.textMuted, fontSize: 13 },
    groupHeading: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginLeft: 4, marginBottom: -8 },
    group: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    groupIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    groupTitle: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
    groupCount: { color: colors.textMuted, fontSize: 13 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)' },
    chipText: { color: colors.text, fontSize: 12 },
});
