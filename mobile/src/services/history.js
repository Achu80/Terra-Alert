/**
 * Prediction history straight from Supabase (risk_history table, written by the backend's /predict)
 */

import { supabase } from '@/services/supabase';
import { assignDistrict } from '@/utils/history';

const MAX_ROWS = 2000;

function friendlyError(error) {
    const message = error?.message ?? String(error);
    if (error?.code === 'PGRST205' || message.includes('Could not find the table')) {
        return "The risk_history table doesn't exist in Supabase yet. Run backend/database/supabase_schema_v2.sql in the Supabase SQL Editor.";
    }
    if (message.includes('Invalid API key')) {
        return 'Supabase rejected the API key. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env.';
    }
    return message;
}

/**
 * Predictions made since `since` (oldest first), each tagged with its HP district.
 * Returns [{ id, score, level, createdAt, name, lat, lon, district }]
 */
export async function fetchRiskHistory({ since }) {
    if (!supabase) {
        throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env.');
    }

    // Only the fields we need - the place name and coordinates live inside the `features` JSON
    const { data, error } = await supabase
        .from('risk_history')
        .select('id, risk_score, risk_level, created_at, location_name:features->>location_name, lat:features->>lat, lon:features->>lon')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true })
        .limit(MAX_ROWS);

    if (error) throw new Error(friendlyError(error));

    return data.map((row) => {
        const lat = parseFloat(row.lat);
        const lon = parseFloat(row.lon);
        return {
            id: row.id,
            score: Number(row.risk_score),
            level: row.risk_level,
            createdAt: new Date(row.created_at),
            name: row.location_name || `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
            lat,
            lon,
            district: assignDistrict(row.location_name, lat, lon),
        };
    });
}
