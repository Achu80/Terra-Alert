import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { colors } from '@/theme/colors';

const PAD = { top: 10, right: 12, bottom: 24, left: 30 };
const GRID_VALUES = [0, 25, 50, 75, 100];
const MAX_X_LABELS = 7;

/**
 * Risk score line chart (0-100) drawn with react-native-svg.
 *
 * points: [{ key, label, score, t? }] - `t` (0-1) places a point by time on the x-axis;
 *         without it, points are spread evenly.
 * baseline: optional score drawn as a dashed line, described by baselineLabel.
 */
export default function TrendChart({ title, points, baseline, baselineLabel, height = 180 }) {
    // Svg needs pixel sizes, so measure the available width first
    const [width, setWidth] = useState(0);

    const graphW = width - PAD.left - PAD.right;
    const graphH = height - PAD.top - PAD.bottom;
    const yOf = (score) => PAD.top + graphH - (score / 100) * graphH;
    const xOf = (p, i) => {
        const t = p.t ?? (points.length > 1 ? i / (points.length - 1) : 0.5);
        return PAD.left + t * graphW;
    };

    const placed = points.map((p, i) => ({ ...p, x: xOf(p, i), y: yOf(p.score) }));
    const linePath = placed.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const baseY = height - PAD.bottom;
    const areaPath =
        placed.length > 1 ? `${linePath} L ${placed[placed.length - 1].x} ${baseY} L ${placed[0].x} ${baseY} Z` : '';
    const labelEvery = Math.max(1, Math.ceil(placed.length / MAX_X_LABELS));
    const dotRadius = placed.length > 20 ? 2.5 : 4;

    return (
        <View>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            <View style={styles.box} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
                {width > 0 ? (
                    <Svg width={width} height={height}>
                        <Defs>
                            <LinearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
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

                        {baseline != null ? (
                            <Line
                                x1={PAD.left}
                                x2={width - PAD.right}
                                y1={yOf(baseline)}
                                y2={yOf(baseline)}
                                stroke="rgba(255,255,255,0.35)"
                                strokeWidth={1}
                                strokeDasharray="5,4"
                            />
                        ) : null}

                        {areaPath ? <Path d={areaPath} fill="url(#trendArea)" /> : null}
                        <Path d={linePath} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

                        {placed.map((p) => (
                            <Circle key={`pt-${p.key}`} cx={p.x} cy={p.y} r={dotRadius} fill={colors.primary} stroke="#fff" strokeWidth={1.5} />
                        ))}
                        {placed.map((p, i) =>
                            i % labelEvery === 0 ? (
                                <SvgText key={`x-${p.key}`} x={p.x} y={baseY + 16} fill={colors.textMuted} fontSize="10" textAnchor="middle">
                                    {p.label}
                                </SvgText>
                            ) : null
                        )}
                    </Svg>
                ) : null}
            </View>

            {baseline != null ? (
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendLine, { backgroundColor: colors.primary }]} />
                        <Text style={styles.legendText}>Risk index</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={styles.legendDashed} />
                        <Text style={styles.legendText}>{baselineLabel}</Text>
                    </View>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    title: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 8 },
    box: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    legend: { flexDirection: 'row', gap: 16, marginTop: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendLine: { width: 18, height: 2, borderRadius: 1 },
    legendDashed: { width: 18, borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.45)' },
    legendText: { color: colors.textMuted, fontSize: 11 },
});
