import { GRADIENTS, SHADOWS } from '@/lib/theme';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

// Custom header background (React Navigation's `headerBackground` option) —
// deliberately used WITHOUT `headerTransparent`, so the header keeps its own
// reserved layout space and content never renders underneath it. Since the
// header sits in its own layer (not stacked over scrolling screen content),
// BlurView here has nothing colorful behind it to actually blur — so the
// gradient is painted directly as the header's own background instead of
// relying on blur-through, which is what kept it looking washed-out/
// inconsistent with the vivid screens below it.
export default function GlassHeaderBackground() {
  return (
    <View style={styles.fill}>
      <LinearGradient colors={GRADIENTS.vivid} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.tint} />
      <View style={styles.border} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.25)' },
  border: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 1,
    backgroundColor: SHADOWS.glassBorder,
  },
});
