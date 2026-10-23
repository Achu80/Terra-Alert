import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import LaunchScreen from '@/components/startup/LaunchScreen';
import WelcomeScreen from '@/components/startup/WelcomeScreen';
import { AdminProvider } from '@/context/AdminContext';
import { AlertProvider } from '@/context/AlertContext';
import { LocationProvider } from '@/context/LocationContext';
import { PredictionProvider } from '@/context/PredictionContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { colors } from '@/theme/colors';

// How long the launch screen stays up on every start (the providers load saved data meanwhile)
const LAUNCH_MS = 1200;

/**
 * Every app start: launch screen -> welcome screen -> app.
 * The startup screens are layers on top of each other: the next one is mounted underneath,
 * then the one on top fades away, so there is never a blank frame between them.
 */
export default function RootLayout() {
    const [showLaunch, setShowLaunch] = useState(true);
    const [showWelcome, setShowWelcome] = useState(false);
    const [showApp, setShowApp] = useState(false);
    const launchOut = useState(() => new Animated.Value(0))[0];
    const welcomeOut = useState(() => new Animated.Value(0))[0];

    // Launch -> welcome: mount the welcome screen underneath, then fade the launch screen out
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowWelcome(true);
            Animated.timing(launchOut, { toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(
                () => setShowLaunch(false)
            );
        }, LAUNCH_MS);
        return () => clearTimeout(timer);
    }, [launchOut]);

    // Welcome -> app: mount the app underneath, then fade the welcome screen out while it zooms in slightly
    const enterApp = () => {
        setShowApp(true);
        Animated.timing(welcomeOut, { toValue: 1, duration: 520, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(
            () => setShowWelcome(false)
        );
    };

    return (
        <AdminProvider>
            <SettingsProvider>
                <LocationProvider>
                    <PredictionProvider>
                        <AlertProvider>
                        <StatusBar style="light" />
                        <View style={styles.root}>
                            {showApp ? <Stack screenOptions={{ headerShown: false, contentStyle: styles.root }} /> : null}

                            {showWelcome ? (
                                <Animated.View
                                    pointerEvents={showApp ? 'none' : 'auto'}
                                    style={[
                                        StyleSheet.absoluteFill,
                                        {
                                            opacity: welcomeOut.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                                            transform: [{ scale: welcomeOut.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
                                        },
                                    ]}
                                >
                                    <WelcomeScreen onGetStarted={enterApp} />
                                </Animated.View>
                            ) : null}

                            {showLaunch ? (
                                <Animated.View
                                    pointerEvents="none"
                                    style={[StyleSheet.absoluteFill, { opacity: launchOut.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
                                >
                                    <LaunchScreen />
                                </Animated.View>
                            ) : null}
                        </View>
                        </AlertProvider>
                    </PredictionProvider>
                </LocationProvider>
            </SettingsProvider>
        </AdminProvider>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
});
