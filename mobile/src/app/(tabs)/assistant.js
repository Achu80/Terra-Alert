import { StyleSheet, Text } from 'react-native';
import Screen from '@/components/Screen';
import { colors } from '@/theme/colors';

// TODO: port from the web frontend
export default function AssistantScreen() {
    return (
        <Screen title="AI Assistant" subtitle="Ask about risk, hospitals and routes">
            <Text style={styles.placeholder}>Coming soon</Text>
        </Screen>
    );
}

const styles = StyleSheet.create({
    placeholder: { color: colors.textMuted },
});
