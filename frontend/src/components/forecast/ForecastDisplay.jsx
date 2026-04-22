import { useWeather } from '../../context/WeatherContext'

// Try to import Recharts, fallback to CSS charts if not installed
let LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend;
try {
    const recharts = require('recharts');
    LineChart = recharts.LineChart;
    Line = recharts.Line;
    AreaChart = recharts.AreaChart;
    Area = recharts.Area;
    XAxis = recharts.XAxis;
    YAxis = recharts.YAxis;
    CartesianGrid = recharts.CartesianGrid;
    Tooltip = recharts.Tooltip;
    ResponsiveContainer = recharts.ResponsiveContainer;
    Legend = recharts.Legend;
} catch (e) {
    // Recharts not installed, will use CSS fallback
}

const RECHARTS_AVAILABLE = !!LineChart;

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload }) => {
    const { theme } = useWeather()
    
    if (active && payload && payload.length) {
        const data = payload[0].payload
        return (
            <div className={`${theme.cardBg} ${theme.cardBorder} backdrop-blur-xl border rounded-xl p-3 shadow-lg`}>
                <p className={`text-sm font-semibold ${theme.textPrimary} mb-1`}>{data.day}</p>
                <p className={`text-xs ${theme.textSecond}`}>
                    Risk Score: <span className="font-bold">{data.score.toFixed(1)}</span>
                </p>
                <p className={`text-xs ${theme.textMuted}`}>
                    Confidence: {data.confidence.toFixed(0)}%
                </p>
            </div>
        )
    }
    return null
}

// 7-Day Forecast Cards
export function SevenDayForecast({ forecast }) {
    const { theme } = useWeather()
    
    const getRiskColor = (level) => {
        if (level === 'CRITICAL') return { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', glow: 'shadow-red-500/20' }
        if (level === 'HIGH') return { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400', glow: 'shadow-orange-500/20' }
        if (level === 'MODERATE') return { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' }
        return { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' }
    }
    
    return (
        <div>
            <h4 className={`text-xs font-semibold ${theme.textSecond} mb-3 flex items-center gap-2`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
                </svg>
                Next 7 Days
            </h4>
            <div className="grid grid-cols-7 gap-2">
                {forecast.map((day, index) => {
                    const colors = getRiskColor(day.level)
                    return (
                        <div 
                            key={index} 
                            className={`p-3 rounded-xl border ${colors.bg} ${colors.border} ${colors.text} transition-all duration-300 hover:scale-105 hover:shadow-lg ${colors.glow} cursor-pointer`}
                        >
                            <p className="text-[10px] font-medium opacity-70 mb-1">{day.day.split(' ')[0]}</p>
                            <p className="text-[9px] opacity-60 mb-2">{day.day.split(' ')[1]}</p>
                            <p className="text-2xl font-bold mb-1">{day.score.toFixed(0)}</p>
                            <div className="flex items-center gap-1 text-[8px] opacity-60">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                    <polyline points="22 4 12 14.01 9 11.01"/>
                                </svg>
                                {day.confidence.toFixed(0)}%
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// Line Chart Component - Works for any number of days
export function FourteenDayTrend({ forecast }) {
    const { theme } = useWeather()
    
    // Dynamic title based on number of days
    const numDays = forecast.length
    const title = `${numDays}-Day Risk Trend`
    
    console.log('FourteenDayTrend - Forecast data:', forecast)
    console.log('FourteenDayTrend - Number of days:', numDays)
    
    if (RECHARTS_AVAILABLE) {
        // Use Recharts for beautiful chart
        const data = forecast.map(day => ({
            ...day,
            name: day.day.split(' ')[1] // Just the date number
        }))
        
        console.log('Using Recharts with data:', data)
        
        return (
            <div>
                <h4 className={`text-xs font-semibold ${theme.textSecond} mb-3 flex items-center gap-2`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    {title}
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data}>
                        <defs>
                            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#a78bfa" />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis 
                            dataKey="name" 
                            stroke="rgba(255,255,255,0.4)" 
                            style={{ fontSize: '10px' }}
                            interval={numDays > 14 ? 2 : 0}
                        />
                        <YAxis 
                            stroke="rgba(255,255,255,0.4)" 
                            style={{ fontSize: '10px' }}
                            domain={[0, 100]}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="url(#lineGradient)" 
                            strokeWidth={3}
                            dot={{ fill: '#8b5cf6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 7, fill: '#8b5cf6' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        )
    }
    
    console.log('Using SVG line chart fallback')
    
    // SVG Line Chart Fallback - Responsive
    const maxScore = 100
    const chartHeight = 200
    const padding = { top: 20, right: 20, bottom: 40, left: 50 }
    
    return (
        <div>
            <h4 className={`text-xs font-semibold ${theme.textSecond} mb-3 flex items-center gap-2`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                {title}
            </h4>
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                <div className="w-full" style={{ height: `${chartHeight}px` }}>
                    <svg 
                        width="100%" 
                        height="100%" 
                        viewBox="0 0 1000 200" 
                        preserveAspectRatio="none"
                        className="overflow-visible"
                    >
                        <defs>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3"/>
                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05"/>
                            </linearGradient>
                        </defs>
                        
                        {/* Calculate responsive dimensions */}
                        {(() => {
                            const graphWidth = 1000 - padding.left - padding.right
                            const graphHeight = chartHeight - padding.top - padding.bottom
                            
                            // Calculate points for the line
                            const points = forecast.map((day, index) => {
                                const x = padding.left + (index / (forecast.length - 1)) * graphWidth
                                const y = padding.top + graphHeight - (day.score / maxScore) * graphHeight
                                return { x, y, day }
                            })
                            
                            // Create SVG path
                            const linePath = points.map((point, index) => {
                                return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
                            }).join(' ')
                            
                            // Create area path (for gradient fill under line)
                            const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding.bottom} L ${padding.left} ${chartHeight - padding.bottom} Z`
                            
                            return (
                                <>
                                    {/* Grid lines */}
                                    {[0, 25, 50, 75, 100].map(value => {
                                        const y = padding.top + graphHeight - (value / maxScore) * graphHeight
                                        return (
                                            <g key={value}>
                                                <line 
                                                    x1={padding.left} 
                                                    y1={y} 
                                                    x2={1000 - padding.right} 
                                                    y2={y} 
                                                    stroke="rgba(255,255,255,0.1)" 
                                                    strokeDasharray="3,3"
                                                    vectorEffect="non-scaling-stroke"
                                                />
                                                <text 
                                                    x={padding.left - 10} 
                                                    y={y + 4} 
                                                    fill="rgba(255,255,255,0.4)" 
                                                    fontSize="10" 
                                                    textAnchor="end"
                                                >
                                                    {value}
                                                </text>
                                            </g>
                                        )
                                    })}
                                    
                                    {/* Area under line */}
                                    <path 
                                        d={areaPath} 
                                        fill="url(#areaGradient)"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                    
                                    {/* Line */}
                                    <path 
                                        d={linePath} 
                                        fill="none" 
                                        stroke="#8b5cf6" 
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                    
                                    {/* Data points */}
                                    {points.map((point, index) => {
                                        const showLabel = numDays <= 7 ? true : (numDays <= 14 ? index % 2 === 0 : index % 3 === 0)
                                        
                                        return (
                                            <g key={index}>
                                                {/* Point circle */}
                                                <circle 
                                                    cx={point.x} 
                                                    cy={point.y} 
                                                    r="5" 
                                                    fill="#8b5cf6"
                                                    stroke="#fff"
                                                    strokeWidth="2"
                                                    className="cursor-pointer hover:r-7 transition-all"
                                                    vectorEffect="non-scaling-stroke"
                                                >
                                                    <title>{point.day.day}: {point.day.score.toFixed(1)}</title>
                                                </circle>
                                                
                                                {/* X-axis labels */}
                                                {showLabel && (
                                                    <text 
                                                        x={point.x} 
                                                        y={chartHeight - padding.bottom + 20} 
                                                        fill="rgba(255,255,255,0.5)" 
                                                        fontSize="10" 
                                                        textAnchor="middle"
                                                    >
                                                        {point.day.day.split(' ')[1]}
                                                    </text>
                                                )}
                                            </g>
                                        )
                                    })}
                                </>
                            )
                        })()}
                    </svg>
                </div>
            </div>
        </div>
    )
}

// 30-Day Summary Stats
export function ThirtyDaySummary({ forecast }) {
    const { theme } = useWeather()
    
    const avgScore = (forecast.reduce((sum, d) => sum + d.score, 0) / forecast.length).toFixed(1)
    const peakDay = forecast.reduce((max, d) => d.score > max.score ? d : max)
    const trend = forecast[forecast.length - 1].score > forecast[0].score ? 'Rising' : 'Falling'
    const trendIcon = trend === 'Rising' ? '📈' : '📉'
    const trendColor = trend === 'Rising' ? 'text-red-400' : 'text-emerald-400'
    
    return (
        <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/30">
                <p className={`text-xs ${theme.textMuted} mb-1 flex items-center gap-1`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="20" x2="12" y2="10"/>
                        <line x1="18" y1="20" x2="18" y2="4"/>
                        <line x1="6" y1="20" x2="6" y2="16"/>
                    </svg>
                    30-Day Average
                </p>
                <p className={`text-3xl font-bold ${theme.textPrimary}`}>{avgScore}</p>
                <p className={`text-[10px] ${theme.textMuted} mt-1`}>Mean risk score</p>
            </div>
            
            <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30">
                <p className={`text-xs ${theme.textMuted} mb-1 flex items-center gap-1`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                    </svg>
                    Peak Risk Day
                </p>
                <p className={`text-lg font-bold ${theme.textPrimary}`}>{peakDay.day}</p>
                <p className={`text-sm ${theme.textSecond} mt-1`}>Score: {peakDay.score.toFixed(0)}</p>
            </div>
            
            <div className={`p-4 rounded-xl bg-gradient-to-br ${trend === 'Rising' ? 'from-red-500/10 to-orange-500/10 border-red-500/30' : 'from-emerald-500/10 to-green-500/10 border-emerald-500/30'} border`}>
                <p className={`text-xs ${theme.textMuted} mb-1 flex items-center gap-1`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    Trend Direction
                </p>
                <p className={`text-2xl font-bold ${trendColor}`}>{trendIcon} {trend}</p>
                <p className={`text-[10px] ${theme.textMuted} mt-1`}>
                    {trend === 'Rising' ? 'Risk increasing' : 'Risk decreasing'}
                </p>
            </div>
        </div>
    )
}

// 30-Day Full Chart (Recharts or CSS)
export function ThirtyDayChart({ forecast }) {
    const { theme } = useWeather()
    
    if (RECHARTS_AVAILABLE) {
        const data = forecast.map(day => ({
            ...day,
            name: day.day.split(' ')[1]
        }))
        
        return (
            <div className="mt-4">
                <h4 className={`text-xs font-semibold ${theme.textSecond} mb-3 flex items-center gap-2`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 3v18h18"/>
                        <path d="m19 9-5 5-4-4-3 3"/>
                    </svg>
                    30-Day Detailed Forecast
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis 
                            dataKey="name" 
                            stroke="rgba(255,255,255,0.4)" 
                            style={{ fontSize: '9px' }}
                            interval={2}
                        />
                        <YAxis 
                            stroke="rgba(255,255,255,0.4)" 
                            style={{ fontSize: '10px' }}
                            domain={[0, 100]}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#8b5cf6" 
                            strokeWidth={3}
                            dot={{ fill: '#8b5cf6', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        )
    }
    
    return null // Skip 30-day chart in CSS fallback to avoid clutter
}
