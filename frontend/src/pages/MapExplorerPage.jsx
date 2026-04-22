import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { useWeather } from '../context/WeatherContext'
import { PageTransition, FadeInUp } from '../components/animations/PageTransition'
import { GlassCard, RiskBadge, FactorBar, SectionLabel, PrimaryButton, StalenessIndicator } from '../components/ui/UIKit'

// Himachal Pradesh bounds
const HP_BOUNDS = {
    center: [31.1048, 77.1734], // Shimla
    bounds: [[30.4, 75.6], [33.2, 79.0]],
    zoom: 8
}

const LEVEL_HEX = { 
    CRITICAL: '#ef4444', 
    HIGH: '#f97316', 
    MODERATE: '#eab308', 
    LOW: '#22c55e',
    UNKNOWN: '#6b7280',
    ERROR: '#9ca3af'
}

// Component to fit map bounds
function FitBounds() {
    const map = useMap()
    
    useEffect(() => {
        map.fitBounds(HP_BOUNDS.bounds, { padding: [50, 50] })
    }, [map])
    
    return null
}

export default function MapExplorerPage() {
    const { theme } = useWeather()
    const [districts, setDistricts] = useState([])
    const [selected, setSelected] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [lastUpdate, setLastUpdate] = useState(null)
    const [cacheAge, setCacheAge] = useState(null)
    const [isCached, setIsCached] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Fetch district data on mount
    useEffect(() => {
        fetchDistrictData()
    }, [])

    // Auto-refresh every 30 minutes
    useEffect(() => {
        const refreshInterval = setInterval(() => {
            console.log('⏰ Auto-refreshing district data (30 minutes elapsed)')
            fetchDistrictData(true) // Force refresh
        }, 30 * 60 * 1000) // 30 minutes in milliseconds

        return () => clearInterval(refreshInterval)
    }, [])

    // Update cache age display every minute
    useEffect(() => {
        if (!lastUpdate) return

        const updateAge = () => {
            const ageMinutes = Math.floor((new Date() - lastUpdate) / 60000)
            setCacheAge(ageMinutes)
        }

        updateAge() // Initial update
        const ageInterval = setInterval(updateAge, 60000) // Update every minute

        return () => clearInterval(ageInterval)
    }, [lastUpdate])

    const fetchDistrictData = async (forceRefresh = false) => {
        // Don't show full loading screen if we already have data (background refresh)
        const hasExistingData = districts.length > 0
        
        if (hasExistingData && forceRefresh) {
            setIsRefreshing(true)
        } else {
            setLoading(true)
        }
        
        setError(null)
        
        try {
            const url = forceRefresh 
                ? 'http://localhost:5000/api/districts/himachal?force_refresh=true'
                : 'http://localhost:5000/api/districts/himachal'
            
            const response = await fetch(url)
            const data = await response.json()
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch district data')
            }
            
            setDistricts(data.districts)
            setLastUpdate(new Date())
            setIsCached(data.cached || false)
            setCacheAge(data.cache_age_minutes || 0)
            
            // Auto-select first district
            if (data.districts.length > 0 && !selected) {
                setSelected(data.districts[0])
            }
            
            // Show cache info
            if (data.cached) {
                console.log(`✅ Loaded from cache (${data.cache_age_minutes} minutes old)`)
            } else {
                console.log(`✅ Fresh data loaded in ${data.fetch_time_seconds}s`)
            }
        } catch (err) {
            console.error('Error fetching district data:', err)
            setError(err.message)
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }

    const getMarkerSize = (score) => {
        if (score >= 80) return 20
        if (score >= 60) return 16
        if (score >= 40) return 14
        return 12
    }

    return (
        <PageTransition>
            <div className="flex gap-5" style={{ height: 'calc(100vh - 108px)' }}>
                {/* Map area - 65% */}
                <div className="flex-[0_0_65%] relative h-full">
                    <FadeInUp className="h-full">
                        <div className={`h-full rounded-2xl overflow-hidden border ${theme.cardBorder} relative`}>
                            {loading ? (
                                <div className="h-full flex items-center justify-center bg-gradient-to-br from-violet-900/20 to-purple-900/20">
                                    <div className="text-center max-w-md">
                                        <div className="w-16 h-16 border-4 border-violet-400/30 border-t-violet-400 rounded-full animate-spin mx-auto mb-4" />
                                        <p className={`text-sm ${theme.textSecond} mb-2`}>
                                            Fetching real-time data from satellites...
                                        </p>
                                        <p className={`text-xs ${theme.textMuted}`}>
                                            This may take 10-20 seconds on first load
                                        </p>
                                        <p className={`text-xs ${theme.textMuted} mt-2`}>
                                            Subsequent loads will be instant (cached)
                                        </p>
                                    </div>
                                </div>
                            ) : error ? (
                                <div className="h-full flex items-center justify-center bg-gradient-to-br from-red-900/20 to-orange-900/20">
                                    <div className="text-center max-w-md">
                                        <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <p className={`text-lg font-semibold ${theme.textPrimary} mb-2`}>Failed to Load Data</p>
                                        <p className={`text-sm ${theme.textMuted} mb-4`}>{error}</p>
                                        <button
                                            onClick={fetchDistrictData}
                                            className="px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-medium text-sm transition-colors"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full w-full relative bg-gray-900">
                                    <MapContainer
                                        center={HP_BOUNDS.center}
                                        zoom={HP_BOUNDS.zoom}
                                        style={{ height: '100%', width: '100%', minHeight: '600px', backgroundColor: '#1a1a2e' }}
                                        scrollWheelZoom={true}
                                        zoomControl={true}
                                        maxBounds={HP_BOUNDS.bounds}
                                        maxBoundsViscosity={1.0}
                                        minZoom={7}
                                    >
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            maxZoom={19}
                                            errorTileUrl="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />
                                        
                                        <FitBounds />
                                        
                                        {/* District markers */}
                                        {districts.map((district) => (
                                            <CircleMarker
                                                key={district.id}
                                                center={[district.lat, district.lon]}
                                                radius={getMarkerSize(district.score)}
                                                pathOptions={{
                                                    fillColor: LEVEL_HEX[district.level] || LEVEL_HEX.UNKNOWN,
                                                    fillOpacity: 0.7,
                                                    color: LEVEL_HEX[district.level] || LEVEL_HEX.UNKNOWN,
                                                    weight: selected?.id === district.id ? 4 : 2,
                                                    opacity: 1
                                                }}
                                                eventHandlers={{
                                                    click: () => setSelected(district)
                                                }}
                                            >
                                                <Popup>
                                                    <div className="text-sm">
                                                        <p className="font-semibold text-gray-800 mb-1">{district.name}</p>
                                                        <div className="space-y-1 text-xs text-gray-600">
                                                            <p>Risk Score: <span className="font-semibold">{district.score?.toFixed(1) || 'N/A'}</span></p>
                                                            <p>Level: <span className="font-semibold" style={{ color: LEVEL_HEX[district.level] }}>{district.level}</span></p>
                                                            {district.confidence !== undefined && (
                                                                <p>Confidence: {district.confidence >= 1 
                                                                    ? `${district.confidence.toFixed(0)}%` 
                                                                    : `${(district.confidence * 100).toFixed(0)}%`}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </CircleMarker>
                                        ))}
                                    </MapContainer>
                                </div>
                            )}
                            
                            {/* Controls overlay */}
                            {!loading && !error && (
                                <>
                                    <div className="absolute top-3 right-3 glass border px-3 py-2 rounded-xl backdrop-blur-md z-[1000]"
                                        style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                        <p className={`text-[10px] ${theme.textMuted} mb-0.5`}>
                                            {isCached ? 'Cached Data' : 'Live Data'}
                                        </p>
                                        <p className={`text-xs score-num font-semibold ${theme.textPrimary}`}>
                                            {lastUpdate?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        {cacheAge !== null && (
                                            <p className={`text-[9px] ${theme.textMuted} mt-0.5`}>
                                                {cacheAge < 30 
                                                    ? `Refreshes in ${30 - cacheAge} min`
                                                    : 'Refreshing...'}
                                            </p>
                                        )}
                                    </div>
                                    
                                    <div className="absolute bottom-3 left-3 z-[1000]">
                                        <StalenessIndicator minutesOld={cacheAge || 0} />
                                    </div>
                                    
                                    {/* Legend */}
                                    <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg z-[1000]">
                                        <p className="text-xs font-semibold text-gray-800 mb-2">Risk Level</p>
                                        <div className="space-y-1">
                                            {Object.entries(LEVEL_HEX).filter(([key]) => !['UNKNOWN', 'ERROR'].includes(key)).map(([lvl, clr]) => (
                                                <div key={lvl} className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ background: clr }} />
                                                    <span className="text-xs text-gray-700">{lvl}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Refresh button */}
                                    <button
                                        onClick={() => fetchDistrictData(true)}
                                        disabled={isRefreshing}
                                        className="absolute top-3 left-3 px-3 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:bg-violet-500/50 text-white text-xs font-medium transition-colors z-[1000] flex items-center gap-2"
                                    >
                                        <svg 
                                            width="14" 
                                            height="14" 
                                            viewBox="0 0 24 24" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            strokeWidth="2"
                                            className={isRefreshing ? 'animate-spin' : ''}
                                        >
                                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                                        </svg>
                                        {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                                    </button>
                                    
                                    {/* Background refresh indicator */}
                                    {isRefreshing && (
                                        <div className="absolute top-16 left-3 bg-violet-500/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg z-[1000] flex items-center gap-2">
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span className="text-xs text-white">Updating data...</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </FadeInUp>
                </div>

                {/* Side panel - 35% */}
                <div className="flex-[0_0_35%] overflow-y-auto flex flex-col gap-4">
                    {selected ? (
                        <FadeInUp key={selected.id}>
                            {/* Header card */}
                            <GlassCard>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h2 className={`text-xl font-bold ${theme.textPrimary}`}>{selected.name}</h2>
                                        <p className={`text-xs mt-0.5 ${theme.textMuted}`}>
                                            Himachal Pradesh · Live Data
                                        </p>
                                    </div>
                                    <RiskBadge level={selected.level} />
                                </div>

                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="text-5xl score-num font-extrabold leading-none"
                                        style={{ color: LEVEL_HEX[selected.level] }}>
                                        {selected.score?.toFixed(1) || 'N/A'}
                                    </span>
                                    <span className={`text-sm ${theme.textSecond}`}>/ 100</span>
                                </div>
                                <p className={`text-xs mb-4 ${theme.textMuted}`}>
                                    {selected.confidence !== undefined 
                                        ? (selected.confidence >= 1 
                                            ? `${selected.confidence.toFixed(0)}% confidence` 
                                            : `${(selected.confidence * 100).toFixed(0)}% confidence`)
                                        : 'Confidence N/A'}
                                </p>

                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        ['Elevation', selected.elevation ? `${selected.elevation.toFixed(0)}m` : 'N/A'],
                                        ['Slope', selected.slope ? `${selected.slope.toFixed(1)}°` : 'N/A'],
                                        ['Rainfall 30d', selected.rainfall_30d ? `${selected.rainfall_30d.toFixed(1)}mm` : 'N/A'],
                                        ['NDVI', selected.ndvi ? selected.ndvi.toFixed(2) : 'N/A'],
                                    ].map(([l, v]) => (
                                        <div key={l} className={`rounded-xl p-2.5 bg-white/[0.04] border ${theme.cardBorder}`}>
                                            <p className={`text-[10px] ${theme.textMuted} mb-0.5`}>{l}</p>
                                            <p className={`text-sm score-num font-semibold ${theme.textPrimary}`}>{v}</p>
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>

                            {/* Factor bars */}
                            {selected.rainfall_30d !== undefined && selected.slope !== undefined && (
                                <GlassCard>
                                    <SectionLabel>Environmental Factors</SectionLabel>
                                    <FactorBar 
                                        label="Rainfall (30 days)" 
                                        value={selected.rainfall_30d || 0} 
                                        max={300} 
                                        colorClass="bg-blue-400" 
                                    />
                                    <FactorBar 
                                        label="Slope steepness" 
                                        value={selected.slope || 0} 
                                        max={45} 
                                        colorClass="bg-red-400" 
                                    />
                                    <FactorBar 
                                        label="Vegetation (NDVI)" 
                                        value={(selected.ndvi || 0) * 100} 
                                        max={100} 
                                        colorClass="bg-emerald-400" 
                                    />
                                    <FactorBar 
                                        label="Water content (NDWI)" 
                                        value={(selected.ndwi || 0) * 100} 
                                        max={100} 
                                        colorClass="bg-cyan-400" 
                                    />
                                    <FactorBar 
                                        label="Elevation" 
                                        value={selected.elevation || 0} 
                                        max={5000} 
                                        colorClass="bg-violet-400" 
                                    />
                                </GlassCard>
                            )}

                            {/* Location info */}
                            <GlassCard>
                                <SectionLabel>Location Details</SectionLabel>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className={theme.textMuted}>Latitude</span>
                                        <span className={`${theme.textPrimary} font-mono`}>{selected.lat.toFixed(4)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className={theme.textMuted}>Longitude</span>
                                        <span className={`${theme.textPrimary} font-mono`}>{selected.lon.toFixed(4)}</span>
                                    </div>
                                    {selected.soil_type !== undefined && (
                                        <div className="flex justify-between">
                                            <span className={theme.textMuted}>Soil Type</span>
                                            <span className={theme.textPrimary}>{selected.soil_type}</span>
                                        </div>
                                    )}
                                </div>
                            </GlassCard>

                            <PrimaryButton 
                                className="w-full"
                                onClick={() => {
                                    // Navigate to prediction page with pre-filled coordinates
                                    window.location.href = `/?lat=${selected.lat}&lon=${selected.lon}`
                                }}
                            >
                                Get Detailed Prediction
                            </PrimaryButton>
                        </FadeInUp>
                    ) : (
                        <GlassCard>
                            <p className={`text-center py-8 ${theme.textMuted}`}>
                                {loading ? 'Loading districts...' : 'Click a district marker to view details'}
                            </p>
                        </GlassCard>
                    )}
                </div>
            </div>
        </PageTransition>
    )
}
