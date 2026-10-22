import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '@/config/env';
import { healthCheck } from '@/services/api';

/**
 * Pings the backend's /health endpoint.
 * Returns { status: 'checking' | 'online' | 'offline', error, latencyMs, url, retry }
 */
export function useBackendStatus() {
    const [state, setState] = useState({ status: 'checking', error: null, latencyMs: null });

    // Only sets state after the request finishes, so it is safe to call from an effect
    const run = useCallback(() => {
        const started = Date.now();
        return healthCheck()
            .then(() => setState({ status: 'online', error: null, latencyMs: Date.now() - started }))
            .catch((e) => setState({ status: 'offline', error: e.message, latencyMs: null }));
    }, []);

    useEffect(() => {
        run();
    }, [run]);

    const retry = useCallback(() => {
        setState((s) => ({ ...s, status: 'checking' }));
        run();
    }, [run]);

    return { ...state, url: API_BASE_URL, retry };
}
