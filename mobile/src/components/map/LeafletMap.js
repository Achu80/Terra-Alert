import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildLeafletHtml } from '@/components/map/leafletHtml';
import { colors } from '@/theme/colors';

const call = (fn, arg) => `window.${fn} && window.${fn}(${JSON.stringify(arg ?? null)}); true;`;

/**
 * Leaflet + OpenStreetMap inside a WebView - the same map as the web app.
 * Needs no Google Maps API key, so it renders the same in Expo Go and in real builds.
 *
 * center { lat, lon } and zoom are only used for the first render.
 * marker { lat, lon, title, subtitle } and heat { lat, lon, score } can change at any time.
 * onPress({ latitude, longitude }) makes the map tappable.
 * onTouchChange(bool) lets a parent ScrollView pause scrolling while the map is being dragged.
 */
export default function LeafletMap({
    center,
    zoom = 8,
    bounds,
    marker = null,
    districts = [],
    selectedDistrictId = null,
    heat = null,
    flyZoom = 11,
    interactive = true,
    onPress,
    onDistrictPress,
    onTouchChange,
    style,
}) {
    const webRef = useRef(null);
    const readyRef = useRef(false);
    const latestRef = useRef({ marker, heat, districts, selectedDistrictId });
    const [error, setError] = useState(null);

    // Built once from the first props; later changes are pushed in, so the map never reloads
    const [html] = useState(() =>
        buildLeafletHtml({ center, zoom, bounds, marker, heat, districts, selectedDistrictId, interactive, tappable: !!onPress })
    );

    const run = useCallback((js) => {
        if (readyRef.current) webRef.current?.injectJavaScript(js);
    }, []);

    const mLat = marker?.lat;
    const mLon = marker?.lon;
    const mTitle = marker?.title;
    const mSubtitle = marker?.subtitle;
    useEffect(() => {
        const next = mLat == null ? null : { lat: mLat, lon: mLon, title: mTitle, subtitle: mSubtitle };
        latestRef.current.marker = next;
        run(call('setMarker', next));
        if (next) run(call('flyTo', { lat: mLat, lon: mLon, zoom: flyZoom }));
    }, [mLat, mLon, mTitle, mSubtitle, flyZoom, run]);

    useEffect(() => {
        latestRef.current.districts = districts;
        latestRef.current.selectedDistrictId = selectedDistrictId;
        run(call('setDistricts', { districts, selectedDistrictId }));
    }, [districts, selectedDistrictId, run]);

    const hLat = heat?.lat;
    const hLon = heat?.lon;
    const hScore = heat?.score;
    useEffect(() => {
        const next = hLat == null ? null : { lat: hLat, lon: hLon, score: hScore };
        latestRef.current.heat = next;
        run(call('setHeat', next));
    }, [hLat, hLon, hScore, run]);

    const handleMessage = (event) => {
        let msg;
        try {
            msg = JSON.parse(event.nativeEvent.data);
        } catch {
            return;
        }

        if (msg.type === 'ready') {
            readyRef.current = true;
            setError(null);
            // Catch up on anything that changed while the page was loading
            run(call('setMarker', latestRef.current.marker));
            run(call('setHeat', latestRef.current.heat));
            run(call('setDistricts', {
                districts: latestRef.current.districts,
                selectedDistrictId: latestRef.current.selectedDistrictId,
            }));
        } else if (msg.type === 'press') {
            onPress?.({ latitude: msg.lat, longitude: msg.lon });
        } else if (msg.type === 'districtPress') {
            onDistrictPress?.(msg.id);
        } else if (msg.type === 'error') {
            setError(msg.message);
        }
    };

    return (
        <View
            style={[styles.wrap, style]}
            onTouchStart={() => onTouchChange?.(true)}
            onTouchEnd={() => onTouchChange?.(false)}
            onTouchCancel={() => onTouchChange?.(false)}
        >
            <WebView
                ref={webRef}
                source={{ html, baseUrl: 'https://terra-alert.app/' }}
                originWhitelist={['*']}
                onMessage={handleMessage}
                onError={(e) => setError(e.nativeEvent.description || 'Map failed to load')}
                applicationNameForUserAgent="TerraAlert-Mobile/1.0"
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
                nestedScrollEnabled
                overScrollMode="never"
                setBuiltInZoomControls={false}
                style={styles.web}
            />
            {error ? (
                <View style={styles.errorBox} pointerEvents="none">
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
    web: { flex: 1, backgroundColor: colors.background },
    errorBox: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 16 },
    errorText: { color: colors.textMuted, textAlign: 'center' },
});
