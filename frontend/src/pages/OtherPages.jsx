import { useState } from "react"
import { useWeather } from "../context/WeatherContext"
import { GlassCard, MetricCard, RiskBadge, SectionLabel, Divider, PrimaryButton, GhostButton, StatusDot, FactorBar } from "../components/ui/UIKit"

/* ════════════════════════════════════════════════
   RISK REPORT PAGE
═══════════════════════════════════════════════════ */
const ALL_DISTRICTS = [
    { id: "nashik", name: "Nashik", score: 87, level: "CRITICAL", pop: "6.1M", rainfall: 241, slope: 34, alerts: 3, conf: 91 },
    { id: "pune", name: "Pune", score: 74, level: "HIGH", pop: "9.4M", rainfall: 142, slope: 28, alerts: 1, conf: 83 },
    { id: "raigad", name: "Raigad", score: 68, level: "HIGH", pop: "2.6M", rainfall: 198, slope: 22, alerts: 1, conf: 78 },
    { id: "satara", name: "Satara", score: 55, level: "MODERATE", pop: "3.0M", rainfall: 89, slope: 18, alerts: 0, conf: 72 },
    { id: "kolhapur", name: "Kolhapur", score: 48, level: "MODERATE", pop: "3.9M", rainfall: 62, slope: 15, alerts: 0, conf: 69 },
    { id: "sindhudurg", name: "Sindhudurg", score: 44, level: "MODERATE", pop: "0.9M", rainfall: 55, slope: 20, alerts: 0, conf: 74 },
    { id: "thane", name: "Thane", score: 38, level: "LOW", pop: "11M", rainfall: 34, slope: 10, alerts: 0, conf: 88 },
    { id: "mumbai", name: "Mumbai", score: 30, level: "LOW", pop: "20.7M", rainfall: 28, slope: 5, alerts: 0, conf: 92 },
    { id: "amravati", name: "Amravati", score: 22, level: "LOW", pop: "2.9M", rainfall: 12, slope: 7, alerts: 0, conf: 94 },
    { id: "nagpur", name: "Nagpur", score: 18, level: "LOW", pop: "2.4M", rainfall: 8, slope: 4, alerts: 0, conf: 96 },
]
const SCORE_COLOR = s => s >= 80 ? "text-red-400" : s >= 60 ? "text-orange-400" : s >= 40 ? "text-yellow-400" : "text-emerald-400"

export function RiskReportPage({ onNavigate }) {
    const { theme } = useWeather()
    const [filter, setFilter] = useState("All")
    const [sortBy, setSortBy] = useState("score")
    const FILTERS = ["All", "Critical", "High", "Moderate", "Low"]
    const top3ids = [...ALL_DISTRICTS].sort((a, b) => b.score - a.score).slice(0, 3).map(d => d.id)

    const rows = ALL_DISTRICTS
        .filter(d => filter === "All" || d.level === filter.toUpperCase())
        .sort((a, b) => sortBy === "score" ? b.score - a.score : sortBy === "pop" ? parseFloat(b.pop) - parseFloat(a.pop) : b.rainfall - a.rainfall)

    return (
        <div className="page-enter flex flex-col gap-4">
            {/* Filter bar */}
            <GlassCard padding="p-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex gap-1.5">
                        {FILTERS.map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200
                  ${filter === f ? `${theme.accentBg} ${theme.accentBorder} ${theme.accentText}` : `bg-transparent ${theme.cardBorder} ${theme.textSecond}`}`}>
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs ${theme.textMuted}`}>Sort:</span>
                        {[["score", "Risk"], ["pop", "Population"], ["rainfall", "Rainfall"]].map(([k, l]) => (
                            <button key={k} onClick={() => setSortBy(k)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] border transition-all duration-200
                  ${sortBy === k ? `${theme.accentBg} ${theme.accentBorder} ${theme.accentText}` : `bg-transparent ${theme.cardBorder} ${theme.textMuted}`}`}>
                                {l}
                            </button>
                        ))}
                        <PrimaryButton className="px-3 py-1.5 text-xs">Export CSV</PrimaryButton>
                    </div>
                </div>
            </GlassCard>

            {/* Table */}
            <GlassCard padding="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className={`border-b ${theme.divider}`}>
                                {["#", "District", "Score", "Level", "Conf.", "Population", "Rainfall", "Slope", "Alerts"].map(h => (
                                    <th key={h} className={`text-left px-4 py-3 label-caps ${theme.textMuted}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((d, i) => {
                                const isPri = top3ids.includes(d.id)
                                return (
                                    <tr key={d.id} onClick={() => onNavigate("map")}
                                        className={`border-b cursor-pointer transition-all duration-150 ${theme.divider}
                      ${isPri ? theme.accentBg : ""} hover:bg-white/[0.05]`}>
                                        <td className={`px-4 py-3 score-num ${theme.textMuted}`}>{i + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-semibold ${theme.textPrimary}`}>{d.name}</span>
                                                {isPri && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${theme.accentBg} ${theme.accentText}`}>TOP</span>}
                                            </div>
                                        </td>
                                        <td className={`px-4 py-3 score-num font-bold ${SCORE_COLOR(d.score)}`}>{d.score}</td>
                                        <td className="px-4 py-3"><RiskBadge level={d.level} size="sm" /></td>
                                        <td className={`px-4 py-3 score-num ${theme.textSecond}`}>{d.conf}%</td>
                                        <td className={`px-4 py-3 ${theme.textSecond}`}>{d.pop}</td>
                                        <td className={`px-4 py-3 score-num ${theme.textSecond}`}>{d.rainfall}mm</td>
                                        <td className={`px-4 py-3 score-num ${theme.textSecond}`}>{d.slope}°</td>
                                        <td className={`px-4 py-3 score-num font-semibold ${d.alerts > 0 ? "text-red-400" : theme.textMuted}`}>{d.alerts}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    )
}

/* ════════════════════════════════════════════════
   HISTORICAL PAGE
═══════════════════════════════════════════════════ */
const HIST = Array.from({ length: 28 }, (_, i) => ({
    day: i + 1,
    score: Math.round(40 + Math.sin(i * 0.4) * 20 + Math.random() * 8),
    base: Math.round(35 + Math.sin(i * 0.3) * 10),
}))

export function HistoricalPage() {
    const { theme } = useWeather()
    const [range, setRange] = useState("1 Month")
    const W = 580, H = 160
    const toX = i => (i / (HIST.length - 1)) * W
    const toY = v => H - (v / 100) * H
    const line = HIST.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d.score)}`).join(" ")
    const bline = HIST.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d.base)}`).join(" ")

    return (
        <div className="page-enter flex flex-col gap-4">
            <GlassCard>
                <div className="flex justify-between items-center mb-4">
                    <SectionLabel>Regional Risk Index Trend</SectionLabel>
                    <div className="flex gap-1.5">
                        {["1 Month", "3 Months", "6 Months", "1 Year"].map(r => (
                            <button key={r} onClick={() => setRange(r)}
                                className={`px-3 py-1 rounded-lg text-[11px] border transition-all duration-200
                  ${range === r ? `${theme.accentBg} ${theme.accentBorder} ${theme.accentText}` : `bg-transparent ${theme.cardBorder} ${theme.textMuted}`}`}>
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
                <svg viewBox={`0 0 ${W} ${H + 28}`} className="w-full h-auto">
                    {[0, 25, 50, 75, 100].map(v => (
                        <g key={v}>
                            <line x1={0} y1={toY(v)} x2={W} y2={toY(v)} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
                            <text x={-4} y={toY(v) + 4} textAnchor="end" fontSize={9} fill={theme.textMuted.replace("text-", "").includes("/") ? "rgba(255,255,255,0.3)" : "#666"}>{v}</text>
                        </g>
                    ))}
                    <path d={bline} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={1} strokeDasharray="4 3" />
                    <path d={line} fill="none" stroke={theme.chartColor} strokeWidth={2} />
                    {HIST.map((d, i) => (
                        <circle key={i} cx={toX(i)} cy={toY(d.score)} r={2.5} fill={theme.chartColor} opacity={0.75} />
                    ))}
                    {HIST.map((d, i) => (
                        <text key={i} x={toX(i)} y={H + 20} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.25)">{i % 7 === 0 ? `D${d.day}` : ""}</text>
                    ))}
                </svg>
                <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-0.5 rounded" style={{ background: theme.chartColor }} />
                        <span className={`text-[11px] ${theme.textSecond}`}>Risk index</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-5 border-t border-dashed border-white/25" />
                        <span className={`text-[11px] ${theme.textSecond}`}>2020–24 baseline</span>
                    </div>
                </div>
            </GlassCard>

            {/* Event timeline */}
            <GlassCard>
                <SectionLabel>Event Timeline</SectionLabel>
                <div className="flex flex-col">
                    {[
                        { time: "Today 06:15", text: "CRITICAL alert triggered — Nashik district, rainfall 241mm", dot: "bg-red-400 shadow-red-400/60" },
                        { time: "Yesterday", text: "GEE data refresh completed — all 34 districts updated", dot: "bg-emerald-400 shadow-emerald-400/60" },
                        { time: "Apr 17", text: "Model retrained on updated dataset — ensemble accuracy 93.1%", dot: `shadow-lg ${theme.accentBg}` },
                        { time: "Apr 15", text: "HIGH alert resolved — Kolhapur, risk dropped to LOW", dot: "bg-orange-400 shadow-orange-400/60" },
                        { time: "Apr 12", text: "Sentinel-2 cloud >80% — MODIS backup activated", dot: "bg-yellow-400 shadow-yellow-400/60" },
                    ].map((e, i, arr) => (
                        <div key={i} className="flex gap-3 pb-4">
                            <div className="flex flex-col items-center w-3 flex-shrink-0">
                                <div className={`w-2.5 h-2.5 rounded-full shadow-md flex-shrink-0 ${e.dot}`} />
                                {i < arr.length - 1 && <div className={`w-px flex-1 mt-1 ${theme.divider.replace("border-", "bg-")}`} />}
                            </div>
                            <div>
                                <p className={`text-[10px] ${theme.textMuted} mb-0.5`}>{e.time}</p>
                                <p className={`text-xs leading-relaxed ${theme.textSecond}`}>{e.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>
        </div>
    )
}

/* ════════════════════════════════════════════════
   DATA SOURCES PAGE
═══════════════════════════════════════════════════ */
const SOURCES = [
    { name: "CHIRPS Rainfall", status: "online", latency: 340, updated: "8m ago", desc: "Daily precipitation raster" },
    { name: "Sentinel-2 SR", status: "online", latency: 620, updated: "14m ago", desc: "NDVI/NDWI vegetation index" },
    { name: "SRTM Terrain", status: "online", latency: 180, updated: "Static", desc: "Elevation, slope, aspect" },
    { name: "WorldPop 100m", status: "online", latency: 290, updated: "Yearly", desc: "Population density grid" },
    { name: "OpenLandMap Soil", status: "online", latency: 210, updated: "Static", desc: "USDA texture class" },
    { name: "MODIS NDVI Backup", status: "degraded", latency: 890, updated: "22m ago", desc: "16-day composite fallback" },
    { name: "Weather Station API", status: "offline", latency: null, updated: "2h ago", desc: "Ground truth validation" },
]

export function DataSourcesPage() {
    const { theme } = useWeather()
    const latencyColor = l => !l ? "text-red-400" : l > 700 ? "text-red-400" : l > 400 ? "text-yellow-400" : "text-emerald-400"
    return (
        <div className="page-enter flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
                <MetricCard label="Total Records" value="1.2M" sub="Predictions stored" />
                <MetricCard label="Sources Online" value="5 / 7" sub="2 degraded or offline" accent />
                <MetricCard label="System Uptime" value="99.2%" sub="Last 30 days" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                {SOURCES.map(s => (
                    <GlassCard key={s.name} padding="p-4"
                        className={s.status === "offline" ? "!border-red-500/20" : s.status === "degraded" ? "!border-yellow-500/20" : ""}>
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <StatusDot status={s.status} />
                                    <span className={`text-sm font-semibold ${theme.textPrimary}`}>{s.name}</span>
                                </div>
                                <p className={`text-[11px] ${theme.textMuted}`}>{s.desc}</p>
                            </div>
                            <GhostButton>Refresh</GhostButton>
                        </div>
                        <div className="flex gap-5">
                            {[
                                ["Latency", s.latency ? `${s.latency}ms` : "—", latencyColor(s.latency)],
                                ["Last update", s.updated, theme.textSecond],
                                ["Status", s.status, s.status === "online" ? "text-emerald-400" : s.status === "degraded" ? "text-yellow-400" : "text-red-400"],
                            ].map(([l, v, c]) => (
                                <div key={l}>
                                    <p className={`text-[10px] ${theme.textMuted} mb-0.5`}>{l}</p>
                                    <p className={`text-xs score-num font-semibold capitalize ${c}`}>{v}</p>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                ))}
            </div>
        </div>
    )
}

/* ════════════════════════════════════════════════
   SETTINGS PAGE
═══════════════════════════════════════════════════ */
function Slider({ label, value, min = 0, max = 100, step = 1, unit = "", onChange, accent }) {
    const { theme } = useWeather()
    return (
        <div className="mb-4">
            <div className="flex justify-between mb-1.5">
                <span className={`text-xs ${theme.textSecond}`}>{label}</span>
                <span className={`text-xs score-num font-semibold ${accent ? theme.accentText : theme.textPrimary}`}>{value}{unit}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full h-1 rounded-full cursor-pointer appearance-none bg-white/10"
                style={{ accentColor: theme.accentHex }} />
        </div>
    )
}

function Toggle({ label, checked, onChange }) {
    const { theme } = useWeather()
    return (
        <div className={`flex justify-between items-center py-3 border-b ${theme.divider}`}>
            <span className={`text-xs ${theme.textSecond}`}>{label}</span>
            <div onClick={onChange}
                className="w-10 h-5 rounded-full cursor-pointer relative transition-all duration-200"
                style={{ background: checked ? theme.accentHex : "rgba(255,255,255,0.1)" }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
                    style={{ left: checked ? "22px" : "2px" }} />
            </div>
        </div>
    )
}

export function SettingsPage() {
    const { theme } = useWeather()
    const [thr, setThr] = useState({ critical: 80, high: 60, moderate: 40 })
    const [wts, setWts] = useState({ rf: 0.4, ada: 0.3, bag: 0.3 })
    const [ntf, setNtf] = useState({ email: true, digest: false, retrain: true })
    const [iv, setIv] = useState(15)
    const total = +(wts.rf + wts.ada + wts.bag).toFixed(2)
    const ok = total === 1.0

    return (
        <div className="page-enter grid grid-cols-2 gap-4">
            <GlassCard>
                <SectionLabel>Alert Thresholds</SectionLabel>
                <Slider label="Critical" value={thr.critical} onChange={v => setThr(p => ({ ...p, critical: v }))} accent />
                <Slider label="High" value={thr.high} onChange={v => setThr(p => ({ ...p, high: v }))} />
                <Slider label="Moderate" value={thr.moderate} onChange={v => setThr(p => ({ ...p, moderate: v }))} />
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[["Low", "#34d399", `0–${thr.moderate}`], ["Moderate", "#fbbf24", `${thr.moderate}–${thr.high}`],
                    ["High", "#fb923c", `${thr.high}–${thr.critical}`], ["Critical", "#f87171", `${thr.critical}–100`]].map(([l, c, r]) => (
                        <div key={l} className="text-center p-2 rounded-xl border" style={{ background: `${c}15`, borderColor: `${c}40` }}>
                            <p className="text-[10px] font-bold" style={{ color: c }}>{l}</p>
                            <p className="text-[9px] score-num mt-0.5" style={{ color: `${c}90` }}>{r}</p>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <GlassCard>
                <div className="flex justify-between items-center mb-3">
                    <SectionLabel>Ensemble Weights</SectionLabel>
                    <span className={`text-[11px] score-num font-bold ${ok ? "text-emerald-400" : "text-red-400"}`}>
                        Σ = {total} {ok ? "✓" : "≠ 1.0"}
                    </span>
                </div>
                <Slider label="Random Forest" value={wts.rf} min={0} max={1} step={0.05} onChange={v => setWts(p => ({ ...p, rf: v }))} accent />
                <Slider label="AdaBoost" value={wts.ada} min={0} max={1} step={0.05} onChange={v => setWts(p => ({ ...p, ada: v }))} />
                <Slider label="Bagging" value={wts.bag} min={0} max={1} step={0.05} onChange={v => setWts(p => ({ ...p, bag: v }))} />
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mt-2">
                    {[{ v: wts.rf, c: theme.accentHex }, { v: wts.ada, c: "#60a5fa" }, { v: wts.bag, c: "#a78bfa" }].map((w, i) => (
                        <div key={i} className="transition-all duration-300 rounded-full" style={{ flex: w.v, background: w.c }} />
                    ))}
                </div>
            </GlassCard>

            <GlassCard>
                <SectionLabel>Notifications</SectionLabel>
                <Toggle label="Email alerts for critical events" checked={ntf.email} onChange={() => setNtf(p => ({ ...p, email: !p.email }))} />
                <Toggle label="Daily digest report" checked={ntf.digest} onChange={() => setNtf(p => ({ ...p, digest: !p.digest }))} />
                <Toggle label="Model retrain notifications" checked={ntf.retrain} onChange={() => setNtf(p => ({ ...p, retrain: !p.retrain }))} />
                <div className="mt-4">
                    <Slider label="GEE refresh interval" value={iv} min={5} max={60} step={5} unit=" min" onChange={setIv} />
                </div>
            </GlassCard>

            <GlassCard>
                <SectionLabel>Save Configuration</SectionLabel>
                <p className={`text-xs leading-relaxed mb-5 ${theme.textSecond}`}>
                    Changes apply on the next scheduler run. Ensemble weights must sum to exactly 1.0 before saving.
                </p>
                <PrimaryButton className={`w-full mb-2 ${!ok ? "opacity-40 cursor-not-allowed" : ""}`}>
                    Save to Backend
                </PrimaryButton>
                <GhostButton className="w-full">Reset to Defaults</GhostButton>
            </GlassCard>
        </div>
    )
}