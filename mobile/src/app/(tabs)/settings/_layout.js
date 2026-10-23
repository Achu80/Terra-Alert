import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';

// Settings has its own page stack: tapping a row slides its detail page in, with a back arrow
export default function SettingsLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerTitleStyle: { fontWeight: '600' },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: colors.background },
                // Detail pages slide in from the right, like a phone's own Settings app
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="thresholds" options={{ title: 'Risk thresholds' }} />
            <Stack.Screen name="location" options={{ title: 'Saved location' }} />
            <Stack.Screen name="model" options={{ title: 'Prediction model' }} />
            <Stack.Screen name="sources" options={{ title: 'Data sources' }} />
            <Stack.Screen name="backend" options={{ title: 'Backend server' }} />
            <Stack.Screen name="about" options={{ title: 'About' }} />
        </Stack>
    );
}
