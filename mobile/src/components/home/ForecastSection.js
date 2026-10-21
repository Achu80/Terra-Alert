import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { Card, SectionLabel } from '@/components/Card';
import { colors, RISK_COLORS } from '@/theme/colors';
import { getRiskColor, withAlpha } from '@/utils/risk';

const TABS = [
    { id: '7days', label: '7 Days' },
    { id: '14days', label: '14 Days' },
    { id: '30days', label: '30 Days' },
];

// Forecast days come from the backend as { date, day: 'Oct 22', score, level, confidence }
const monthOf = (day) => day.day.split(' ')[0];
const dateOf = (day) => day.day.split(' ')[1];

function ForecastCards({ days }) {
    return (
        <View>
            <Text style={styles.subTitle}>Next {days.length} Days</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
                {days.map((day) => {
                    const color = getRiskColor(day.level);
                    return (
                        <View
                            key={day.date}
                            style={[styles.dayCard, { backgroundColor: withAlpha(color, 0.15), borderColor: withAlpha(color, 0.5) }]}
                        >
                            <Text style={[styles.dayMonth, { color }]}>{monthOf(day)}</Text>
                            <Text style={[styles.dayDate, { color }]}>{dateOf(day)}</Text>
                            <Text style={[styles.dayScore, { color }]}>{day.score.toFixed(0)}</Text>
                            <Text style={[styles.dayConfidence, { color }]}>{day.confidence.toFixed(0)}%</Text>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const CHART_HEIGHT = 180;
const PAD = { top: 10, right: 12, bottom: 24, left: 30 };
const GRID_VALUES = [0, 25, 50, 75, 100];

function TrendChart({ days }) {
    // Svg needs pixel sizes, so measure the available width first
    const [width, setWidth] = useState(0);

    const graphW = width - PAD.left - PAD.right;
    const graphH = CHART_HEIGHT - PAD.top - PAD.bottom;
    const yOf = (score) => PAD.top + graphH - (score / 100) * graphH;
    const points = days.map((day, i) => ({
        x: PAD.left + (days.length > 1 ? (i / (days.length - 1)) * graphW : graphW / 2),
        y: yOf(day.score),
        day,
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const baseY = CHART_HEIGHT - PAD.bottom;
    const areaPath = points.length
        ? `${linePath} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`
        : '';
    const labelEvery = days.length <= 7 ? 1 : days.length <= 14 ? 2 : 3;

    return (
        <View style={styles.chartBlock}>
            <Text style={styles.subTitle}>{days.length}-Day Risk Trend</Text>
            <View style={styles.chartBox} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
                {width > 0 ? (
                    <Svg width={width} height={CHART_HEIGHT}>
                        <Defs>
                            <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor={colors.primary} stopOpacity="0.3" />
                                <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
                            </LinearGradient>
                        </Defs>

                        {GRID_VALUES.map((v) => (
                            <Line
                                key={`grid-${v}`}
                                x1={PAD.left}
                                x2={width - PAD.right}
                                y1={yOf(v)}
                                y2={yOf(v)}
                                stroke="rgba(255,255,255,0.1)"
                                strokeDasharray="3,3"
                            />
                        ))}
                        {GRID_VALUES.map((v) => (
                            <SvgText key={`y-${v}`} x={PAD.left - 6} y={yOf(v) + 4} fill={colors.textMuted} fontSize="10" textAnchor="end">
                                {v}
                            </SvgText>
                        ))}

                        <Path d={areaPath} fill="url(#area)" />
                        <Path d={linePath} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

                        {points.map((p) => (
                            <Circle key={`pt-${p.day.date}`} cx={p.x} cy={p.y} r={days.length > 14 ? 2.5 : 4} fill={colors.primary} stroke="#fff" strokeWidth={1.5} />
                        ))}
                        {points.map((p, i) =>
                            i % labelEvery === 0 ? (
                                <SvgText key={`x-${p.day.date}`} x={p.x} y={baseY + 16} fill={colors.textMuted} fontSize="10" textAnchor="middle">
                                    {dateOf(p.day)}
                                </SvgText>
                            ) : null
                        )}
                    </Svg>
                ) : null}
            </View>
        </View>
    );
}

function ThirtyDaySummary({ days }) {
    const avg = days.reduce((sum, d) => sum + d.score, 0) / days.length;
    const peak = days.reduce((max, d) => (d.score > max.score ? d : max));
    const rising = days[days.length - 1].score > days[0].score;
    const trendColor = rising ? RISK_COLORS.Critical : RISK_COLORS.Low;

    return (
        <View style={styles.summaryRow}>
            <View style={styles.summaryTile}>
                <Text style={styles.summaryLabel}>30-Day Average</Text>
                <Text style={styles.summaryValue}>{avg.toFixed(1)}</Text>
                <Text style={styles.summaryHint}>Mean risk score</Text>
            </View>
            <View style={styles.summaryTile}>
                <Text style={styles.summaryLabel}>Peak Risk Day</Text>
                <Text style={styles.summaryValue}>{peak.day}</Text>
                <Text style={styles.summaryHint}>Score: {peak.score.toFixed(0)}</Text>
            </View>
            <View style={[styles.summaryTile, { borderColor: withAlpha(trendColor, 0.4) }]}>
                <Text style={styles.summaryLabel}>Trend</Text>
                <Text style={[styles.summaryValue, { color: trendColor }]}>{rising ? '↑ Rising' : '↓ Falling'}</Text>
                <Text style={styles.summaryHint}>{rising ? 'Risk increasing' : 'Risk decreasing'}</Text>
            </View>
        </View>
    );
}

export default function ForecastSection({ forecast }) {
    const [tab, setTab] = useState('7days');
    const days = forecast?.[tab] ?? [];

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

            {days.length === 0 ? (
                <Text style={styles.empty}>No forecast data</Text>
            ) : (
                <View style={styles.content}>
                    {tab === '7days' ? <ForecastCards days={days} /> : null}
                    {tab === '30days' ? <ThirtyDaySummary days={days} /> : null}
                    <TrendChart days={days} />
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
    content: { gap: 16 },
    empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 16 },
    subTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 8 },
    cardsRow: { gap: 8 },
    dayCard: { width: 64, borderWidth: 1, borderRadius: 12, padding: 8, alignItems: 'center' },
    dayMonth: { fontSize: 11, opacity: 0.8 },
    dayDate: { fontSize: 11, opacity: 0.7 },
    dayScore: { fontSize: 22, fontWeight: '700', marginVertical: 4 },
    dayConfidence: { fontSize: 10, opacity: 0.7 },
    chartBlock: {},
    chartBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    summaryRow: { flexDirection: 'row', gap: 8 },
    summaryTile: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, backgroundColor: 'rgba(255,255,255,0.03)' },
    summaryLabel: { color: colors.textMuted, fontSize: 11 },
    summaryValue: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 4 },
    summaryHint: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
});
