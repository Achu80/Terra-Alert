import { KeyboardAvoidingView, StyleSheet } from 'react-native';
import Chatbot from '@/components/assistant/Chatbot';
import Screen from '@/components/Screen';
import { usePrediction } from '@/context/PredictionContext';

// Mobile version of the web AssistantPage
export default function AssistantScreen() {
    const { prediction } = usePrediction();

    return (
        <Screen
            title="Terra Alert Assistant"
            subtitle="Ask about landslide first aid, or get location-aware help after a risk assessment"
        >
            {/* Pushes the input row above the on-screen keyboard */}
            <KeyboardAvoidingView style={styles.fill} behavior="padding">
                <Chatbot prediction={prediction} />
            </KeyboardAvoidingView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1, paddingBottom: 12 },
});
