/**
 * Supabase Client Configuration
 * Provides direct database access from frontend
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false, // We're not using auth yet
    },
    db: {
        schema: 'public',
    },
    global: {
        headers: {
            'x-client-info': 'terraalert-frontend',
        },
    },
})

/**
 * Check if Supabase is configured
 */
export const isSupabaseConfigured = () => {
    return !!(supabaseUrl && supabaseAnonKey && 
              supabaseUrl !== 'https://your-project.supabase.co' &&
              supabaseAnonKey !== 'your-anon-key-here')
}

/**
 * Districts API - Direct database access
 */
export const districtsDB = {
    /**
     * Get all districts
     */
    getAll: async () => {
        const { data, error } = await supabase
            .from('districts')
            .select('*')
            .order('risk_score', { ascending: false })
        
        if (error) throw error
        return data
    },

    /**
     * Get single district by ID
     */
    getById: async (districtId) => {
        const { data, error } = await supabase
            .from('districts')
            .select('*')
            .eq('district_id', districtId)
            .single()
        
        if (error) throw error
        return data
    },

    /**
     * Get high-risk districts
     */
    getHighRisk: async () => {
        const { data, error } = await supabase
            .from('districts')
            .select('*')
            .in('risk_level', ['HIGH', 'CRITICAL'])
            .order('risk_score', { ascending: false })
        
        if (error) throw error
        return data
    },

    /**
     * Subscribe to district changes (real-time)
     */
    subscribe: (callback) => {
        const subscription = supabase
            .channel('districts-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'districts' },
                (payload) => callback(payload)
            )
            .subscribe()
        
        return subscription
    },
}

/**
 * Risk History API
 */
export const historyDB = {
    /**
     * Get history for a district
     */
    getForDistrict: async (districtId, fromDate = null, toDate = null) => {
        let query = supabase
            .from('risk_history')
            .select('*')
            .eq('district_id', districtId)
            .order('date', { ascending: false })
        
        if (fromDate) {
            query = query.gte('date', fromDate)
        }
        if (toDate) {
            query = query.lte('date', toDate)
        }
        
        const { data, error } = await query
        if (error) throw error
        return data
    },

    /**
     * Get recent predictions across all districts
     */
    getRecent: async (limit = 10) => {
        const { data, error } = await supabase
            .from('risk_history')
            .select('*, districts(name, district_id)')
            .order('created_at', { ascending: false })
            .limit(limit)
        
        if (error) throw error
        return data
    },

    /**
     * Get 7-day trend
     */
    get7DayTrend: async () => {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        
        const { data, error } = await supabase
            .from('risk_history')
            .select('date, risk_score')
            .gte('date', sevenDaysAgo.toISOString())
            .order('date', { ascending: true })
        
        if (error) throw error
        
        // Group by day and calculate average
        const dailyScores = {}
        data.forEach(item => {
            const day = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            if (!dailyScores[day]) {
                dailyScores[day] = []
            }
            dailyScores[day].push(item.risk_score)
        })
        
        return Object.entries(dailyScores).map(([date, scores]) => ({
            date,
            avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        }))
    },
}

/**
 * Alerts API
 */
export const alertsDB = {
    /**
     * Get recent alerts
     */
    getRecent: async (limit = 10, level = null) => {
        let query = supabase
            .from('alerts')
            .select('*, districts(name, district_id)')
            .order('created_at', { ascending: false })
            .limit(limit)
        
        if (level) {
            query = query.eq('level', level)
        }
        
        const { data, error } = await query
        if (error) throw error
        return data
    },

    /**
     * Get unacknowledged alerts
     */
    getUnacknowledged: async () => {
        const { data, error } = await supabase
            .from('alerts')
            .select('*, districts(name, district_id)')
            .eq('acknowledged', false)
            .order('created_at', { ascending: false })
        
        if (error) throw error
        return data
    },

    /**
     * Acknowledge an alert
     */
    acknowledge: async (alertId) => {
        const { data, error } = await supabase
            .from('alerts')
            .update({ acknowledged: true })
            .eq('id', alertId)
            .select()
        
        if (error) throw error
        return data[0]
    },

    /**
     * Subscribe to new alerts (real-time)
     */
    subscribe: (callback) => {
        const subscription = supabase
            .channel('alerts-changes')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'alerts' },
                (payload) => callback(payload.new)
            )
            .subscribe()
        
        return subscription
    },
}

/**
 * Stats API
 */
export const statsDB = {
    /**
     * Get dashboard statistics
     */
    getDashboardStats: async () => {
        const { data, error } = await supabase
            .from('dashboard_stats')
            .select('*')
            .single()
        
        if (error) throw error
        return data
    },

    /**
     * Get score distribution
     */
    getScoreDistribution: async () => {
        const { data, error } = await supabase
            .from('districts')
            .select('risk_score')
        
        if (error) throw error
        
        // Calculate distribution
        const ranges = {
            '0–20': 0,
            '21–40': 0,
            '41–60': 0,
            '61–80': 0,
            '81–100': 0,
        }
        
        data.forEach(d => {
            const score = d.risk_score
            if (score <= 20) ranges['0–20']++
            else if (score <= 40) ranges['21–40']++
            else if (score <= 60) ranges['41–60']++
            else if (score <= 80) ranges['61–80']++
            else ranges['81–100']++
        })
        
        return Object.entries(ranges).map(([range, count]) => ({ range, count }))
    },
}

/**
 * Settings API
 */
export const settingsDB = {
    /**
     * Get settings
     */
    get: async () => {
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .limit(1)
            .single()
        
        if (error) {
            // Return defaults if no settings exist
            return {
                thresholds: { critical: 80, high: 60, moderate: 40 },
                weights: { rf: 0.4, adaboost: 0.3, bagging: 0.3 },
                refresh_interval: 15,
                notifications: { email: false, digest: false, retrain: false },
            }
        }
        return data
    },

    /**
     * Update settings
     */
    update: async (settings) => {
        // Check if settings exist
        const { data: existing } = await supabase
            .from('settings')
            .select('id')
            .limit(1)
            .single()
        
        if (existing) {
            // Update existing
            const { data, error } = await supabase
                .from('settings')
                .update(settings)
                .eq('id', existing.id)
                .select()
            
            if (error) throw error
            return data[0]
        } else {
            // Create new
            const { data, error } = await supabase
                .from('settings')
                .insert(settings)
                .select()
            
            if (error) throw error
            return data[0]
        }
    },
}

/**
 * Prediction Cache API
 */
export const cacheDB = {
    /**
     * Get cached prediction
     */
    get: async (lat, lon, maxAgeHours = 2) => {
        const locationKey = `${lat.toFixed(4)}_${lon.toFixed(4)}`
        const maxAge = new Date()
        maxAge.setHours(maxAge.getHours() - maxAgeHours)
        
        const { data, error } = await supabase
            .from('prediction_cache')
            .select('*')
            .eq('location_key', locationKey)
            .gte('created_at', maxAge.toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
        
        if (error) return null
        return data
    },

    /**
     * Save prediction to cache
     */
    save: async (lat, lon, predictionData) => {
        const locationKey = `${lat.toFixed(4)}_${lon.toFixed(4)}`
        
        const { data, error } = await supabase
            .from('prediction_cache')
            .insert({
                location_key: locationKey,
                lat,
                lon,
                prediction_data: predictionData,
            })
            .select()
        
        if (error) throw error
        return data[0]
    },

    /**
     * Clear old cache entries
     */
    clearOld: async (daysOld = 7) => {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - daysOld)
        
        const { error } = await supabase
            .from('prediction_cache')
            .delete()
            .lt('created_at', cutoffDate.toISOString())
        
        if (error) throw error
    },
}

export default {
    supabase,
    isSupabaseConfigured,
    districts: districtsDB,
    history: historyDB,
    alerts: alertsDB,
    stats: statsDB,
    settings: settingsDB,
    cache: cacheDB,
}
