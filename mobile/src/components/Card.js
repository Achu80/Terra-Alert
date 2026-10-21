import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

// Mobile counterparts of the web BentoCard and SectionLabel
export function Card({ style, children }) {
    return <View style={[styles.card, style]}>{children}</View>;
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
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
});
