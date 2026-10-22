import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import GlassView from '@/components/GlassView';
import { colors } from '@/theme/colors';

// Mobile counterparts of the web BentoCard and SectionLabel, in the dark glass style
export function Card({ style, children }) {
    return <GlassView style={[styles.card, style]}>{children}</GlassView>;
}

export function SectionLabel({ icon, children }) {
    return (
        <View style={styles.labelRow}>
            {icon ? <Ionicons name={icon} size={16} color={colors.primary} /> : null}
            <Text style={styles.label}>{children}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: { padding: 16 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
});
