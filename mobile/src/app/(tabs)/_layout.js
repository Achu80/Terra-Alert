import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Easing, StyleSheet, View } from 'react-native';
import AlertBanner from '@/components/alerts/AlertBanner';
import AlertSheet from '@/components/alerts/AlertSheet';
import { colors } from '@/theme/colors';

const icon = (name) => {
    const TabBarIcon = ({ color, size }) => <Ionicons name={name} color={color} size={size} />;
    return TabBarIcon;
};

/**
 * Material "fade through" (used for bottom tabs in Google's apps): the old screen fades out quickly
 * without moving, then the new one fades in while settling from 94% to full size with a small slide
 * in the direction of travel. The screens never overlap half-transparent, so the switch looks clean.
 *
 * progress: 0 = the visible screen, -1 / 1 = a screen off to the left / right.
 */
const fadeThrough = ({ current }) => ({
    sceneStyle: {
        opacity: current.progress.interpolate({ inputRange: [-1, -0.6, 0, 0.6, 1], outputRange: [0, 0, 1, 0, 0] }),
        transform: [
            { translateX: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-28, 0, 28] }) },
            { scale: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.94, 1, 0.94] }) },
        ],
    },
});

// Material 3 "emphasized" curve: quick start, long soft landing
const fadeThroughSpec = {
    animation: 'timing',
    config: { duration: 320, easing: Easing.bezier(0.2, 0, 0, 1) },
};

export default function TabLayout() {
    return (
        <View style={styles.fill}>
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: { backgroundColor: '#111113', borderTopColor: colors.glassBorder },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
                sceneStyleInterpolator: fadeThrough,
                transitionSpec: fadeThroughSpec,
                sceneStyle: { backgroundColor: colors.background },
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home') }} />
            <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: icon('map') }} />
            <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('time') }} />
            <Tabs.Screen name="assistant" options={{ title: 'Assistant', tabBarIcon: icon('chatbubbles') }} />
            <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings') }} />
        </Tabs>

            {/* No Alerts tab: Moderate+ readings show a pop-up over every tab; tapping it opens the alert sheet */}
            <AlertBanner />
            <AlertSheet />
        </View>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1, backgroundColor: colors.background },
});
