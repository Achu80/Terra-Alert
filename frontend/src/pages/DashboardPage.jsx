import { useWeather } from "../context/WeatherContext"
import { GlassCard, MetricCard, RiskBadge, SectionLabel, Divider, FactorBar } from "../components/ui/UIKit"

const DIST_DATA = [
    { name: "Nashik", score: 87, level: "CRITICAL", bar: "bg-red-400" },
    { name: "Pune", score: 74, level: "HIGH", bar: "bg-orange-400" },
    { name: "Raigad", score: 68, level: "HIGH", bar: "bg-orange-400" },
    { name: "Satara", score: 55, level: "MODERATE", bar: "bg-yellow-400" },
    { name: "Kolhapur", score: 48, level: "MODERATE", bar: "bg-yellow-400" },
    { name: "Thane", score: 38, level: "LOW", bar: "bg-emerald-400" },
    { name: "Amravati", score: 22, level: "LOW", bar: "bg-emerald-400" },
]

const MODEL_TABLE = [
    { model: "Random Forest", acc: 91.2, prec: 89.4, rec: 88.7, f1: 89.0, auc: 0.94 },
    { model: "AdaBoost", acc: 88.6, prec: 86.2, rec: 87.1, f1: 86.6, auc: 0.91 },
    { model: "Bagging", acc: 89.9, prec: 88.0, rec: 88.5, f1: 88.2, auc: 0.93 },
    { model: "Ensemble", acc: 93.1, prec: 91.8, rec: 92.0, f1: 91.9, auc: 0.96 },
]

const FEATURES = [
    { name: "Rainfall 7d", imp: 31, color: "bg-blue-400" },
    { name: "Slope max", imp: 24, color: "bg-red-400" },
    { name: "Rainfall 30d", imp: 18, color: "bg-blue-300" },
    { name: "NDVI", imp: 12, color: "bg-emerald-400" },
    { name: "Population density", imp: 9, color: "bg-violet-400" },
    { name: "Soil type", imp: 6, color: "bg-yellow-400" },
]

export default function DashboardPage() {
    const { theme } = useWeather()

    return (
        <div className="page-enter flex flex-col gap-5">

            {/* Metric cards */}
            <div className="grid grid-cols-4 gap-4">
                <MetricCard label="Avg Risk Score" value="55.2" sub="Across all districts" />
                <MetricCard label="Critical Zones" value="3" sub="Require immediate action" accent />
                <MetricCard label="Pop. Exposed" value="18.1M" sub="In high/critical zones" />
                <MetricCard label="Roads at Risk" value="12" sub="Highway segments affected" />
            </div>

            {/* Bar chart + Impact analysis */}
            <div className="grid grid-cols-[1.6fr_1fr] gap-5">

                <GlassCard>
                    <SectionLabel>District Risk Scores</SectionLabel>
                    <div className="flex flex-col gap-2.5">
                        {DIST_DATA.map(d => (
                            <div key={d.name} className="flex items-center gap-3">
                                <span className={`w-20 text-xs flex-shrink-0 ${theme.textSecond}`}>{d.name}</span>
                                <div className="flex-1 h-5 rounded bg-white/[0.05] overflow-hidden relative">
                                    <div
                                        className={`h-full rounded transition-all duration-700 ${d.bar} opacity-70`}
                                        style={{ width: `${d.score}%` }}
                                    />
                                    <div
                                        className={`absolute right-0 top-0 h-full w-0.5 ${d.bar}`}
                                        style={{ left: `${d.score}%` }}
                                    />
                                </div>
                                <span className={`w-8 text-xs score-num font-bold text-right ${d.score >= 80 ? "text-red-400" :
                                        d.score >= 60 ? "text-orange-400" :
                                            d.score >= 40 ? "text-yellow-400" : "text-emerald-400"
                                    }`}>{d.score}</span>
                                <RiskBadge level={d.level} size="sm" />
                            </div>
                        ))}
                    </div>
                </GlassCard>

                <GlassCard>
                    <SectionLabel>Impact Analysis</SectionLabel>
                    <div className="flex flex-col gap-3">
                        {[
                            { label: "Road proximity impact", value: "67%", sub: "of critical districts have highway exposure", color: "text-red-400", bg: "bg-red-400" },
                            { label: "Population exposure index", value: "2.4M", sub: "people in zones with risk score above 60", color: "text-orange-400", bg: "bg-orange-400" },
                            { label: "Isolation risk count", value: "5", sub: "communities at risk of losing road access", color: "text-yellow-400", bg: "bg-yellow-400" },
                        ].map(item => (
                            <div key={item.label}
                                className={`p-3 rounded-xl bg-white/[0.04] border ${theme.cardBorder}`}>
                                <p className={`text-2xl score-num font-bold ${item.color}`}>{item.value}</p>
                                <p className={`text-xs font-medium mt-1 ${theme.textPrimary}`}>{item.label}</p>
                                <p className={`text-[11px] mt-0.5 leading-relaxed ${theme.textMuted}`}>{item.sub}</p>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>

            {/* ML table + Feature importances */}
            <div className="grid grid-cols-[1.4fr_1fr] gap-5">

                <GlassCard>
                    <SectionLabel>ML Model Comparison</SectionLabel>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr>
                                    {["Model", "Accuracy", "Precision", "Recall", "F1", "AUC-ROC"].map(h => (
                                        <th key={h} className={`text-left pb-3 pr-3 label-caps ${theme.textMuted}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {MODEL_TABLE.map((m, i) => {
                                    const isEnsemble = i === 3
                                    return (
                                        <tr key={m.model} className={`border-t ${theme.divider}`}>
                                            <td className={`py-2.5 pr-3 ${isEnsemble ? `font-semibold ${theme.accentText}` : theme.textPrimary}`}>
                                                {m.model}
                                            </td>
                                            {[m.acc, m.prec, m.rec, m.f1].map((v, j) => (
                                                <td key={j} className={`py-2.5 pr-3 score-num ${isEnsemble ? theme.accentText : theme.textSecond}`}>
                                                    {v}%
                                                </td>
                                            ))}
                                            <td className={`py-2.5 pr-3 score-num font-semibold ${isEnsemble ? theme.accentText : theme.textSecond}`}>
                                                {m.auc}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>

                <GlassCard>
                    <SectionLabel>Top Feature Importances</SectionLabel>
                    {FEATURES.map(f => (
                        <FactorBar
                            key={f.name}
                            label={f.name}
                            value={f.imp}
                            max={100}
                            colorClass={f.color}
                        />
                    ))}
                </GlassCard>

            </div>
        </div>
    )
}