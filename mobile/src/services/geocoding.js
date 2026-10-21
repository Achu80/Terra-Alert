/**
 * Place search restricted to Himachal Pradesh (OpenStreetMap Nominatim)
 */

import { HP_BOUNDS, HP_STATE_NAME, isWithinHP } from '@/constants/himachal';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

const HEADERS = {
    'Accept-Language': 'en',
    'User-Agent': 'TerraAlert-Mobile/1.0',
};

const regionOf = (address) =>
    [address?.state_district || address?.county, HP_STATE_NAME].filter(Boolean).join(', ');

export async function searchHimachalPlaces(query, { signal } = {}) {
    const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        addressdetails: '1',
        countrycodes: 'in',
        limit: '10',
        viewbox: `${HP_BOUNDS.west},${HP_BOUNDS.north},${HP_BOUNDS.east},${HP_BOUNDS.south}`,
        bounded: '1',
    });

    const response = await fetch(`${NOMINATIM_URL}/search?${params}`, { signal, headers: HEADERS });

    if (!response.ok) {
        throw new Error(`Search failed (${response.status})`);
    }

    const results = await response.json();

    return results
        .map((r) => ({
            id: `osm_${r.osm_type}_${r.osm_id}`,
            name: r.name || r.display_name.split(',')[0],
            region: regionOf(r.address),
            lat: parseFloat(r.lat),
            lon: parseFloat(r.lon),
            state: r.address?.state,
            type: 'place',
        }))
        .filter((r) => r.state === HP_STATE_NAME && isWithinHP(r.lat, r.lon));
}

// Name for a tapped map point; returns null when the point is outside Himachal Pradesh
export async function reverseGeocodeHP(lat, lon) {
    const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        format: 'jsonv2',
        addressdetails: '1',
        zoom: '14', // village/town level
    });

    const response = await fetch(`${NOMINATIM_URL}/reverse?${params}`, { headers: HEADERS });

    if (!response.ok) {
        throw new Error(`Reverse geocoding failed (${response.status})`);
    }

    const r = await response.json();
    const a = r.address;
    if (r.error || a?.state !== HP_STATE_NAME) return null;

    return {
        id: `pin_${lat.toFixed(5)}_${lon.toFixed(5)}`,
        name: a.village || a.town || a.city || a.hamlet || a.suburb || r.name || 'Selected point',
        region: regionOf(a),
        lat,
        lon,
        type: 'pin',
    };
}
