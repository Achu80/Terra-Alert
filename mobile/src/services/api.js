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
    // 7-day rainfall-driven risk forecast
    predict: (lat, lon) => post('/forecast/predict', { lat, lon }),
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
    update: (settings) => post('/settings', settings),
};

export const healthCheck = () => fetchAPI('/health');

export default { predictionAPI, forecastAPI, statsAPI, chatbotAPI, settingsAPI, healthCheck };
