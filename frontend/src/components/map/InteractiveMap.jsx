import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

// Fix for default marker icons in React-Leaflet
// This is necessary because Webpack doesn't automatically include marker images
if (typeof window !== 'undefined') {
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    })
}

// Custom marker icon for selected location
const selectedIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }) {
    const [position, setPosition] = useState(null)

    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng
            setPosition([lat, lng])
            onLocationSelect({
                lat: lat,
                lon: lng,
                name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
            })
        },
    })

    return position === null ? null : (
        <Marker position={position} icon={selectedIcon}>
            <Popup>
                <div className="text-sm">
                    <p className="font-semibold mb-1">Selected Location</p>
                    <p className="text-xs text-gray-600">
                        Lat: {position[0].toFixed(4)}<br />
                        Lon: {position[1].toFixed(4)}
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                        Click "Get Prediction" to analyze
                    </p>
                </div>
            </Popup>
        </Marker>
    )
}

export default function InteractiveMap({ onLocationSelect, selectedLocation, className = '' }) {
    const mapRef = useRef(null)
    
    // Himachal Pradesh bounds
    const HP_BOUNDS = {
        north: 33.2,
        south: 30.4,
        east: 79.0,
        west: 75.6
    }
    
    // Center of Himachal Pradesh
    const defaultCenter = [31.1048, 77.1734] // Shimla
    const defaultZoom = 8

    useEffect(() => {
        // If a location is selected externally (e.g., from search), update map
        if (selectedLocation && mapRef.current) {
            mapRef.current.setView([selectedLocation.lat, selectedLocation.lon], 10)
        }
    }, [selectedLocation])

    return (
        <div className={`relative w-full h-full ${className}`} style={{ minHeight: '400px' }}>
            <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
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
                maxBounds={[
                    [HP_BOUNDS.south, HP_BOUNDS.west],
                    [HP_BOUNDS.north, HP_BOUNDS.east]
                ]}
                maxBoundsViscosity={1.0}
                minZoom={7}
            >
                {/* Base map tiles - OpenStreetMap */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                />

                {/* Click handler */}
                <MapClickHandler onLocationSelect={onLocationSelect} />

                {/* Show marker if location is selected */}
                {selectedLocation && (
                    <Marker 
                        position={[selectedLocation.lat, selectedLocation.lon]}
                        icon={selectedIcon}
                    >
                        <Popup>
                            <div className="text-sm">
                                <p className="font-semibold mb-1">{selectedLocation.name}</p>
                                <p className="text-xs text-gray-600">
                                    Lat: {selectedLocation.lat.toFixed(4)}<br />
                                    Lon: {selectedLocation.lon.toFixed(4)}
                                </p>
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>

            {/* Map instructions overlay */}
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg z-[1000] pointer-events-none">
                <p className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    Click anywhere on the map
                </p>
                <p className="text-xs text-gray-600">
                    Select a location in Himachal Pradesh for landslide risk prediction
                </p>
            </div>
        </div>
    )
}
