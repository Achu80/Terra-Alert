/**
 * Helper Utility Functions
 */

import { RISK_THRESHOLDS, RISK_LEVELS, RISK_COLORS } from './constants'

/**
 * Get risk level from score
 */
export function getRiskLevel(score) {
    if (score >= RISK_THRESHOLDS.CRITICAL) return RISK_LEVELS.CRITICAL
    if (score >= RISK_THRESHOLDS.HIGH) return RISK_LEVELS.HIGH
    if (score >= RISK_THRESHOLDS.MODERATE) return RISK_LEVELS.MODERATE
    return RISK_LEVELS.LOW
}

/**
 * Get risk color classes from score or level
 */
export function getRiskColor(scoreOrLevel) {
    const level = typeof scoreOrLevel === 'number' 
        ? getRiskLevel(scoreOrLevel) 
        : scoreOrLevel
    
    return RISK_COLORS[level] || RISK_COLORS.LOW
}

/**
 * Format date to readable string
 */
export function formatDate(date, format = 'short') {
    const d = new Date(date)
    
    if (format === 'short') {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    
    if (format === 'long') {
        return d.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })
    }
    
    if (format === 'time') {
        return d.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })
    }
    
    return d.toLocaleDateString()
}

/**
 * Format confidence value (handles both decimal and percentage)
 */
export function formatConfidence(confidence) {
    if (confidence >= 1) {
        // Already a percentage
        return `${confidence.toFixed(0)}%`
    } else {
        // Decimal, convert to percentage
        return `${(confidence * 100).toFixed(0)}%`
    }
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLength = 50) {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
}

/**
 * Debounce function
 */
export function debounce(func, wait = 300) {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

/**
 * Throttle function
 */
export function throttle(func, limit = 300) {
    let inThrottle
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args)
            inThrottle = true
            setTimeout(() => inThrottle = false, limit)
        }
    }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371 // Earth's radius in km
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

function toRad(degrees) {
    return degrees * (Math.PI / 180)
}

/**
 * Format number with commas
 */
export function formatNumber(num, decimals = 0) {
    if (num === null || num === undefined) return '0'
    return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Clamp number between min and max
 */
export function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max)
}

/**
 * Generate unique ID
 */
export function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Check if value is empty
 */
export function isEmpty(value) {
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value.trim() === ''
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'object') return Object.keys(value).length === 0
    return false
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj))
}

/**
 * Sleep/delay function
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get time ago string
 */
export function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000)
    
    let interval = seconds / 31536000
    if (interval > 1) return Math.floor(interval) + ' years ago'
    
    interval = seconds / 2592000
    if (interval > 1) return Math.floor(interval) + ' months ago'
    
    interval = seconds / 86400
    if (interval > 1) return Math.floor(interval) + ' days ago'
    
    interval = seconds / 3600
    if (interval > 1) return Math.floor(interval) + ' hours ago'
    
    interval = seconds / 60
    if (interval > 1) return Math.floor(interval) + ' minutes ago'
    
    return Math.floor(seconds) + ' seconds ago'
}

export default {
    getRiskLevel,
    getRiskColor,
    formatDate,
    formatConfidence,
    truncate,
    debounce,
    throttle,
    calculateDistance,
    formatNumber,
    clamp,
    generateId,
    isEmpty,
    deepClone,
    sleep,
    timeAgo,
}
