import { makeStyles, useTheme } from '@/lib/ThemeContext';
import { RADII } from '@/lib/theme';
import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Every card in the app is the same glass panel: real blur over the
// backdrop's color pools, tinted with the theme's glass swatch, with a bright
// rim along the edge. One look everywhere — emphasis comes from `glow`
// (hero/highlight cards) rather than from switching card colors.
//
// Android note: expo-blur's BlurView defaults to `experimentalBlurMethod:
// 'none'` on Android, which the native module itself already renders as a
// plain translucent tint with no real blur (see expo-blur's ExpoBlurView.kt)
// — so this degrades gracefully to a flat tinted card on Android without any
// extra handling here. iOS gets the real blur. This is a real visual
// difference between platforms, not a bug.

type GlassCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: keyof typeof RADII;
  intensity?: number;
  glow?: boolean;
  padding?: number;
  onPress?: () => void;
};

export default function GlassCard({
  children, style, radius = 'lg', intensity = 40, glow = false, padding = 14, onPress,
}: GlassCardProps) {
  const { theme } = useTheme();
  const styles = useStyles();
  const borderRadius = RADII[radius];
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const card = (
    <Animated.View style={[glow ? theme.shadows.glow : theme.shadows.card, onPress ? animatedStyle : null, style]}>
      <View style={[styles.clip, { borderRadius }]}>
        <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[styles.tint, glow && styles.tintStrong]} />
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

const useStyles = makeStyles(({ colors }) => ({
  clip: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassEdge,
  },
  tint: { ...StyleSheet.absoluteFill, backgroundColor: colors.glass },
  tintStrong: { backgroundColor: colors.glassStrong },
}));
