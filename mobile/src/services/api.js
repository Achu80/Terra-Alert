/**
 * API Service - mirrors frontend/src/services/api.js against the same Flask backend
 */

import { API_BASE_URL } from '@/config/env';

// Default limit for one request. Without it, a dead or slow backend leaves the app waiting forever.
const DEFAULT_TIMEOUT_MS = 30000;

async function fetchAPI(endpoint, { timeoutMs = DEFAULT_TIMEOUT_MS, ...options } = {}) {
    // Abort the request when the time limit passes, so the screen can show an error instead of spinning
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
            signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `API Error: ${response.status}`);
        }

        return data;
    } catch (error) {
        if (error.name === 'AbortError') {
            error = new Error('The server took too long to answer. Check that the backend is running and try again.');
        }
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

const post = (endpoint, body, timeoutMs) =>
    fetchAPI(endpoint, { method: 'POST', body: JSON.stringify(body), timeoutMs });

export const predictionAPI = {
    // A prediction downloads fresh satellite data for the place, so it can take a minute or more
    predict: (lat, lon, options = {}) =>
        post('/predict', {
            lat,
            lon,
            days_back: options.daysBack || 30,
            buffer: options.buffer || 1000,
            use_cache: options.useCache !== undefined ? options.useCache : false,
        }, 180000),

    getDistricts: (forceRefresh = false) =>
        fetchAPI(`/districts/himachal${forceRefresh ? '?force_refresh=true' : ''}`),

    getDistrict: (districtId) => fetchAPI(`/districts/${districtId}`),
};

export const forecastAPI = {
    // Rainfall-forecast-driven risk for the next `days` days (up to 30). notify=false: viewing a forecast never sends SMS alerts
    predict: (lat, lon, days = 7) => post('/forecast/predict', { lat, lon, days, notify: false }),
};

export const subscriberAPI = {
    // Saves a phone number for landslide SMS alerts near (lat, lon). The backend never returns the number.
    subscribe: (phone, lat, lon, name) => post('/subscribers', { phone, lat, lon, name }),
    unsubscribe: (phone) => post('/subscribers/unsubscribe', { phone }),
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

export const pushAPI = {
    // Registers this phone for app alerts near (lat, lon). The token is never shown or returned.
    // minScore: 60 = High and above (people who live there), 80 = Critical only (visitors)
    register: (token, lat, lon, name, minScore = 60) => post('/push/register', { token, lat, lon, name, min_score: minScore }),
    unregister: (token) => post('/push/unregister', { token }),
};
