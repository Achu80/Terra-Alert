import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, SectionLabel } from '@/components/Card';
import LocationMap from '@/components/home/LocationMap';
import PredictionLoading from '@/components/home/PredictionLoading';
import PredictionResults from '@/components/home/PredictionResults';
import LocationPicker from '@/components/LocationPicker';
import Screen from '@/components/Screen';
import { HP_STATE_NAME, isWithinHP } from '@/constants/himachal';
import { useSelectedLocation } from '@/context/LocationContext';
import { usePrediction } from '@/context/PredictionContext';
import { predictionAPI } from '@/services/api';
import { reverseGeocodeHP } from '@/services/geocoding';
import { colors } from '@/theme/colors';

const OUTSIDE_HP_MESSAGE = `Please select a location within ${HP_STATE_NAME}.`;

/**
 * Mobile version of the web PredictionPage: select a location -> loading -> results
 */
export default function HomeScreen() {
    const { location, setLocation, ready } = useSelectedLocation();
    const { prediction, setPrediction } = usePrediction();

    const [pickerOpen, setPickerOpen] = useState(false);
    const [resolvingPin, setResolvingPin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mapTouched, setMapTouched] = useState(false);

    // Which of the three web steps to show, derived instead of stored separately
    const step = loading ? 'loading' : prediction ? 'results' : 'select';

    const handleMapPick = async ({ latitude, longitude }) => {
        if (!isWithinHP(latitude, longitude)) {
            Alert.alert('Outside Himachal Pradesh', OUTSIDE_HP_MESSAGE);
            return;
        }

        setResolvingPin(true);
        try {
            const place = await reverseGeocodeHP(latitude, longitude);
            if (!place) {
                Alert.alert('Outside Himachal Pradesh', OUTSIDE_HP_MESSAGE);
                return;
            }
            setLocation(place);
        } catch {
            // Name lookup failed (e.g. offline) - the point is inside the HP box, so keep it with coordinates only
            setLocation({
                id: `pin_${latitude.toFixed(5)}_${longitude.toFixed(5)}`,
                name: 'Dropped pin',
                region: HP_STATE_NAME,
                lat: latitude,
                lon: longitude,
                type: 'pin',
            });
        } finally {
            setResolvingPin(false);
        }
    };

    const getAssessment = async () => {
        if (!location) return;
        setLoading(true);
        try {
            const data = await predictionAPI.predict(location.lat, location.lon);
            setPrediction({ ...data, location });
        } catch (e) {
            Alert.alert('Failed to get prediction', e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen title="Landslide Risk Prediction" subtitle="Satellite data and machine learning for Himachal Pradesh">
            {step === 'loading' ? (
                <PredictionLoading locationName={location?.name} />
            ) : (
                <ScrollView
                    scrollEnabled={!mapTouched}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {step === 'results' ? (
                        <PredictionResults result={prediction} onNewAssessment={() => setPrediction(null)} />
                    ) : (
                        <>
                            <Card>
                                <SectionLabel icon="location-outline">Select Location</SectionLabel>
                                <View>
                                    <LocationMap selected={location} onPick={handleMapPick} onTouchChange={setMapTouched} />
                                    {resolvingPin ? (
                                        <View style={styles.mapBusy} pointerEvents="none">
                                            <ActivityIndicator color={colors.primary} />
                                        </View>
                                    ) : null}
                                </View>
                                <Text style={styles.hint}>Tap anywhere on the map inside Himachal Pradesh</Text>
                            </Card>

                            <Card>
                                <SectionLabel icon="search-outline">Search Location</SectionLabel>
                                <Pressable
                                    onPress={() => setPickerOpen(true)}
                                    style={({ pressed }) => [styles.searchField, pressed && styles.pressed]}
                                >
                                    <Ionicons name="search" size={18} color={colors.textMuted} />
                                    <Text style={styles.searchPlaceholder}>Search a town, village or district</Text>
                                </Pressable>
                            </Card>

                            {ready && location ? (
                                <Card style={styles.selectedCard}>
                                    <View style={styles.selectedRow}>
                                        <Ionicons name="location" size={22} color={colors.primary} />
                                        <View style={styles.selectedText}>
                                            <Text style={styles.selectedLabel}>Selected Location</Text>
                                            <Text style={styles.selectedName}>{location.name}</Text>
                                            <Text style={styles.selectedRegion}>{location.region}</Text>
                                            <Text style={styles.coords}>
                                                {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                                            </Text>
                                        </View>
                                    </View>
                                    <Pressable
                                        onPress={getAssessment}
                                        disabled={resolvingPin}
                                        style={({ pressed }) => [styles.primaryButton, (pressed || resolvingPin) && styles.pressed]}
                                    >
                                        <Text style={styles.primaryButtonText}>Get Risk Assessment</Text>
                                    </Pressable>
                                </Card>
                            ) : null}
                        </>
                    )}
                </ScrollView>
            )}

            <LocationPicker
                visible={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={setLocation}
                selectedId={location?.id}
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    content: { gap: 16, paddingBottom: 32 },
    pressed: { opacity: 0.7 },
    hint: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
    mapBusy: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${colors.background}59`,
        borderRadius: 12,
    },
    searchField: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    searchPlaceholder: { color: colors.textMuted, fontSize: 15 },
    selectedCard: { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}4d` },
    selectedRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    selectedText: { flex: 1 },
    selectedLabel: { color: colors.primary, fontSize: 13, fontWeight: '600' },
    selectedName: { color: colors.text, fontSize: 17, fontWeight: '600', marginTop: 4 },
    selectedRegion: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    coords: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
    primaryButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    primaryButtonText: { color: colors.background, fontWeight: '700', fontSize: 15 },
});
