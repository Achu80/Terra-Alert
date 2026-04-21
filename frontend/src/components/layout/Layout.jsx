import WeatherBackground from "../weather/WeatherBackground"
import Sidebar from "./Sidebar"
import TopBar from "./TopBar"
import { useWeather } from "../../context/WeatherContext"

export default function Layout({ active, onNav, children }) {
    const { theme } = useWeather()
    return (
        <div className={`min-h-screen flex font-sans ${theme.textPrimary} transition-colors duration-[1500ms]`}>
            <WeatherBackground />
            <div className="relative z-10 flex w-full">
                <Sidebar active={active} onNav={onNav} />
                <div className="flex flex-col flex-1 min-w-0">
                    <TopBar active={active} />
                    <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    )
}