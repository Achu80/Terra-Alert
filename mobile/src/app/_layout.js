import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LocationProvider } from '@/context/LocationContext';
import { PredictionProvider } from '@/context/PredictionContext';
import { colors } from '@/theme/colors';

const WELCOME_KEY = 'terra-alert-welcome-complete';

function LaunchScreen() {
    const pulse = useState(() => new Animated.Value(0.88))[0];

    useEffect(() => {
        const animation = Animated.loop(Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 850, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0.88, duration: 850, useNativeDriver: true }),
        ]));
        animation.start();
        return () => animation.stop();
    }, [pulse]);

    return (
        <View style={styles.launch}>
            <View style={styles.launchArtwork}>
                <View style={styles.orbitOuter} />
                <View style={styles.orbitInner} />
                <Animated.View style={[styles.launchIcon, { transform: [{ scale: pulse }] }]}>
                    <Ionicons name="earth" size={36} color="#0b1220" />
                </Animated.View>
            </View>
            <Text style={styles.brand}>TERRA ALERT</Text>
            <Text style={styles.launchCaption}>Understanding the ground beneath us</Text>
            <ActivityIndicator color={colors.primary} style={styles.launchSpinner} />
        </View>
    );
}

function WelcomeScreen({ onGetStarted }) {
    return (
        <View style={styles.welcome}>
            <View style={styles.welcomeTopline}>
                <View style={styles.brandMark}><Ionicons name="earth" size={19} color="#0b1220" /></View>
                <Text style={styles.welcomeBrand}>TERRA ALERT</Text>
                <View style={styles.liveTag}><View style={styles.liveDot} /><Text style={styles.liveLabel}>HIMACHAL</Text></View>
            </View>

            <View style={styles.hero}>
                <View style={styles.terrain}>
                    <View style={styles.terrainGlow} />
                    <Ionicons name="trail-sign-outline" size={34} color="#f4c95d" style={styles.terrainPin} />
                    <Ionicons name="chevron-down" size={18} color="#e7f4f0" style={styles.terrainChevron} />
                    <View style={styles.ridgeBack} />
                    <View style={styles.ridgeFront} />
                    <View style={styles.ridgeBase} />
                    <View style={styles.terrainLabel}><View style={styles.labelDot} /><Text style={styles.terrainLabelText}>TERRAIN MONITORING ACTIVE</Text></View>
                </View>
                <Text style={styles.eyebrow}>KNOW THE RISK. MOVE WITH CONFIDENCE.</Text>
                <Text style={styles.headline}>A clearer view of{ '\n' }mountain risk.</Text>
                <Text style={styles.intro}>
                    Terra Alert combines satellite observations and machine learning to help you explore landslide risk across Himachal Pradesh.
                </Text>
            </View>

            <View style={styles.stats}>
                <View style={styles.stat}>
                    <Ionicons name="analytics-outline" size={20} color="#46d6c3" />
                    <Text style={styles.statValue}>97%</Text>
                    <Text style={styles.statLabel}>Model accuracy</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                    <Ionicons name="location-outline" size={20} color="#f4c95d" />
                    <Text style={styles.statValue}>12</Text>
                    <Text style={styles.statLabel}>Districts covered</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <Pressable
                    accessibilityRole="button"
                    onPress={onGetStarted}
                    style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
                >
                    <Text style={styles.startButtonText}>Get started</Text>
                    <Ionicons name="arrow-forward" size={19} color="#0b1220" />
                </Pressable>
                <Text style={styles.footerNote}>LOCAL INSIGHT FOR A SAFER TOMORROW</Text>
            </View>
        </View>
    );
}

export default function RootLayout() {
    const [startup, setStartup] = useState('loading');

    useEffect(() => {
        let active = true;
        const startedAt = Date.now();
        AsyncStorage.getItem(WELCOME_KEY).then((value) => {
            const remaining = Math.max(0, 900 - (Date.now() - startedAt));
            setTimeout(() => {
                if (active) setStartup(value === 'true' ? 'app' : 'welcome');
            }, remaining);
        }).catch(() => {
            if (active) setStartup('welcome');
        });
        return () => { active = false; };
    }, []);

    const finishWelcome = async () => {
        try {
            await AsyncStorage.setItem(WELCOME_KEY, 'true');
        } finally {
            setStartup('app');
        }
    };

    return (
        <LocationProvider>
            <PredictionProvider>
                <StatusBar style="light" />
                {startup === 'loading' ? <LaunchScreen /> : null}
                {startup === 'welcome' ? <WelcomeScreen onGetStarted={finishWelcome} /> : null}
                {startup === 'app' ? <Stack screenOptions={{ headerShown: false }} /> : null}
            </PredictionProvider>
        </LocationProvider>
    );
}

const styles = StyleSheet.create({
    launch: { flex: 1, backgroundColor: '#07151a', alignItems: 'center', justifyContent: 'center' },
    launchArtwork: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
    orbitOuter: { position: 'absolute', width: 128, height: 128, borderRadius: 64, borderWidth: 1, borderColor: '#46d6c344' },
    orbitInner: { position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 1, borderColor: '#f4c95d55' },
    launchIcon: { width: 68, height: 68, borderRadius: 23, backgroundColor: '#46d6c3', alignItems: 'center', justifyContent: 'center' },
    brand: { color: '#f1f7f4', fontSize: 16, fontWeight: '800', letterSpacing: 3 },
    launchCaption: { color: '#91aaa5', fontSize: 12, marginTop: 9 },
    launchSpinner: { position: 'absolute', bottom: 56 },
    welcome: { flex: 1, backgroundColor: '#07151a', paddingHorizontal: 24, paddingTop: 58, paddingBottom: 22, justifyContent: 'space-between' },
    welcomeTopline: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    brandMark: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#46d6c3', alignItems: 'center', justifyContent: 'center' },
    welcomeBrand: { flex: 1, color: '#e9f4ef', fontSize: 13, fontWeight: '800', letterSpacing: 1.7 },
    liveTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#46d6c344' },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#46d6c3' },
    liveLabel: { color: '#a7c5bc', fontSize: 9, fontWeight: '700', letterSpacing: 0.7 },
    hero: { marginTop: 20 },
    terrain: { height: 214, borderRadius: 22, backgroundColor: '#10282b', overflow: 'hidden', justifyContent: 'flex-end', marginBottom: 25 },
    terrainGlow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: '#f4c95d12', top: -70, right: -15 },
    terrainPin: { position: 'absolute', top: 46, right: '27%', zIndex: 4 },
    terrainChevron: { position: 'absolute', top: 84, right: '31%', zIndex: 4 },
    ridgeBack: { position: 'absolute', width: 250, height: 140, bottom: 48, left: -45, backgroundColor: '#1c4945', transform: [{ rotate: '-21deg' }], borderTopRightRadius: 90 },
    ridgeFront: { position: 'absolute', width: 270, height: 125, bottom: 25, right: -58, backgroundColor: '#237067', transform: [{ rotate: '18deg' }], borderTopLeftRadius: 100 },
    ridgeBase: { height: 62, backgroundColor: '#16443e', zIndex: 2 },
    terrainLabel: { position: 'absolute', bottom: 19, left: 16, zIndex: 3, flexDirection: 'row', alignItems: 'center', gap: 7 },
    labelDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#46d6c3' },
    terrainLabelText: { color: '#d4e7df', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
    eyebrow: { color: '#46d6c3', fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginBottom: 9 },
    headline: { color: '#f1f7f4', fontSize: 34, lineHeight: 39, fontWeight: '800' },
    intro: { color: '#a5b9b4', fontSize: 14, lineHeight: 21, marginTop: 11 },
    stats: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#ffffff18', paddingVertical: 14 },
    stat: { flex: 1, alignItems: 'center', gap: 3 },
    statValue: { color: '#f1f7f4', fontSize: 21, fontWeight: '800', fontVariant: ['tabular-nums'] },
    statLabel: { color: '#9cb1ab', fontSize: 11 },
    statDivider: { width: 1, height: 44, backgroundColor: '#ffffff20' },
    footer: { gap: 13 },
    startButton: { minHeight: 56, borderRadius: 15, paddingHorizontal: 20, backgroundColor: '#f4c95d', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    startButtonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
    startButtonText: { color: '#14221f', fontSize: 16, fontWeight: '800' },
    footerNote: { color: '#68827b', fontSize: 9, fontWeight: '700', textAlign: 'center', letterSpacing: 1.1 },
});
