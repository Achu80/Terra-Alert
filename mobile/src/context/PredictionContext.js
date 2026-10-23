/**
 * Latest risk assessment, shared across tabs (mirrors frontend/src/context/PredictionContext.jsx)
 * Shape: the /api/predict response plus the `location` it was requested for
 *
 * chatKey changes for every new assessment (and when one is cleared). The Assistant uses it as the
 * chat's React key, so each new analysis starts a fresh conversation.
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const PredictionContext = createContext(null);

export function PredictionProvider({ children }) {
    const [prediction, setPredictionState] = useState(null);
    const [chatKey, setChatKey] = useState(0);

    const setPrediction = useCallback((next) => {
        setPredictionState(next);
        setChatKey((k) => k + 1);
    }, []);

    // "New analysis": back to choosing a location, with a fresh assistant chat
    const startNewAssessment = useCallback(() => setPrediction(null), [setPrediction]);

    const value = useMemo(
        () => ({ prediction, setPrediction, startNewAssessment, chatKey }),
        [prediction, setPrediction, startNewAssessment, chatKey]
    );

    return <PredictionContext.Provider value={value}>{children}</PredictionContext.Provider>;
}

export function usePrediction() {
    const ctx = useContext(PredictionContext);
    if (!ctx) throw new Error('usePrediction must be used inside PredictionProvider');
    return ctx;
}
