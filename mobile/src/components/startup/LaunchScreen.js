import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

// Shown on every app start while the app gets ready, before the welcome screen
export default function LaunchScreen() {
    const pulse = useState(() => new Animated.Value(0.88))[0];

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1, duration: 850, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0.88, duration: 850, useNativeDriver: true }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [pulse]);

    return (
        <View style={styles.launch}>
            <View style={styles.launchArtwork}>
                <View style={styles.orbitOuter} />
                <View style={styles.orbitInner} />
                <Animated.View style={[styles.launchIcon, { transform: [{ scale: pulse }] }]}>
                    <Ionicons name="earth" size={36} color={colors.background} />
                </Animated.View>
            </View>
            <Text style={styles.brand}>TERRA ALERT</Text>
            <Text style={styles.launchCaption}>Understanding the ground beneath us</Text>
            <ActivityIndicator color={colors.primary} style={styles.launchSpinner} />
        </View>
    );
}

const styles = StyleSheet.create({
    launch: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
    launchArtwork: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
    orbitOuter: { position: 'absolute', width: 128, height: 128, borderRadius: 64, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
    orbitInner: { position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 1, borderColor: `${colors.primary}66` },
    launchIcon: { width: 68, height: 68, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    brand: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 3 },
    launchCaption: { color: colors.textMuted, fontSize: 12, marginTop: 9 },
    launchSpinner: { position: 'absolute', bottom: 56 },
});
