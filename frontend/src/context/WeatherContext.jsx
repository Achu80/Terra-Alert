import { createContext, useContext, useState, useCallback } from "react"

export const THEMES = {
    storm: {
        name: "storm",
        label: "Storm",
        skyFrom: "#0a0618",
        skyTo: "#1c0f3f",
        accent: "violet",
        accentHex: "#8b5cf6",
        accentBg: "bg-violet-500/20",
        accentBorder: "border-violet-500/30",
        accentText: "text-violet-400",
        accentBtn: "bg-violet-600 hover:bg-violet-700",
        accentGlow: "shadow-violet-500/30",
        navBg: "bg-[#0a0618]/80",
        navBorder: "border-violet-900/40",
        textPrimary: "text-violet-50",
        textSecond: "text-violet-200/70",
        textMuted: "text-violet-300/40",
        cardBorder: "border-white/[0.09]",
        divider: "border-white/[0.06]",
        chartColor: "#a78bfa",
        rain: 220,
        lightning: true,
        clouds: "storm",
    },
    overcast: {
        name: "overcast",
        label: "Overcast",
        skyFrom: "#0d1829",
        skyTo: "#1a3555",
        accent: "blue",
        accentHex: "#3b82f6",
        accentBg: "bg-blue-500/20",
        accentBorder: "border-blue-500/30",
        accentText: "text-blue-400",
        accentBtn: "bg-blue-600 hover:bg-blue-700",
        accentGlow: "shadow-blue-500/30",
        navBg: "bg-[#0d1829]/85",
        navBorder: "border-blue-900/40",
        textPrimary: "text-blue-50",
        textSecond: "text-blue-200/70",
        textMuted: "text-blue-300/40",
        cardBorder: "border-blue-200/[0.09]",
        divider: "border-blue-200/[0.06]",
        chartColor: "#60a5fa",
        rain: 90,
        lightning: false,
        clouds: "overcast",
    },
    cloudy: {
        name: "cloudy",
        label: "Cloudy",
        skyFrom: "#1a2030",
        skyTo: "#263245",
        accent: "slate",
        accentHex: "#64748b",
        accentBg: "bg-slate-500/20",
        accentBorder: "border-slate-500/30",
        accentText: "text-slate-300",
        accentBtn: "bg-slate-600 hover:bg-slate-700",
        accentGlow: "shadow-slate-500/20",
        navBg: "bg-[#1a2030]/85",
        navBorder: "border-slate-700/40",
        textPrimary: "text-slate-100",
        textSecond: "text-slate-300/70",
        textMuted: "text-slate-400/50",
        cardBorder: "border-slate-300/[0.09]",
        divider: "border-slate-300/[0.06]",
        chartColor: "#94a3b8",
        rain: 0,
        lightning: false,
        clouds: "cloudy",
    },
    sunny: {
        name: "sunny",
        label: "Sunny",
        skyFrom: "#6b2d0a",
        skyTo: "#a8450d",
        accent: "amber",
        accentHex: "#f59e0b",
        accentBg: "bg-amber-500/20",
        accentBorder: "border-amber-500/30",
        accentText: "text-amber-400",
        accentBtn: "bg-amber-600 hover:bg-amber-700",
        accentGlow: "shadow-amber-500/30",
        navBg: "bg-[#3d1505]/80",
        navBorder: "border-amber-800/40",
        textPrimary: "text-amber-50",
        textSecond: "text-amber-200/75",
        textMuted: "text-amber-300/45",
        cardBorder: "border-amber-200/[0.12]",
        divider: "border-amber-200/[0.08]",
        chartColor: "#fbbf24",
        rain: 0,
        lightning: false,
        clouds: "none",
    },
}

export function deriveWeatherState(rainfall1d = 0, riskScore = 0) {
    if (rainfall1d > 50 || riskScore >= 80) return "storm"
    if (rainfall1d > 20 || riskScore >= 60) return "overcast"
    if (rainfall1d > 5 || riskScore >= 40) return "cloudy"
    return "sunny"
}

const WeatherContext = createContext(null)

export function WeatherProvider({ children }) {
    const [stateName, setStateName] = useState("storm")
    const theme = THEMES[stateName]

    const updateFromData = useCallback((rainfall1d, riskScore) => {
        setStateName(deriveWeatherState(rainfall1d, riskScore))
    }, [])

    return (
        <WeatherContext.Provider value={{ stateName, setStateName, theme, updateFromData, THEMES }}>
            {children}
        </WeatherContext.Provider>
    )
}

export function useWeather() {
    const ctx = useContext(WeatherContext)
    if (!ctx) throw new Error("useWeather must be inside WeatherProvider")
    return ctx
}