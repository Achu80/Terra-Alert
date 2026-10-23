import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import GlassView from '@/components/GlassView';
import { useAdmin } from '@/context/AdminContext';
import { useAlerts } from '@/context/AlertContext';
import { adminAPI, modelsAPI } from '@/services/api';
import { colors, RISK_COLORS } from '@/theme/colors';
import { withAlpha } from '@/utils/risk';

const RAIN_LABELS = {
    chirps: 'CHIRPS (about 3 weeks behind)',
    imerg: 'NASA IMERG (about 1 day behind)',
};

// Test results stored in each model's meta.json, in plain words
const METRIC_LABELS = {
    accuracy_random_split: 'Accuracy, random test split',
    roc_auc_random_split: 'ROC-AUC, random test split',
    spatial_cv_accuracy: 'Accuracy, unseen areas',
    spatial_cv_roc_auc: 'ROC-AUC, unseen areas',
    himachal_holdout_accuracy: 'Accuracy, Himachal held out',
    himachal_holdout_roc_auc: 'ROC-AUC, Himachal held out',
    v2_spatial_cv_roc_auc: 'v2 on the same test: ROC-AUC, unseen areas',
    v2_himachal_holdout_roc_auc: 'v2 on the same test: ROC-AUC, Himachal',
};

const formatMetric = (key, value) =>
    value == null ? '–' : key.includes('accuracy') ? `${Math.round(value * 100)}%` : Number(value).toFixed(2);

/**
 * Admin: pick the landslide model every user's predictions use (backend: POST /api/admin/model).
 */
export default function ModelSelector() {
    const { adminPin } = useAdmin();
    const { refreshForecast } = useAlerts();
    const [state, setState] = useState({ loading: true, models: [], error: null });
    const [switching, setSwitching] = useState(null);

    useEffect(() => {
        let cancelled = false;
        modelsAPI
            .list()
            .then((r) => !cancelled && setState({ loading: false, models: r.models ?? [], error: null }))
            .catch((e) => !cancelled && setState({ loading: false, models: [], error: e.message }));
        return () => {
            cancelled = true;
        };
    }, []);

    const switchTo = (model) => {
        Alert.alert(
            `Use ${model.version} for everyone?`,
            `From now on, every user's new predictions, district map and alerts will use ${model.label}. You can switch back at any time.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: `Use ${model.version}`,
                    onPress: async () => {
                        setSwitching(model.version);
                        try {
                            const r = await adminAPI.setModel(model.version, adminPin);
                            setState({ loading: false, models: r.models ?? [], error: null });
                            refreshForecast(); // alerts re-check with the new model
                        } catch (e) {
                            Alert.alert("Couldn't switch model", e.message);
                        } finally {
                            setSwitching(null);
                        }
                    },
                },
            ]
        );
    };

    if (state.loading) return <ActivityIndicator color={colors.primary} style={styles.loader} />;
    if (state.error) return <Text style={styles.error}>{`Couldn't load models: ${state.error}`}</Text>;

    return (
        <View style={styles.wrap}>
            {state.models.map((m) => (
                <GlassView key={m.version} style={[styles.card, m.active && styles.cardActive]}>
                    <View style={styles.header}>
                        <View style={[styles.icon, m.active && { backgroundColor: withAlpha(colors.primary, 0.18) }]}>
                            <Ionicons name="hardware-chip" size={20} color={m.active ? colors.primary : colors.textMuted} />
                        </View>
                        <Text style={styles.title}>{m.label}</Text>
                        {m.active ? (
                            <View style={styles.activeChip}>
                                <Text style={styles.activeText}>ACTIVE</Text>
                            </View>
                        ) : null}
                    </View>
                    {m.description ? <Text style={styles.description}>{m.description}</Text> : null}

                    <View style={styles.line}>
                        <Ionicons name="rainy" size={14} color={colors.info} />
                        <Text style={styles.lineText}>Rain data: {RAIN_LABELS[m.rain_source] ?? m.rain_source}</Text>
                    </View>
                    {Object.entries(m.metrics ?? {}).map(([key, value]) => (
                        <View key={key} style={styles.metric}>
                            <Text style={styles.metricLabel}>{METRIC_LABELS[key] ?? key}</Text>
                            <Text style={styles.metricValue}>{formatMetric(key, value)}</Text>
                        </View>
                    ))}

                    {!m.active ? (
                        <Pressable
                            onPress={() => switchTo(m)}
                            disabled={switching != null}
                            style={({ pressed }) => [styles.button, (pressed || switching) && styles.pressed]}
                        >
                            {switching === m.version ? (
                                <ActivityIndicator color={colors.background} />
                            ) : (
                                <Text style={styles.buttonText}>Use this model for everyone</Text>
                            )}
                        </Pressable>
                    ) : null}
                </GlassView>
            ))}
            {state.models.length < 2 ? (
                <Text style={styles.note}>v3 will appear here once it has been trained and installed on the server.</Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { gap: 12 },
    loader: { marginVertical: 20 },
    error: { color: RISK_COLORS.Critical, fontSize: 13 },
    card: { padding: 14, gap: 8 },
    cardActive: { borderColor: withAlpha(colors.primary, 0.55) },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glass },
    title: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
    activeChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: withAlpha(colors.primary, 0.18) },
    activeText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
    description: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
    line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    lineText: { color: colors.text, fontSize: 13 },
    metric: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    metricLabel: { color: colors.textMuted, fontSize: 12, flex: 1 },
    metricValue: { color: colors.text, fontSize: 13, fontWeight: '700' },
    button: { marginTop: 6, minHeight: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    buttonText: { color: colors.background, fontWeight: '700' },
    pressed: { opacity: 0.7 },
    note: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});
