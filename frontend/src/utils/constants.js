/**
 * Application Constants
 */

// Risk Levels
export const RISK_LEVELS = {
    LOW: 'LOW',
    MODERATE: 'MODERATE',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL',
}

// Risk Level Thresholds
export const RISK_THRESHOLDS = {
    CRITICAL: 80,
    HIGH: 60,
    MODERATE: 40,
    LOW: 0,
}

// Risk Level Colors
export const RISK_COLORS = {
    CRITICAL: {
        bg: 'bg-red-500/20',
        border: 'border-red-500/50',
        text: 'text-red-400',
        solid: 'bg-red-500',
        hex: '#ef4444',
    },
    HIGH: {
        bg: 'bg-orange-500/20',
        border: 'border-orange-500/50',
        text: 'text-orange-400',
        solid: 'bg-orange-500',
        hex: '#f97316',
    },
    MODERATE: {
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/50',
        text: 'text-yellow-400',
        solid: 'bg-yellow-500',
        hex: '#eab308',
    },
    LOW: {
        bg: 'bg-emerald-500/20',
        border: 'border-emerald-500/50',
        text: 'text-emerald-400',
        solid: 'bg-emerald-500',
        hex: '#10b981',
    },
}

// Himachal Pradesh Districts
export const HP_DISTRICTS = [
    { id: 'shimla', name: 'Shimla', lat: 31.1048, lon: 77.1734 },
    { id: 'mandi', name: 'Mandi', lat: 31.7084, lon: 76.9318 },
    { id: 'kullu', name: 'Kullu', lat: 31.9578, lon: 77.1093 },
    { id: 'kangra', name: 'Kangra', lat: 32.0998, lon: 76.2691 },
    { id: 'chamba', name: 'Chamba', lat: 32.5562, lon: 76.1262 },
    { id: 'hamirpur', name: 'Hamirpur', lat: 31.6838, lon: 76.5178 },
    { id: 'una', name: 'Una', lat: 31.4685, lon: 76.2708 },
    { id: 'bilaspur', name: 'Bilaspur', lat: 31.3409, lon: 76.7568 },
    { id: 'solan', name: 'Solan', lat: 30.9045, lon: 77.0967 },
    { id: 'sirmaur', name: 'Sirmaur', lat: 30.5628, lon: 77.2839 },
    { id: 'kinnaur', name: 'Kinnaur', lat: 31.5830, lon: 78.3830 },
    { id: 'lahaul_spiti', name: 'Lahaul and Spiti', lat: 32.5667, lon: 77.1500 },
]

// Map Configuration
export const MAP_CONFIG = {
    HP_CENTER: [31.1048, 77.1734], // Shimla
    HP_BOUNDS: {
        north: 33.2,
        south: 30.4,
        east: 79.0,
        west: 75.6,
    },
    DEFAULT_ZOOM: 8,
    MIN_ZOOM: 7,
    MAX_ZOOM: 18,
    TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}

// Feature Names (for model input)
export const FEATURE_NAMES = [
    'elevation',
    'slope',
    'aspect',
    'ndvi',
    'ndwi',
    'soil_type',
    'rainfall_3d',
    'rainfall_7d',
    'rainfall_14d',
    'rainfall_30d',
    'rainfall_slope_interaction',
    'rainfall_ndvi_interaction',
    'high_rainfall_flag',
    'steep_slope_flag',
    'low_vegetation_flag',
    'elevation_slope_ratio',
    'rainfall_vegetation_ratio',
    'cumulative_rainfall_index',
    'terrain_vulnerability_index',
    'moisture_stress_index',
]

// Cache Configuration
export const CACHE_CONFIG = {
    DISTRICT_CACHE_DURATION: 30, // minutes
    PREDICTION_CACHE_DURATION: 120, // minutes (not used for individual predictions)
    AUTO_REFRESH_INTERVAL: 30, // minutes
}

// API Configuration
export const API_CONFIG = {
    BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
}

// Forecast Configuration
export const FORECAST_CONFIG = {
    DAYS_7: 7,
    DAYS_14: 14,
    DAYS_30: 30,
}

// Animation Durations (ms)
export const ANIMATION_DURATIONS = {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
}

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
}

export default {
    RISK_LEVELS,
    RISK_THRESHOLDS,
    RISK_COLORS,
    HP_DISTRICTS,
    MAP_CONFIG,
    FEATURE_NAMES,
    CACHE_CONFIG,
    API_CONFIG,
    FORECAST_CONFIG,
    ANIMATION_DURATIONS,
    BREAKPOINTS,
}
