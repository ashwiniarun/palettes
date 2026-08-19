import { COLORS, RADII, SHADOWS } from '@/lib/theme';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

// Wraps a look/post photo with a gold border flush against its actual
// edges, plus the gilded corner flourish already used on GlassCard's
// `ornate` hero cards, at each corner. (An earlier version stretched a full
// frame graphic over the photo, but that source graphic's linework sits
// inset from its own canvas edges — stretching it never lined up with the
// photo's real bounds. A real border always hugs the container exactly.)
//
// `radius` is passed explicitly (matching the radius already in the
// caller's own photo style) rather than read out of `style`, because the
// rounding has to live on an inner overflow:hidden layer around just the
// photo — the corner flourishes sit on the outer, unclipped layer so they
// aren't cut off where they poke slightly past the edge.
type Props = { uri: string; radius: keyof typeof RADII; style?: StyleProp<ViewStyle> };

export default function DecoPhotoFrame({ uri, radius, style }: Props) {
  const borderRadius = RADII[radius];
  return (
    <View style={style}>
      <View style={[styles.clip, { borderRadius }]}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={[styles.border, { borderRadius }]} />
      </View>
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
        isTop ? { top: -2 } : { bottom: -2 },
        isLeft ? { left: -2 } : { right: -2 },
        { transform: [{ rotate: CORNER_ROTATION[corner] }] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  clip: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  border: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderColor: SHADOWS.cardBorder },
  flourish: { position: 'absolute', width: 18, height: 18 },
});
