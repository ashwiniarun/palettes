import { makeStyles } from '@/lib/ThemeContext';
import { StyleSheet, View } from 'react-native';

// Custom header background (React Navigation's `headerBackground` option) —
// deliberately used WITHOUT `headerTransparent`, so the header keeps its own
// reserved layout space and content never renders underneath it. Since
// nothing scrolls behind it there's nothing for a blur to pick up, so the
// glass is composed directly: the theme's base color under its glass tint,
// with the same bright rim the glass cards have.
export default function GlassHeaderBackground() {
  const styles = useStyles();
  return (
    <View style={styles.fill}>
      <View style={styles.tint} />
      <View style={styles.rim} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  fill: { ...StyleSheet.absoluteFill, backgroundColor: colors.bg },
  tint: { ...StyleSheet.absoluteFill, backgroundColor: colors.glass },
  rim: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 1,
    backgroundColor: colors.glassEdge,
  },
}));
