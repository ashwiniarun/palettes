import Sheet from '@/components/Sheet';
import { SerifText, Text } from '@/components/ThemedText';
import { makeStyles, useTheme } from '@/lib/ThemeContext';
import { RADII, Theme, THEMES } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

// Header button + sheet for choosing the app's palette theme. Each option is
// drawn in its OWN theme's colors (not the active one's), with the full
// source palette as a swatch strip and a mini card/button preview, so you
// can see exactly what you're picking before tapping it. Tapping applies
// immediately — the app recolors behind the sheet.
export default function ThemePickerButton() {
  const { theme } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={10}
        style={styles.headerButton}
        accessibilityRole="button"
        accessibilityLabel="change color palette"
      >
        <Ionicons name="color-palette-outline" size={22} color={theme.colors.icon} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)}>
        <ThemePickerContent onDone={() => setOpen(false)} />
      </Sheet>
    </>
  );
}

function ThemePickerContent({ onDone }: { onDone: () => void }) {
  const { theme: active, setThemeId } = useTheme();
  const styles = useStyles();

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
      <SerifText style={styles.title}>color palette</SerifText>
      <Text style={styles.hint}>tap a palette to try it — your choice is saved on this device.</Text>

      {THEMES.map(t => (
        <ThemeOption key={t.id} theme={t} selected={t.id === active.id} onPress={() => setThemeId(t.id)} />
      ))}

      <Pressable onPress={onDone} style={styles.doneButton}>
        <Text style={styles.doneText}>done</Text>
      </Pressable>
    </ScrollView>
  );
}

function ThemeOption({ theme, selected, onPress }: { theme: Theme; selected: boolean; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = theme;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${theme.name} palette`}
      style={[
        styles.option,
        { backgroundColor: colors.bg, borderColor: selected ? colors.primary : colors.border },
        selected && styles.optionSelected,
      ]}
    >
      <View style={styles.optionHeader}>
        <SerifText style={[styles.optionName, { color: colors.text }]}>{theme.name}</SerifText>
        {selected ? (
          <View style={[styles.check, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
          </View>
        ) : (
          <View style={[styles.check, styles.checkEmpty, { borderColor: colors.border }]} />
        )}
      </View>

      <View style={styles.strip}>
        {theme.swatches.map(s => (
          <View key={s.hex} style={[styles.swatch, { backgroundColor: s.hex }]} />
        ))}
      </View>
      <View style={styles.swatchNames}>
        {theme.swatches.map(s => (
          <Text key={s.hex} numberOfLines={2} style={[styles.swatchName, { color: colors.textMuted }]}>{s.name}</Text>
        ))}
      </View>

      <View style={styles.preview}>
        <View style={[styles.previewCard, { backgroundColor: colors.glassStrong, borderColor: colors.glassEdge }]}>
          <Text style={[styles.previewHandle, { color: colors.text }]}>your closet</Text>
          <Text style={[styles.previewSub, { color: colors.textMuted }]}>worn 12 times</Text>
        </View>
        <View style={[styles.previewChip, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.previewChipText, { color: colors.onSecondary }]}>tag</Text>
        </View>
        <View style={[styles.previewButton, { backgroundColor: colors.primary }]}>
          <Text style={[styles.previewButtonText, { color: colors.onPrimary }]}>post</Text>
        </View>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  headerButton: { marginHorizontal: 12, padding: 2 },
  title: { fontSize: 18, marginBottom: 4, color: colors.text },
  hint: { fontSize: 11, color: colors.textMuted, marginBottom: 16 },
  option: {
    borderRadius: RADII.lg, borderWidth: 1, padding: 14, marginBottom: 12,
  },
  optionSelected: { borderWidth: 2, padding: 13 },
  optionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  optionName: { fontSize: 17 },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  checkEmpty: { borderWidth: 1.5 },
  strip: { flexDirection: 'row', height: 44, borderRadius: RADII.sm, overflow: 'hidden' },
  swatch: { flex: 1 },
  swatchNames: { flexDirection: 'row', marginTop: 4, gap: 2 },
  swatchName: { flex: 1, fontSize: 8, textAlign: 'center' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  previewCard: { flex: 1, borderRadius: RADII.sm, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 10 },
  previewHandle: { fontSize: 12, fontWeight: '600' },
  previewSub: { fontSize: 10, marginTop: 1 },
  previewChip: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  previewChipText: { fontSize: 11, fontWeight: '600' },
  previewButton: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
  previewButtonText: { fontSize: 12, fontWeight: '600' },
  doneButton: { alignSelf: 'center', marginTop: 4, marginBottom: 20, paddingVertical: 10, paddingHorizontal: 24 },
  doneText: { color: colors.textMuted, fontWeight: '600' },
}));
