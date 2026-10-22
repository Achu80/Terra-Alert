import { StyleSheet, Text, View } from 'react-native';
import LeafletMap from '@/components/map/LeafletMap';

const LEGEND = [
    { label: 'Critical (80+)', color: '#d32f2f' },
    { label: 'High (60-80)', color: '#fb8c00' },
    { label: 'Moderate (40-60)', color: '#fdd835' },
    { label: 'Low (<40)', color: '#43a047' },
];

/**
 * Risk area around the assessed point. The web version scatters random canvas points;
 * here overlapping translucent circles (drawn in leafletHtml.js) build the same fade-out.
 */
export default function RiskHeatmap({ location, score, height = 300 }) {
    const point = { lat: location.lat, lon: location.lon };

    return (
        <View style={{ height }}>
            <LeafletMap
                style={StyleSheet.absoluteFill}
                center={point}
                zoom={11}
                interactive={false}
                marker={{ ...point, title: location.name, subtitle: `Risk Score: ${score.toFixed(1)}` }}
                heat={{ ...point, score }}
            />

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
    legend: {
        position: 'absolute',
        right: 8,
        bottom: 20,
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
