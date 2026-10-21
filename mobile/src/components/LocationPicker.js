import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HP_DISTRICTS, HP_STATE_NAME } from '@/constants/himachal';
import { searchHimachalPlaces } from '@/services/geocoding';
import { colors } from '@/theme/colors';

const MIN_QUERY_LENGTH = 3;
const SEARCH_DELAY_MS = 500; // Nominatim allows ~1 request/second

const DISTRICT_OPTIONS = HP_DISTRICTS.map((d) => ({
    ...d,
    region: `District, ${HP_STATE_NAME}`,
    type: 'district',
}));

const Separator = () => <View style={styles.separator} />;

export default function LocationPicker({ visible, onClose, onSelect, selectedId }) {
    const [query, setQuery] = useState('');
    // Result of the last finished search; it is stale while `query` differs from `search.query`
    const [search, setSearch] = useState({ query: '', results: [], error: null });

    const trimmed = query.trim();
    const isSearch = trimmed.length >= MIN_QUERY_LENGTH;
    const searching = isSearch && search.query !== trimmed;
    const results = isSearch && !searching ? search.results : [];
    const error = isSearch && !searching ? search.error : null;

    useEffect(() => {
        if (!isSearch) return;

        const controller = new AbortController();
        const timer = setTimeout(() => {
            searchHimachalPlaces(trimmed, { signal: controller.signal })
                .then((found) => setSearch({ query: trimmed, results: found, error: null }))
                .catch((e) => {
                    if (e.name !== 'AbortError') setSearch({ query: trimmed, results: [], error: e.message });
                });
        }, SEARCH_DELAY_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [trimmed, isSearch]);

    const close = () => {
        setQuery('');
        onClose();
    };

    const choose = (item) => {
        const { id, name, region, lat, lon, type } = item;
        onSelect({ id, name, region, lat, lon, type });
        close();
    };

    const renderItem = ({ item }) => {
        const selected = item.id === selectedId;
        return (
            <Pressable
                onPress={() => choose(item)}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            >
                <Ionicons
                    name={item.type === 'district' ? 'business-outline' : 'location-outline'}
                    size={20}
                    color={selected ? colors.primary : colors.textMuted}
                />
                <View style={styles.itemText}>
                    <Text style={[styles.itemName, selected && { color: colors.primary }]}>{item.name}</Text>
                    <Text style={styles.itemRegion}>{item.region}</Text>
                </View>
                {selected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
            </Pressable>
        );
    };

    let emptyMessage = null;
    if (isSearch && !searching) {
        emptyMessage = error ? `Couldn't search: ${error}` : `No places found in ${HP_STATE_NAME}`;
    } else if (trimmed.length > 0 && !isSearch) {
        emptyMessage = `Type at least ${MIN_QUERY_LENGTH} letters to search`;
    }

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={close}>
            <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
                <View style={styles.header}>
                    <Text style={styles.title}>Choose location</Text>
                    <Pressable onPress={close} hitSlop={12}>
                        <Ionicons name="close" size={26} color={colors.text} />
                    </Pressable>
                </View>

                <View style={styles.searchBox}>
                    <Ionicons name="search" size={18} color={colors.textMuted} />
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Search a town or village in Himachal"
                        placeholderTextColor={colors.textMuted}
                        style={styles.input}
                        autoCorrect={false}
                        returnKeyType="search"
                    />
                    {searching ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                    {query && !searching ? (
                        <Pressable onPress={() => setQuery('')} hitSlop={8}>
                            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                        </Pressable>
                    ) : null}
                </View>

                <Text style={styles.sectionLabel}>{isSearch ? 'Places' : 'Districts'}</Text>

                <FlatList
                    data={isSearch ? results : trimmed ? [] : DISTRICT_OPTIONS}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    keyboardShouldPersistTaps="handled"
                    ItemSeparatorComponent={Separator}
                    ListEmptyComponent={emptyMessage ? <Text style={styles.empty}>{emptyMessage}</Text> : null}
                />
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    title: { color: colors.text, fontSize: 20, fontWeight: '700' },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
    },
    input: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 10 },
    sectionLabel: { color: colors.textMuted, fontSize: 12, textTransform: 'uppercase', marginTop: 20, marginBottom: 8 },
    item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    itemPressed: { opacity: 0.6 },
    itemText: { flex: 1 },
    itemName: { color: colors.text, fontSize: 16 },
    itemRegion: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    separator: { height: 1, backgroundColor: colors.border },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
});
