import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, SectionLabel } from '@/components/Card';
import TrendChart from '@/components/charts/TrendChart';
import { useSettings } from '@/context/SettingsContext';
import { colors, RISK_COLORS } from '@/theme/colors';
import { shortDate } from '@/utils/history';
import { getRiskColor, getRiskLevel, withAlpha } from '@/utils/risk';

const TABS = [
    { id: '7days', label: '7 Days', days: 7 },
    { id: '14days', label: '14 Days', days: 14 },
    { id: '30days', label: '30 Days', days: 30 },
];

// '2026-10-24' -> 'Oct 24' (parsed as a local date, so the day doesn't shift with the time zone)
const labelOfIso = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return shortDate(new Date(y, m - 1, d));
};

// Real forecast rows from /api/forecast/predict: { date, rainfall_mm, rain_source, risk_score, confidence }
// rain_source is 'forecast' (weather forecast, first 16 days) or 'seasonal' (seasonal outlook after that)
const fromWeather = (rows) =>
    rows.map((r) => ({
        key: r.date,
        label: labelOfIso(r.date),
        score: r.risk_score,
        confidence: r.confidence,
        rain: r.rainfall_mm,
        seasonal: r.rain_source === 'seasonal',
        // Likely score range over the rain scenarios ([p10, p90]); null when only one forecast was available
        range: r.risk_range ?? null,
    }));

const rangeText = (range) => (range && range[1] - range[0] >= 1 ? ` · likely ${range[0].toFixed(0)}-${range[1].toFixed(0)}` : '');

// Projection rows from /api/predict: { date, day: 'Oct 24', score, confidence }
const fromProjection = (rows) =>
    rows.map((r) => ({ key: r.date, label: r.day, score: r.score, confidence: r.confidence }));

function ForecastCards({ days }) {
    const { thresholds } = useSettings();
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
            {days.map((day) => {
                // Colour by the user's thresholds rather than the backend's fixed level
                const color = getRiskColor(getRiskLevel(day.score, thresholds));
                const [month, date] = day.label.split(' ');
                return (
                    <View
                        key={day.key}
                        style={[styles.dayCard, { backgroundColor: withAlpha(color, 0.15), borderColor: withAlpha(color, 0.5) }]}
                    >
                        <Text style={[styles.dayMonth, { color }]}>{month}</Text>
                        <Text style={[styles.dayDate, { color }]}>{date}</Text>
                        <Text style={[styles.dayScore, { color }]}>{day.score.toFixed(0)}</Text>
                        {day.rain != null ? (
                            <View style={styles.rainRow}>
                                <Ionicons name="water" size={10} color={colors.info} />
                                <Text style={styles.rainText}>{day.rain.toFixed(1)} mm</Text>
                            </View>
                        ) : (
                            <Text style={[styles.dayConfidence, { color }]}>{day.confidence.toFixed(0)}%</Text>
                        )}
                    </View>
                );
            })}
        </ScrollView>
    );
}

function weatherNote(days) {
    const firm = days.filter((d) => !d.seasonal).length;
    const scenarios = days[0]?.range ? ' Each score is averaged over 31 possible rain scenarios.' : '';
    if (firm === days.length) return `Based on the weather forecast for the next ${days.length} days (Open-Meteo).${scenarios}`;
    return `Days 1-${firm} use the weather forecast; days ${firm + 1}-${days.length} use the seasonal rain outlook, which is much less certain (Open-Meteo).${scenarios}`;
}

function ThirtyDaySummary({ days }) {
    const avg = days.reduce((sum, d) => sum + d.score, 0) / days.length;
    const peak = days.reduce((max, d) => (d.score > max.score ? d : max));
    const rising = days[days.length - 1].score > days[0].score;
    const flat = days[days.length - 1].score === days[0].score;
    const trendColor = flat ? colors.textMuted : rising ? RISK_COLORS.Critical : RISK_COLORS.Low;

    return (
        <View style={styles.summaryRow}>
            <View style={styles.summaryTile}>
                <Text style={styles.summaryLabel}>30-Day Average</Text>
                <Text style={styles.summaryValue}>{avg.toFixed(1)}</Text>
                <Text style={styles.summaryHint}>Mean risk score</Text>
            </View>
            <View style={styles.summaryTile}>
                <Text style={styles.summaryLabel}>Peak Risk Day</Text>
                <Text style={styles.summaryValue}>{peak.label}</Text>
                <Text style={styles.summaryHint}>Score: {peak.score.toFixed(0)}</Text>
            </View>
            <View style={[styles.summaryTile, { borderColor: withAlpha(trendColor, 0.4) }]}>
                <Text style={styles.summaryLabel}>Trend</Text>
                <Text style={[styles.summaryValue, { color: trendColor }]}>{flat ? '→ Steady' : rising ? '↑ Rising' : '↓ Falling'}</Text>
                <Text style={styles.summaryHint}>{flat ? 'No change expected' : rising ? 'Risk increasing' : 'Risk decreasing'}</Text>
            </View>
        </View>
    );
}

function Note({ icon, text }) {
    return (
        <View style={styles.note}>
            <Ionicons name={icon} size={14} color={colors.textMuted} />
            <Text style={styles.noteText}>{text}</Text>
        </View>
    );
}

/**
 * forecast: the projection that comes with /api/predict (7/14/30 days, estimated from recent conditions)
 * weather: { loading, days, error } - real rainfall-forecast-driven risk from /api/forecast/predict
 */
export default function ForecastSection({ forecast, weather }) {
    const { thresholds } = useSettings();
    const [tab, setTab] = useState('7days');

    // Every tab uses the real forecast (one 30-day request); the old projection is only a fallback if it failed
    const tabDays = TABS.find((t) => t.id === tab).days;
    const weatherDays = fromWeather((weather?.days ?? []).slice(0, tabDays));
    const useWeather = weatherDays.length > 0;
    const days = useWeather ? weatherDays : fromProjection(forecast?.[tab] ?? []);

    return (
        <Card>
            <SectionLabel icon="calendar-outline">Risk Forecast</SectionLabel>

            <View style={styles.tabs}>
                {TABS.map((t) => {
                    const active = t.id === tab;
                    return (
                        <Pressable key={t.id} onPress={() => setTab(t.id)} style={[styles.tab, active && styles.tabActive]}>
                            <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
                        </Pressable>
                    );
                })}
            </View>

            {weather?.loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.noteText}>Loading the rainfall forecast…</Text>
                </View>
            ) : days.length === 0 ? (
                <Text style={styles.empty}>No forecast data</Text>
            ) : (
                <View style={styles.content}>
                    {useWeather ? (
                        <Note icon="rainy-outline" text={weatherNote(days)} />
                    ) : (
                        <Note
                            icon="information-circle-outline"
                            text={
                                weather?.error
                                    ? `Weather forecast unavailable (${weather.error}). Showing a projection from recent rainfall instead.`
                                    : 'Projection from the last 30 days of rainfall and the season - not a weather forecast.'
                            }
                        />
                    )}
                    {tab !== '30days' ? <ForecastCards days={days} /> : null}
                    {tab === '30days' ? <ThirtyDaySummary days={days} /> : null}
                    <TrendChart
                        title={`${days.length}-Day Risk Trend`}
                        points={days.map((d) => ({
                            ...d,
                            detail:
                                d.rain == null
                                    ? 'Projected risk'
                                    : `${d.seasonal ? 'Seasonal outlook' : 'Forecast'} rain ${d.rain.toFixed(1)} mm${rangeText(d.range)}`,
                        }))}
                        height={230}
                        bands={thresholds}
                        yAxisLabel="Risk score"
                        xAxisLabel="Date"
                    />
                </View>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
    tabActive: { backgroundColor: colors.primary },
    tabText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
    tabTextActive: { color: colors.background },
    content: { gap: 14 },
    loading: { alignItems: 'center', gap: 8, paddingVertical: 20 },
    empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 16 },
    note: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
    noteText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, flex: 1 },
    cardsRow: { gap: 8 },
    dayCard: { width: 66, borderWidth: 1, borderRadius: 12, padding: 8, alignItems: 'center' },
    dayMonth: { fontSize: 11, opacity: 0.8 },
    dayDate: { fontSize: 11, opacity: 0.7 },
    dayScore: { fontSize: 22, fontWeight: '700', marginVertical: 4 },
    dayConfidence: { fontSize: 10, opacity: 0.7 },
    rainRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    rainText: { color: colors.info, fontSize: 10 },
    summaryRow: { flexDirection: 'row', gap: 8 },
    summaryTile: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, backgroundColor: 'rgba(255,255,255,0.03)' },
    summaryLabel: { color: colors.textMuted, fontSize: 11 },
    summaryValue: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 4 },
    summaryHint: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
});
