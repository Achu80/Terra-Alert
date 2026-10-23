import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RISK_GUIDANCE } from '@/constants/riskGuidance';
import { useAlerts } from '@/context/AlertContext';
import { colors } from '@/theme/colors';
import { getRiskColor, withAlpha } from '@/utils/risk';

/**
 * Notification-style pop-up that slides down from the top while there are Moderate+ alerts.
 * Tap -> alert sheet with details and what to do; the x hides it until the alerts change.
 */
export default function AlertBanner() {
    const { bannerVisible, top, items, openSheet, dismiss } = useAlerts();
    const insets = useSafeAreaInsets();
    const slide = useState(() => new Animated.Value(0))[0];
    const pulse = useState(() => new Animated.Value(0))[0];

    // Slide in with a spring when alerts appear; slide out when dismissed
    useEffect(() => {
        const anim = bannerVisible
            ? Animated.spring(slide, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 160 })
            : Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true });
        anim.start();
        return () => anim.stop();
    }, [bannerVisible, slide]);

    useEffect(() => {
        const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }));
        loop.start();
        return () => loop.stop();
    }, [pulse]);

    // `top` stays set after dismissing, so the text is still there while the banner slides away
    if (!top) return null;

    const color = getRiskColor(top.level);
    const guidance = RISK_GUIDANCE[top.level];
    const where = top.kind === 'forecast' ? `${top.place} · in the forecast` : top.place;

    return (
        <Animated.View
            pointerEvents={bannerVisible ? 'box-none' : 'none'}
            style={[
                styles.wrap,
                { top: insets.top + 6 },
                {
                    opacity: slide,
                    transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }) }],
                },
            ]}
        >
            <Pressable
                onPress={openSheet}
                accessibilityRole="button"
                accessibilityLabel={`${top.level} landslide risk. Open alert details`}
                style={({ pressed }) => [
                    styles.banner,
                    { borderColor: withAlpha(color, 0.55), backgroundColor: '#1a1a1d' },
                    pressed && styles.pressed,
                ]}
            >
                <View style={[styles.iconWrap, { backgroundColor: withAlpha(color, 0.18) }]}>
                    <Animated.View
                        style={[
                            styles.pulse,
                            {
                                backgroundColor: color,
                                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
                                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }],
                            },
                        ]}
                    />
                    <Ionicons name="warning" size={20} color={color} />
                </View>
                <View style={styles.texts}>
                    <Text style={styles.title} numberOfLines={1}>
                        <Text style={{ color }}>{top.level}</Text> landslide risk · {guidance.title}
                    </Text>
                    <Text style={styles.subtitle} numberOfLines={1}>
                        {where}
                        {items.length > 1 ? ` · ${items.length} alerts` : ''} · Tap for what to do
                    </Text>
                </View>
                <Pressable onPress={dismiss} hitSlop={10} accessibilityLabel="Hide alert" style={styles.close}>
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                </Pressable>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrap: { position: 'absolute', left: 12, right: 12, zIndex: 50 },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingLeft: 10,
        paddingRight: 8,
        borderRadius: 18,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.45,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
    },
    pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
    iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    pulse: { position: 'absolute', width: 40, height: 40, borderRadius: 12 },
    texts: { flex: 1 },
    title: { color: colors.text, fontSize: 14, fontWeight: '700' },
    subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    close: { padding: 4 },
});
