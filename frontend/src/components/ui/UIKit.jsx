import { useWeather } from "../../context/WeatherContext"

/* ── Risk badge ─────────────────────────────────────── */
const RISK = {
    CRITICAL: "bg-red-500/20   border border-red-500/50   text-red-400",
    HIGH: "bg-orange-500/20 border border-orange-500/50 text-orange-400",
    MODERATE: "bg-yellow-500/20 border border-yellow-500/50 text-yellow-400",
    LOW: "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400",
}

export function RiskBadge({ level = "LOW", size = "md" }) {
    const pad = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-[11px]"
    return (
        <span className={`${RISK[level] || RISK.LOW} ${pad} rounded-full font-semibold tracking-wide whitespace-nowrap`}>
            {level}
        </span>
    )
}

/* ── Status dot ─────────────────────────────────────── */
export function StatusDot({ status = "online" }) {
    const cls = status === "online" ? "bg-emerald-400 shadow-emerald-400/60"
        : status === "degraded" ? "bg-yellow-400 shadow-yellow-400/60"
            : "bg-red-400 shadow-red-400/60"
    return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 shadow-md ${cls}`} />
}

/* ── Staleness indicator ─────────────────────────────── */
export function StalenessIndicator({ minutesOld = 0 }) {
    const stale = minutesOld > 120
    return (
        <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shadow-md ${stale ? "bg-yellow-400 shadow-yellow-400/60 animate-pulse2" : "bg-emerald-400 shadow-emerald-400/60"}`} />
            <span className={`text-[11px] font-medium ${stale ? "text-yellow-400" : "text-emerald-400"}`}>
                {stale ? `Data ${Math.floor(minutesOld / 60)}h old` : "Live"}
            </span>
        </div>
    )
}

/* ── Metric card ─────────────────────────────────────── */
export function MetricCard({ label, value, sub, accent, icon }) {
    const { theme } = useWeather()
    return (
        <div className={`glass glass-hover p-4 ${theme.cardBorder}`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className={`label-caps mb-1.5 ${theme.textMuted}`}>{label}</p>
                    <p className={`text-3xl score-num font-bold leading-none ${accent ? theme.accentText : theme.textPrimary}`}>
                        {value}
                    </p>
                    {sub && <p className={`text-xs mt-1 ${theme.textSecond}`}>{sub}</p>}
                </div>
                {icon && <span className={`text-2xl opacity-50 ${theme.textPrimary}`}>{icon}</span>}
            </div>
        </div>
    )
}

/* ── Factor bar ──────────────────────────────────────── */
export function FactorBar({ label, value, max = 100, colorClass = "bg-violet-400" }) {
    const { theme } = useWeather()
    const pct = Math.min((value / max) * 100, 100)
    return (
        <div className="mb-2.5">
            <div className="flex justify-between mb-1">
                <span className={`text-xs ${theme.textSecond}`}>{label}</span>
                <span className={`text-xs score-num font-semibold ${theme.textPrimary}`}>{Math.round(value)}</span>
            </div>
            <div className={`h-1.5 rounded-full ${theme.accentBg} bg-white/[0.05]`}>
                <div
                    className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    )
}

/* ── Model score pill ────────────────────────────────── */
export function ModelScorePill({ model, score, isEnsemble = false }) {
    const { theme } = useWeather()
    return (
        <div className={`flex-1 rounded-xl p-2 text-center border ${isEnsemble ? `${theme.accentBg} ${theme.accentBorder}` : `bg-white/[0.04] ${theme.cardBorder}`}`}>
            <p className={`label-caps mb-0.5 ${theme.textMuted}`}>{model}</p>
            <p className={`text-lg score-num font-bold ${isEnsemble ? theme.accentText : theme.textPrimary}`}>{score}</p>
        </div>
    )
}

/* ── Buttons ─────────────────────────────────────────── */
export function PrimaryButton({ children, onClick, className = "" }) {
    const { theme } = useWeather()
    return (
        <button
            onClick={onClick}
            className={`${theme.accentBtn} text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg ${theme.accentGlow} ${className}`}
        >
            {children}
        </button>
    )
}

export function GhostButton({ children, onClick, className = "" }) {
    const { theme } = useWeather()
    return (
        <button
            onClick={onClick}
            className={`bg-transparent border ${theme.cardBorder} ${theme.textSecond} text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 hover:bg-white/[0.07] hover:${theme.textPrimary} ${className}`}
        >
            {children}
        </button>
    )
}

/* ── Section label ───────────────────────────────────── */
export function SectionLabel({ children }) {
    const { theme } = useWeather()
    return <p className={`label-caps mb-3 ${theme.textMuted}`}>{children}</p>
}

/* ── Divider ─────────────────────────────────────────── */
export function Divider() {
    const { theme } = useWeather()
    return <div className={`border-t ${theme.divider} my-4`} />
}

/* ── Glass card ──────────────────────────────────────── */
export function GlassCard({ children, className = "", padding = "p-5", onClick, accent }) {
    const { theme } = useWeather()
    return (
        <div
            onClick={onClick}
            className={`glass ${padding} border ${accent ? `${theme.accentBorder} ${theme.accentBg}` : theme.cardBorder} ${onClick ? "cursor-pointer glass-hover" : ""} ${className}`}
        >
            {children}
        </div>
    )
}