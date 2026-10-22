import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useAdmin } from '@/context/AdminContext';
import { colors } from '@/theme/colors';

/**
 * Wrap anything that only admins should see:
 *   <AdminOnly><RefreshButton /></AdminOnly>
 * Regular users see `fallback` (nothing by default).
 */
export default function AdminOnly({ children, fallback = null }) {
    const { isAdmin } = useAdmin();
    return isAdmin ? children : fallback;
}

// For whole admin screens: shows a short notice instead of the screen for regular users
export function AdminScreenGate({ children }) {
    const { isAdmin } = useAdmin();
    if (isAdmin) return children;
    return (
        <View style={styles.gate}>
            <Ionicons name="lock-closed" size={32} color={colors.textMuted} />
            <Text style={styles.gateTitle}>Admin only</Text>
            <Text style={styles.gateText}>This page is available to Terra Alert administrators.</Text>
        </View>
    );
}

// Small label shown next to admin-only sections so admins know users don't see them
export function AdminBadge() {
    return (
        <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={11} color="#fbbf24" />
            <Text style={styles.badgeText}>Admin</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    gate: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
    gateTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
    gateText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: 'rgba(251,191,36,0.12)',
    },
    badgeText: { color: '#fbbf24', fontSize: 11, fontWeight: '700' },
});
