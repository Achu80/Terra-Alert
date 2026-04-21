import { useWeather } from "../../context/WeatherContext"

const NAV = [
    { id: "home", icon: "⌂", label: "Home" },
    { id: "map", icon: "◎", label: "Map Explorer" },
    { id: "dashboard", icon: "▦", label: "Dashboard" },
    { id: "report", icon: "≡", label: "Risk Report" },
    { id: "history", icon: "⏱", label: "Historical" },
    { id: "sources", icon: "◈", label: "Data Sources" },
    { id: "settings", icon: "⚙", label: "Settings" },
]

export default function Sidebar({ active, onNav }) {
    const { theme } = useWeather()
    return (
        <aside className={`w-[72px] min-h-screen flex flex-col items-center py-5 sticky top-0 z-50 border-r ${theme.navBg} ${theme.navBorder} transition-all duration-[1500ms] flex-shrink-0 backdrop-blur-2xl`}>
            {/* Logo */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base mb-7 border ${theme.accentBg} ${theme.accentBorder}`}>
                ⚡
            </div>

            {/* Nav items */}
            <nav className="flex flex-col gap-1 flex-1">
                {NAV.map(item => {
                    const isActive = active === item.id
                    return (
                        <button
                            key={item.id}
                            onClick={() => onNav(item.id)}
                            title={item.label}
                            className={`w-12 h-12 rounded-xl text-lg flex items-center justify-center transition-all duration-200 border
                ${isActive
                                    ? `${theme.accentBg} ${theme.accentBorder} ${theme.accentText} shadow-lg ${theme.accentGlow}`
                                    : `bg-transparent border-transparent ${theme.textMuted} hover:bg-white/[0.06] hover:${theme.textSecond}`
                                }`}
                        >
                            {item.icon}
                        </button>
                    )
                })}
            </nav>

            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border ${theme.accentBg} ${theme.cardBorder} ${theme.textSecond} mt-auto`}>
                TA
            </div>
        </aside>
    )
}