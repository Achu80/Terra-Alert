import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAdmin } from '@/context/AdminContext';
import { colors, RISK_COLORS } from '@/theme/colors';

// PIN prompt for admin mode. The PIN is checked by the backend, never inside the app.
export default function AdminUnlockModal({ visible, onClose, onUnlocked }) {
    const { unlock } = useAdmin();
    const [pin, setPin] = useState('');
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState(null);

    const close = () => {
        setPin('');
        setError(null);
        onClose();
    };

    const submit = async () => {
        if (pin.length < 4 || checking) return;
        setChecking(true);
        setError(null);
        try {
            const valid = await unlock(pin);
            if (valid) {
                setPin('');
                onUnlocked?.();
                onClose();
            } else {
                setError('Wrong PIN.');
                setPin('');
            }
        } catch (e) {
            setError(e.message.includes('Too many') ? e.message : `Couldn't reach the server: ${e.message}`);
        } finally {
            setChecking(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
            <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
                <View style={styles.sheet}>
                    <View style={styles.icon}>
                        <Ionicons name="shield-checkmark" size={26} color="#fbbf24" />
                    </View>
                    <Text style={styles.title}>Admin mode</Text>
                    <Text style={styles.text}>Enter the admin PIN to see management tools on this phone.</Text>

                    <TextInput
                        value={pin}
                        onChangeText={(t) => setPin(t.replace(/\D/g, ''))}
                        onSubmitEditing={submit}
                        placeholder="PIN"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        secureTextEntry
                        maxLength={12}
                        autoFocus
                        style={styles.input}
                    />
                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <View style={styles.buttons}>
                        <Pressable onPress={close} style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed]}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={submit}
                            disabled={pin.length < 4 || checking}
                            style={({ pressed }) => [styles.button, styles.confirm, (pin.length < 4 || checking) && styles.disabled, pressed && styles.pressed]}
                        >
                            {checking ? <ActivityIndicator color={colors.background} /> : <Text style={styles.confirmText}>Unlock</Text>}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
    sheet: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 20, alignItems: 'center' },
    icon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(251,191,36,0.12)',
        marginBottom: 10,
    },
    title: { color: colors.text, fontSize: 18, fontWeight: '700' },
    text: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 18 },
    input: {
        alignSelf: 'stretch',
        marginTop: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        color: colors.text,
        fontSize: 22,
        letterSpacing: 6,
        textAlign: 'center',
        paddingVertical: 12,
    },
    error: { color: RISK_COLORS.Critical, fontSize: 13, marginTop: 8 },
    buttons: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 18 },
    button: { flex: 1, minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cancel: { borderWidth: 1, borderColor: colors.border },
    cancelText: { color: colors.text, fontWeight: '600' },
    confirm: { backgroundColor: colors.primary },
    confirmText: { color: colors.background, fontWeight: '700' },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.75 },
});
