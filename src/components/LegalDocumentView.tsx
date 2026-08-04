import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts, radii, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import type { LegalDocument } from '../legal';
import { SettingsBackHeader } from './SettingsChrome';

export function LegalDocumentView({ document }: { document: LegalDocument }) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]} edges={['top']}>
      <SettingsBackHeader title={document.title} />
      <ScrollView
        contentContainerStyle={styles.content}
        accessibilityRole="scrollbar"
      >
        <Text style={[styles.meta, { color: colors.inkFaint }]}>
          Version {document.lastUpdated} · Mise à jour indiquée dans l’app
        </Text>
        {document.intro ? (
          <Text style={[styles.intro, { color: colors.ink }]}>{document.intro}</Text>
        ) : null}
        {document.sections.map((section) => (
          <View
            key={section.title}
            style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>{section.title}</Text>
            {section.paragraphs.map((p, idx) => (
              <Text
                key={`${section.title}-${idx}`}
                style={[styles.paragraph, { color: colors.inkMuted }]}
              >
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  meta: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  intro: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 17,
    marginBottom: 4,
  },
  paragraph: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
  },
});
