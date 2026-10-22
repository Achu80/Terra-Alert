import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { colors, RISK_COLORS } from '@/theme/colors';

const GRID_VALUES = [0, 25, 50, 75, 100];
const MAX_X_LABELS = 5;

// Evenly spread label positions: always the first and last point, never crowded
function labelIndexes(count) {
    if (count <= MAX_X_LABELS) return new Set([...Array(count).keys()]);
    const step = (count - 1) / (MAX_X_LABELS - 1);
    return new Set(Array.from({ length: MAX_X_LABELS }, (_, i) => Math.round(i * step)));
}

/**
 * Risk score line chart (0-100) drawn with react-native-svg.
 *
 * points: [{ key, label, score, t?, detail? }] - `t` (0-1) places a point by time; without it points are evenly spread.
 *         `detail` is extra text for the tap tooltip (e.g. "3 predictions").
 * baseline / baselineLabel: optional dashed reference line.
 * bands: optional { moderate, high, critical } thresholds - shades the Low / Moderate / High / Critical zones.
 * xAxisLabel / yAxisLabel: axis titles.
 */
export default function TrendChart({ title, points, baseline, baselineLabel, bands, xAxisLabel, yAxisLabel, height = 200 }) {
    // Svg needs pixel sizes, so measure the available width first
    const [width, setWidth] = useState(0);
    const [selectedKey, setSelectedKey] = useState(null);

    const pad = {
        top: 14,
        right: bands ? 58 : 14,
        bottom: xAxisLabel ? 46 : 28,
        left: yAxisLabel ? 48 : 34,
    };
    const graphW = Math.max(0, width - pad.left - pad.right);
    const graphH = height - pad.top - pad.bottom;
    const yOf = (score) => pad.top + graphH - (Math.max(0, Math.min(100, score)) / 100) * graphH;
    const xOf = (p, i) => {
        const t = p.t ?? (points.length > 1 ? i / (points.length - 1) : 0.5);
        return pad.left + t * graphW;
    };

    const placed = points.map((p, i) => ({ ...p, x: xOf(p, i), y: yOf(p.score) }));
    const linePath = placed.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const baseY = pad.top + graphH;
    const areaPath =
        placed.length > 1 ? `${linePath} L ${placed[placed.length - 1].x} ${baseY} L ${placed[0].x} ${baseY} Z` : '';
    const showLabel = labelIndexes(placed.length);
    const dotRadius = placed.length > 30 ? 3 : 4.5;
    const selected = placed.find((p) => p.key === selectedKey);

    const zones = bands
        ? [
              { label: 'Critical', from: bands.critical, to: 100, color: RISK_COLORS.Critical },
              { label: 'High', from: bands.high, to: bands.critical, color: RISK_COLORS.High },
              { label: 'Moderate', from: bands.moderate, to: bands.high, color: RISK_COLORS.Moderate },
              { label: 'Low', from: 0, to: bands.moderate, color: RISK_COLORS.Low },
          ]
        : [];

    // Tap anywhere on the chart -> select the nearest point by x position
    const handlePress = (e) => {
        if (placed.length === 0) return;
        const x = e.nativeEvent.locationX;
        const nearest = placed.reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best));
        setSelectedKey((current) => (current === nearest.key ? null : nearest.key));
    };

    // Keep the tooltip inside the chart
    const tipW = 150;
    const tipX = selected ? Math.min(Math.max(selected.x - tipW / 2, pad.left), width - pad.right - tipW) : 0;
    const tipY = selected ? (selected.y - pad.top > 52 ? selected.y - 50 : selected.y + 12) : 0;

    return (
        <View>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            <Pressable
                style={styles.box}
                onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
                onPress={handlePress}
                accessibilityHint="Tap the chart to read a value"
            >
                {width > 0 ? (
                    <Svg width={width} height={height}>
                        <Defs>
                            <LinearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor={colors.primary} stopOpacity="0.28" />
                                <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
                            </LinearGradient>
                        </Defs>

                        {/* Risk zones */}
                        {zones.map((z) => (
                            <G key={z.label}>
                                <Rect
                                    x={pad.left}
                                    y={yOf(z.to)}
                                    width={graphW}
                                    height={yOf(z.from) - yOf(z.to)}
                                    fill={z.color}
                                    opacity={0.07}
                                />
                                <SvgText
                                    x={pad.left + graphW + 6}
                                    y={(yOf(z.from) + yOf(z.to)) / 2 + 4}
                                    fill={z.color}
                                    fontSize="11"
                                    fontWeight="600"
                                >
                                    {z.label}
                                </SvgText>
                            </G>
                        ))}

                        {/* Grid + y-axis values */}
                        {GRID_VALUES.map((v) => (
                            <G key={`grid-${v}`}>
                                <Line
                                    x1={pad.left}
                                    x2={pad.left + graphW}
                                    y1={yOf(v)}
                                    y2={yOf(v)}
                                    stroke="rgba(255,255,255,0.1)"
                                    strokeDasharray={v === 0 ? undefined : '3,4'}
                                />
                                <SvgText x={pad.left - 8} y={yOf(v) + 4} fill={colors.textMuted} fontSize="11" textAnchor="end">
                                    {v}
                                </SvgText>
                            </G>
                        ))}

                        {yAxisLabel ? (
                            <SvgText
                                x={12}
                                y={pad.top + graphH / 2}
                                fill={colors.textMuted}
                                fontSize="11"
                                fontWeight="600"
                                textAnchor="middle"
                                transform={`rotate(-90, 12, ${pad.top + graphH / 2})`}
                            >
                                {yAxisLabel}
                            </SvgText>
                        ) : null}

                        {baseline != null ? (
                            <Line
                                x1={pad.left}
                                x2={pad.left + graphW}
                                y1={yOf(baseline)}
                                y2={yOf(baseline)}
                                stroke="rgba(255,255,255,0.45)"
                                strokeWidth={1}
                                strokeDasharray="6,5"
                            />
                        ) : null}

                        {areaPath ? <Path d={areaPath} fill="url(#trendArea)" /> : null}
                        <Path d={linePath} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

                        {selected ? (
                            <Line x1={selected.x} x2={selected.x} y1={pad.top} y2={baseY} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
                        ) : null}

                        {placed.map((p) => (
                            <Circle
                                key={`pt-${p.key}`}
                                cx={p.x}
                                cy={p.y}
                                r={p.key === selectedKey ? dotRadius + 2 : dotRadius}
                                fill={colors.primary}
                                stroke={colors.background}
                                strokeWidth={1.5}
                            />
                        ))}

                        {/* x-axis dates */}
                        {placed.map((p, i) =>
                            showLabel.has(i) ? (
                                <SvgText
                                    key={`x-${p.key}`}
                                    x={p.x}
                                    y={baseY + 17}
                                    fill={colors.textMuted}
                                    fontSize="11"
                                    textAnchor={i === 0 && placed.length > 1 ? 'start' : i === placed.length - 1 && placed.length > 1 ? 'end' : 'middle'}
                                >
                                    {p.label}
                                </SvgText>
                            ) : null
                        )}

                        {xAxisLabel ? (
                            <SvgText
                                x={pad.left + graphW / 2}
                                y={height - 8}
                                fill={colors.textMuted}
                                fontSize="11"
                                fontWeight="600"
                                textAnchor="middle"
                            >
                                {xAxisLabel}
                            </SvgText>
                        ) : null}

                        {/* Tooltip for the tapped point */}
                        {selected ? (
                            <G>
                                <Rect x={tipX} y={tipY} width={tipW} height={38} rx={8} fill={colors.surface} stroke={colors.border} />
                                <SvgText x={tipX + 10} y={tipY + 16} fill={colors.text} fontSize="12" fontWeight="700">
                                    {`${selected.label} · ${selected.score.toFixed(1)}`}
                                </SvgText>
                                <SvgText x={tipX + 10} y={tipY + 30} fill={colors.textMuted} fontSize="11">
                                    {selected.detail ?? 'Risk score'}
                                </SvgText>
                            </G>
                        ) : null}
                    </Svg>
                ) : null}
            </Pressable>

            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendLine, { backgroundColor: colors.primary }]} />
                    <Text style={styles.legendText}>Risk score</Text>
                </View>
                {baseline != null ? (
                    <View style={styles.legendItem}>
                        <View style={styles.legendDashed} />
                        <Text style={styles.legendText}>{baselineLabel}</Text>
                    </View>
                ) : null}
                <Text style={styles.hint}>Tap the chart to read values</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    title: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 8 },
    box: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 16, rowGap: 6, marginTop: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendLine: { width: 18, height: 3, borderRadius: 2 },
    legendDashed: { width: 18, borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.55)' },
    legendText: { color: colors.textMuted, fontSize: 12 },
    hint: { color: colors.textMuted, fontSize: 11, opacity: 0.7, marginLeft: 'auto' },
});
