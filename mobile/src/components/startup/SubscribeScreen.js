import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { pushAPI, subscriberAPI } from '@/services/api';
import { getPushToken } from '@/services/notifications';
import { searchHimachalPlaces } from '@/services/geocoding';
import { colors } from '@/theme/colors';

// Shown once per install. Saved here once the person saves a number or chooses "Not now".
export const SUBSCRIBE_PROMPT_KEY = 'alerts.subscribePrompted';
const SEARCH_DELAY_MS = 500; // Nominatim allows about one request per second

/**
 * First-launch prompt: asks a new user for a mobile number and a place, so SMS landslide alerts can reach them
 * when the risk at that place is high. Shown after the welcome screen, and never again once answered.
 *
 * onDone: called when the prompt is saved, skipped, or was already answered before.
 */
export default function SubscribeScreen({ onDone }) {
    const [visible, setVisible] = useState(false);
    const [phone, setPhone] = useState('');
    // false: lives in the area (SMS optional, High and above). true: visiting, trip planning (app notifications, Critical only)
    const [visitor, setVisitor] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [place, setPlace] = useState(null);
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const doneRef = useRef(onDone);
    useEffect(() => {
        doneRef.current = onDone;
    }, [onDone]);

    // Only ask a person who has not answered before
    useEffect(() => {
        let cancelled = false;
        AsyncStorage.getItem(SUBSCRIBE_PROMPT_KEY)
            .then((value) => {
                if (cancelled) return;
                if (value === '1') doneRef.current?.();
                else setVisible(true);
            })
            .catch(() => {
                if (!cancelled) setVisible(true);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // Search for the place as the person types, after a short pause
    useEffect(() => {
        if (place || query.trim().length < 3) return undefined;
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                setResults(await searchHimachalPlaces(query.trim(), { signal: controller.signal }));
            } catch (e) {
                if (e.name !== 'AbortError') setResults([]);
            } finally {
                setSearching(false);
            }
        }, SEARCH_DELAY_MS);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, place]);

    // Typing: search only once there are 3+ letters; drop old results when the text gets shorter
    const changeQuery = (text) => {
        setQuery(text);
        if (text.trim().length < 3) setResults([]);
    };
    const choosePlace = (r) => {
        setPlace(r);
        setResults([]);
    };
    const clearPlace = () => {
        setPlace(null);
        setQuery('');
        setResults([]);
    };

    const finish = async () => {
        await AsyncStorage.setItem(SUBSCRIBE_PROMPT_KEY, '1').catch(() => {});
        setVisible(false);
        doneRef.current?.();
    };

    const save = async () => {
        setError(null);
        const digits = phone.replace(/\D/g, '');
        const mobile = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
        const wantSms = !visitor && digits.length > 0;
        if (wantSms && !/^[6-9]\d{9}$/.test(mobile)) {
            setError('Enter a 10-digit mobile number, for example 98765 43210, or leave it empty.');
            return;
        }
        if (!place) {
            setError('Search for your village or town and pick it from the list.');
            return;
        }
        setSaving(true);
        let pushed = false;
        let pushError = null;
        try {
            // App notifications for this phone, for the place chosen
            try {
                const token = await getPushToken();
                await pushAPI.register(token, place.lat, place.lon, place.name, visitor ? 80 : 60);
                pushed = true;
            } catch (e) {
                pushError = e.message;
            }
            if (wantSms) {
                await subscriberAPI.subscribe(`+91${mobile}`, place.lat, place.lon, place.name);
            } else if (!pushed) {
                throw new Error(pushError || (visitor
                    ? 'Allow notifications in your phone settings to get trip alerts.'
                    : 'Enter a mobile number, or allow notifications, to get alerts.'));
            }
            await finish();
        } catch (e) {
            setError(e.message || 'Could not save right now. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={finish}>
            <View style={styles.backdrop}>
                <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
                    <Text style={styles.title}>{visitor ? 'Trip alerts' : 'Landslide warnings near you'}</Text>
                    <Text style={styles.body}>
                        {visitor
                            ? 'Planning a trip to Himachal Pradesh? Choose the place you will visit. We send you a notification on this phone if the risk there becomes Critical. You only get these trip alerts; nothing else is sent.'
                            : 'Choose the village or town you live in. If the risk there becomes high, we send a warning to people in that area: a notification on this phone, and a text if you add your number. We use your number only for these alerts and never share it.'}
                    </Text>

                    <View style={styles.modeRow}>
                        <Pressable onPress={() => setVisitor(false)} style={[styles.mode, !visitor && styles.modeOn]}>
                            <Text style={[styles.modeText, !visitor && styles.modeTextOn]}>I live here</Text>
                        </Pressable>
                        <Pressable onPress={() => setVisitor(true)} style={[styles.mode, visitor && styles.modeOn]}>
                            <Text style={[styles.modeText, visitor && styles.modeTextOn]}>I am visiting</Text>
                        </Pressable>
                    </View>

                    {visitor ? null : (
                    <>
                    <Text style={styles.label}>Mobile number (optional, for SMS)</Text>
                    <View style={styles.phoneRow}>
                        <Text style={styles.prefix}>+91</Text>
                        <TextInput
                            value={phone}
                            onChangeText={(t) => setPhone(t.replace(/[^\d\s]/g, ''))}
                            keyboardType="phone-pad"
                            placeholder="98765 43210"
                            placeholderTextColor={colors.textMuted}
                            maxLength={12}
                            style={[styles.input, styles.phoneInput]}
                        />
                    </View>

                    </>
                    )}

                    <Text style={styles.label}>{visitor ? 'Place you will visit' : 'Your village or town (required)'}</Text>
                    {place ? (
                        <Pressable onPress={clearPlace} style={styles.chosen}>
                            <Text style={styles.chosenText} numberOfLines={1}>{place.name}</Text>
                            <Text style={styles.change}>Change</Text>
                        </Pressable>
                    ) : (
                        <>
                            <TextInput
                                value={query}
                                onChangeText={changeQuery}
                                placeholder="e.g. Shimla, Mandi"
                                placeholderTextColor={colors.textMuted}
                                autoCorrect={false}
                                style={styles.input}
                            />
                            {searching ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : null}
                            {results.map((r) => (
                                <Pressable key={r.id} onPress={() => choosePlace(r)} style={styles.result}>
                                    <Text style={styles.resultName}>{r.name}</Text>
                                    {r.region ? <Text style={styles.resultRegion}>{r.region}</Text> : null}
                                </Pressable>
                            ))}
                        </>
                    )}

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <Pressable onPress={save} disabled={saving} style={[styles.primary, saving && styles.disabled]}>
                        <Text style={styles.primaryText}>{saving ? 'Saving...' : 'Save and get alerts'}</Text>
                    </Pressable>
                    <Pressable onPress={finish} style={styles.secondary}>
                        <Text style={styles.secondaryText}>Not now</Text>
                    </Pressable>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
    sheet: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20 },
    title: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
    body: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 16 },
    label: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 4 },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        color: colors.text,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
    },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    modeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    mode: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    modeOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    modeText: { color: colors.text, fontSize: 13, fontWeight: '600' },
    modeTextOn: { color: '#0a0a0c' },
    prefix: { color: colors.text, fontSize: 15, fontWeight: '600' },
    phoneInput: { flex: 1 },
    spinner: { marginVertical: 8 },
    result: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    resultName: { color: colors.text, fontSize: 14 },
    resultRegion: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    chosen: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    chosenText: { color: colors.text, fontSize: 15, flexShrink: 1, marginRight: 8 },
    change: { color: colors.primary, fontSize: 13, fontWeight: '600' },
    error: { color: colors.text, fontSize: 13, marginTop: 10 },
    primary: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
    primaryText: { color: '#0a0a0c', fontSize: 15, fontWeight: '700' },
    disabled: { opacity: 0.6 },
    secondary: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
    secondaryText: { color: colors.textMuted, fontSize: 14 },
});
