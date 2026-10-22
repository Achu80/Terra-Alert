import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import Screen from '@/components/Screen';
import LeafletMap from '@/components/map/LeafletMap';
import { predictionAPI } from '@/services/api';
import { colors } from '@/theme/colors';
import { HP_BOUNDS } from '@/constants/himachal';
import { getRiskColor } from '@/utils/risk';

const LEVEL_COLORS = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MODERATE: '#eab308',
    LOW: '#10b981',
    UNKNOWN: '#6b7280',
    ERROR: '#9ca3af',
};

const formatNumber = (value, digits = 1) =>
    Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : 'N/A';

function RiskBadge({ level }) {
    const normalizedLevel = String(level || 'UNKNOWN').toUpperCase();
    const color = LEVEL_COLORS[normalizedLevel] || LEVEL_COLORS.UNKNOWN;
    return (
        <View style={[styles.riskBadge, { borderColor: `${color}88`, backgroundColor: `${color}22` }]}>
            <Text style={[styles.riskBadgeText, { color }]}>{normalizedLevel}</Text>
        </View>
    );
}

function FactorBar({ label, value, max, color }) {
    const numericValue = Number(value);
    const progress = Number.isFinite(numericValue) ? Math.max(0, Math.min(numericValue / max, 1)) : 0;
    return (
        <View style={styles.factorRow}>
            <View style={styles.factorLabelRow}>
                <Text style={styles.factorLabel}>{label}</Text>
                <Text style={styles.factorValue}>{Number.isFinite(numericValue) ? numericValue.toFixed(1) : 'N/A'}</Text>
            </View>
            <View style={styles.track}>
                <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
}

export default function MapScreen() {
    const { lat, lon } = useLocalSearchParams();
    const [districts, setDistricts] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [isCached, setIsCached] = useState(false);
    const [cacheAge, setCacheAge] = useState(null);
    const [ageUpdatedAt, setAgeUpdatedAt] = useState(null);

    const linkedLocation = useMemo(() => {
        const latitude = Number(Array.isArray(lat) ? lat[0] : lat);
        const longitude = Number(Array.isArray(lon) ? lon[0] : lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
        return { lat: latitude, lon: longitude };
    }, [lat, lon]);

    const loadDistricts = useCallback(async (forceRefresh = false) => {
        if (forceRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            const data = await predictionAPI.getDistricts(forceRefresh);
            const nextDistricts = Array.isArray(data.districts) ? data.districts : [];
            setDistricts(nextDistricts);
            setIsCached(Boolean(data.cached));
            setCacheAge(Number(data.cache_age_minutes) || 0);
            setAgeUpdatedAt(Date.now());
            setSelectedId((current) =>
                nextDistricts.some((district) => district.id === current)
                    ? current
                    : nextDistricts[0]?.id || null,
            );
        } catch (loadError) {
            setError(loadError.message || 'Could not load district data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        let active = true;
        predictionAPI.getDistricts().then((data) => {
            if (!active) return;
            const nextDistricts = Array.isArray(data.districts) ? data.districts : [];
            setDistricts(nextDistricts);
            setIsCached(Boolean(data.cached));
            setCacheAge(Number(data.cache_age_minutes) || 0);
            setAgeUpdatedAt(Date.now());
            setSelectedId(nextDistricts[0]?.id || null);
        }).catch((loadError) => {
            if (active) setError(loadError.message || 'Could not load district data.');
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (ageUpdatedAt == null) return undefined;
        const timer = setInterval(() => {
            setCacheAge((age) => (age == null ? age : age + 1));
        }, 60000);
        return () => clearInterval(timer);
    }, [ageUpdatedAt]);

    const selectedDistrict = districts.find((district) => district.id === selectedId) || null;
    const mapDistricts = districts.map((district) => ({
        ...district,
        color: LEVEL_COLORS[String(district.level || 'UNKNOWN').toUpperCase()] || LEVEL_COLORS.UNKNOWN,
        scoreLabel: Number.isFinite(Number(district.score)) ? Number(district.score).toFixed(1) : 'N/A',
    }));
    const mapMarker = linkedLocation
        ? { ...linkedLocation, title: 'Selected location', subtitle: `${linkedLocation.lat.toFixed(4)}, ${linkedLocation.lon.toFixed(4)}` }
        : null;

    return (
        <Screen title="Map Explorer" subtitle="Himachal Pradesh district risk">
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.mapHeader}>
                    <View style={styles.freshness}>
                        <View style={[styles.statusDot, { backgroundColor: cacheAge > 120 ? '#eab308' : '#10b981' }]} />
                        <Text style={styles.freshnessText}>
                            {cacheAge == null ? 'Waiting for data' : `${isCached ? 'Cached data' : 'Live data'} · ${cacheAge} min old`}
                        </Text>
                    </View>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Refresh district risk data"
                        onPress={() => loadDistricts(true)}
                        disabled={refreshing || loading}
                        style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed, (refreshing || loading) && styles.disabled]}
                    >
                        {refreshing ? <ActivityIndicator size="small" color={colors.text} /> : <Ionicons name="refresh" size={17} color={colors.text} />}
                        <Text style={styles.refreshText}>{refreshing ? 'Refreshing' : 'Refresh'}</Text>
                    </Pressable>
                </View>

                <View style={styles.mapWrap}>
                    <LeafletMap
                        center={linkedLocation || { lat: 31.1048, lon: 77.1734 }}
                        zoom={linkedLocation ? 11 : 8}
                        bounds={HP_BOUNDS}
                        marker={mapMarker}
                        districts={mapDistricts}
                        selectedDistrictId={selectedId}
                        onDistrictPress={setSelectedId}
                        style={styles.map}
                    />
                    {loading ? (
                        <View style={styles.mapOverlay}>
                            <ActivityIndicator color={colors.primary} />
                            <Text style={styles.overlayText}>Loading district risk data</Text>
                        </View>
                    ) : null}
                </View>

                {error ? (
                    <View style={styles.errorPanel}>
                        <Text style={styles.errorText}>{error}</Text>
                        <Pressable onPress={() => loadDistricts()}><Text style={styles.retryText}>Retry</Text></Pressable>
                    </View>
                ) : null}

                <View style={styles.legend}>
                    {['CRITICAL', 'HIGH', 'MODERATE', 'LOW'].map((level) => (
                        <View key={level} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: LEVEL_COLORS[level] }]} />
                            <Text style={styles.legendText}>{level}</Text>
                        </View>
                    ))}
                </View>

                {linkedLocation ? (
                    <View style={styles.locationNotice}>
                        <Ionicons name="navigate" size={16} color={colors.primary} />
                        <Text style={styles.locationText}>Map opened at {linkedLocation.lat.toFixed(4)}, {linkedLocation.lon.toFixed(4)}</Text>
                    </View>
                ) : null}

                {selectedDistrict ? (
                    <View style={styles.panel}>
                        <View style={styles.panelHeading}>
                            <View style={styles.headingText}>
                                <Text style={styles.districtName}>{selectedDistrict.name}</Text>
                                <Text style={styles.locationDetail}>Himachal Pradesh · {formatNumber(selectedDistrict.lat, 4)}, {formatNumber(selectedDistrict.lon, 4)}</Text>
                            </View>
                            <RiskBadge level={selectedDistrict.level} />
                        </View>
                        <View style={styles.scoreRow}>
                            <Text style={[styles.score, { color: getRiskColor(selectedDistrict.level) }]}>
                                {formatNumber(selectedDistrict.score)}
                            </Text>
                            <Text style={styles.scoreMax}>/ 100 risk score</Text>
                        </View>
                        <Text style={styles.confidence}>
                            {selectedDistrict.confidence == null ? 'Confidence unavailable' : `${Number(selectedDistrict.confidence) >= 1 ? Number(selectedDistrict.confidence).toFixed(0) : (Number(selectedDistrict.confidence) * 100).toFixed(0)}% model confidence`}
                        </Text>
                        <View style={styles.metrics}>
                            <Metric label="Elevation" value={`${formatNumber(selectedDistrict.elevation, 0)} m`} />
                            <Metric label="Slope" value={`${formatNumber(selectedDistrict.slope)}°`} />
                            <Metric label="Rainfall 30d" value={`${formatNumber(selectedDistrict.rainfall_30d)} mm`} />
                            <Metric label="NDVI" value={formatNumber(selectedDistrict.ndvi, 2)} />
                        </View>
                        <Text style={styles.sectionTitle}>Environmental factors</Text>
                        <FactorBar label="Rainfall (30 days)" value={selectedDistrict.rainfall_30d} max={300} color="#60a5fa" />
                        <FactorBar label="Slope steepness" value={selectedDistrict.slope} max={45} color="#f87171" />
                        <FactorBar label="Vegetation (NDVI)" value={Number(selectedDistrict.ndvi) * 100} max={100} color="#34d399" />
                    </View>
                ) : null}

                <View style={styles.listHeader}>
                    <Text style={styles.sectionTitle}>Districts</Text>
                    <Text style={styles.count}>{districts.length} of 12</Text>
                </View>
                <View style={styles.districtList}>
                    {districts.map((district) => {
                        const level = String(district.level || 'UNKNOWN').toUpperCase();
                        const active = district.id === selectedId;
                        return (
                            <Pressable
                                key={district.id}
                                onPress={() => setSelectedId(district.id)}
                                style={({ pressed }) => [styles.districtRow, active && styles.districtRowActive, pressed && styles.pressed]}
                            >
                                <View style={[styles.legendDot, { backgroundColor: LEVEL_COLORS[level] || LEVEL_COLORS.UNKNOWN }]} />
                                <Text numberOfLines={1} style={styles.rowName}>{district.name}</Text>
                                <Text style={styles.rowScore}>{formatNumber(district.score)}</Text>
                                <RiskBadge level={level} />
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>
        </Screen>
    );
}

function Metric({ label, value }) {
    return (
        <View style={styles.metric}>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    content: { paddingBottom: 28, gap: 12 },
    mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 40 },
    freshness: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    freshnessText: { color: colors.textMuted, fontSize: 12, flexShrink: 1 },
    refreshButton: { minHeight: 38, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 7 },
    refreshText: { color: colors.text, fontSize: 12, fontWeight: '600' },
    disabled: { opacity: 0.6 },
    pressed: { opacity: 0.75 },
    mapWrap: { height: 260, borderRadius: 12, overflow: 'hidden', position: 'relative' },
    map: { flex: 1 },
    mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0b1220aa', alignItems: 'center', justifyContent: 'center', gap: 10 },
    overlayText: { color: colors.text, fontSize: 13 },
    errorPanel: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ef444466', backgroundColor: '#ef444411', gap: 6 },
    errorText: { color: '#fca5a5', fontSize: 13 },
    retryText: { color: colors.primary, fontWeight: '700' },
    legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 8, paddingHorizontal: 2 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 9, height: 9, borderRadius: 5 },
    legendText: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
    locationNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, backgroundColor: '#38bdf811', borderWidth: 1, borderColor: '#38bdf844' },
    locationText: { color: colors.text, fontSize: 12, flexShrink: 1 },
    panel: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14 },
    panelHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
    headingText: { flex: 1 },
    districtName: { color: colors.text, fontSize: 19, fontWeight: '700' },
    locationDetail: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
    riskBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    riskBadgeText: { fontSize: 9, fontWeight: '800' },
    scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 14 },
    score: { fontSize: 42, lineHeight: 48, fontWeight: '800', fontVariant: ['tabular-nums'] },
    scoreMax: { color: colors.textMuted, fontSize: 12 },
    confidence: { color: colors.textMuted, fontSize: 11, marginBottom: 13 },
    metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    metric: { width: '48%', minHeight: 58, padding: 9, borderRadius: 8, backgroundColor: '#ffffff08', borderWidth: 1, borderColor: colors.border },
    metricLabel: { color: colors.textMuted, fontSize: 10 },
    metricValue: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 5 },
    sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
    factorRow: { marginTop: 10 },
    factorLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    factorLabel: { color: colors.textMuted, fontSize: 11 },
    factorValue: { color: colors.text, fontSize: 11, fontWeight: '700' },
    track: { height: 5, borderRadius: 3, backgroundColor: '#ffffff12', overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 3 },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    count: { color: colors.textMuted, fontSize: 11 },
    districtList: { borderTopWidth: 1, borderTopColor: colors.border },
    districtRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    districtRowActive: { backgroundColor: '#38bdf811' },
    rowName: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1 },
    rowScore: { color: colors.text, fontSize: 12, fontWeight: '700', width: 38, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
