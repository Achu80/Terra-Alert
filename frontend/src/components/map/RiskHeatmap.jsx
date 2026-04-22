import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
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

// Custom Canvas Heatmap Layer Component
function CanvasHeatmapLayer({ points }) {
    const map = useMap()
    const canvasLayerRef = useRef(null)
    
    useEffect(() => {
        if (!map || !points || points.length === 0) return
        
        // Remove existing canvas layer
        if (canvasLayerRef.current) {
            map.removeLayer(canvasLayerRef.current)
        }
        
        // Create custom canvas layer
        const CanvasLayer = L.Layer.extend({
            onAdd: function(map) {
                this._map = map
                
                if (!this._canvas) {
                    this._initCanvas()
                }
                
                map.getPanes().overlayPane.appendChild(this._canvas)
                map.on('moveend', this._reset, this)
                map.on('zoom', this._reset, this)
                
                this._reset()
            },
            
            onRemove: function(map) {
                if (this._canvas) {
                    map.getPanes().overlayPane.removeChild(this._canvas)
                }
                map.off('moveend', this._reset, this)
                map.off('zoom', this._reset, this)
            },
            
            _initCanvas: function() {
                const canvas = L.DomUtil.create('canvas', 'leaflet-heatmap-layer')
                const size = this._map.getSize()
                canvas.width = size.x
                canvas.height = size.y
                canvas.style.position = 'absolute'
                canvas.style.pointerEvents = 'none'
                this._canvas = canvas
            },
            
            _reset: function() {
                const topLeft = this._map.containerPointToLayerPoint([0, 0])
                L.DomUtil.setPosition(this._canvas, topLeft)
                
                const size = this._map.getSize()
                this._canvas.width = size.x
                this._canvas.height = size.y
                
                this._draw()
            },
            
            _draw: function() {
                const ctx = this._canvas.getContext('2d')
                ctx.clearRect(0, 0, this._canvas.width, this._canvas.height)
                
                // Draw each point with radial gradient
                points.forEach(point => {
                    const pos = this._map.latLngToContainerPoint([point.lat, point.lon])
                    const radius = 80 // Radius in pixels
                    
                    // Create radial gradient
                    const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius)
                    
                    // Get color based on intensity
                    const color = this._getColorForIntensity(point.intensity)
                    
                    // Add gradient stops for smooth fade
                    gradient.addColorStop(0, color.replace('rgb', 'rgba').replace(')', `, ${point.intensity * 0.8})`))
                    gradient.addColorStop(0.5, color.replace('rgb', 'rgba').replace(')', `, ${point.intensity * 0.4})`))
                    gradient.addColorStop(1, color.replace('rgb', 'rgba').replace(')', ', 0)'))
                    
                    ctx.fillStyle = gradient
                    ctx.fillRect(pos.x - radius, pos.y - radius, radius * 2, radius * 2)
                })
                
                // Apply blur for smoother effect
                ctx.filter = 'blur(20px)'
                ctx.globalCompositeOperation = 'source-over'
            },
            
            _getColorForIntensity: function(intensity) {
                // Color gradient: blue → green → yellow → orange → red
                if (intensity < 0.2) {
                    return this._interpolateColor('rgb(30, 136, 229)', 'rgb(67, 160, 71)', intensity / 0.2)
                } else if (intensity < 0.4) {
                    return this._interpolateColor('rgb(67, 160, 71)', 'rgb(124, 179, 66)', (intensity - 0.2) / 0.2)
                } else if (intensity < 0.6) {
                    return this._interpolateColor('rgb(124, 179, 66)', 'rgb(253, 216, 53)', (intensity - 0.4) / 0.2)
                } else if (intensity < 0.8) {
                    return this._interpolateColor('rgb(253, 216, 53)', 'rgb(251, 140, 0)', (intensity - 0.6) / 0.2)
                } else {
                    return this._interpolateColor('rgb(251, 140, 0)', 'rgb(211, 47, 47)', (intensity - 0.8) / 0.2)
                }
            },
            
            _interpolateColor: function(color1, color2, factor) {
                const c1 = color1.match(/\d+/g).map(Number)
                const c2 = color2.match(/\d+/g).map(Number)
                const r = Math.round(c1[0] + factor * (c2[0] - c1[0]))
                const g = Math.round(c1[1] + factor * (c2[1] - c1[1]))
                const b = Math.round(c1[2] + factor * (c2[2] - c1[2]))
                return `rgb(${r}, ${g}, ${b})`
            }
        })
        
        canvasLayerRef.current = new CanvasLayer()
        canvasLayerRef.current.addTo(map)
        
        return () => {
            if (canvasLayerRef.current) {
                map.removeLayer(canvasLayerRef.current)
            }
        }
    }, [map, points])
    
    return null
}

// Component to fit bounds
function FitBounds({ center }) {
    const map = useMap()
    
    useEffect(() => {
        if (center) {
            map.setView([center.lat, center.lon], 11)
        }
    }, [center, map])
    
    return null
}

export default function RiskHeatmap({ location, riskScore, className = '' }) {
    const mapRef = useRef(null)
    
    // Generate heatmap points around the epicenter with smooth distribution
    const generateHeatmapPoints = (lat, lon, score) => {
        const points = []
        const numRings = 5        // Number of concentric rings
        const pointsPerRing = 12  // Points per ring
        
        // Normalize score to 0-1 range for intensity
        const baseIntensity = score / 100
        
        // Add epicenter with highest intensity
        points.push({
            lat: lat,
            lon: lon,
            intensity: baseIntensity
        })
        
        // Generate points in concentric rings with less aggressive decay
        for (let ring = 1; ring <= numRings; ring++) {
            const ringRadius = ring * 0.03 // Degrees (roughly 3km per ring)
            // Use less aggressive decay: 0.85 instead of 0.7 to maintain high risk colors
            const ringIntensity = baseIntensity * Math.pow(0.85, ring)
            
            for (let i = 0; i < pointsPerRing; i++) {
                const angle = (i * 360 / pointsPerRing) * (Math.PI / 180)
                
                // Add some randomness for natural look
                const radiusVariation = ringRadius * (0.8 + Math.random() * 0.4)
                const intensityVariation = ringIntensity * (0.85 + Math.random() * 0.3)
                
                const pointLat = lat + radiusVariation * Math.cos(angle)
                const pointLon = lon + radiusVariation * Math.sin(angle)
                
                points.push({
                    lat: pointLat,
                    lon: pointLon,
                    intensity: Math.max(0.1, Math.min(1.0, intensityVariation))
                })
            }
        }
        
        // Add additional scattered points for smoother gradient
        const scatterPoints = 30
        for (let i = 0; i < scatterPoints; i++) {
            const angle = Math.random() * 2 * Math.PI
            const distance = Math.random() * 0.15 // Up to ~15km
            // Maintain higher intensity for scattered points
            const intensity = baseIntensity * (0.5 + Math.random() * 0.4) * Math.pow(0.85, distance / 0.03)
            
            points.push({
                lat: lat + distance * Math.cos(angle),
                lon: lon + distance * Math.sin(angle),
                intensity: Math.max(0.1, Math.min(1.0, intensity))
            })
        }
        
        return points
    }
    
    const heatmapPoints = generateHeatmapPoints(location.lat, location.lon, riskScore)

    return (
        <div className={`relative w-full h-full ${className}`} style={{ minHeight: '400px' }}>
            <MapContainer
                center={[location.lat, location.lon]}
                zoom={11}
                style={{ 
                    height: '100%', 
                    width: '100%', 
                    minHeight: '400px',
                    zIndex: 0
                }}
                ref={mapRef}
                scrollWheelZoom={true}
                zoomControl={true}
            >
                {/* Base map - OpenStreetMap */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                />

                {/* Smooth gradient heatmap layer */}
                <CanvasHeatmapLayer points={heatmapPoints} />

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

                {/* Fit bounds to show heatmap */}
                <FitBounds center={location} />
            </MapContainer>

            {/* Legend with gradient */}
            <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg z-[1000]">
                <p className="text-xs font-semibold text-gray-800 mb-2">Risk Level</p>
                
                {/* Gradient bar */}
                <div className="mb-3">
                    <div 
                        className="h-6 rounded-md"
                        style={{
                            background: 'linear-gradient(to right, #1e88e5, #43a047, #fdd835, #fb8c00, #d32f2f)',
                            width: '150px'
                        }}
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                        <span>Low</span>
                        <span>High</span>
                    </div>
                </div>
                
                {/* Discrete levels */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#d32f2f' }}></div>
                        <span className="text-xs text-gray-700">Critical (80+)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#fb8c00' }}></div>
                        <span className="text-xs text-gray-700">High (60-80)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#fdd835' }}></div>
                        <span className="text-xs text-gray-700">Moderate (40-60)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#43a047' }}></div>
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
