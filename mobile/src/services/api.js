/**
 * API Service - mirrors frontend/src/services/api.js against the same Flask backend
 */

import { API_BASE_URL } from '@/config/env';

async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `API Error: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
    }
}

const post = (endpoint, body) => fetchAPI(endpoint, { method: 'POST', body: JSON.stringify(body) });

export const predictionAPI = {
    predict: (lat, lon, options = {}) =>
        post('/predict', {
            lat,
            lon,
            days_back: options.daysBack || 30,
            buffer: options.buffer || 1000,
            use_cache: options.useCache !== undefined ? options.useCache : false,
        }),

    getDistricts: (forceRefresh = false) =>
        fetchAPI(`/districts/himachal${forceRefresh ? '?force_refresh=true' : ''}`),

    getDistrict: (districtId) => fetchAPI(`/districts/${districtId}`),
};

export const forecastAPI = {
    // Rainfall-forecast-driven risk for the next `days` days (up to 30). notify=false: viewing a forecast never sends SMS alerts
    predict: (lat, lon, days = 7) => post('/forecast/predict', { lat, lon, days, notify: false }),
};

export const statsAPI = {
    getStats: () => fetchAPI('/stats'),
    getPredictions: (limit = 8) => fetchAPI(`/predictions?limit=${limit}`),
    getAlerts: (limit = 10, level = null) =>
        fetchAPI(`/alerts?limit=${limit}${level ? `&level=${level}` : ''}`),
    getHistory: (districtId) => fetchAPI(`/history/${districtId}`),
};

export const chatbotAPI = {
    // context: { latitude, longitude, location_name, risk_score, risk_level }
    send: (message, sessionId = null, context = null) =>
        post('/chatbot', { message, session_id: sessionId, context }),
};

export const settingsAPI = {
    get: () => fetchAPI('/settings'),
    // Changing settings is admin-only; the backend checks the PIN header
    update: (settings, adminPin) =>
        fetchAPI('/settings', {
            method: 'POST',
            body: JSON.stringify(settings),
            headers: { 'Content-Type': 'application/json', 'X-Admin-Pin': adminPin ?? '' },
        }),
};

export const adminAPI = {
    // Resolves to true/false; throws on network errors or when too many wrong PINs were tried
    verify: (pin) => post('/admin/verify', { pin }).then((r) => r.valid === true),
    // Choose the landslide model everyone uses: resolves to { active, models }
    setModel: (version, pin) =>
        fetchAPI('/admin/model', {
            method: 'POST',
            body: JSON.stringify({ version }),
            headers: { 'Content-Type': 'application/json', 'X-Admin-Pin': pin ?? '' },
        }),
    // SMS alert setup: { sms: { package_installed, configured, enabled } }
    status: (pin) => fetchAPI('/admin/status', { headers: { 'Content-Type': 'application/json', 'X-Admin-Pin': pin ?? '' } }),
};

export const modelsAPI = {
    // { active: 'v2', models: [{ version, label, description, rain_source, veg_source, metrics, trained_at, active }] }
    list: () => fetchAPI('/models'),
};

export const healthCheck = () => fetchAPI('/health');

export default { predictionAPI, forecastAPI, statsAPI, chatbotAPI, settingsAPI, healthCheck };
