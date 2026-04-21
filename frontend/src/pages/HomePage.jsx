import { useWeather } from "../context/WeatherContext"
import { GlassCard, MetricCard, RiskBadge, SectionLabel, Divider, PrimaryButton } from "../components/ui/UIKit"

const ALERTS = [
    { id: 1, district: "Nashik", score: 87, level: "CRITICAL", trigger: "Rainfall 241mm", time: "2m ago" },
    { id: 2, district: "Pune", score: 74, level: "HIGH", trigger: "Slope 34°", time: "15m ago" },
    { id: 3, district: "Raigad", score: 68, level: "HIGH", trigger: "NDVI low 0.12", time: "32m ago" },
    { id: 4, district: "Satara", score: 55, level: "MODERATE", trigger: "Rainfall 89mm", time: "1h ago" },
    { id: 5, district: "Kolhapur", score: 48, level: "MODERATE", trigger: "Soil saturation", time: "2h ago" },
]

const DIST = [
    { level: "CRITICAL", count: 3, bar: "bg-red-400" },
    { level: "HIGH", count: 8, bar: "bg-orange-400" },
    { level: "MODERATE", count: 14, bar: "bg-yellow-400" },
    { level: "LOW", count: 9, bar: "bg-emerald-400" },
]

const MODELS = [
    { model: "Random Forest", acc: "91.2", prec: "89.4", rec: "88.7", f1: "89.0" },
    { model: "AdaBoost", acc: "88.6", prec: "86.2", rec: "87.1", f1: "86.6" },
    { model: "Bagging", acc: "89.9", prec: "88.0", rec: "88.5", f1: "88.2" },
    { model: "Ensemble", acc: "93.1", prec: "91.8", rec: "92.0", f1: "91.9" },
]

export default function HomePage({ onNavigate }) {
    const { theme } = useWeather()
    const total = DIST.reduce((s, d) => s + d.count, 0)

    return (
        <div className="page-enter flex flex-col gap-5">
            {/* Metric cards */}
            <div className="grid grid-cols-4 gap-4">
                <MetricCard label="Zones Monitored" value="34" sub="Maharashtra districts" icon="◎" />
                <MetricCard label="Critical Alerts" value="3" sub="Active right now" icon="⚠" accent />
                <MetricCard label="Feed Status" value="Live" sub="Last refresh 8m ago" icon="◈" />
                <MetricCard label="Model Accuracy" value="93.1%" sub="Ensemble F1 score" icon="▦" />
            </div>

            <div className="grid grid-cols-3 gap-5">
                {/* Alert feed */}
                <GlassCard>
                    <SectionLabel>Live Alert Feed</SectionLabel>
                    <div className="flex flex-col gap-2">
                        {ALERTS.map(a => (
                            <div key={a.id}
                                className={`flex items-center justify-between p-3 rounded-xl border ${theme.cardBorder} bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200 cursor-pointer`}>
                                <div>
                                    <p className={`text-sm font-semibold ${theme.textPrimary}`}>{a.district}</p>
                                    <p className={`text-[11px] mt-0.5 ${theme.textMuted}`}>{a.trigger}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <RiskBadge level={a.level} size="sm" />
                                    <span className={`text-[10px] ${theme.textMuted}`}>{a.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                {/* Risk distribution */}
                <GlassCard>
                    <SectionLabel>Risk Distribution</SectionLabel>
                    <div className="flex flex-col gap-3 mb-4">
                        {DIST.map(d => (
                            <div key={d.level}>
                                <div className="flex justify-between mb-1">
                                    <span className={`text-xs ${theme.textSecond}`}>{d.level}</span>
                                    <span className={`text-xs score-num font-semibold ${theme.textPrimary}`}>{d.count}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-white/[0.06]">
                                    <div className={`h-full rounded-full transition-all duration-700 ${d.bar}`}
                                        style={{ width: `${(d.count / total) * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <Divider />
                    <div className="flex justify-between items-center">
                        <div>
                            <p className={`text-3xl score-num font-bold ${theme.accentText}`}>34</p>
                            <p className={`text-[11px] ${theme.textMuted}`}>total districts</p>
                        </div>
                        <PrimaryButton onClick={() => onNavigate("map")}>Open Map →</PrimaryButton>
                    </div>
                </GlassCard>

                {/* ML model table */}
                <GlassCard>
                    <SectionLabel>ML Model Performance</SectionLabel>
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr>
                                {["Model", "Acc", "Prec", "Rec", "F1"].map(h => (
                                    <th key={h} className={`text-left pb-2.5 pr-2 label-caps ${theme.textMuted}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {MODELS.map((m, i) => (
                                <tr key={m.model} className={`border-t ${theme.divider}`}>
                                    <td className={`py-2.5 pr-2 text-xs ${i === 3 ? `font-semibold ${theme.accentText}` : theme.textPrimary}`}>{m.model}</td>
                                    {[m.acc, m.prec, m.rec, m.f1].map((v, j) => (
                                        <td key={j} className={`py-2.5 pr-2 score-num ${i === 3 ? theme.accentText : theme.textSecond}`}>{v}%</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </GlassCard>
            </div>

            {/* Capabilities */}
            <GlassCard padding="p-4">
                <SectionLabel>System Capabilities</SectionLabel>
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { icon: "🛰", title: "Live Satellite Data", desc: "CHIRPS, Sentinel-2, SRTM refreshed every 15 min via Google Earth Engine" },
                        { icon: "🤖", title: "Ensemble ML", desc: "Random Forest + AdaBoost + Bagging weighted vote with configurable weights" },
                        { icon: "📊", title: "Impact Analysis", desc: "Road proximity scoring, population exposure index, isolation risk mapping" },
                        { icon: "📄", title: "PDF Export", desc: "Per-district risk reports with factor breakdown and alert history" },
                    ].map(c => (
                        <div key={c.title} className="flex gap-3">
                            <span className="text-xl mt-0.5 flex-shrink-0">{c.icon}</span>
                            <div>
                                <p className={`text-xs font-semibold mb-1 ${theme.textPrimary}`}>{c.title}</p>
                                <p className={`text-[11px] leading-relaxed ${theme.textSecond}`}>{c.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>
        </div>
    )
}