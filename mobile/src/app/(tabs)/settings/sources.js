import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminScreenGate } from '@/components/admin/AdminOnly';
import { SettingsRow, SettingsSection } from '@/components/settings/SettingsList';
import { statsAPI } from '@/services/api';
import { colors, RISK_COLORS } from '@/theme/colors';

// Real datasets used by backend/services/gee_service.py (Google Earth Engine collection IDs)
const SATELLITE = [
    { icon: 'rainy', color: colors.info, title: 'CHIRPS Daily', subtitle: 'Rainfall - 3, 7, 14 and 30-day totals', value: 'UCSB-CHG' },
    { icon: 'leaf', color: RISK_COLORS.Low, title: 'Sentinel-2 SR', subtitle: 'Vegetation (NDVI) and moisture (NDWI)', value: 'ESA' },
    { icon: 'leaf-outline', color: '#4ade80', title: 'MODIS MOD13A2', subtitle: 'Vegetation backup when Sentinel-2 is cloudy', value: 'NASA' },
    { icon: 'triangle', color: RISK_COLORS.High, title: 'SRTM 30 m', subtitle: 'Elevation, slope and aspect', value: 'USGS' },
    { icon: 'layers', color: '#a16207', title: 'OpenLandMap', subtitle: 'Soil texture class (USDA)', value: 'Soil' },
    { icon: 'people', color: '#f472b6', title: 'WorldPop 100 m', subtitle: 'Population density', value: 'WorldPop' },
];

const SERVICES = [
    { icon: 'globe', color: colors.primary, title: 'Google Earth Engine', subtitle: 'Processes the satellite data on demand' },
    { icon: 'partly-sunny', color: '#fbbf24', title: 'Open-Meteo', subtitle: '16-day rainfall forecast + seasonal outlook to 30 days' },
    { icon: 'map', color: '#34d399', title: 'OpenStreetMap', subtitle: 'Maps, place search and hospital lookup' },
    { icon: 'sparkles', color: '#a78bfa', title: 'Google Gemini', subtitle: 'AI assistant' },
    { icon: 'server', color: '#3ecf8e', title: 'Supabase', subtitle: 'Stores every prediction' },
];

function SourcesContent() {
    // Live numbers from the backend (/api/stats reads Supabase with the server key)
    const [stats, setStats] = useState({ loaded: false, data: null, error: null });

    useEffect(() => {
        statsAPI
            .getStats()
            .then((data) => setStats({ loaded: true, data, error: null }))
            .catch((e) => setStats({ loaded: true, data: null, error: e.message }));
    }, []);

    return (
        <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.statsRow}>
                {!stats.loaded ? (
                    <ActivityIndicator color={colors.primary} style={styles.loader} />
                ) : stats.error ? (
                    <Text style={styles.error}>Live stats unavailable - {stats.error}</Text>
                ) : (
                    <>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{stats.data.total_predictions ?? 0}</Text>
                            <Text style={styles.statLabel}>Predictions stored</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{Number(stats.data.avg_risk_score ?? 0).toFixed(1)}</Text>
                            <Text style={styles.statLabel}>Average score</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={[styles.statValue, { color: RISK_COLORS.Critical }]}>
                                {(stats.data.critical_count ?? 0) + (stats.data.high_count ?? 0)}
                            </Text>
                            <Text style={styles.statLabel}>High or critical</Text>
                        </View>
                    </>
                )}
            </View>

            <SettingsSection title="SATELLITE DATA" footer="Fetched fresh from Google Earth Engine for every prediction.">
                {SATELLITE.map((s) => (
                    <SettingsRow key={s.title} icon={s.icon} iconColor={s.color} title={s.title} subtitle={s.subtitle} value={s.value} />
                ))}
            </SettingsSection>

            <SettingsSection title="SERVICES">
                {SERVICES.map((s) => (
                    <SettingsRow key={s.title} icon={s.icon} iconColor={s.color} title={s.title} subtitle={s.subtitle} />
                ))}
            </SettingsSection>
        </ScrollView>
    );
}

// Admin-only page: regular users see an "Admin only" notice instead
export default function SourcesScreen() {
    return (
        <AdminScreenGate>
            <SourcesContent />
        </AdminScreenGate>
    );
}

const styles = StyleSheet.create({
    content: { padding: 16, gap: 22, paddingBottom: 40 },
    statsRow: { flexDirection: 'row', gap: 8, minHeight: 80 },
    loader: { flex: 1 },
    error: { color: colors.textMuted, fontSize: 13, flex: 1, textAlign: 'center', alignSelf: 'center' },
    stat: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
        justifyContent: 'center',
    },
    statValue: { color: colors.text, fontSize: 24, fontWeight: '800' },
    statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
