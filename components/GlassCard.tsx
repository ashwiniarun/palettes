import { GLASS_TINTS, RADII, SHADOWS } from '@/lib/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { Image, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Art Deco panel: a diagonal gradient from the jewel tint down to black,
// not a flat fill — panels should look lit from one corner and falling into
// shadow toward the other, not evenly lit. Crisp gold border, no blur/
// translucency — Deco is bold flat color fields and linework, not frosted
// glass.
// `ornate` adds gilded corner-flourish brackets (like a picture frame) for
// hero/singular elements (profile header, twin-score card).
// `plaque` adds a second, dimmer inset gold rule a few px inside the panel
// border — the layered-line look of an engraved nameplate — for repeated
// product rows (closet items) where a full corner-flourish treatment would
// be too busy at list scale, but a plain single border feels flat.
// Both default off so ordinary list rows (feed cards, rankings rows) stay
// visually quiet.

const GLOW_STYLES = {
  coral: SHADOWS.glowCoral,
  sage: SHADOWS.glowSage,
  rose: SHADOWS.glowRose,
  lavender: SHADOWS.glowLavender,
  gold: SHADOWS.glowGold,
  none: null,
};

type GlowColor = keyof typeof GLOW_STYLES;

type GlassCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: keyof typeof RADII;
  glow?: GlowColor;
  tint?: keyof typeof GLASS_TINTS;
  padding?: number;
  onPress?: () => void;
  ornate?: boolean;
  plaque?: boolean;
};

export default function GlassCard({
  children, style, radius = 'lg', glow = 'none',
  tint = 'neutral', padding = 14, onPress, ornate = false, plaque = false,
}: GlassCardProps) {
  const borderRadius = RADII[radius];
  const glowStyle = GLOW_STYLES[glow];
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const card = (
    <Animated.View style={[glowStyle, onPress ? animatedStyle : null, style]}>
      <LinearGradient
        colors={[GLASS_TINTS[tint], '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.panel, { borderRadius }]}
      >
        <View style={{ padding }}>{children}</View>
        {plaque && (
          <View pointerEvents="none" style={[styles.plaqueInset, { borderRadius: Math.max(borderRadius - 4, 2) }]} />
        )}
      </LinearGradient>
      {ornate && (
        <>
          <CornerFlourish corner="tl" />
          <CornerFlourish corner="tr" />
          <CornerFlourish corner="bl" />
          <CornerFlourish corner="br" />
        </>
      )}
    </Animated.View>
  );

  if (!onPress) return card;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97); }}
      onPressOut={() => { scale.value = withSpring(1); }}
    >
      {card}
    </Pressable>
  );
}

const CORNER_ROTATION = { tl: '0deg', tr: '90deg', br: '180deg', bl: '270deg' };

function CornerFlourish({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const isTop = corner === 'tl' || corner === 'tr';
  const isLeft = corner === 'tl' || corner === 'bl';
  return (
    <Image
      source={require('@/assets/images/deco-corner.png')}
      tintColor={SHADOWS.cardBorder}
      style={[
        styles.flourish,
        isTop ? { top: -4 } : { bottom: -4 },
        isLeft ? { left: -4 } : { right: -4 },
        { transform: [{ rotate: CORNER_ROTATION[corner] }] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  panel: {
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: SHADOWS.cardBorder,
  },
  plaqueInset: {
    position: 'absolute',
    top: 4, left: 4, right: 4, bottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.4)',
  },
  flourish: {
    position: 'absolute',
    width: 22,
    height: 22,
  },
});
