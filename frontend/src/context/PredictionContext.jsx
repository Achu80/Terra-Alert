import { createContext, useContext, useState } from 'react'

const PredictionContext = createContext(null)

export function PredictionProvider({ children }) {
    const [prediction, setPrediction] = useState(null)
    return (
        <PredictionContext.Provider value={{ prediction, setPrediction }}>
            {children}
        </PredictionContext.Provider>
    )
}

export function usePrediction() {
    return useContext(PredictionContext)
}