import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '@/theme/colors';

const icon = (name) => ({ color, size }) => <Ionicons name={name} color={color} size={size} />;

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home') }} />
            <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: icon('map') }} />
            <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: icon('warning') }} />
            <Tabs.Screen name="assistant" options={{ title: 'Assistant', tabBarIcon: icon('chatbubbles') }} />
            <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings') }} />
        </Tabs>
    );
}
