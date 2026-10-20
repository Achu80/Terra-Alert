import { StyleSheet, Text } from 'react-native';
import Screen from '@/components/Screen';
import { colors } from '@/theme/colors';

// TODO: port from the web frontend
export default function AlertsScreen() {
    return (
        <Screen title="Alerts" subtitle="High-risk areas and recent warnings">
            <Text style={styles.placeholder}>Coming soon</Text>
        </Screen>
    );
}

const styles = StyleSheet.create({
    placeholder: { color: colors.textMuted },
});
