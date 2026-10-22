import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminScreenGate } from '@/components/admin/AdminOnly';
import { Card } from '@/components/Card';
import { useSettings } from '@/context/SettingsContext';
import { colors, RISK_COLORS } from '@/theme/colors';
import { DEFAULT_THRESHOLDS, getRiskColor, getRiskLevel, withAlpha } from '@/utils/risk';

const SLIDERS = [
    { key: 'critical', label: 'Critical', color: RISK_COLORS.Critical, hint: 'Immediate danger - evacuate if advised' },
    { key: 'high', label: 'High', color: RISK_COLORS.High, hint: 'Avoid slopes and travel on hill roads' },
    { key: 'moderate', label: 'Moderate', color: RISK_COLORS.Moderate, hint: 'Stay alert during heavy rain' },
];

// Keep Moderate < High < Critical while a slider moves
function clampOrder(key, value, t) {
    if (key === 'moderate') return Math.min(Math.max(value, 1), t.high - 1);
    if (key === 'high') return Math.min(Math.max(value, t.moderate + 1), t.critical - 1);
    return Math.min(Math.max(value, t.high + 1), 100);
}

const sameThresholds = (a, b) => a.critical === b.critical && a.high === b.high && a.moderate === b.moderate;

function ThresholdsContent() {
    const { thresholds, saveThresholds } = useSettings();
    const [draft, setDraft] = useState(thresholds);
    const [saving, setSaving] = useState(false);
    const [sample, setSample] = useState(65);

    const changed = !sameThresholds(draft, thresholds);
    const isDefault = sameThresholds(draft, DEFAULT_THRESHOLDS);

    const update = (key, raw) => {
        const value = Math.round(raw);
        setDraft((prev) => ({ ...prev, [key]: clampOrder(key, value, prev) }));
    };

    const save = async () => {
        setSaving(true);
        try {
            await saveThresholds(draft);
            Alert.alert('Saved', 'Risk levels across the app now use these thresholds.');
        } catch (e) {
            Alert.alert("Couldn't save", e.message);
        } finally {
            setSaving(false);
        }
    };

    const bands = [
        { label: 'Low', color: RISK_COLORS.Low, range: `0–${draft.moderate - 1}` },
        { label: 'Moderate', color: RISK_COLORS.Moderate, range: `${draft.moderate}–${draft.high - 1}` },
        { label: 'High', color: RISK_COLORS.High, range: `${draft.high}–${draft.critical - 1}` },
        { label: 'Critical', color: RISK_COLORS.Critical, range: `${draft.critical}–100` },
    ];
    const sampleLevel = getRiskLevel(sample, draft);
    const sampleColor = getRiskColor(sampleLevel);

    return (
        <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.intro}>
                Choose the risk score (0–100) at which each level starts. These colour every score in the app - Home, History and
                the Assistant.
            </Text>

            {/* Colour band preview: one segment per level, sized by its share of 0-100 */}
            <View style={styles.bar}>
                <View style={{ flex: draft.moderate, backgroundColor: RISK_COLORS.Low }} />
                <View style={{ flex: draft.high - draft.moderate, backgroundColor: RISK_COLORS.Moderate }} />
                <View style={{ flex: draft.critical - draft.high, backgroundColor: RISK_COLORS.High }} />
                <View style={{ flex: 100 - draft.critical, backgroundColor: RISK_COLORS.Critical }} />
            </View>
            <View style={styles.bands}>
                {bands.map((b) => (
                    <View key={b.label} style={[styles.band, { backgroundColor: withAlpha(b.color, 0.12), borderColor: withAlpha(b.color, 0.4) }]}>
                        <Text style={[styles.bandLabel, { color: b.color }]}>{b.label}</Text>
                        <Text style={styles.bandRange}>{b.range}</Text>
                    </View>
                ))}
            </View>

            <Card style={styles.card}>
                {SLIDERS.map((s) => (
                    <View key={s.key} style={styles.sliderBlock}>
                        <View style={styles.sliderHeader}>
                            <View style={styles.sliderTitleRow}>
                                <View style={[styles.dot, { backgroundColor: s.color }]} />
                                <Text style={styles.sliderLabel}>{s.label} from</Text>
                            </View>
                            <Text style={[styles.sliderValue, { color: s.color }]}>{draft[s.key]}</Text>
                        </View>
                        <Slider
                            minimumValue={0}
                            maximumValue={100}
                            step={1}
                            value={draft[s.key]}
                            onValueChange={(v) => update(s.key, v)}
                            minimumTrackTintColor={s.color}
                            maximumTrackTintColor={colors.border}
                            thumbTintColor={s.color}
                        />
                        <Text style={styles.sliderHint}>{s.hint}</Text>
                    </View>
                ))}
            </Card>

            <Card style={styles.card}>
                <Text style={styles.previewTitle}>Try a score</Text>
                <View style={styles.previewRow}>
                    <Text style={styles.previewScore}>{sample}</Text>
                    <Text style={[styles.previewLevel, { color: sampleColor, backgroundColor: withAlpha(sampleColor, 0.15) }]}>
                        {sampleLevel}
                    </Text>
                </View>
                <Slider
                    minimumValue={0}
                    maximumValue={100}
                    step={1}
                    value={sample}
                    onValueChange={(v) => setSample(Math.round(v))}
                    minimumTrackTintColor={sampleColor}
                    maximumTrackTintColor={colors.border}
                    thumbTintColor={sampleColor}
                />
            </Card>

            <Pressable
                onPress={save}
                disabled={!changed || saving}
                style={({ pressed }) => [styles.saveButton, (!changed || saving) && styles.disabled, pressed && styles.pressed]}
            >
                {saving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.saveText}>{changed ? 'Save changes' : 'Saved'}</Text>}
            </Pressable>

            <Pressable
                onPress={() => setDraft(DEFAULT_THRESHOLDS)}
                disabled={isDefault || saving}
                style={({ pressed }) => [styles.resetButton, (isDefault || saving) && styles.disabled, pressed && styles.pressed]}
            >
                <Text style={styles.resetText}>Reset to defaults (80 · 60 · 40)</Text>
            </Pressable>

            <Text style={styles.note}>Saved on the Terra Alert server, so they stay the same after reinstalling the app.</Text>
        </ScrollView>
    );
}

// Admin-only page: regular users see an "Admin only" notice instead
export default function ThresholdsScreen() {
    return (
        <AdminScreenGate>
            <ThresholdsContent />
        </AdminScreenGate>
    );
}

const styles = StyleSheet.create({
    content: { padding: 16, gap: 16, paddingBottom: 40 },
    intro: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
    bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' },
    bands: { flexDirection: 'row', gap: 6 },
    band: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    bandLabel: { fontSize: 11, fontWeight: '700' },
    bandRange: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
    card: { gap: 18 },
    sliderBlock: { gap: 4 },
    sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sliderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    sliderLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
    sliderValue: { fontSize: 20, fontWeight: '800' },
    sliderHint: { color: colors.textMuted, fontSize: 12 },
    previewTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
    previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    previewScore: { color: colors.text, fontSize: 28, fontWeight: '800', minWidth: 48 },
    previewLevel: { fontSize: 13, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
    saveButton: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    saveText: { color: colors.background, fontWeight: '700', fontSize: 15 },
    resetButton: { borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    resetText: { color: colors.text, fontWeight: '600', fontSize: 14 },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.75 },
    note: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});
