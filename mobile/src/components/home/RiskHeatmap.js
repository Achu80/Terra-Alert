import { StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { colors } from '@/theme/colors';

// Same blue -> green -> yellow -> orange -> red scale as the web RiskHeatmap
const HEAT_STOPS = [
    [0, [30, 136, 229]],
    [0.2, [67, 160, 71]],
    [0.4, [124, 179, 66]],
    [0.6, [253, 216, 53]],
    [0.8, [251, 140, 0]],
    [1, [211, 47, 47]],
];

function heatColor(intensity, alpha) {
    const t = Math.max(0, Math.min(1, intensity));
    let i = 0;
    while (i < HEAT_STOPS.length - 2 && t > HEAT_STOPS[i + 1][0]) i++;
    const [t0, c0] = HEAT_STOPS[i];
    const [t1, c1] = HEAT_STOPS[i + 1];
    const f = (t - t0) / (t1 - t0);
    const [r, g, b] = c0.map((v, k) => Math.round(v + f * (c1[k] - v)));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const RING_COUNT = 5;
const RING_STEP_M = 3000; // ~3 km per ring, as on the web
const DECAY = 0.85;

// Largest ring first so smaller, stronger rings are drawn on top
const RINGS = Array.from({ length: RING_COUNT }, (_, i) => RING_COUNT - i);

const LEGEND = [
    { label: 'Critical (80+)', color: '#d32f2f' },
    { label: 'High (60-80)', color: '#fb8c00' },
    { label: 'Moderate (40-60)', color: '#fdd835' },
    { label: 'Low (<40)', color: '#43a047' },
];

/**
 * Risk area around the assessed point. The web version scatters random canvas points;
 * here overlapping translucent circles build the same fade-out without randomness.
 */
export default function RiskHeatmap({ location, score, height = 300 }) {
    const center = { latitude: location.lat, longitude: location.lon };
    const base = score / 100;

    return (
        <View style={[styles.wrap, { height }]}>
            <MapView
                style={StyleSheet.absoluteFill}
                initialRegion={{ ...center, latitudeDelta: 0.35, longitudeDelta: 0.35 }}
                scrollEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                toolbarEnabled={false}
            >
                {RINGS.map((ring) => {
                    const intensity = Math.max(0.1, base * DECAY ** ring);
                    return (
                        <Circle
                            key={ring}
                            center={center}
                            radius={ring * RING_STEP_M}
                            fillColor={heatColor(intensity, 0.22)}
                            strokeWidth={0}
                        />
                    );
                })}
                <Circle center={center} radius={1200} fillColor={heatColor(Math.max(0.1, base), 0.45)} strokeWidth={0} />
                <Marker coordinate={center} title={location.name} description={`Risk Score: ${score.toFixed(1)}`} />
            </MapView>

            <View style={styles.legend} pointerEvents="none">
                <Text style={styles.legendTitle}>Risk Level</Text>
                {LEGEND.map((item) => (
                    <View key={item.label} style={styles.legendRow}>
                        <View style={[styles.dot, { backgroundColor: item.color }]} />
                        <Text style={styles.legendText}>{item.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    legend: {
        position: 'absolute',
        right: 8,
        bottom: 8,
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 3,
    },
    legendTitle: { fontSize: 11, fontWeight: '700', color: '#1f2937', marginBottom: 2 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 11, color: '#374151' },
});
