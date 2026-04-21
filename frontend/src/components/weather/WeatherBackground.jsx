import { useEffect, useRef } from "react"
import { useWeather } from "../../context/WeatherContext"

function RainCanvas({ count }) {
    const ref = useRef(null)
    const anim = useRef(null)
    const drops = useRef([])

    useEffect(() => {
        const canvas = ref.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener("resize", resize)

        drops.current = Array.from({ length: count }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            len: Math.random() * 16 + 8,
            spd: Math.random() * 7 + 8,
            op: Math.random() * 0.3 + 0.08,
            w: Math.random() * 0.7 + 0.3,
        }))

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            drops.current.forEach(d => {
                ctx.beginPath()
                ctx.moveTo(d.x, d.y)
                ctx.lineTo(d.x - d.len * 0.12, d.y + d.len)
                ctx.strokeStyle = `rgba(180,210,255,${d.op})`
                ctx.lineWidth = d.w
                ctx.stroke()
                d.y += d.spd
                d.x -= d.spd * 0.12
                if (d.y > canvas.height) { d.y = -d.len; d.x = Math.random() * canvas.width }
            })
            anim.current = requestAnimationFrame(draw)
        }
        draw()

        return () => {
            cancelAnimationFrame(anim.current)
            window.removeEventListener("resize", resize)
        }
    }, [count])

    return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-[1]" />
}

export default function WeatherBackground() {
    const { theme } = useWeather()
    const isStorm = theme.name === "storm"
    const isOver = theme.name === "overcast"
    const isCloudy = theme.name === "cloudy"
    const isSunny = theme.name === "sunny"

    return (
        <>
            {/* Sky gradient */}
            <div
                className="fixed inset-0 z-0 transition-all duration-[2000ms]"
                style={{ background: `linear-gradient(160deg, ${theme.skyFrom} 0%, ${theme.skyTo} 100%)` }}
            />

            {/* Storm clouds */}
            {(isStorm || isOver) && (
                <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                    <div
                        className="absolute -top-10 -left-24 w-[500px] h-[200px] rounded-full animate-cloud1"
                        style={{
                            background: isStorm
                                ? "radial-gradient(ellipse, rgba(40,15,80,0.85) 0%, transparent 70%)"
                                : "radial-gradient(ellipse, rgba(15,40,90,0.75) 0%, transparent 70%)",
                            filter: "blur(22px)"
                        }}
                    />
                    <div
                        className="absolute top-8 -left-40 w-[650px] h-[240px] rounded-full animate-cloud2"
                        style={{
                            background: isStorm
                                ? "radial-gradient(ellipse, rgba(28,8,60,0.8) 0%, transparent 70%)"
                                : "radial-gradient(ellipse, rgba(12,35,80,0.7) 0%, transparent 70%)",
                            filter: "blur(28px)"
                        }}
                    />
                    <div
                        className="absolute -top-6 right-0 w-[420px] h-[170px] rounded-full animate-cloud3"
                        style={{
                            background: isStorm
                                ? "radial-gradient(ellipse, rgba(50,18,88,0.75) 0%, transparent 70%)"
                                : "radial-gradient(ellipse, rgba(18,50,100,0.65) 0%, transparent 70%)",
                            filter: "blur(18px)"
                        }}
                    />
                    {isStorm && (
                        <div className="absolute inset-0 bg-violet-400/[0.04] animate-lightning" />
                    )}
                </div>
            )}

            {/* Cloudy */}
            {isCloudy && (
                <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                    <div
                        className="absolute top-4 -left-20 w-[380px] h-[140px] rounded-full animate-cloud1"
                        style={{ background: "radial-gradient(ellipse, rgba(80,100,130,0.45) 0%, transparent 70%)", filter: "blur(24px)" }}
                    />
                    <div
                        className="absolute top-12 -left-32 w-[320px] h-[110px] rounded-full animate-cloud2"
                        style={{ background: "radial-gradient(ellipse, rgba(65,85,115,0.35) 0%, transparent 70%)", filter: "blur(20px)" }}
                    />
                </div>
            )}

            {/* Sun glow */}
            {isSunny && (
                <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                    <div
                        className="absolute -top-20 -right-20 w-96 h-96 rounded-full"
                        style={{ background: "radial-gradient(circle, rgba(251,191,36,0.35) 0%, rgba(245,158,11,0.12) 45%, transparent 70%)" }}
                    />
                    <div
                        className="absolute -top-10 -right-10 w-64 h-64 rounded-full"
                        style={{ background: "radial-gradient(circle, rgba(253,230,100,0.55) 0%, transparent 60%)" }}
                    />
                </div>
            )}

            {/* Rain */}
            {theme.rain > 0 && <RainCanvas count={theme.rain} />}

            {/* Subtle vignette */}
            <div className="fixed inset-0 z-[2] pointer-events-none"
                style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.025) 0%, transparent 55%)" }}
            />
        </>
    )
}