import { Text } from '@/components/ThemedText';
import { COLORS, RADII, SHADOWS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// RN gives each view exactly one shadow, so neumorphism's light+dark pair
// needs two stacked, identically-sized views behind the content: one casts
// the dark bottom-right shadow, one casts the light top-left shadow. Because
// each shadow renders OUTSIDE that view's own bounds (via shadowOffset), the
// two peek out on opposite corners without occluding each other, even though
// both bodies share the same rect. Both shadow layers (and the visible body
// fill) are absolutely positioned so they never affect layout — only the
// content child is normally flowed, so it's what actually determines the
// button's size for auto-sized variants (raised/pill); fixed-size variants
// (circular/fab) size the outer box explicitly instead.
//
// RN has no real inset/pressed shadow. The "pressed" state here is an honest
// approximation: both shadow layers fade toward transparent and a thin inner
// border appears, rather than literally inverting shadow geometry.
//
// Android note: shadowColor/shadowOpacity/shadowRadius/shadowOffset are
// iOS-only in RN. Android falls back to `elevation` (single gray shadow, no
// color) via the elevation field already present on SHADOWS.neuDark/glow*.
// The dual colored shadow is an iOS-only effect — Android will look flatter.

const GLOW_STYLES = {
  coral: SHADOWS.glowCoral,
  sage: SHADOWS.glowSage,
  rose: SHADOWS.glowRose,
  lavender: SHADOWS.glowLavender,
  none: null,
};

const GRADIENT_BY_GLOW = {
  coral: [COLORS.sage, COLORS.coral] as const,
  sage: [COLORS.sageSoft, COLORS.sage] as const,
  rose: [COLORS.blush, COLORS.rose] as const,
  lavender: [COLORS.blushLight, COLORS.lavender] as const,
};

type GlowColor = keyof typeof GLOW_STYLES;

type NeumorphicButtonProps = {
  onPress?: () => void;
  label?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  children?: ReactNode;
  variant?: 'raised' | 'pill' | 'circular' | 'fab';
  tone?: 'cream' | 'blushLight';
  glow?: GlowColor;
  size?: number; // fixed box size for circular/fab; ignored for raised/pill
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function NeumorphicButton({
  onPress, label, icon, children, variant = 'raised', tone = 'cream',
  glow = 'none', size, disabled = false, style,
}: NeumorphicButtonProps) {
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function onPressIn() {
    scale.value = withSpring(0.98, { damping: 25, stiffness: 300 });
    setPressed(true);
  }
  function onPressOut() {
    scale.value = withSpring(1, { damping: 25, stiffness: 300 });
    setPressed(false);
  }

  const isFixedSize = variant === 'circular' || variant === 'fab';
  const resolvedSize = size ?? (variant === 'fab' ? 56 : 44);
  const borderRadius = variant === 'pill' ? 999 : isFixedSize ? resolvedSize / 2 : RADII.md;
  const useGradient = glow !== 'none';
  const contentColor = useGradient ? '#FFFFFF' : COLORS.ink;

  const outerStyle: ViewStyle = {
    borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    ...(isFixedSize ? { width: resolvedSize, height: resolvedSize } : {}),
  };
  const fillStyle: ViewStyle = { borderRadius };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={[disabled && styles.disabled, style]}
    >
      <Animated.View style={[outerStyle, animatedStyle]}>
        <View
          style={[
            StyleSheet.absoluteFillObject, fillStyle, SHADOWS.neuDark,
            { opacity: pressed ? 0.35 : 1 },
          ]}
        />
        <View
          style={[
            StyleSheet.absoluteFillObject, fillStyle, SHADOWS.neuLight,
            { opacity: pressed ? 0.3 : 1 },
          ]}
        />
        {useGradient ? (
          <LinearGradient
            colors={GRADIENT_BY_GLOW[glow as Exclude<GlowColor, 'none'>]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              StyleSheet.absoluteFillObject, fillStyle,
              GLOW_STYLES[glow],
              pressed && styles.pressedBorder,
            ]}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFillObject, fillStyle,
              { backgroundColor: COLORS[tone] },
              pressed && styles.pressedBorder,
            ]}
          />
        )}
        <View style={[styles.content, !isFixedSize && styles.contentPadded]}>
          {children ?? (
            <>
              {icon && <Ionicons name={icon} size={variant === 'fab' ? 26 : 18} color={contentColor} />}
              {label && (
                <Text style={[styles.label, { color: contentColor }, icon ? { marginLeft: 6 } : null]}>
                  {label}
                </Text>
              )}
            </>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentPadded: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  pressedBorder: {
    borderWidth: 1,
    borderColor: 'rgba(54,43,29,0.12)',
  },
  disabled: {
    opacity: 0.5,
  },
});
