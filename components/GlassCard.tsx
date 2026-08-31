import { GLASS_TINTS, RADII, SHADOWS } from '@/lib/theme';
import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Glass surfaces get their own colored tint (not a plain white wash) so they
// read as colorful tinted glass rather than frosted neutral — a white wash
// over blur stays pale no matter how saturated the background underneath is.
//
// Android note: expo-blur's BlurView defaults to `experimentalBlurMethod:
// 'none'` on Android, which the native module itself already renders as a
// plain translucent tint with no real blur (see expo-blur's ExpoBlurView.kt)
// — so this degrades gracefully to a flat tinted card on Android without any
// extra handling here. iOS gets the real blur. This is a real visual
// difference between platforms, not a bug.

const GLOW_STYLES = {
  coral: SHADOWS.glowCoral,
  sage: SHADOWS.glowSage,
  rose: SHADOWS.glowRose,
  lavender: SHADOWS.glowLavender,
  none: null,
};

type GlowColor = keyof typeof GLOW_STYLES;

type GlassCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: keyof typeof RADII;
  intensity?: number;
  glow?: GlowColor;
  tint?: keyof typeof GLASS_TINTS;
  padding?: number;
  onPress?: () => void;
};

export default function GlassCard({
  children, style, radius = 'lg', intensity = 40, glow = 'none',
  tint = 'neutral', padding = 14, onPress,
}: GlassCardProps) {
  const borderRadius = RADII[radius];
  const glowStyle = GLOW_STYLES[glow];
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const card = (
    <Animated.View style={[glowStyle, onPress ? animatedStyle : null, style]}>
      <View style={[styles.clip, { borderRadius }]}>
        <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[styles.tint, { borderRadius, backgroundColor: GLASS_TINTS[tint] }]} />
        <View style={{ padding }}>{children}</View>
      </View>
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

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: SHADOWS.glassBorder,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
  },
});
