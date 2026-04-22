import { useWeather, THEMES } from "../../context/WeatherContext"
import { StalenessIndicator } from "../ui/UIKit"

const PAGE_TITLES = {
    home: "Overview", map: "Map Explorer", dashboard: "Analytics Dashboard",
    report: "Risk Report", history: "Historical View", sources: "Data Sources", settings: "Settings",
}

const WeatherIcon = ({ type }) => {
    switch(type) {
        case 'storm':
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"></path>
                    <polyline points="13 11 9 17 15 17 11 23"></polyline>
                </svg>
            )
        case 'overcast':
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="2" x2="12" y2="6"></line>
                    <line x1="12" y1="18" x2="12" y2="22"></line>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                    <line x1="2" y1="12" x2="6" y2="12"></line>
                    <line x1="18" y1="12" x2="22" y2="12"></line>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                    <path d="M8 12h8"></path>
                </svg>
            )
        case 'cloudy':
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
                </svg>
            )
        case 'sunny':
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
            )
        default:
            return null
    }
}

export default function TopBar({ active }) {
    const { theme, stateName, setStateName } = useWeather()
    return (
        <header className={`h-[60px] flex-shrink-0 flex items-center justify-between px-6 sticky top-0 z-40 border-b ${theme.navBg} ${theme.navBorder} backdrop-blur-2xl transition-all duration-[1500ms]`}>
            <div>
                <h1 className={`text-base font-semibold leading-none ${theme.textPrimary}`}>{PAGE_TITLES[active]}</h1>
                <p className={`text-[11px] mt-0.5 ${theme.textMuted}`}>Himachal Pradesh · Real-time monitoring</p>
            </div>

            <div className="flex items-center gap-3">
                <StalenessIndicator minutesOld={8} />

                {/* Weather dev toggle */}
                <div className={`flex gap-1 p-1 rounded-xl border glass ${theme.cardBorder}`}>
                    {Object.values(THEMES).map(ws => (
                        <button
                            key={ws.name}
                            onClick={() => setStateName(ws.name)}
                            title={ws.label}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center
                ${stateName === ws.name ? `${theme.accentBg} ${theme.accentText}` : `bg-transparent ${theme.textMuted}`}`}
                        >
                            <WeatherIcon type={ws.name} />
                        </button>
                    ))}
                </div>

                <div className={`glass px-3 py-1.5 rounded-lg text-xs ${theme.textSecond} border ${theme.cardBorder}`}>
                    {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
            </div>
        </header>
    )
}