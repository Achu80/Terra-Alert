/**
 * Admin mode (the app has no login).
 * Unlocked with a PIN that only the backend knows (ADMIN_PIN in backend/.env).
 * The PIN is kept in the phone's secure storage and sent with admin-only requests.
 */

import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { adminAPI } from '@/services/api';

const PIN_KEY = 'terraalert_admin_pin';

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
    const [pin, setPin] = useState(null);

    useEffect(() => {
        let cancelled = false;
        SecureStore.getItemAsync(PIN_KEY)
            .then((saved) => {
                if (!saved || cancelled) return;
                setPin(saved);
                // Re-check in the background: if the backend PIN changed, leave admin mode.
                // Network errors keep admin mode on (the backend still checks every admin request).
                adminAPI
                    .verify(saved)
                    .then((valid) => {
                        if (!valid && !cancelled) {
                            setPin(null);
                            SecureStore.deleteItemAsync(PIN_KEY).catch(() => {});
                        }
                    })
                    .catch(() => {});
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    // Returns true when the PIN is correct; throws on network errors / lockout
    const unlock = useCallback(async (candidate) => {
        const valid = await adminAPI.verify(candidate);
        if (valid) {
            await SecureStore.setItemAsync(PIN_KEY, candidate);
            setPin(candidate);
        }
        return valid;
    }, []);

    const lock = useCallback(() => {
        setPin(null);
        SecureStore.deleteItemAsync(PIN_KEY).catch(() => {});
    }, []);

    const value = useMemo(() => ({ isAdmin: pin != null, adminPin: pin, unlock, lock }), [pin, unlock, lock]);

    return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
    const ctx = useContext(AdminContext);
    if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
    return ctx;
}
