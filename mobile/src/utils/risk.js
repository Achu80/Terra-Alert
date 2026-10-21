import { RISK_COLORS } from '@/theme/colors';

// Same thresholds as the backend forecast and the web PredictionPage.
// The level is derived from the score because the backend returns mixed casing ('low' vs 'LOW').
export function getRiskLevel(score) {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MODERATE';
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
