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

/*
 * How results are worded to users.
 * The score is a RISK WARNING, not a forecast that a landslide will happen: at MODERATE or higher the model
 * catches about 7 in 10 past landslides, but most alerts do not end in one (ai-module/v3/V3_BEFORE_AFTER.pdf).
 * So: "High landslide risk in Shimla today because of heavy rain. Stay alert." - never "A landslide will happen".
 */
export const RISK_DISCLAIMER =
    'This is a risk warning based on recent rain and terrain, not a forecast that a landslide will happen. ' +
    'Always follow official advisories (HPSDMA, IMD, district administration).';

const LEVEL_WORDS = { LOW: 'Low', MODERATE: 'Moderate', HIGH: 'High', CRITICAL: 'Very high' };

const ADVICE = {
    LOW: 'No special action needed - keep an eye on the weather.',
    MODERATE: 'Stay alert.',
    HIGH: 'Be ready to move.',
    CRITICAL: 'Move away from slopes and follow official advisories.',
};

const joinList = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

/** The main things pushing the risk up (or keeping it down), in plain words. Missing values are skipped. */
export function riskReasons({ level, rain3d, rain30d, slope }) {
    const reasons = [];
    if (rain3d >= 50) reasons.push(`heavy rain (${rain3d.toFixed(0)} mm in 3 days)`);
    else if (rain3d >= 20) reasons.push(`recent rain (${rain3d.toFixed(0)} mm in 3 days)`);
    if (rain30d >= 300) reasons.push(`a very wet month (${rain30d.toFixed(0)} mm in 30 days)`);
    if (slope >= 25) reasons.push(`steep slopes (${slope.toFixed(0)}°)`);
    if (!reasons.length && level === 'LOW' && Number.isFinite(rain3d) && rain3d < 10) reasons.push('little recent rain');
    return reasons;
}

/**
 * One warning sentence for a place, e.g.
 * "High landslide risk in Shimla today, mainly because of heavy rain (85 mm in 3 days). Be ready to move."
 * plains: true when the backend's plains rule answered (flat, low ground is always Low).
 */
export function riskMessage({ level: rawLevel, place, rain3d, rain30d, slope, plains = false }) {
    const where = place ? ` in ${place}` : '';
    const level = String(rawLevel ?? '').toUpperCase();
    // UNKNOWN / ERROR: the backend refused to guess because satellite data was missing
    if (!LEVEL_WORDS[level]) return `Risk${where} could not be checked right now - satellite data is unavailable. Try again later.`;
    if (plains) return `Low landslide risk${where}: flat, low-lying ground. ${ADVICE.LOW}`;
    const reasons = riskReasons({ level, rain3d, rain30d, slope });
    const because = reasons.length ? `, mainly because of ${joinList(reasons)}` : '';
    return `${LEVEL_WORDS[level]} landslide risk${where} today${because}. ${ADVICE[level]}`;
}

/** Backend `warnings` codes (see backend/services/model_service.py data_warnings) -> plain sentences, no repeats. */
export function describeWarnings(warnings = []) {
    const out = new Set();
    for (const w of warnings) {
        if (w.startsWith('rain_source_mismatch')) {
            out.add('Recent rain data came from a backup source, so this score is less reliable than usual.');
        } else if (w.startsWith('outside_training_range:rainfall')) {
            out.add('Rainfall here is beyond anything the model was trained on - treat the score as a rough guide.');
        } else if (w.startsWith('outside_training_range')) {
            out.add('Conditions here are unusual for the model (e.g. elevation or slope) - treat the score as a rough guide.');
        }
    }
    return [...out];
}
