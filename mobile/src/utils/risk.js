import { RISK_COLORS } from '@/theme/colors';

// Defaults match the backend forecast and the web PredictionPage; users can change them in Settings
export const DEFAULT_THRESHOLDS = { critical: 80, high: 60, moderate: 40 };

// Thresholds must be ordered moderate < high < critical within 1-100
export const isValidThresholds = (t) =>
    !!t &&
    [t.moderate, t.high, t.critical].every(Number.isFinite) &&
    t.moderate > 0 &&
    t.moderate < t.high &&
    t.high < t.critical &&
    t.critical <= 100;

// The level is derived from the score because the backend returns mixed casing ('low' vs 'LOW')
export function getRiskLevel(score, thresholds = DEFAULT_THRESHOLDS) {
    if (score >= thresholds.critical) return 'CRITICAL';
    if (score >= thresholds.high) return 'HIGH';
    if (score >= thresholds.moderate) return 'MODERATE';
    return 'LOW';
}

const LEVEL_COLORS = {
    CRITICAL: RISK_COLORS.Critical,
    HIGH: RISK_COLORS.High,
    MODERATE: RISK_COLORS.Moderate,
    LOW: RISK_COLORS.Low,
};

export const getRiskColor = (level) => LEVEL_COLORS[String(level).toUpperCase()] ?? RISK_COLORS.Low;

// '#ef4444' + 0.2 -> '#ef444433' (8-digit hex with alpha)
export const withAlpha = (hex, alpha) =>
    `${hex}${Math.round(alpha * 255)
        .toString(16)
        .padStart(2, '0')}`;

// The model returns confidence as a percentage, older responses as a 0-1 fraction
export const formatConfidence = (confidence) => `${(confidence >= 1 ? confidence : confidence * 100).toFixed(0)}%`;
