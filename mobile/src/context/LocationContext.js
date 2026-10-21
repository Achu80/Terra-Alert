/**
 * Selected location shared across tabs (Home, Map, Assistant) and persisted between launches
 * Shape: { id, name, region, lat, lon, type: 'district' | 'place' }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'terraalert:selectedLocation';

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
    const [location, setLocationState] = useState(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((raw) => {
                if (raw) setLocationState(JSON.parse(raw));
            })
            .catch((e) => console.warn('Could not restore saved location:', e))
            .finally(() => setReady(true));
    }, []);

    const setLocation = useCallback((next) => {
        setLocationState(next);
        const save = next
            ? AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
            : AsyncStorage.removeItem(STORAGE_KEY);
        save.catch((e) => console.warn('Could not save location:', e));
    }, []);

    const value = useMemo(() => ({ location, setLocation, ready }), [location, setLocation, ready]);

    return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useSelectedLocation() {
    const ctx = useContext(LocationContext);
    if (!ctx) throw new Error('useSelectedLocation must be used inside LocationProvider');
    return ctx;
}
