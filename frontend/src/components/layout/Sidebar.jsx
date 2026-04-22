import { Link } from 'react-router-dom'
import { useWeather } from "../../context/WeatherContext"

// SVG Icons as components
const HomeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
)

const MapIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
        <line x1="8" y1="2" x2="8" y2="18"></line>
        <line x1="16" y1="6" x2="16" y2="22"></line>
    </svg>
)

const DashboardIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
)

const ReportIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
)

const HistoryIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
)

const DataIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
    </svg>
)

const SettingsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2-5.2l-4.2 4.2m0 6l4.2 4.2"></path>
    </svg>
)

const NAV = [
    { id: "home", path: "/", icon: HomeIcon, label: "Home" },
    { id: "map", path: "/map", icon: MapIcon, label: "Map Explorer" },
    { id: "dashboard", path: "/dashboard", icon: DashboardIcon, label: "Dashboard" },
    { id: "report", path: "/report", icon: ReportIcon, label: "Risk Report" },
    { id: "history", path: "/history", icon: HistoryIcon, label: "Historical" },
    { id: "sources", path: "/sources", icon: DataIcon, label: "Data Sources" },
    { id: "settings", path: "/settings", icon: SettingsIcon, label: "Settings" },
]

export default function Sidebar({ active }) {
    const { theme } = useWeather()
    return (
        <aside className={`w-[72px] min-h-screen flex flex-col items-center py-5 sticky top-0 z-50 border-r ${theme.navBg} ${theme.navBorder} transition-all duration-[1500ms] flex-shrink-0 backdrop-blur-2xl`}>
            {/* Logo */}
            <Link to="/" className={`w-10 h-10 rounded-xl flex items-center justify-center text-base mb-7 border ${theme.accentBg} ${theme.accentBorder} font-bold`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
            </Link>

            {/* Nav items */}
            <nav className="flex flex-col gap-1 flex-1">
                {NAV.map(item => {
                    const isActive = active === item.id
                    const IconComponent = item.icon
                    return (
                        <Link
                            key={item.id}
                            to={item.path}
                            title={item.label}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 border
                ${isActive
                                    ? `${theme.accentBg} ${theme.accentBorder} ${theme.accentText} shadow-lg ${theme.accentGlow}`
                                    : `bg-transparent border-transparent ${theme.textMuted} hover:bg-white/[0.06] hover:${theme.textSecond}`
                                }`}
                        >
                            <IconComponent />
                        </Link>
                    )
                })}
            </nav>

            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border ${theme.accentBg} ${theme.cardBorder} ${theme.textSecond} mt-auto`}>
                GS
            </div>
        </aside>
    )
}