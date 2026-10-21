import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LocationProvider } from '@/context/LocationContext';
import { PredictionProvider } from '@/context/PredictionContext';

export default function RootLayout() {
    return (
        <LocationProvider>
            <PredictionProvider>
                <StatusBar style="light" />
                <Stack screenOptions={{ headerShown: false }} />
            </PredictionProvider>
        </LocationProvider>
    );
}
