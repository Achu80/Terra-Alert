/**
 * Latest risk assessment, shared across tabs (mirrors frontend/src/context/PredictionContext.jsx)
 * Shape: the /api/predict response plus the `location` it was requested for
 */

import { createContext, useContext, useMemo, useState } from 'react';

const PredictionContext = createContext(null);

export function PredictionProvider({ children }) {
    const [prediction, setPrediction] = useState(null);
    const value = useMemo(() => ({ prediction, setPrediction }), [prediction]);

    return <PredictionContext.Provider value={value}>{children}</PredictionContext.Provider>;
}

export function usePrediction() {
    const ctx = useContext(PredictionContext);
    if (!ctx) throw new Error('usePrediction must be used inside PredictionProvider');
    return ctx;
}
