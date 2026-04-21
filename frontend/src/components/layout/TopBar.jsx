import { useWeather, THEMES } from "../../context/WeatherContext"
import { StalenessIndicator } from "../ui/UIKit"

const PAGE_TITLES = {
    home: "Overview", map: "Map Explorer", dashboard: "Analysis Dashboard",
    report: "Risk Report", history: "Historical View", sources: "Data Sources", settings: "Settings",
}
const ICONS = { storm: "⛈", overcast: "🌧", cloudy: "☁", sunny: "☀" }

export default function TopBar({ active }) {
    const { theme, stateName, setStateName } = useWeather()
    return (
        <header className={`h-[60px] flex-shrink-0 flex items-center justify-between px-6 sticky top-0 z-40 border-b ${theme.navBg} ${theme.navBorder} backdrop-blur-2xl transition-all duration-[1500ms]`}>
            <div>
                <h1 className={`text-base font-semibold leading-none ${theme.textPrimary}`}>{PAGE_TITLES[active]}</h1>
                <p className={`text-[11px] mt-0.5 ${theme.textMuted}`}>Maharashtra · 34 districts monitored</p>
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
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200
                ${stateName === ws.name ? `${theme.accentBg} ${theme.accentText}` : `bg-transparent ${theme.textMuted}`}`}
                        >
                            {ICONS[ws.name]}
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