import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdminBadge } from '@/components/admin/AdminOnly';
import GlassView from '@/components/GlassView';
import { EMERGENCY_NUMBERS, isAlertLevel, LEVEL_ORDER, RISK_GUIDANCE } from '@/constants/riskGuidance';
import { useAdmin } from '@/context/AdminContext';
import { useAlerts } from '@/context/AlertContext';
import { useSettings } from '@/context/SettingsContext';
import { adminAPI, predictionAPI, statsAPI } from '@/services/api';
import { colors } from '@/theme/colors';
import { shortDate } from '@/utils/history';
import { getRiskColor, getRiskLevel, withAlpha } from '@/utils/risk';

const dayLabel = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return shortDate(new Date(y, m - 1, d));
};

function SectionTitle({ icon, children, right }) {
    return (
        <View style={styles.sectionTitleRow}>
            <Ionicons name={icon} size={15} color={colors.primary} />
            <Text style={styles.sectionTitle}>{children}</Text>
            {right}
        </View>
    );
}

function LevelChip({ level }) {
    const color = getRiskColor(level);
    return (
        <View style={[styles.chip, { backgroundColor: withAlpha(color, 0.16), borderColor: withAlpha(color, 0.5) }]}>
            <Text style={[styles.chipText, { color }]}>{level}</Text>
        </View>
    );
}

// Districts at Moderate or above (loaded each time the sheet opens)
function DistrictWarnings() {
    const { thresholds } = useSettings();
    const [state, setState] = useState({ loading: true, list: [], error: null });

    useEffect(() => {
        let cancelled = false;
        predictionAPI
            .getDistricts()
            .then((data) => {
                if (cancelled) return;
                const list = (data.districts ?? [])
                    .map((d) => ({ id: d.id, name: d.name, score: Number(d.score), level: getRiskLevel(Number(d.score), thresholds) }))
                    .filter((d) => isAlertLevel(d.level))
                    .sort((a, b) => b.score - a.score);
                setState({ loading: false, list, error: null });
            })
            .catch((e) => {
                if (!cancelled) setState({ loading: false, list: [], error: e.message });
            });
        return () => {
            cancelled = true;
        };
    }, [thresholds]);

    if (state.loading) return <ActivityIndicator color={colors.primary} style={styles.loader} />;
    if (state.error) return <Text style={styles.muted}>District data unavailable ({state.error}).</Text>;
    if (state.list.length === 0) return <Text style={styles.muted}>No district is at Moderate or above right now.</Text>;

    return (
        <View style={styles.list}>
            {state.list.map((d) => (
                <View key={d.id} style={styles.row}>
                    <View style={[styles.dot, { backgroundColor: getRiskColor(d.level) }]} />
                    <Text style={styles.rowTitle}>{d.name}</Text>
                    <Text style={styles.rowScore}>{d.score.toFixed(0)}</Text>
                    <LevelChip level={d.level} />
                </View>
            ))}
        </View>
    );
}

// Admin only: SMS alert setup and the recorded alert log
function AdminAlertPanel() {
    const { adminPin } = useAdmin();
    const [state, setState] = useState({ loading: true, sms: null, alerts: [], error: null });

    useEffect(() => {
        let cancelled = false;
        Promise.all([adminAPI.status(adminPin), statsAPI.getAlerts(8)])
            .then(([status, log]) => {
                if (!cancelled) setState({ loading: false, sms: status.sms, alerts: log.alerts ?? [], error: null });
            })
            .catch((e) => {
                if (!cancelled) setState({ loading: false, sms: null, alerts: [], error: e.message });
            });
        return () => {
            cancelled = true;
        };
    }, [adminPin]);

    if (state.loading) return <ActivityIndicator color={colors.primary} style={styles.loader} />;
    if (state.error) return <Text style={styles.muted}>Admin data unavailable ({state.error}).</Text>;

    const sms = state.sms;
    const smsLabel = sms.enabled ? 'On' : !sms.package_installed ? 'Off - Twilio not installed' : !sms.configured ? 'Off - not configured' : 'Off';

    return (
        <View style={styles.list}>
            <View style={styles.row}>
                <Ionicons name="chatbox-ellipses" size={16} color={sms.enabled ? '#10b981' : colors.textMuted} />
                <Text style={styles.rowTitle}>SMS alerts</Text>
                <Text style={[styles.rowValue, { color: sms.enabled ? '#10b981' : colors.textMuted }]}>{smsLabel}</Text>
            </View>
            <Text style={styles.subheading}>Recent alerts recorded</Text>
            {state.alerts.length === 0 ? (
                <Text style={styles.muted}>No alerts recorded yet.</Text>
            ) : (
                state.alerts.map((a) => (
                    <View key={a.id} style={styles.row}>
                        <View style={[styles.dot, { backgroundColor: getRiskColor(a.level) }]} />
                        <Text style={styles.rowTitle} numberOfLines={1}>
                            {a.trigger}
                        </Text>
                        <LevelChip level={String(a.level).toUpperCase()} />
                    </View>
                ))
            )}
        </View>
    );
}

export default function AlertSheet() {
    const { sheetOpen, closeSheet, items, top } = useAlerts();
    const { isAdmin } = useAdmin();
    const insets = useSafeAreaInsets();

    // Guidance matches the reading: Moderate -> Moderate steps only, High -> High, Critical -> Critical
    const guideLevel = top?.level ?? 'MODERATE';
    const guide = RISK_GUIDANCE[guideLevel];
    const headColor = getRiskColor(guideLevel);
    const close = closeSheet;

    const sorted = [...items].sort((a, b) => LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level]);

    return (
        <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={close}>
            <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close alert details" />
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
                <View style={styles.handle} />
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={[styles.headIcon, { backgroundColor: withAlpha(headColor, 0.18) }]}>
                            <Ionicons name="warning" size={26} color={headColor} />
                        </View>
                        <View style={styles.headText}>
                            <Text style={[styles.headLevel, { color: headColor }]}>{top ? `${top.level} RISK` : 'No active alerts'}</Text>
                            <Text style={styles.headTitle}>{top ? RISK_GUIDANCE[top.level].title : 'All clear'}</Text>
                        </View>
                        <Pressable onPress={close} hitSlop={10} accessibilityLabel="Close">
                            <Ionicons name="close" size={24} color={colors.textMuted} />
                        </Pressable>
                    </View>
                    {top ? <Text style={styles.summary}>{RISK_GUIDANCE[top.level].summary}</Text> : null}

                    {/* Readings */}
                    {sorted.length ? (
                        <GlassView style={styles.card}>
                            <SectionTitle icon="pulse">Readings</SectionTitle>
                            <View style={styles.list}>
                                {sorted.map((a) => (
                                    <View key={a.id} style={styles.row}>
                                        <Ionicons
                                            name={a.kind === 'forecast' ? 'rainy' : 'location'}
                                            size={16}
                                            color={a.kind === 'forecast' ? colors.info : colors.primary}
                                        />
                                        <View style={styles.rowTexts}>
                                            <Text style={styles.rowTitle} numberOfLines={1}>
                                                {a.kind === 'forecast' ? `Forecast · ${dayLabel(a.date)}` : 'Your assessment'}
                                            </Text>
                                            <Text style={styles.rowSub} numberOfLines={1}>
                                                {a.place}
                                                {a.kind === 'forecast' && a.rain != null ? ` · ${Number(a.rain).toFixed(1)} mm rain` : ''}
                                            </Text>
                                        </View>
                                        <Text style={styles.rowScore}>{a.score.toFixed(0)}</Text>
                                        <LevelChip level={a.level} />
                                    </View>
                                ))}
                            </View>
                        </GlassView>
                    ) : null}

                    {/* What to do: only the guidance for the highest reading */}
                    <GlassView style={styles.card}>
                        <SectionTitle icon="shield-checkmark" right={<LevelChip level={guideLevel} />}>
                            What to do
                        </SectionTitle>
                        <Text style={[styles.guideTitle, { color: getRiskColor(guideLevel) }]}>{guide.title}</Text>
                        <View style={styles.steps}>
                            {guide.steps.map((step, i) => (
                                <View key={step} style={styles.step}>
                                    <View style={[styles.stepNum, { backgroundColor: withAlpha(getRiskColor(guideLevel), 0.16) }]}>
                                        <Text style={[styles.stepNumText, { color: getRiskColor(guideLevel) }]}>{i + 1}</Text>
                                    </View>
                                    <Text style={styles.stepText}>{step}</Text>
                                </View>
                            ))}
                        </View>
                        <Text style={styles.source}>Based on NDMA landslide guidance. Always follow instructions from local authorities.</Text>
                    </GlassView>

                    {/* Districts */}
                    <GlassView style={styles.card}>
                        <SectionTitle icon="map">Elsewhere in Himachal</SectionTitle>
                        <DistrictWarnings />
                    </GlassView>

                    {/* Emergency */}
                    <GlassView style={styles.card}>
                        <SectionTitle icon="call">Emergency numbers</SectionTitle>
                        <View style={styles.callGrid}>
                            {EMERGENCY_NUMBERS.map((n) => (
                                <Pressable
                                    key={n.number}
                                    onPress={() => Linking.openURL(`tel:${n.number}`)}
                                    style={({ pressed }) => [styles.call, pressed && styles.pressed]}
                                    accessibilityLabel={`Call ${n.number}, ${n.label}`}
                                >
                                    <Ionicons name={n.icon} size={16} color="#f87171" />
                                    <Text style={styles.callNumber}>{n.number}</Text>
                                    <Text style={styles.callLabel} numberOfLines={2}>
                                        {n.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </GlassView>

                    {isAdmin ? (
                        <GlassView style={styles.card}>
                            <SectionTitle icon="settings" right={<AdminBadge />}>
                                Alert system
                            </SectionTitle>
                            <AdminAlertPanel />
                        </GlassView>
                    ) : null}
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: '90%',
        backgroundColor: '#121214',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderTopColor: colors.glassHighlight,
    },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 10 },
    content: { padding: 18, gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    headText: { flex: 1 },
    headLevel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6 },
    headTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 2 },
    summary: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
    card: { padding: 14 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
    list: { gap: 10 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowTexts: { flex: 1 },
    rowTitle: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
    rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
    rowScore: { color: colors.text, fontSize: 15, fontWeight: '800', minWidth: 28, textAlign: 'right' },
    rowValue: { fontSize: 13, fontWeight: '600' },
    dot: { width: 9, height: 9, borderRadius: 5 },
    chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
    chipText: { fontSize: 10, fontWeight: '800' },
    guideTitle: { fontSize: 17, fontWeight: '800', marginBottom: 10 },
    steps: { gap: 10 },
    step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    stepNumText: { fontSize: 12, fontWeight: '800' },
    stepText: { color: colors.text, fontSize: 14, lineHeight: 20, flex: 1 },
    source: { color: colors.textMuted, fontSize: 11, marginTop: 12 },
    callGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    call: {
        flexBasis: '47%',
        flexGrow: 1,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(248,113,113,0.35)',
        backgroundColor: 'rgba(248,113,113,0.08)',
        gap: 2,
    },
    pressed: { opacity: 0.75 },
    callNumber: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 4 },
    callLabel: { color: colors.textMuted, fontSize: 12 },
    subheading: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: 4 },
    muted: { color: colors.textMuted, fontSize: 13 },
    loader: { marginVertical: 12 },
});
