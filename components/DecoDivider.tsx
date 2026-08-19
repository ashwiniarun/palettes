import { COLORS } from '@/lib/theme';
import { StyleSheet, View } from 'react-native';

// Classic Deco title-divider motif: thin gold rules flanking a small
// diamond. Used sparingly between major sections on hero screens (profile,
// friend profile) — a signature ornamental touch, not a general-purpose
// section title (most screens still use a plain SerifText section title).
export default function DecoDivider() {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <View style={styles.diamondOuter}>
        <View style={styles.diamondInner} />
      </View>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  line: { flex: 1, height: 1.5, backgroundColor: COLORS.gold },
  diamondOuter: {
    width: 12, height: 12, marginHorizontal: 10,
    borderWidth: 1.5, borderColor: COLORS.gold,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center', justifyContent: 'center',
  },
  diamondInner: {
    width: 4, height: 4, backgroundColor: COLORS.gold,
  },
});
