import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { colors, RISK_COLORS } from '@/theme/colors';

const GRID_VALUES = [0, 25, 50, 75, 100];
// Date labels are written vertically, so they only need the height of one line of text between them
const LABEL_GAP = 12;
// Room under the axis for a vertical date label (about 6 characters at 11px)
const DATE_LABEL_SPACE = 44;
// Horizontal space per day (or week) slot. When the slots need more room than the screen, the chart scrolls sideways.
const SLOT_PX = 14;

// Pick which points get a date label, using their actual x positions (points are placed by time, so
// evenly spaced indexes can sit on top of each other). Greedy left to right, skipping any label that
// would be closer than LABEL_GAP to the last one shown. The last point is always labelled if it fits.
function pickLabels(placed) {
    const shown = new Set();
    let lastX = -Infinity;
    placed.forEach((p, i) => {
        if (p.x - lastX >= LABEL_GAP) {
            shown.add(i);
            lastX = p.x;
        }
    });
    const last = placed.length - 1;
    if (last >= 0 && !shown.has(last)) {
        // Make room for the final label by dropping shown labels it would collide with
        for (const i of [...shown]) {
            if (Math.abs(placed[last].x - placed[i].x) < LABEL_GAP && i !== 0) shown.delete(i);
        }
        // If the first label is still too close, the first label wins and the last one is left off
        if (!shown.has(0) || Math.abs(placed[last].x - placed[0].x) >= LABEL_GAP) shown.add(last);
    }
    return shown;
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
    const scrollRef = useRef(null);

    const pad = {
        top: 14,
        right: bands ? 58 : 14,
        bottom: DATE_LABEL_SPACE + (xAxisLabel ? 46 : 28),
        left: yAxisLabel ? 48 : 34,
    };
    // Chart width: the screen width, or wider when there are many slots (then the chart scrolls sideways)
    const chartW = Math.max(width, pad.left + pad.right + points.length * SLOT_PX);
    const graphW = Math.max(0, chartW - pad.left - pad.right);
    const graphH = height - pad.top - pad.bottom;
    const yOf = (score) => pad.top + graphH - (Math.max(0, Math.min(100, score)) / 100) * graphH;
    const xOf = (p, i) => {
        const t = p.t ?? (points.length > 1 ? i / (points.length - 1) : 0.5);
        return pad.left + t * graphW;
    };

    // Slots with no score (no predictions that day or week) keep their x position and date label,
    // but get no dot, and the line is broken across them
    const placed = points.map((p, i) => ({ ...p, x: xOf(p, i), y: p.score == null ? null : yOf(p.score) }));
    const known = placed.filter((p) => p.y != null);
    let linePath = '';
    let penDown = false;
    placed.forEach((p) => {
        if (p.y == null) {
            penDown = false;
            return;
        }
        linePath += `${penDown ? 'L' : 'M'} ${p.x} ${p.y} `;
        penDown = true;
    });
    const baseY = pad.top + graphH;
    const areaPath =
        known.length > 1
            ? `M ${known[0].x} ${known[0].y} ${known.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')} L ${known[known.length - 1].x} ${baseY} L ${known[0].x} ${baseY} Z`
            : '';
    const showLabel = pickLabels(placed);
    const dotRadius = placed.length > 30 ? 3 : 4.5;
    const selected = known.find((p) => p.key === selectedKey);

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
        if (known.length === 0) return;
        const x = e.nativeEvent.locationX;
        const nearest = known.reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best));
        setSelectedKey((current) => (current === nearest.key ? null : nearest.key));
    };

    // Keep the tooltip inside the chart
    const tipW = 150;
    const tipX = selected ? Math.min(Math.max(selected.x - tipW / 2, pad.left), chartW - pad.right - tipW) : 0;
    const tipY = selected ? (selected.y - pad.top > 52 ? selected.y - 50 : selected.y + 12) : 0;

    // The scroll view starts at the most recent day, which is on the right
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
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
                    >
                    <Svg width={chartW} height={height}>
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

                        {known.map((p) => (
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
                                    y={baseY + 8}
                                    // Rotated -90 degrees and anchored at its end, so the text hangs straight down
                                    transform={`rotate(-90 ${p.x} ${baseY + 8})`}
                                    fill={colors.textMuted}
                                    fontSize="9"
                                    textAnchor="end"
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
                    </ScrollView>
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
