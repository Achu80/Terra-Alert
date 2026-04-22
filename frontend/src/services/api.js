/**
 * API Service - Centralized API calls
 * Integrates with both Flask backend and Supabase database
 */

import supabaseService from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const USE_SUPABASE_DIRECT = import.meta.env.VITE_USE_SUPABASE_DIRECT === 'true'

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || `API Error: ${response.status}`)
        }

        return data
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error)
        throw error
    }
}

/**
 * Prediction API
 */
export const predictionAPI = {
    /**
     * Get landslide prediction for a location
     */
    predict: async (lat, lon, options = {}) => {
        return fetchAPI('/predict', {
            method: 'POST',
            body: JSON.stringify({
                lat,
                lon,
                days_back: options.daysBack || 30,
                buffer: options.buffer || 1000,
                use_cache: options.useCache !== undefined ? options.useCache : false,
            }),
        })
    },

    /**
     * Get all Himachal Pradesh districts data
     */
    getDistricts: async (forceRefresh = false) => {
        const query = forceRefresh ? '?force_refresh=true' : ''
        return fetchAPI(`/districts/himachal${query}`)
    },

    /**
     * Get single district data
     */
    getDistrict: async (districtId) => {
        return fetchAPI(`/districts/${districtId}`)
    },
}

/**
 * GEE (Google Earth Engine) API
 */
export const geeAPI = {
    /**
     * Get raw GEE data
     */
    getData: async (lat, lon, startDate, endDate, buffer = 1000) => {
        return fetchAPI('/gee/data', {
            method: 'POST',
            body: JSON.stringify({ lat, lon, start_date: startDate, end_date: endDate, buffer }),
        })
    },

    /**
     * Get processed GEE data
     */
    getProcessedData: async (lat, lon, startDate, endDate, buffer = 1000) => {
        return fetchAPI('/gee/process', {
            method: 'POST',
            body: JSON.stringify({ lat, lon, start_date: startDate, end_date: endDate, buffer }),
        })
    },
}

/**
 * Stats and History API
 * Can use either backend API or direct Supabase access
 */
export const statsAPI = {
    /**
     * Get dashboard statistics
     */
    getStats: async () => {
        if (USE_SUPABASE_DIRECT && supabaseService.isSupabaseConfigured()) {
            try {
                return await supabaseService.stats.getDashboardStats()
            } catch (error) {
                console.warn('Supabase stats failed, falling back to API:', error)
            }
        }
        return fetchAPI('/stats')
    },

    /**
     * Get recent predictions
     */
    getPredictions: async (limit = 8) => {
        if (USE_SUPABASE_DIRECT && supabaseService.isSupabaseConfigured()) {
            try {
                const data = await supabaseService.history.getRecent(limit)
                return { predictions: data, count: data.length }
            } catch (error) {
                console.warn('Supabase predictions failed, falling back to API:', error)
            }
        }
        return fetchAPI(`/predictions?limit=${limit}`)
    },

    /**
     * Get alerts
     */
    getAlerts: async (limit = 10, level = null) => {
        if (USE_SUPABASE_DIRECT && supabaseService.isSupabaseConfigured()) {
            try {
                const data = await supabaseService.alerts.getRecent(limit, level)
                return { alerts: data, count: data.length }
            } catch (error) {
                console.warn('Supabase alerts failed, falling back to API:', error)
            }
        }
        const query = level ? `?limit=${limit}&level=${level}` : `?limit=${limit}`
        return fetchAPI(`/alerts${query}`)
    },

    /**
     * Get history for a district
     */
    getHistory: async (districtId, fromDate = null, toDate = null) => {
        if (USE_SUPABASE_DIRECT && supabaseService.isSupabaseConfigured()) {
            try {
                const data = await supabaseService.history.getForDistrict(districtId, fromDate, toDate)
                return { history: data, count: data.length }
            } catch (error) {
                console.warn('Supabase history failed, falling back to API:', error)
            }
        }
        let query = ''
        if (fromDate) query += `?from=${fromDate}`
        if (toDate) query += `${query ? '&' : '?'}to=${toDate}`
        return fetchAPI(`/history/${districtId}${query}`)
    },

    /**
     * Get 7-day trend
     */
    get7DayTrend: async () => {
        if (USE_SUPABASE_DIRECT && supabaseService.isSupabaseConfigured()) {
            try {
                return await supabaseService.history.get7DayTrend()
            } catch (error) {
                console.warn('Supabase trend failed, falling back to API:', error)
            }
        }
        return fetchAPI('/stats/trend')
    },
}

/**
 * Settings API
 */
export const settingsAPI = {
    /**
     * Get settings
     */
    get: async () => {
        return fetchAPI('/settings')
    },

    /**
     * Update settings
     */
    update: async (settings) => {
        return fetchAPI('/settings', {
            method: 'POST',
            body: JSON.stringify(settings),
        })
    },
}

/**
 * Health check
 */
export const healthCheck = async () => {
    return fetchAPI('/health')
}

/**
 * Real-time subscriptions (Supabase only)
 */
export const realtimeAPI = {
    /**
     * Subscribe to district updates
     */
    subscribeToDistricts: (callback) => {
        if (!supabaseService.isSupabaseConfigured()) {
            console.warn('Supabase not configured, real-time updates unavailable')
            return null
        }
        return supabaseService.districts.subscribe(callback)
    },

    /**
     * Subscribe to new alerts
     */
    subscribeToAlerts: (callback) => {
        if (!supabaseService.isSupabaseConfigured()) {
            console.warn('Supabase not configured, real-time alerts unavailable')
            return null
        }
        return supabaseService.alerts.subscribe(callback)
    },

    /**
     * Unsubscribe from a channel
     */
    unsubscribe: (subscription) => {
        if (subscription) {
            subscription.unsubscribe()
        }
    },
}

export default {
    prediction: predictionAPI,
    gee: geeAPI,
    stats: statsAPI,
    settings: settingsAPI,
    realtime: realtimeAPI,
    healthCheck,
    supabase: supabaseService,
}
