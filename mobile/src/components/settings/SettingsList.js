import { Ionicons } from '@expo/vector-icons';
import { Children, Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import GlassView from '@/components/GlassView';
import { colors } from '@/theme/colors';
import { withAlpha } from '@/utils/risk';

/**
 * Building blocks for phone-style settings pages:
 * <SettingsSection title="…"> groups rows in one rounded card, <SettingsRow> is a single line.
 */
export function SettingsSection({ title, footer, children }) {
    const rows = Children.toArray(children).filter(Boolean);
    return (
        <View style={styles.section}>
            {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
            <GlassView radius={20}>
                {rows.map((row, i) => (
                    <Fragment key={i}>
                        {i > 0 ? <View style={styles.divider} /> : null}
                        {row}
                    </Fragment>
                ))}
            </GlassView>
            {footer ? <Text style={styles.footer}>{footer}</Text> : null}
        </View>
    );
}

/**
 * icon / iconColor: the coloured square on the left
 * value: short text on the right (e.g. current setting)
 * onPress: makes the row tappable and adds a chevron
 * right: custom element instead of value + chevron (e.g. a Switch)
 */
export function SettingsRow({ icon, iconColor = colors.primary, title, subtitle, value, valueColor, onPress, right }) {
    const content = (
        <>
            {icon ? (
                <View style={[styles.iconBox, { backgroundColor: withAlpha(iconColor, 0.18) }]}>
                    <Ionicons name={icon} size={18} color={iconColor} />
                </View>
            ) : null}
            <View style={styles.texts}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {right ?? (
                <>
                    {value ? (
                        <Text style={[styles.value, valueColor && { color: valueColor }]} numberOfLines={1}>
                            {value}
                        </Text>
                    ) : null}
                    {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
                </>
            )}
        </>
    );

    if (!onPress) return <View style={styles.row}>{content}</View>;
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
            {content}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    section: { gap: 8 },
    sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginLeft: 4 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.glassBorder, marginLeft: 60 },
    footer: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginHorizontal: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 56 },
    rowPressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
    iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    texts: { flex: 1 },
    title: { color: colors.text, fontSize: 15, fontWeight: '500' },
    subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    value: { color: colors.textMuted, fontSize: 14, maxWidth: 150 },
});
