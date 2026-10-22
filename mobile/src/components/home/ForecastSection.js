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
    { id: '7days', label: '7 Days' },
    { id: '14days', label: '14 Days' },
    { id: '30days', label: '30 Days' },
];

// '2026-10-24' -> 'Oct 24' (parsed as a local date, so the day doesn't shift with the time zone)
const labelOfIso = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return shortDate(new Date(y, m - 1, d));
};

// Real forecast rows from /api/forecast/predict: { date, rainfall_mm, risk_score, confidence }
const fromWeather = (rows) =>
    rows.map((r) => ({ key: r.date, label: labelOfIso(r.date), score: r.risk_score, confidence: r.confidence, rain: r.rainfall_mm }));

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
    const [tab, setTab] = useState('7days');

    const weatherDays = fromWeather(weather?.days ?? []);
    const useWeather = tab === '7days' && weatherDays.length > 0;
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

            {tab === '7days' && weather?.loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.noteText}>Loading the rainfall forecast…</Text>
                </View>
            ) : days.length === 0 ? (
                <Text style={styles.empty}>No forecast data</Text>
            ) : (
                <View style={styles.content}>
                    {useWeather ? (
                        <Note icon="rainy-outline" text={`Based on the weather forecast for the next ${days.length} days (OpenWeatherMap).`} />
                    ) : (
                        <Note
                            icon="information-circle-outline"
                            text={
                                tab === '7days' && weather?.error
                                    ? `Weather forecast unavailable (${weather.error}). Showing a projection from recent rainfall instead.`
                                    : 'Projection from the last 30 days of rainfall and the season - not a weather forecast.'
                            }
                        />
                    )}
                    {tab === '7days' ? <ForecastCards days={days} /> : null}
                    {tab === '30days' ? <ThirtyDaySummary days={days} /> : null}
                    <TrendChart title={`${days.length}-Day Risk Trend`} points={days} />
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
