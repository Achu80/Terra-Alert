import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { HP_BOUNDS } from '@/constants/himachal';
import { colors } from '@/theme/colors';

// Whole state in view
const HP_REGION = {
    latitude: (HP_BOUNDS.north + HP_BOUNDS.south) / 2,
    longitude: (HP_BOUNDS.east + HP_BOUNDS.west) / 2,
    latitudeDelta: 3.2,
    longitudeDelta: 3.6,
};

const zoomedTo = (lat, lon) => ({ latitude: lat, longitude: lon, latitudeDelta: 0.4, longitudeDelta: 0.4 });

/**
 * Map for choosing a point, kept inside Himachal Pradesh (mobile version of the web InteractiveMap)
 * onTouchChange lets the parent ScrollView stop scrolling while a finger is on the map
 */
export default function LocationMap({ selected, onPick, onTouchChange, height = 320 }) {
    const mapRef = useRef(null);
    const lat = selected?.lat;
    const lon = selected?.lon;

    // Fly to the location whenever it changes (map tap, search or district pick)
    useEffect(() => {
        if (lat == null || lon == null) return;
        mapRef.current?.animateToRegion(zoomedTo(lat, lon), 500);
    }, [lat, lon]);

    const handleMapReady = () => {
        // Stop the camera panning outside the state (Google Maps provider, the Android default)
        mapRef.current?.setMapBoundaries(
            { latitude: HP_BOUNDS.north, longitude: HP_BOUNDS.east },
            { latitude: HP_BOUNDS.south, longitude: HP_BOUNDS.west }
        );
    };

    const handlePress = (e) => {
        // Tapping the existing marker also fires a map press - ignore it
        if (e.nativeEvent.action === 'marker-press') return;
        onPick(e.nativeEvent.coordinate);
    };

    return (
        <View
            style={[styles.wrap, { height }]}
            onTouchStart={() => onTouchChange?.(true)}
            onTouchEnd={() => onTouchChange?.(false)}
            onTouchCancel={() => onTouchChange?.(false)}
        >
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                initialRegion={lat != null ? zoomedTo(lat, lon) : HP_REGION}
                minZoomLevel={6}
                onMapReady={handleMapReady}
                onPress={handlePress}
                toolbarEnabled={false}
            >
                {selected ? (
                    <Marker
                        coordinate={{ latitude: selected.lat, longitude: selected.lon }}
                        title={selected.name}
                        description={selected.region}
                    />
                ) : null}
            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
});
