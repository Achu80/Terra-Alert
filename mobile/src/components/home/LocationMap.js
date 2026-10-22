import LeafletMap from '@/components/map/LeafletMap';
import { HP_BOUNDS } from '@/constants/himachal';

// Whole state in view on first load
const HP_CENTER = {
    lat: (HP_BOUNDS.north + HP_BOUNDS.south) / 2,
    lon: (HP_BOUNDS.east + HP_BOUNDS.west) / 2,
};

/**
 * Map for choosing a point, kept inside Himachal Pradesh (mobile version of the web InteractiveMap)
 * onTouchChange lets the parent ScrollView stop scrolling while a finger is on the map
 */
export default function LocationMap({ selected, onPick, onTouchChange, height = 320 }) {
    return (
        <LeafletMap
            style={{ height }}
            center={selected ? { lat: selected.lat, lon: selected.lon } : HP_CENTER}
            zoom={selected ? 11 : 7}
            bounds={HP_BOUNDS}
            marker={selected ? { lat: selected.lat, lon: selected.lon, title: selected.name, subtitle: selected.region } : null}
            onPress={onPick}
            onTouchChange={onTouchChange}
        />
    );
}
