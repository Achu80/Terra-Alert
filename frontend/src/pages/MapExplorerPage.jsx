import { useState } from "react"
import { useWeather } from "../context/WeatherContext"
import { GlassCard, RiskBadge, FactorBar, ModelScorePill, SectionLabel, Divider, PrimaryButton, StalenessIndicator } from "../components/ui/UIKit"

const DISTRICTS = [
    { id: "nashik", name: "Nashik", score: 87, level: "CRITICAL", pop: "6.1M", rainfall: 241, slope: 34, confidence: 91, trigger: "Rainfall 241mm", alerts: 3, rf: 85, ada: 82, bag: 88, lat: 20.0, lng: 73.8 },
    { id: "pune", name: "Pune", score: 74, level: "HIGH", pop: "9.4M", rainfall: 142, slope: 28, confidence: 83, trigger: "Slope 28°", alerts: 1, rf: 72, ada: 70, bag: 76, lat: 18.5, lng: 73.9 },
    { id: "raigad", name: "Raigad", score: 68, level: "HIGH", pop: "2.6M", rainfall: 198, slope: 22, confidence: 78, trigger: "NDVI 0.12", alerts: 1, rf: 66, ada: 64, bag: 70, lat: 18.5, lng: 73.2 },
    { id: "satara", name: "Satara", score: 55, level: "MODERATE", pop: "3.0M", rainfall: 89, slope: 18, confidence: 72, trigger: "Rainfall 89mm", alerts: 0, rf: 53, ada: 50, bag: 58, lat: 17.7, lng: 74.0 },
    { id: "kolhapur", name: "Kolhapur", score: 48, level: "MODERATE", pop: "3.9M", rainfall: 62, slope: 15, confidence: 69, trigger: "Soil sat.", alerts: 0, rf: 46, ada: 44, bag: 52, lat: 16.7, lng: 74.2 },
    { id: "thane", name: "Thane", score: 38, level: "LOW", pop: "11M", rainfall: 34, slope: 10, confidence: 88, trigger: "Low rainfall", alerts: 0, rf: 36, ada: 35, bag: 40, lat: 19.2, lng: 72.9 },
    { id: "amravati", name: "Amravati", score: 22, level: "LOW", pop: "2.9M", rainfall: 12, slope: 7, confidence: 94, trigger: "Clear skies", alerts: 0, rf: 20, ada: 19, bag: 24, lat: 20.9, lng: 77.8 },
]

const LEVEL_HEX = { CRITICAL: "#f87171", HIGH: "#fb923c", MODERATE: "#fbbf24", LOW: "#34d399" }
const LAYERS = ["Risk Overlay", "Satellite", "Terrain"]

export default function MapExplorerPage() {
    const { theme } = useWeather()
    const [selected, setSelected] = useState(DISTRICTS[0])
    const [layer, setLayer] = useState("Risk Overlay")

    return (
        <div className="page-enter flex gap-5" style={{ height: "calc(100vh - 108px)" }}>

            {/* ── Map area 65% ── */}
            <div className={`flex-[0_0_65%] relative rounded-2xl overflow-hidden border ${theme.cardBorder}`}
                style={{ background: `linear-gradient(135deg, ${theme.skyFrom}ee, ${theme.skyTo}cc)` }}>

                {/* Grid overlay */}
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: `repeating-linear-gradient(0deg,rgba(255,255,255,.15) 0,rgba(255,255,255,.15) 1px,transparent 1px,transparent 60px),repeating-linear-gradient(90deg,rgba(255,255,255,.15) 0,rgba(255,255,255,.15) 1px,transparent 1px,transparent 60px)` }} />

                {/* District bubbles */}
                {DISTRICTS.map(d => {
                    const x = ((d.lng - 72) / 7) * 80 + 10
                    const y = ((21.5 - d.lat) / 6) * 80 + 10
                    const col = LEVEL_HEX[d.level]
                    const sz = d.score > 70 ? 52 : d.score > 50 ? 42 : 34
                    const sel = selected?.id === d.id
                    return (
                        <div key={d.id} onClick={() => setSelected(d)}
                            className="absolute cursor-pointer transition-all duration-200"
                            style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)" }}>
                            <div style={{
                                width: sz, height: sz, borderRadius: "50%",
                                background: `${col}28`, border: `2px solid ${col}`,
                                boxShadow: sel ? `0 0 0 4px ${col}40, 0 0 20px ${col}60` : `0 0 12px ${col}40`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transform: sel ? "scale(1.18)" : "scale(1)", transition: "all .2s ease",
                            }}>
                                <span className="score-num font-bold" style={{ fontSize: 10, color: col }}>{d.score}</span>
                            </div>
                            <p className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap text-[10px] font-medium px-1.5 py-0.5 rounded"
                                style={{ background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.7)" }}>
                                {d.name}
                            </p>
                        </div>
                    )
                })}

                {/* Layer toggles */}
                <div className="absolute top-3 left-3 flex gap-1.5">
                    {LAYERS.map(l => (
                        <button key={l} onClick={() => setLayer(l)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium backdrop-blur-md border transition-all duration-200
                ${layer === l ? `${theme.accentBg} ${theme.accentBorder} ${theme.accentText}` : `bg-black/40 border-white/10 ${theme.textSecond}`}`}>
                            {l}
                        </button>
                    ))}
                </div>

                {/* Date picker placeholder */}
                <div className="absolute top-3 right-3 glass border px-3 py-2 rounded-xl backdrop-blur-md"
                    style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                    <p className={`text-[10px] ${theme.textMuted} mb-0.5`}>Date</p>
                    <p className={`text-xs score-num font-semibold ${theme.textPrimary}`}>{new Date().toLocaleDateString("en-IN")}</p>
                </div>

                {/* Staleness */}
                <div className="absolute bottom-3 left-3">
                    <StalenessIndicator minutesOld={8} />
                </div>

                {/* Legend */}
                <div className="absolute bottom-3 right-3 flex flex-col gap-1">
                    {Object.entries(LEVEL_HEX).map(([lvl, clr]) => (
                        <div key={lvl} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: clr, boxShadow: `0 0 5px ${clr}` }} />
                            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>{lvl}</span>
                        </div>
                    ))}
                </div>

                {/* Map placeholder label */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-[11px] tracking-widest opacity-10 uppercase font-semibold">
                        Replace with Leaflet map
                    </p>
                </div>
            </div>

            {/* ── Side panel 35% ── */}
            <div className="flex-[0_0_35%] overflow-y-auto flex flex-col gap-4">
                {selected ? (
                    <>
                        {/* Header card */}
                        <GlassCard>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h2 className={`text-xl font-bold ${theme.textPrimary}`}>{selected.name}</h2>
                                    <p className={`text-xs mt-0.5 ${theme.textMuted}`}>Maharashtra · Updated 8m ago</p>
                                </div>
                                <RiskBadge level={selected.level} />
                            </div>

                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-5xl score-num font-extrabold leading-none"
                                    style={{ color: LEVEL_HEX[selected.level] }}>
                                    {selected.score}
                                </span>
                                <span className={`text-sm ${theme.textSecond}`}>/ 100</span>
                            </div>
                            <p className={`text-xs mb-4 ${theme.textMuted}`}>
                                {selected.confidence}% confidence · {selected.trigger}
                            </p>

                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    ["Population", selected.pop],
                                    ["Rainfall 24h", `${selected.rainfall}mm`],
                                    ["Max Slope", `${selected.slope}°`],
                                    ["Active Alerts", selected.alerts],
                                ].map(([l, v]) => (
                                    <div key={l} className={`rounded-xl p-2.5 bg-white/[0.04] border ${theme.cardBorder}`}>
                                        <p className={`text-[10px] ${theme.textMuted} mb-0.5`}>{l}</p>
                                        <p className={`text-sm score-num font-semibold ${theme.textPrimary}`}>{v}</p>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>

                        {/* Factor bars */}
                        <GlassCard>
                            <SectionLabel>Factor Breakdown</SectionLabel>
                            <FactorBar label="Rainfall intensity" value={selected.rainfall} max={300} colorClass="bg-blue-400" />
                            <FactorBar label="Slope steepness" value={selected.slope} max={45} colorClass="bg-red-400" />
                            <FactorBar label="NDVI (inverted)" value={32} max={100} colorClass="bg-emerald-400" />
                            <FactorBar label="Lithology risk" value={48} max={100} colorClass="bg-yellow-400" />
                            <FactorBar label="Population density" value={Math.round(selected.score * 0.7)} max={100} colorClass="bg-violet-400" />
                        </GlassCard>

                        {/* Model scores */}
                        <GlassCard>
                            <SectionLabel>Individual Model Scores</SectionLabel>
                            <div className="flex gap-2">
                                <ModelScorePill model="RF" score={selected.rf} />
                                <ModelScorePill model="AdaBoost" score={selected.ada} />
                                <ModelScorePill model="Bagging" score={selected.bag} />
                                <ModelScorePill model="Ensemble" score={selected.score} isEnsemble />
                            </div>
                        </GlassCard>

                        <PrimaryButton className="w-full">Export PDF Report</PrimaryButton>
                    </>
                ) : (
                    <GlassCard>
                        <p className={`text-center py-8 ${theme.textMuted}`}>Click a district to view analysis</p>
                    </GlassCard>
                )}
            </div>
        </div>
    )
}