import { KeyboardAvoidingView, StyleSheet } from 'react-native';
import Chatbot from '@/components/assistant/Chatbot';
import Screen from '@/components/Screen';
import { usePrediction } from '@/context/PredictionContext';

// Mobile version of the web AssistantPage
export default function AssistantScreen() {
    const { prediction, chatKey } = usePrediction();

    return (
        <Screen
            title="Terra Alert Assistant"
            subtitle="Ask about landslide first aid, or get location-aware help after a risk assessment"
        >
            {/* Pushes the input row above the on-screen keyboard */}
            <KeyboardAvoidingView style={styles.fill} behavior="padding">
                {/* New key for every new analysis -> React mounts a fresh chat (new messages, new backend session) */}
                <Chatbot key={chatKey} prediction={prediction} />
            </KeyboardAvoidingView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1, paddingBottom: 12 },
});
