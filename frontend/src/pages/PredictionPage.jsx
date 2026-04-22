import { useState } from 'react'
import { useWeather } from '../context/WeatherContext'
import InteractiveMap from '../components/map/InteractiveMap'
import RiskHeatmap from '../components/map/RiskHeatmap'

// Bento Card Component
const BentoCard = ({ children, className = '', span = 1, tall = false }) => {
    const { theme } = useWeather()
    return (
        <div 
            className={`
                ${theme.cardBg} ${theme.cardBorder} 
                backdrop-blur-xl border rounded-2xl p-6
                transition-all duration-300 hover:border-violet-400/30
                ${span === 2 ? 'col-span-2' : 'col-span-1'}
                ${tall ? 'row-span-2' : 'row-span-1'}
                ${className}
            `}
        >
            {children}
        </div>
    )
}

// Section Label
const SectionLabel = ({ children, icon }) => {
    const { theme } = useWeather()
    return (
        <div className="flex items-center gap-2 mb-4">
            {icon && <span className="text-violet-400">{icon}</span>}
            <h3 className={`text-sm font-semibold tracking-wide uppercase ${theme.textSecond}`}>
                {children}
            </h3>
        </div>
    )
}

// Metric Display
const MetricCard = ({ label, value, unit, trend, color = 'violet' }) => {
    const { theme } = useWeather()
    const colorClasses = {
        violet: 'text-violet-400 bg-violet-400/10',
        emerald: 'text-emerald-400 bg-emerald-400/10',
        orange: 'text-orange-400 bg-orange-400/10',
        red: 'text-red-400 bg-red-400/10',
        blue: 'text-blue-400 bg-blue-400/10'
    }
    
    return (
        <div className={`p-4 rounded-xl ${colorClasses[color]} border border-${color}-400/20`}>
            <p className={`text-xs ${theme.textMuted} mb-1`}>{label}</p>
            <div className="flex items-baseline gap-2">
                <p className={`text-2xl font-bold ${colorClasses[color].split(' ')[0]}`}>
                    {value}
                </p>
                {unit && <span className={`text-sm ${theme.textMuted}`}>{unit}</span>}
            </div>
            {trend && (
                <p className={`text-xs mt-1 ${theme.textMuted}`}>{trend}</p>
            )}
        </div>
    )
}

// Location Selection Component
const LocationSelector = ({ onLocationSelect, loading }) => {
    const { theme } = useWeather()
    const [inputMethod, setInputMethod] = useState('map')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCoords, setSelectedCoords] = useState(null)

    const handleSearch = async () => {
        if (!searchQuery.trim()) return
        
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)},India&format=json&limit=1`
            )
            const data = await response.json()
            
            if (data && data.length > 0) {
                const { lat, lon, display_name } = data[0]
                const coords = { lat: parseFloat(lat), lon: parseFloat(lon), name: display_name }
                setSelectedCoords(coords)
            } else {
                alert('Location not found. Please try another search.')
            }
        } catch (error) {
            console.error('Geocoding error:', error)
            alert('Error finding location. Please try again.')
        }
    }

    const handleMapSelect = (coords) => {
        setSelectedCoords(coords)
    }

    const handleGetPrediction = () => {
        if (selectedCoords) {
            onLocationSelect(selectedCoords)
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Map - Takes 2 columns */}
            <BentoCard span={2} className="min-h-[500px]">
                <SectionLabel icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                }>
                    Select Location
                </SectionLabel>
                
                <div className="h-[calc(100%-3rem)] rounded-xl overflow-hidden border border-white/10">
                    <InteractiveMap 
                        onLocationSelect={handleMapSelect}
                        selectedLocation={selectedCoords}
                    />
                </div>
            </BentoCard>

            {/* Controls - Takes 1 column */}
            <div className="flex flex-col gap-4">
                <BentoCard>
                    <SectionLabel icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                    }>
                        Search Location
                    </SectionLabel>
                    
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Enter city name..."
                            className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${theme.cardBorder} ${theme.textPrimary} placeholder-white/40 focus:outline-none focus:border-violet-400 transition-colors text-sm`}
                            disabled={loading}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={loading || !searchQuery.trim()}
                            className="w-full px-4 py-3 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:bg-violet-500/50 text-white font-medium text-sm transition-colors"
                        >
                            Search
                        </button>
                    </div>
                </BentoCard>

                {selectedCoords && (
                    <BentoCard className="bg-violet-400/10 border-violet-400/30">
                        <div className="flex items-start gap-3 mb-4">
                            <svg className="flex-shrink-0 mt-1 text-violet-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-violet-400 mb-1">
                                    Selected Location
                                </p>
                                <p className={`text-xs ${theme.textSecond} truncate`}>
                                    {selectedCoords.name}
                                </p>
                                <p className={`text-xs ${theme.textMuted} mt-1`}>
                                    {selectedCoords.lat.toFixed(4)}, {selectedCoords.lon.toFixed(4)}
                                </p>
                            </div>
                        </div>
                        
                        <button
                            onClick={handleGetPrediction}
                            disabled={loading}
                            className="w-full px-4 py-3 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:bg-violet-500/50 text-white font-medium text-sm transition-colors"
                        >
                            {loading ? 'Analyzing...' : 'Get Risk Assessment'}
                        </button>
                    </BentoCard>
                )}
            </div>
        </div>
    )
}

// Loading Component
const PredictionLoading = () => {
    const { theme } = useWeather()
    const [stage, setStage] = useState(0)
    
    const stages = [
        'Fetching satellite data from Google Earth Engine...',
        'Processing terrain and rainfall data...',
        'Analyzing vegetation indices...',
        'Running XGBoost prediction model...',
        'Generating risk forecast...',
    ]

    useState(() => {
        const interval = setInterval(() => {
            setStage(prev => (prev + 1) % stages.length)
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
                <div className="w-16 h-16 border-4 border-violet-400/30 border-t-violet-400 rounded-full animate-spin mx-auto mb-6" />
                <p className={`text-lg font-semibold ${theme.textPrimary} mb-2`}>
                    Analyzing Landslide Risk
                </p>
                <p className={`text-sm ${theme.textSecond} mb-6`}>
                    {stages[stage]}
                </p>
                {/* <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${((stage + 1) / stages.length) * 100}%` }}
                    />
                </div> */}
            </div>
        </div>
    )
}

// Results Component with Bento Layout
const PredictionResults = ({ prediction, onNewPrediction }) => {
    const { theme } = useWeather()

    const getRiskColor = (score) => {
        if (score >= 80) return 'red'
        if (score >= 60) return 'orange'
        if (score >= 40) return 'orange'
        return 'emerald'
    }

    const getRiskLevel = (score) => {
        if (score >= 80) return 'CRITICAL'
        if (score >= 60) return 'HIGH'
        if (score >= 40) return 'MODERATE'
        return 'LOW'
    }

    const riskColor = getRiskColor(prediction.prediction.score)
    const riskLevel = getRiskLevel(prediction.prediction.score)

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-white">Risk Assessment</h2>
                    <p className={`text-sm ${theme.textMuted} mt-1`}>
                        {prediction.location.name || `${prediction.location.lat.toFixed(4)}, ${prediction.location.lon.toFixed(4)}`}
                    </p>
                </div>
                <button
                    onClick={onNewPrediction}
                    className={`px-4 py-2 rounded-xl text-sm font-medium ${theme.textSecond} hover:${theme.textPrimary} bg-white/5 hover:bg-white/10 transition-all flex items-center gap-2`}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    New Assessment
                </button>
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Main Risk Score - Large Card */}
                <BentoCard span={1} tall={true} className={`bg-${riskColor}-400/10 border-${riskColor}-400/30`}>
                    <SectionLabel>Risk Score</SectionLabel>
                    <div className="flex flex-col items-center justify-center h-[calc(100%-3rem)]">
                        <div className={`text-7xl font-bold text-${riskColor}-400 mb-4`}>
                            {prediction.prediction.score}
                        </div>
                        <div className={`px-6 py-2 rounded-full text-lg font-semibold bg-${riskColor}-400/20 text-${riskColor}-400`}>
                            {riskLevel} RISK
                        </div>
                        <p className={`text-sm ${theme.textMuted} mt-4`}>
                            Confidence: {(prediction.prediction.confidence * 100).toFixed(0)}%
                        </p>
                    </div>
                </BentoCard>

                {/* Key Metrics - 2 columns */}
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <MetricCard 
                        label="Elevation"
                        value={prediction.features.values[0]?.toFixed(0) || 0}
                        unit="m"
                        color="blue"
                    />
                    <MetricCard 
                        label="Slope Angle"
                        value={prediction.features.values[1]?.toFixed(1) || 0}
                        unit="°"
                        color="orange"
                    />
                    <MetricCard 
                        label="30-Day Rainfall"
                        value={prediction.features.values[9]?.toFixed(1) || 0}
                        unit="mm"
                        color="blue"
                    />
                    <MetricCard 
                        label="Vegetation (NDVI)"
                        value={prediction.features.values[3]?.toFixed(2) || 0}
                        color="emerald"
                    />
                </div>

                {/* Risk Heatmap */}
                <BentoCard span={2} className="min-h-[400px]">
                    <SectionLabel icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                    }>
                        Risk Heatmap
                    </SectionLabel>
                    <div className="h-[calc(100%-3rem)] rounded-xl overflow-hidden border border-white/10">
                        <RiskHeatmap 
                            location={{
                                lat: prediction.location.lat,
                                lon: prediction.location.lon,
                                name: prediction.location.name || `${prediction.location.lat.toFixed(4)}, ${prediction.location.lon.toFixed(4)}`
                            }}
                            riskScore={prediction.prediction.score}
                        />
                    </div>
                </BentoCard>

                {/* Recommendations */}
                <BentoCard>
                    <SectionLabel icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                    }>
                        Recommendations
                    </SectionLabel>
                    <div className="space-y-3">
                        {riskLevel === 'CRITICAL' && (
                            <>
                                <div className="flex gap-2 text-sm">
                                    <svg className="flex-shrink-0 text-red-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                                    </svg>
                                    <p className={theme.textSecond}>Evacuate if possible</p>
                                </div>
                                <div className="flex gap-2 text-sm">
                                    <svg className="flex-shrink-0 text-red-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                    </svg>
                                    <p className={theme.textSecond}>Contact authorities</p>
                                </div>
                            </>
                        )}
                        {riskLevel === 'HIGH' && (
                            <div className="flex gap-2 text-sm">
                                <svg className="flex-shrink-0 text-orange-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                                </svg>
                                <p className={theme.textSecond}>Monitor conditions closely</p>
                            </div>
                        )}
                        {riskLevel === 'MODERATE' && (
                            <div className="flex gap-2 text-sm">
                                <svg className="flex-shrink-0 text-yellow-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                <p className={theme.textSecond}>Stay vigilant</p>
                            </div>
                        )}
                        {riskLevel === 'LOW' && (
                            <div className="flex gap-2 text-sm">
                                <svg className="flex-shrink-0 text-emerald-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <p className={theme.textSecond}>Conditions are favorable</p>
                            </div>
                        )}
                    </div>
                </BentoCard>

            </div>

            {/* All Features Grid - Full Width Below */}
            <BentoCard className="mt-4">
                <SectionLabel icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                }>
                    Environmental Parameters
                </SectionLabel>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {prediction.features.names.slice(0, 10).map((name, index) => (
                        <div key={index} className="p-3 rounded-xl bg-white/5 border border-white/10">
                            <p className={`text-xs ${theme.textMuted} mb-1 capitalize`}>
                                {name.replace(/_/g, ' ')}
                            </p>
                            <p className={`text-base font-semibold ${theme.textPrimary}`}>
                                {typeof prediction.features.values[index] === 'number' 
                                    ? prediction.features.values[index].toFixed(2) 
                                    : prediction.features.values[index]}
                            </p>
                        </div>
                    ))}
                </div>
            </BentoCard>
        </div>
    )
}

// Main Component
export default function PredictionPage() {
    const [step, setStep] = useState('select')
    const [prediction, setPrediction] = useState(null)

    const handleLocationSelect = async (location) => {
        setStep('loading')

        try {
            const response = await fetch('http://localhost:5000/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lat: location.lat,
                    lon: location.lon,
                    days_back: 30,
                    buffer: 1000
                })
            })

            const data = await response.json()
            
            if (!response.ok) {
                console.error('Server error:', data)
                throw new Error(data.error || 'Prediction failed')
            }

            setPrediction({ ...data, location })
            setStep('results')
        } catch (err) {
            console.error('Prediction error:', err)
            setStep('select')
            alert(`Failed to get prediction: ${err.message}\n\nPlease check:\n1. Backend server is running\n2. GEE is authenticated\n3. Check backend console for errors`)
        }
    }

    const handleNewPrediction = () => {
        setStep('select')
        setPrediction(null)
    }

    return (
        <div className="page-enter">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">
                    Landslide Risk Prediction
                </h1>
                <p className="text-white/60 text-sm">
                    Real-time risk assessment powered by satellite data and machine learning
                </p>
            </div>

            {step === 'select' && (
                <LocationSelector 
                    onLocationSelect={handleLocationSelect}
                    loading={false}
                />
            )}

            {step === 'loading' && <PredictionLoading />}

            {step === 'results' && prediction && (
                <PredictionResults 
                    prediction={prediction}
                    onNewPrediction={handleNewPrediction}
                />
            )}
        </div>
    )
}
