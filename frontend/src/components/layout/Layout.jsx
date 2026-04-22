import { useLocation } from 'react-router-dom'
import WeatherBackground from "../weather/WeatherBackground"
import Sidebar from "./Sidebar"
import TopBar from "./TopBar"
import { useWeather } from "../../context/WeatherContext"

export default function Layout({ children }) {
    const { theme } = useWeather()
    const location = useLocation()
    
    // Map routes to page IDs
    const getActiveFromPath = (pathname) => {
        if (pathname === '/') return 'home'
        return pathname.slice(1) // Remove leading slash
    }
    
    const active = getActiveFromPath(location.pathname)
    
    return (
        <div className={`min-h-screen flex font-sans ${theme.textPrimary} transition-colors duration-[1500ms]`}>
            <WeatherBackground />
            <div className="relative z-10 flex w-full">
                {/* Fixed Sidebar */}
                <Sidebar active={active} />
                
                {/* Main content area with left margin for fixed sidebar */}
                <div className="flex flex-col flex-1 min-w-0 ml-[72px]">
                    {/* Fixed TopBar */}
                    <TopBar active={active} />
                    
                    {/* Scrollable main content */}
                    <main className="flex-1 p-8 overflow-y-auto overflow-x-hidden scroll-smooth">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    )
}