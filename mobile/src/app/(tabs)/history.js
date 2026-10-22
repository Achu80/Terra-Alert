import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, SectionLabel } from '@/components/Card';
import AdminOnly, { AdminBadge } from '@/components/admin/AdminOnly';
import TrendChart from '@/components/charts/TrendChart';
import Screen from '@/components/Screen';
import { HP_DISTRICTS } from '@/constants/himachal';
import { useAdmin } from '@/context/AdminContext';
import { useSelectedLocation } from '@/context/LocationContext';
import { useSettings } from '@/context/SettingsContext';
import { fetchRiskHistory } from '@/services/history';
import { colors, RISK_COLORS } from '@/theme/colors';
import { assignDistrict, buildTrend, formatEventTime, HISTORY_RANGES, rangeStart, summarize } from '@/utils/history';
import { getRiskColor, getRiskLevel } from '@/utils/risk';

const REGIONS = [{ id: 'all', name: 'All Himachal' }, ...HP_DISTRICTS];
const TIMELINE_LIMIT = 10;

function Chip({ label, active, onPress }) {
    return (
        <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
        </Pressable>
    );
}

/**
 * Mobile version of the web HistoricalPage, backed by real predictions from Supabase
 * instead of generated sample data.
 */
export default function HistoryScreen() {
    const { location } = useSelectedLocation();
    const { thresholds } = useSettings();
    const { isAdmin } = useAdmin();

    // Start on the district of the location chosen on Home, if there is one
    const [region, setRegion] = useState(() =>
        location ? assignDistrict(`${location.name}, ${location.region}`, location.lat, location.lon) ?? 'all' : 'all'
    );
    const [rangeId, setRangeId] = useState('1M');
    const [refreshTick, setRefreshTick] = useState(0);

    // Result of the last finished request; while requestKey differs from result.key, a request is in flight
    const [result, setResult] = useState({ key: null, rows: [], error: null });
    const requestKey = `${rangeId}:${refreshTick}`;
    const loading = result.key !== requestKey;
    const range = HISTORY_RANGES.find((r) => r.id === rangeId);

    useEffect(() => {
        let cancelled = false;
        fetchRiskHistory({ since: rangeStart(range) })
            .then((rows) => {
                if (!cancelled) setResult({ key: requestKey, rows, error: null });
            })
            .catch((e) => {
                if (!cancelled) setResult({ key: requestKey, rows: [], error: e.message });
            });
        return () => {
            cancelled = true;
        };
    }, [requestKey, range]);

    // Region filtering happens on the phone, so switching district is instant (no new request)
    const regionRows = useMemo(
        () => (region === 'all' ? result.rows : result.rows.filter((r) => r.district === region)),
        [result.rows, region]
    );
    const trend = useMemo(() => buildTrend(regionRows, range), [regionRows, range]);
    const summary = useMemo(() => summarize(regionRows, thresholds.high), [regionRows, thresholds.high]);
    const events = useMemo(() => [...regionRows].reverse().slice(0, TIMELINE_LIMIT), [regionRows]);
    const regionName = REGIONS.find((r) => r.id === region)?.name;

    const firstLoad = loading && result.key === null;

    return (
        <Screen title="Historical" subtitle="Past landslide risk predictions across Himachal Pradesh">
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={loading && !firstLoad}
                        onRefresh={() => setRefreshTick((t) => t + 1)}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    {REGIONS.map((r) => (
                        <Chip key={r.id} label={r.name} active={r.id === region} onPress={() => setRegion(r.id)} />
                    ))}
                </ScrollView>

                <Card>
                    <SectionLabel icon="trending-up-outline">Regional Risk Index Trend</SectionLabel>
                    <View style={styles.rangeRow}>
                        {HISTORY_RANGES.map((r) => (
                            <Chip key={r.id} label={r.label} active={r.id === rangeId} onPress={() => setRangeId(r.id)} />
                        ))}
                    </View>

                    {firstLoad ? (
                        <ActivityIndicator color={colors.primary} style={styles.loader} />
                    ) : result.error ? (
                        <Text style={styles.error}>{result.error}</Text>
                    ) : trend.length === 0 ? (
                        <Text style={styles.empty}>
                            No predictions for {regionName} in the last {range.label.toLowerCase()}. Run a risk assessment on Home to
                            add one.
                        </Text>
                    ) : (
                        <>
                            <AdminOnly>
                                <Text style={styles.summary}>
                                    {summary.count} prediction{summary.count === 1 ? '' : 's'} · average {summary.average.toFixed(1)} ·{' '}
                                    {summary.highOrCritical} high or critical
                                </Text>
                            </AdminOnly>
                            <TrendChart
                                points={trend.map((p) => ({
                                    ...p,
                                    // Prediction counts are usage data, so only admins see them
                                    detail: isAdmin
                                        ? `${range.bucket === 'week' ? 'Week avg' : 'Day avg'} of ${p.count} prediction${p.count === 1 ? '' : 's'}`
                                        : range.bucket === 'week'
                                          ? 'Weekly average'
                                          : 'Daily average',
                                }))}
                                height={280}
                                bands={thresholds}
                                baseline={summary.average}
                                baselineLabel="Period average"
                                yAxisLabel="Risk score (0–100)"
                                xAxisLabel={range.bucket === 'week' ? 'Week starting' : 'Date'}
                            />
                        </>
                    )}
                </Card>

                {/* Lists places other people checked, so it is admin only */}
                <AdminOnly>
                <Card>
                    <SectionLabel icon="time-outline">Event Timeline</SectionLabel>
                    <AdminBadge />
                    {firstLoad ? (
                        <ActivityIndicator color={colors.primary} style={styles.loader} />
                    ) : events.length === 0 ? (
                        <Text style={styles.empty}>{result.error ? 'Timeline unavailable.' : 'No events yet.'}</Text>
                    ) : (
                        events.map((e, i) => {
                            const level = getRiskLevel(e.score, thresholds);
                            const color = getRiskColor(level);
                            const last = i === events.length - 1;
                            return (
                                <View key={e.id} style={styles.event}>
                                    <View style={styles.eventRail}>
                                        <View style={[styles.eventDot, { backgroundColor: color, shadowColor: color }]} />
                                        {!last ? <View style={styles.eventLine} /> : null}
                                    </View>
                                    <View style={styles.eventBody}>
                                        <Text style={styles.eventTime}>{formatEventTime(e.createdAt)}</Text>
                                        <Text style={styles.eventText}>
                                            <Text style={{ color, fontWeight: '700' }}>{level}</Text> risk ({e.score.toFixed(0)}) —{' '}
                                            {e.name}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </Card>
                </AdminOnly>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    content: { gap: 16, paddingBottom: 32 },
    chipRow: { gap: 8 },
    rangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    chipTextActive: { color: colors.background },
    loader: { marginVertical: 24 },
    error: { color: RISK_COLORS.Critical, fontSize: 13, lineHeight: 19 },
    empty: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
    summary: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
    event: { flexDirection: 'row', gap: 12 },
    eventRail: { width: 12, alignItems: 'center' },
    eventDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, shadowOpacity: 0.6, shadowRadius: 4, elevation: 2 },
    eventLine: { width: 1, flex: 1, backgroundColor: colors.border, marginTop: 4 },
    eventBody: { flex: 1, paddingBottom: 16 },
    eventTime: { color: colors.textMuted, fontSize: 11, marginBottom: 2 },
    eventText: { color: colors.text, fontSize: 13, lineHeight: 18 },
});
