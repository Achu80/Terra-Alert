import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme/colors';

/**
 * Frosted-glass panel: translucent fill, a soft sheen fading down from the top and a brighter top edge,
 * like light catching the edge of a glass card.
 * Any background colour passed in `style` (e.g. a risk tint) is drawn under the sheen.
 */
export default function GlassView({ style, children, radius = 22, ...rest }) {
    return (
        <View style={[styles.base, { borderRadius: radius }, style]} {...rest}>
            <LinearGradient
                pointerEvents="none"
                colors={[colors.glassTop, 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 0.6 }}
                style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
            />
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        backgroundColor: colors.glass,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderTopColor: colors.glassHighlight,
        overflow: 'hidden',
    },
});
