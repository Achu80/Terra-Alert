/**
 * Geocoding Service - Location search and validation
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org'

// Himachal Pradesh bounds
export const HP_BOUNDS = {
    north: 33.2,
    south: 30.4,
    east: 79.0,
    west: 75.6,
}

/**
 * Check if coordinates are within Himachal Pradesh
 */
export function isWithinHP(lat, lon) {
    return (
        lat >= HP_BOUNDS.south &&
        lat <= HP_BOUNDS.north &&
        lon >= HP_BOUNDS.west &&
        lon <= HP_BOUNDS.east
    )
}

/**
 * Search for a location in Himachal Pradesh
 */
export async function searchLocation(query) {
    try {
        const response = await fetch(
            `${NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(query)},Himachal Pradesh,India&format=json&limit=5`
        )
        
        if (!response.ok) {
            throw new Error('Geocoding request failed')
        }
        
        const data = await response.json()
        
        // Filter results to only include locations within HP
        const validResults = data
            .map(result => ({
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                name: result.display_name,
                type: result.type,
                importance: result.importance,
            }))
            .filter(result => isWithinHP(result.lat, result.lon))
        
        return validResults
    } catch (error) {
        console.error('Geocoding error:', error)
        throw new Error('Failed to search location')
    }
}

/**
 * Reverse geocode coordinates to get location name
 */
export async function reverseGeocode(lat, lon) {
    try {
        const response = await fetch(
            `${NOMINATIM_BASE_URL}/reverse?lat=${lat}&lon=${lon}&format=json`
        )
        
        if (!response.ok) {
            throw new Error('Reverse geocoding request failed')
        }
        
        const data = await response.json()
        
        return {
            name: data.display_name,
            address: data.address,
        }
    } catch (error) {
        console.error('Reverse geocoding error:', error)
        return {
            name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
            address: null,
        }
    }
}

export default {
    searchLocation,
    reverseGeocode,
    isWithinHP,
    HP_BOUNDS,
}
