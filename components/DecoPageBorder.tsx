import { COLORS, SHADOWS } from '@/lib/theme';
import { Image, StyleSheet, View } from 'react-native';

// A gilded frame around the whole screen. An earlier version stretched a
// full frame graphic (with corner ornamentation baked in at fixed
// proportions) over the screen — non-uniform stretching across a phone's
// tall aspect ratio wrecked the corner geometry into a smeared tangle.
// Same fix as DecoPhotoFrame: a plain border that always hugs the actual
// edges exactly, plus the fixed-size corner flourish asset (already proven
// to align correctly on GlassCard/DecoPhotoFrame, since it's positioned at
// a constant pixel size rather than stretched).
export default function DecoPageBorder() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.border} />
      <CornerFlourish corner="tl" />
      <CornerFlourish corner="tr" />
      <CornerFlourish corner="bl" />
      <CornerFlourish corner="br" />
    </View>
  );
}

const CORNER_ROTATION = { tl: '0deg', tr: '90deg', br: '180deg', bl: '270deg' };

function CornerFlourish({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const isTop = corner === 'tl' || corner === 'tr';
  const isLeft = corner === 'tl' || corner === 'bl';
  return (
    <Image
      source={require('@/assets/images/deco-corner.png')}
      tintColor={COLORS.goldDull}
      style={[
        styles.flourish,
        isTop ? { top: 0 } : { bottom: 0 },
        isLeft ? { left: 0 } : { right: 0 },
        { transform: [{ rotate: CORNER_ROTATION[corner] }] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  border: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderColor: SHADOWS.cardBorder },
  flourish: { position: 'absolute', width: 34, height: 34 },
});
