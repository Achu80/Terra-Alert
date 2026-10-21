import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

const STAGES = [
    'Fetching satellite data from Google Earth Engine...',
    'Processing terrain and rainfall data...',
    'Analyzing vegetation indices...',
    'Running XGBoost prediction model...',
    'Generating risk forecast...',
];

export default function PredictionLoading({ locationName }) {
    const [stage, setStage] = useState(0);

    // Cycle the status text while the backend works (takes several seconds)
    useEffect(() => {
        const id = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 2000);
        return () => clearInterval(id);
    }, []);

    return (
        <View style={styles.wrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.title}>Analyzing Landslide Risk</Text>
            {locationName ? <Text style={styles.place}>{locationName}</Text> : null}
            <Text style={styles.stage}>{STAGES[stage]}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    title: { color: colors.text, fontSize: 18, fontWeight: '600', marginTop: 24 },
    place: { color: colors.primary, fontSize: 14, marginTop: 4 },
    stage: { color: colors.textMuted, fontSize: 14, marginTop: 12, textAlign: 'center' },
});
