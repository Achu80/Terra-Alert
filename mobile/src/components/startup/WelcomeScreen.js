import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NightScene from '@/components/startup/NightScene';
import { colors } from '@/theme/colors';

/**
 * Shown after the launch screen on every app start.
 * A low-poly night scene fills the screen; the wordmark sits in the sky and the button on the ground.
 */
export default function WelcomeScreen({ onGetStarted }) {
    // 0: scene, 1: wordmark, 2: bottom panel
    const steps = useState(() => [0, 1, 2].map(() => new Animated.Value(0)))[0];

    useEffect(() => {
        Animated.stagger(
            220,
            steps.map((v) => Animated.timing(v, { toValue: 1, duration: 600, useNativeDriver: true }))
        ).start();
    }, [steps]);

    const rise = (v, distance = 18) => ({
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
    });

    return (
        <View style={styles.screen}>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: steps[0] }]}>
                <NightScene />
            </Animated.View>

            {/* Fades the ground into the background so the text and button stay readable */}
            <LinearGradient
                pointerEvents="none"
                colors={['rgba(10,10,12,0)', 'rgba(10,10,12,0.85)', colors.background]}
                locations={[0.68, 0.84, 1]}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.content} edges={['top', 'bottom']}>
                <Animated.View style={[styles.brand, rise(steps[1])]}>
                    <Text style={styles.logo}>Terra-Alert</Text>
                    <View style={styles.underline} />
                    <Text style={styles.tagline}>Landslide risk for the hills you call home</Text>
                </Animated.View>

                <Animated.View style={[styles.panel, rise(steps[2], 24)]}>
                    <Text style={styles.lead}>
                        Check any town or village in Himachal Pradesh. Satellite rainfall, slope and soil data, turned into a
                        clear risk score.
                    </Text>

                    <Pressable
                        accessibilityRole="button"
                        onPress={onGetStarted}
                        style={({ pressed }) => [styles.start, pressed && styles.startPressed]}
                    >
                        <Text style={styles.startText}>Get started</Text>
                        <Ionicons name="arrow-forward" size={18} color={colors.background} />
                    </Pressable>

                    <Pressable onPress={() => Linking.openURL('tel:112')} hitSlop={8} style={styles.emergencyRow}>
                        <Ionicons name="call" size={13} color="#f87171" />
                        <Text style={styles.emergency}>
                            Emergency? Call <Text style={styles.emergencyNumber}>112</Text>
                        </Text>
                    </Pressable>
                </Animated.View>
            </SafeAreaView>
        </View>
    );
}

const textShadow = { textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 };

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 28 },
    brand: { alignItems: 'center', marginTop: '22%' },
    logo: { color: '#ffffff', fontSize: 42, fontWeight: '800', letterSpacing: 0.5, ...textShadow },
    underline: { width: 132, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 6 },
    tagline: { color: '#d4d4d8', fontSize: 15, marginTop: 14, textAlign: 'center', ...textShadow },
    panel: { gap: 16, paddingBottom: 8 },
    lead: { color: '#d4d4d8', fontSize: 14, lineHeight: 21, textAlign: 'center' },
    start: {
        minHeight: 56,
        borderRadius: 16,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: colors.primary,
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
    },
    startPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
    startText: { color: colors.background, fontSize: 16, fontWeight: '700' },
    emergencyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    emergency: { color: colors.textMuted, fontSize: 13 },
    emergencyNumber: { color: '#f87171', fontWeight: '700' },
});
