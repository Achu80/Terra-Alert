/**
 * Risk alerts (there is no separate Alerts tab).
 * An alert exists when a reading is Moderate, High or Critical:
 *   - the latest assessment on Home, or
 *   - any upcoming day in the rain forecast for the saved location.
 * The pop-up banner shows while alerts exist; tapping it opens the alert sheet.
 *
 * Also owns the forecast for the saved location, so Home and the alerts share one request.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isAlertLevel, LEVEL_ORDER } from '@/constants/riskGuidance';
import { useSelectedLocation } from '@/context/LocationContext';
import { usePrediction } from '@/context/PredictionContext';
import { useSettings } from '@/context/SettingsContext';
import { forecastAPI } from '@/services/api';
import { getRiskLevel } from '@/utils/risk';

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
    const { location } = useSelectedLocation();
    const { prediction } = usePrediction();
    const { thresholds } = useSettings();

    // ---- Rain-forecast risk for the saved location ----
    const lat = location?.lat;
    const lon = location?.lon;
    const [refreshTick, setRefreshTick] = useState(0);
    const requestKey = lat == null ? null : `${lat},${lon}#${refreshTick}`;
    const [forecast, setForecast] = useState({ key: null, days: [], error: null });

    useEffect(() => {
        if (requestKey == null) return;
        let cancelled = false;
        forecastAPI
            .predict(lat, lon)
            .then((r) => {
                if (!cancelled) setForecast({ key: requestKey, days: r.forecast ?? [], error: null });
            })
            .catch((e) => {
                if (!cancelled) setForecast({ key: requestKey, days: [], error: e.message });
            });
        return () => {
            cancelled = true;
        };
    }, [requestKey, lat, lon]);

    const forecastReady = requestKey != null && forecast.key === requestKey;
    const refreshForecast = useCallback(() => setRefreshTick((t) => t + 1), []);

    // ---- Alerts: only Moderate, High and Critical readings ----
    const items = useMemo(() => {
        const list = [];
        if (prediction) {
            const score = Number(prediction.prediction.score);
            const level = getRiskLevel(score, thresholds);
            if (isAlertLevel(level)) {
                list.push({ id: 'assessment', kind: 'assessment', place: prediction.location.name, score, level });
            }
        }
        if (forecastReady && location) {
            for (const day of forecast.days) {
                const score = Number(day.risk_score);
                const level = getRiskLevel(score, thresholds);
                if (isAlertLevel(level)) {
                    list.push({
                        id: `forecast-${day.date}`,
                        kind: 'forecast',
                        place: location.name,
                        date: day.date,
                        rain: day.rainfall_mm,
                        score,
                        level,
                    });
                }
            }
        }
        return list;
    }, [prediction, forecastReady, forecast.days, location, thresholds]);

    const top = useMemo(
        () => items.reduce((best, a) => (!best || LEVEL_ORDER[a.level] > LEVEL_ORDER[best.level] ? a : best), null),
        [items]
    );

    // Dismissing hides the banner until the set of alerts changes
    const signature = items.map((a) => `${a.id}:${a.level}`).join('|');
    const [dismissedSignature, setDismissedSignature] = useState(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const value = useMemo(
        () => ({
            items,
            top,
            bannerVisible: items.length > 0 && dismissedSignature !== signature,
            dismiss: () => setDismissedSignature(signature),
            sheetOpen,
            openSheet: () => setSheetOpen(true),
            closeSheet: () => setSheetOpen(false),
            forecast: {
                loading: requestKey != null && !forecastReady,
                days: forecastReady ? forecast.days : [],
                error: forecastReady ? forecast.error : null,
            },
            refreshForecast,
        }),
        [items, top, dismissedSignature, signature, sheetOpen, requestKey, forecastReady, forecast, refreshForecast]
    );

    return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
}

export function useAlerts() {
    const ctx = useContext(AlertContext);
    if (!ctx) throw new Error('useAlerts must be used inside AlertProvider');
    return ctx;
}
