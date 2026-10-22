import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

/**
 * Small markdown renderer for assistant replies (the web uses react-markdown, which renders HTML).
 * Handles what Gemini replies use: headings, bullet and numbered lists, **bold**, *italic* and `code`.
 */

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

function renderInline(text) {
    return text.split(INLINE).map((part, i) => {
        if (!part) return null;
        if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
            return (
                <Text key={i} style={styles.bold}>
                    {part.slice(2, -2)}
                </Text>
            );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return (
                <Text key={i} style={styles.code}>
                    {part.slice(1, -1)}
                </Text>
            );
        }
        if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
            return (
                <Text key={i} style={styles.italic}>
                    {part.slice(1, -1)}
                </Text>
            );
        }
        return part;
    });
}

export default function Markdown({ text }) {
    const lines = String(text ?? '').replace(/\r/g, '').split('\n');

    return (
        <View style={styles.wrap}>
            {lines.map((line, i) => {
                if (!line.trim()) return <View key={i} style={styles.gap} />;

                const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
                if (heading) {
                    return (
                        <Text key={i} style={[styles.text, styles.heading]}>
                            {renderInline(heading[1])}
                        </Text>
                    );
                }

                const bullet = line.match(/^(\s*)[-*•]\s+(.*)$/);
                const numbered = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
                if (bullet || numbered) {
                    const indent = (bullet || numbered)[1].length >= 2 ? 16 : 0;
                    return (
                        <View key={i} style={[styles.listRow, { paddingLeft: indent }]}>
                            <Text style={[styles.text, styles.listMark]}>{bullet ? '•' : `${numbered[2]}.`}</Text>
                            <Text style={[styles.text, styles.listText]}>{renderInline(bullet ? bullet[2] : numbered[3])}</Text>
                        </View>
                    );
                }

                return (
                    <Text key={i} style={styles.text}>
                        {renderInline(line)}
                    </Text>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { gap: 2 },
    gap: { height: 6 },
    text: { color: colors.text, fontSize: 14, lineHeight: 20 },
    heading: { fontWeight: '700', fontSize: 15, marginTop: 4 },
    bold: { fontWeight: '700' },
    italic: { fontStyle: 'italic' },
    code: { fontFamily: 'monospace', backgroundColor: 'rgba(255,255,255,0.08)' },
    listRow: { flexDirection: 'row', gap: 6 },
    listMark: { minWidth: 14 },
    listText: { flex: 1 },
});
