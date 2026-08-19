import { COLORS } from '@/lib/theme';
import { StyleSheet, View } from 'react-native';

// Custom header background (React Navigation's `headerBackground` option) —
// deliberately used WITHOUT `headerTransparent`, so the header keeps its own
// reserved layout space and content never renders underneath it. Solid Deco
// panel fill with a gold bottom rule, not blur — a header sits in its own
// layer, not stacked over scrolling content, so there was never anything
// underneath for a blur to actually pick up.
export default function GlassHeaderBackground() {
  return (
    <View style={styles.fill}>
      <View style={styles.border} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.surface },
  border: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 2,
    backgroundColor: COLORS.goldDull,
  },
});
