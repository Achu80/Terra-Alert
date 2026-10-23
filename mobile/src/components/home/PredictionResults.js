import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AdminBadge } from '@/components/admin/AdminOnly';
import { Card, SectionLabel } from '@/components/Card';
import { Stagger } from '@/components/FadeInView';
import ForecastSection from '@/components/home/ForecastSection';
import RiskHeatmap from '@/components/home/RiskHeatmap';
import { useAdmin } from '@/context/AdminContext';
import { useAlerts } from '@/context/AlertContext';
import { useSettings } from '@/context/SettingsContext';
import { colors, RISK_COLORS } from '@/theme/colors';
import { formatConfidence, getRiskColor, getRiskLevel, withAlpha } from '@/utils/risk';

function MetricCard({ label, value, unit, color, icon }) {
    return (
        <View style={[styles.metric, { backgroundColor: withAlpha(color, 0.1), borderColor: withAlpha(color, 0.25) }]}>
            <View style={styles.metricHeader}>
                <Ionicons name={icon} size={14} color={color} />
                <Text style={styles.metricLabel}>{label}</Text>
            </View>
            <View style={styles.metricValueRow}>
                <Text style={[styles.metricValue, { color }]}>{value ?? '–'}</Text>
                {unit ? <Text style={styles.metricUnit}>{unit}</Text> : null}
            </View>
        </View>
    );
}

const formatParam = (value) => (typeof value === 'number' ? value.toFixed(2) : String(value ?? '–'));
const prettyName = (name) => name.replace(/_/g, ' ');

/**
 * Mobile version of the web PredictionResults: score, key metrics, heatmap,
 * environmental parameters and the forecast tabs
 */
export default function PredictionResults({ result, onNewAssessment }) {
    const { prediction, features, forecast, location } = result;
    const { thresholds } = useSettings();
    const { isAdmin } = useAdmin();
    const level = getRiskLevel(prediction.score, thresholds);
    const color = getRiskColor(level);
    const values = features.values;

    // Real rainfall-forecast-based risk for the saved location (the place being assessed).
    // Fetched once by AlertContext and shared with the alert pop-up.
    const { forecast: weather } = useAlerts();

    // Indexes follow the backend FEATURE_ORDER (0 elevation, 1 slope, 3 ndvi, 9 rainfall_30d)
    const metrics = [
        { label: 'Elevation', value: values[0]?.toFixed(0), unit: 'm', color: colors.info, icon: 'trending-up-outline' },
        { label: 'Slope Angle', value: values[1]?.toFixed(1), unit: '°', color: RISK_COLORS.High, icon: 'triangle-outline' },
        { label: '30-Day Rainfall', value: values[9]?.toFixed(1), unit: 'mm', color: colors.info, icon: 'rainy-outline' },
        { label: 'Vegetation (NDVI)', value: values[3]?.toFixed(2), color: RISK_COLORS.Low, icon: 'leaf-outline' },
    ];

    return (
        <View style={styles.wrap}>
            {/* Sections cascade in one after another */}
            <Stagger step={60}>
            <View style={styles.header}>
                <View style={styles.headerText}>
                    <Text style={styles.title}>Risk Assessment</Text>
                    <Text style={styles.place} numberOfLines={2}>
                        {location.name}
                        {location.region ? `, ${location.region}` : ''}
                    </Text>
                </View>
                <Pressable
                    onPress={onNewAssessment}
                    accessibilityRole="button"
                    accessibilityLabel="Start a new analysis"
                    style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}
                >
                    <Ionicons name="add" size={18} color={colors.primary} />
                    <Text style={styles.newButtonText}>New analysis</Text>
                </Pressable>
            </View>

            {/* Admin: which model answered and how fresh its rain data was */}
            {isAdmin && result.model ? (
                <View style={styles.modelLine}>
                    <Ionicons name="hardware-chip-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.modelText}>
                        Model {result.model.version} · rain: {result.model.rain_source_used ?? 'unknown'}
                        {result.model.rain_data_age_days != null ? `, ${result.model.rain_data_age_days} day(s) old` : ''}
                    </Text>
                    {result.model.rain_source_used === 'open-meteo' || (result.model.rain_data_age_days ?? 0) > 3 ? (
                        <Ionicons name="warning" size={14} color={RISK_COLORS.Moderate} />
                    ) : null}
                </View>
            ) : null}

            {result.warning ? (
                <View style={styles.warning}>
                    <Ionicons name="alert-circle-outline" size={16} color={RISK_COLORS.Moderate} />
                    <Text style={styles.warningText}>{result.warning}</Text>
                </View>
            ) : null}

            <Card style={{ backgroundColor: withAlpha(color, 0.1), borderColor: withAlpha(color, 0.3) }}>
                <SectionLabel>Risk Score</SectionLabel>
                <View style={styles.scoreBox}>
                    <Text style={[styles.score, { color }]}>{prediction.score}</Text>
                    <View style={[styles.levelPill, { backgroundColor: withAlpha(color, 0.2) }]}>
                        <Text style={[styles.levelText, { color }]}>{level} RISK</Text>
                    </View>
                    <Text style={styles.confidence}>Confidence: {formatConfidence(prediction.confidence)}</Text>
                </View>
            </Card>

            <View style={styles.metricGrid}>
                {metrics.map((m) => (
                    <MetricCard key={m.label} {...m} />
                ))}
            </View>

            <Card>
                <SectionLabel icon="map-outline">Risk Heatmap</SectionLabel>
                <RiskHeatmap location={location} score={prediction.score} />
            </Card>

            {/* Admin only: the raw model inputs. A plain condition (not <AdminOnly>) so nothing is left in the layout for users */}
            {isAdmin ? (
                <Card>
                    <SectionLabel icon="grid-outline">Environmental Parameters</SectionLabel>
                    <AdminBadge />
                    <View style={styles.paramGrid}>
                        {features.names.slice(0, 10).map((name, i) => (
                            <View key={name} style={styles.param}>
                                <Text style={styles.paramName}>{prettyName(name)}</Text>
                                <Text style={styles.paramValue}>{formatParam(values[i])}</Text>
                            </View>
                        ))}
                    </View>
                </Card>
            ) : null}

            {forecast ? (
                <ForecastSection
                    forecast={forecast}
                    weather={weather}
                />
            ) : null}

            <Pressable
                onPress={onNewAssessment}
                accessibilityRole="button"
                style={({ pressed }) => [styles.newWide, pressed && styles.pressed]}
            >
                <Ionicons name="refresh" size={18} color={colors.background} />
                <Text style={styles.newWideText}>Start a new analysis</Text>
            </Pressable>
            <Text style={styles.newHint}>This also starts a fresh conversation with the assistant.</Text>
            </Stagger>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { gap: 16 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerText: { flex: 1 },
    title: { color: colors.text, fontSize: 20, fontWeight: '700' },
    place: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    newButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.5),
        backgroundColor: withAlpha(colors.primary, 0.1),
    },
    newButtonText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    newWide: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 52,
        borderRadius: 16,
        backgroundColor: colors.primary,
        marginTop: 4,
    },
    newWideText: { color: colors.background, fontWeight: '700', fontSize: 15 },
    modelLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    modelText: { color: colors.textMuted, fontSize: 12, flexShrink: 1 },
    newHint: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: -6 },
    pressed: { opacity: 0.7 },
    warning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        borderRadius: 10,
        backgroundColor: withAlpha(RISK_COLORS.Moderate, 0.1),
    },
    warningText: { color: RISK_COLORS.Moderate, fontSize: 13, flex: 1 },
    scoreBox: { alignItems: 'center', paddingVertical: 8 },
    score: { fontSize: 64, fontWeight: '800' },
    levelPill: { paddingHorizontal: 20, paddingVertical: 6, borderRadius: 999, marginTop: 4 },
    levelText: { fontSize: 16, fontWeight: '700' },
    confidence: { color: colors.textMuted, fontSize: 13, marginTop: 12 },
    metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    metric: { flexGrow: 1, flexBasis: '45%', borderWidth: 1, borderRadius: 12, padding: 12 },
    metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metricLabel: { color: colors.textMuted, fontSize: 12 },
    metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 6 },
    metricValue: { fontSize: 24, fontWeight: '700' },
    metricUnit: { color: colors.textMuted, fontSize: 13 },
    paramGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    param: {
        flexGrow: 1,
        flexBasis: '45%',
        padding: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: colors.border,
    },
    paramName: { color: colors.textMuted, fontSize: 11, textTransform: 'capitalize' },
    paramValue: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 4 },
});
