import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';

export default function Screen({ title, subtitle, children }) {
    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <View style={styles.body}>{children}</View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
    title: { color: colors.text, fontSize: 24, fontWeight: '700' },
    subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
    body: { flex: 1, paddingHorizontal: 16 },
});
