import { StyleSheet, Text } from 'react-native';
import Screen from '@/components/Screen';
import { colors } from '@/theme/colors';

// TODO: port from the web frontend
export default function MapScreen() {
    return (
        <Screen title="Map Explorer" subtitle="Tap anywhere to predict landslide risk">
            <Text style={styles.placeholder}>Coming soon</Text>
        </Screen>
    );
}

const styles = StyleSheet.create({
    placeholder: { color: colors.textMuted },
});
