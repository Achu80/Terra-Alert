import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import LocationPicker from '@/components/LocationPicker';
import { useSelectedLocation } from '@/context/LocationContext';
import { usePrediction } from '@/context/PredictionContext';
import { colors, RISK_COLORS } from '@/theme/colors';
import { withAlpha } from '@/utils/risk';

const TYPE_LABEL = { district: 'District', place: 'Town / village', pin: 'Map pin' };

export default function LocationSettingsScreen() {
    const { location, setLocation } = useSelectedLocation();
    const { setPrediction } = usePrediction();
    const [pickerOpen, setPickerOpen] = useState(false);

    const clear = () => {
        Alert.alert('Clear saved location?', 'Home, History and the Assistant will no longer start from this place.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear',
                style: 'destructive',
                onPress: () => {
                    setLocation(null);
                    setPrediction(null);
                },
            },
        ]);
    };

    return (
        <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.intro}>
                The app remembers one place in Himachal Pradesh. Home opens on it, History starts on its district, and the
                Assistant uses it for nearby hospitals and routes.
            </Text>

            {location ? (
                <Card style={styles.card}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="location" size={26} color={colors.primary} />
                    </View>
                    <Text style={styles.name}>{location.name}</Text>
                    <Text style={styles.region}>{location.region}</Text>
                    <View style={styles.metaRow}>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>{TYPE_LABEL[location.type] ?? 'Location'}</Text>
                        </View>
                        <Text style={styles.coords}>
                            {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                        </Text>
                    </View>
                </Card>
            ) : (
                <Card style={styles.card}>
                    <Ionicons name="location-outline" size={32} color={colors.textMuted} />
                    <Text style={styles.empty}>No location saved yet</Text>
                </Card>
            )}

            <Pressable onPress={() => setPickerOpen(true)} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
                <Ionicons name="search" size={18} color={colors.background} />
                <Text style={styles.primaryText}>{location ? 'Change location' : 'Choose a location'}</Text>
            </Pressable>

            {location ? (
                <Pressable onPress={clear} style={({ pressed }) => [styles.danger, pressed && styles.pressed]}>
                    <Ionicons name="trash-outline" size={18} color={RISK_COLORS.Critical} />
                    <Text style={styles.dangerText}>Clear saved location</Text>
                </Pressable>
            ) : null}

            <LocationPicker
                visible={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={(next) => {
                    setLocation(next);
                    setPrediction(null); // the old assessment belongs to the previous place
                }}
                selectedId={location?.id}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { padding: 16, gap: 16, paddingBottom: 40 },
    intro: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
    card: { alignItems: 'center', gap: 4, paddingVertical: 24 },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withAlpha(colors.primary, 0.15),
        marginBottom: 8,
    },
    name: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
    region: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
    tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: withAlpha(colors.primary, 0.15) },
    tagText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
    coords: { color: colors.textMuted, fontSize: 12 },
    empty: { color: colors.textMuted, fontSize: 14, marginTop: 6 },
    primary: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: 15,
    },
    primaryText: { color: colors.background, fontWeight: '700', fontSize: 15 },
    danger: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        paddingVertical: 13,
        borderWidth: 1,
        borderColor: withAlpha(RISK_COLORS.Critical, 0.4),
    },
    dangerText: { color: RISK_COLORS.Critical, fontWeight: '600', fontSize: 14 },
    pressed: { opacity: 0.75 },
});
