import { HP_DISTRICTS } from '@/constants/himachal';

export const HISTORY_RANGES = [
    { id: '1M', label: '1 Month', days: 30, bucket: 'day' },
    { id: '3M', label: '3 Months', days: 90, bucket: 'day' },
    { id: '6M', label: '6 Months', days: 182, bucket: 'week' },
    { id: '1Y', label: '1 Year', days: 365, bucket: 'week' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 24 * 60 * 60 * 1000;

export const shortDate = (d) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

export function rangeStart(range, now = new Date()) {
    const start = new Date(now.getTime() - range.days * DAY_MS);
    start.setHours(0, 0, 0, 0);
    return start;
}

// Name variants Nominatim uses for districts whose names differ from ours
const DISTRICT_ALIASES = {
    lahaul_spiti: ['lahaul', 'lahul', 'spiti'],
};

const namesFor = (d) => DISTRICT_ALIASES[d.id] ?? [d.name.toLowerCase()];

/**
 * Which HP district a saved prediction belongs to.
 * 1. The stored place name, e.g. "Manali, Kullu, Himachal Pradesh" - checked right-to-left, skipping the state,
 *    so the district part wins over a village that happens to share a district's name.
 * 2. Otherwise the nearest district centre (approximate).
 */
export function assignDistrict(name, lat, lon) {
    if (name) {
        const parts = name.split(',').map((s) => s.trim().toLowerCase());
        for (let i = parts.length - 1; i >= 0; i--) {
            const hit = HP_DISTRICTS.find((d) => namesFor(d).some((n) => parts[i].includes(n)));
            if (hit) return hit.id;
        }
    }

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
        let best = null;
        let bestDist = Infinity;
        for (const d of HP_DISTRICTS) {
            const dist = (d.lat - lat) ** 2 + (d.lon - lon) ** 2;
            if (dist < bestDist) {
                bestDist = dist;
                best = d.id;
            }
        }
        return best;
    }

    return null;
}

function bucketStart(date, bucket) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (bucket === 'week') {
        const sinceMonday = (d.getDay() + 6) % 7;
        d.setDate(d.getDate() - sinceMonday);
    }
    return d;
}

/**
 * Average risk score per day (or week) for the chart.
 * Returns points for TrendChart: { key, label, score, count, t } where t is the position in the range (0-1).
 */
export function buildTrend(rows, range, now = new Date()) {
    const start = rangeStart(range, now).getTime();
    const span = Math.max(1, now.getTime() - start);
    const buckets = new Map();

    for (const row of rows) {
        const b = bucketStart(row.createdAt, range.bucket);
        const key = b.toISOString();
        const entry = buckets.get(key) ?? { date: b, sum: 0, count: 0 };
        entry.sum += row.score;
        entry.count += 1;
        buckets.set(key, entry);
    }

    return [...buckets.entries()]
        .sort(([, a], [, b]) => a.date - b.date)
        .map(([key, e]) => ({
            key,
            label: shortDate(e.date),
            score: e.sum / e.count,
            count: e.count,
            t: Math.min(1, Math.max(0, (e.date.getTime() - start) / span)),
        }));
}

export function summarize(rows) {
    if (rows.length === 0) return null;
    const total = rows.reduce((sum, r) => sum + r.score, 0);
    return {
        count: rows.length,
        average: total / rows.length,
        highOrCritical: rows.filter((r) => r.score >= 60).length,
    };
}

// "Today 06:15", "Yesterday 18:40", "Oct 12"
export function formatEventTime(date, now = new Date()) {
    const hhmm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const today = bucketStart(now, 'day').getTime();
    const day = bucketStart(date, 'day').getTime();
    if (day === today) return `Today ${hhmm}`;
    if (day === today - DAY_MS) return `Yesterday ${hhmm}`;
    return shortDate(date);
}
