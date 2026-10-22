import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import LaunchScreen from '@/components/startup/LaunchScreen';
import WelcomeScreen from '@/components/startup/WelcomeScreen';
import { AdminProvider } from '@/context/AdminContext';
import { LocationProvider } from '@/context/LocationContext';
import { PredictionProvider } from '@/context/PredictionContext';
import { SettingsProvider } from '@/context/SettingsContext';

// How long the launch screen stays up on every start (the providers load saved data meanwhile)
const LAUNCH_MS = 1200;

export default function RootLayout() {
    // Every app start: launch screen -> welcome screen -> app
    const [startup, setStartup] = useState('loading');

    useEffect(() => {
        const timer = setTimeout(() => setStartup('welcome'), LAUNCH_MS);
        return () => clearTimeout(timer);
    }, []);

    return (
        <AdminProvider>
            <SettingsProvider>
                <LocationProvider>
                    <PredictionProvider>
                        <StatusBar style="light" />
                        {startup === 'loading' ? <LaunchScreen /> : null}
                        {startup === 'welcome' ? <WelcomeScreen onGetStarted={() => setStartup('app')} /> : null}
                        {startup === 'app' ? <Stack screenOptions={{ headerShown: false }} /> : null}
                    </PredictionProvider>
                </LocationProvider>
            </SettingsProvider>
        </AdminProvider>
    );
}
