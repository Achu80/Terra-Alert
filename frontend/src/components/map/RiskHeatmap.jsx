import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

// Custom marker for epicenter
const epicenterIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

// Component to fit bounds
function FitBounds({ center, riskZones }) {
    const map = useMap()
    
    useEffect(() => {
        if (center && riskZones.length > 0) {
            const bounds = L.latLngBounds([center])
            riskZones.forEach(zone => {
                bounds.extend([zone.lat, zone.lon])
            })
            map.fitBounds(bounds, { padding: [50, 50] })
        }
    }, [center, riskZones, map])
    
    return null
}

export default function RiskHeatmap({ location, riskScore, className = '' }) {
    const mapRef = useRef(null)
    
    // Generate risk zones around the epicenter
    const generateRiskZones = (lat, lon, score) => {
        const zones = []
        const numZones = 8
        const baseRadius = 5000 // 5km base radius
        
        // Generate concentric circles with varying risk
        for (let i = 0; i < numZones; i++) {
            const angle = (i * 360) / numZones
            const distance = 0.05 + Math.random() * 0.15 // Random distance 0.05-0.2 degrees
            
            const zoneLat = lat + distance * Math.cos((angle * Math.PI) / 180)
            const zoneLon = lon + distance * Math.sin((angle * Math.PI) / 180)
            
            // Calculate risk based on distance from epicenter and base score
            const distanceFromCenter = Math.sqrt(
                Math.pow(zoneLat - lat, 2) + Math.pow(zoneLon - lon, 2)
            )
            const riskFactor = Math.max(0.3, 1 - distanceFromCenter * 5)
            const zoneRisk = Math.min(100, score * riskFactor + (Math.random() - 0.5) * 20)
            
            zones.push({
                lat: zoneLat,
                lon: zoneLon,
                risk: zoneRisk,
                radius: baseRadius * (0.5 + Math.random() * 0.5)
            })
        }
        
        return zones
    }
    
    const riskZones = generateRiskZones(location.lat, location.lon, riskScore)
    
    // Get color based on risk score
    const getRiskColor = (risk) => {
        if (risk >= 80) return '#ef4444' // red-500
        if (risk >= 60) return '#f97316' // orange-500
        if (risk >= 40) return '#eab308' // yellow-500
        return '#22c55e' // green-500
    }
    
    // Get opacity based on risk
    const getRiskOpacity = (risk) => {
        return 0.2 + (risk / 100) * 0.4 // 0.2 to 0.6
    }

    return (
        <div className={`relative w-full h-full ${className}`} style={{ minHeight: '400px' }}>
            <MapContainer
                center={[location.lat, location.lon]}
                zoom={10}
                style={{ 
                    height: '100%', 
                    width: '100%', 
                    minHeight: '400px',
                    borderRadius: '12px',
                    zIndex: 0
                }}
                ref={mapRef}
                scrollWheelZoom={true}
                zoomControl={true}
            >
                {/* Satellite/Terrain base map */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                />

                {/* Risk zones (heatmap circles) */}
                {riskZones.map((zone, index) => (
                    <Circle
                        key={index}
                        center={[zone.lat, zone.lon]}
                        radius={zone.radius}
                        pathOptions={{
                            fillColor: getRiskColor(zone.risk),
                            fillOpacity: getRiskOpacity(zone.risk),
                            color: getRiskColor(zone.risk),
                            weight: 1,
                            opacity: 0.6
                        }}
                    >
                        <Popup>
                            <div className="text-sm">
                                <p className="font-semibold mb-1">Risk Zone</p>
                                <p className="text-xs text-gray-600">
                                    Risk Score: {zone.risk.toFixed(1)}<br />
                                    Radius: {(zone.radius / 1000).toFixed(1)} km
                                </p>
                            </div>
                        </Popup>
                    </Circle>
                ))}

                {/* Main epicenter marker */}
                <Marker 
                    position={[location.lat, location.lon]}
                    icon={epicenterIcon}
                >
                    <Popup>
                        <div className="text-sm">
                            <p className="font-semibold mb-1 text-red-600">Landslide Epicenter</p>
                            <p className="text-xs text-gray-600 mb-2">
                                {location.name || `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`}
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded px-2 py-1">
                                <p className="text-xs font-semibold text-red-700">
                                    Risk Score: {riskScore.toFixed(1)}
                                </p>
                            </div>
                        </div>
                    </Popup>
                </Marker>

                {/* Fit bounds to show all zones */}
                <FitBounds center={[location.lat, location.lon]} riskZones={riskZones} />
            </MapContainer>

            {/* Legend */}
            <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg z-[1000]">
                <p className="text-xs font-semibold text-gray-800 mb-2">Risk Level</p>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-500"></div>
                        <span className="text-xs text-gray-700">Critical (80+)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                        <span className="text-xs text-gray-700">High (60-80)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                        <span className="text-xs text-gray-700">Moderate (40-60)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <span className="text-xs text-gray-700">Low (&lt;40)</span>
                    </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                        <svg width="12" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span className="text-xs text-gray-700">Epicenter</span>
                    </div>
                </div>
            </div>

            {/* Info overlay */}
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg z-[1000] pointer-events-none">
                <p className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    Risk Heatmap
                </p>
                <p className="text-xs text-gray-600">
                    Showing predicted risk zones around the location
                </p>
            </div>
        </div>
    )
}
