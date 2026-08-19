import { Text } from '@/components/ThemedText';
import { COLORS, RADII, SHADOWS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Art Deco button: a bordered gold-outlined plate by default (dark fill,
// light ink text), or — for `glow` variants — a solid jewel/gold gradient
// fill (bold poster-plate look). This replaced the previous soft dual-shadow
// neumorphic treatment entirely: soft-touch depth is the wrong material
// language for Deco, which is bold flat color fields and crisp linework.
// Pressed state inverts the default bordered variant (dark fill -> gold
// fill, light text -> dark text) rather than trying to simulate a soft
// press; gradient-filled buttons just dim slightly on press instead, so
// their jewel color doesn't get replaced by gold on every tap.
//
// Android note: shadowColor/shadowOpacity/shadowRadius are iOS-only in RN;
// Android falls back to `elevation` on the glow shadow objects. Colored glow
// is an iOS-only effect — Android will look flatter but not broken.

const GLOW_STYLES = {
  coral: SHADOWS.glowCoral,
  sage: SHADOWS.glowSage,
  rose: SHADOWS.glowRose,
  lavender: SHADOWS.glowLavender,
  gold: SHADOWS.glowGold,
  none: null,
};

const GRADIENT_BY_GLOW = {
  coral: [COLORS.coral, '#9C2B44'] as const,
  sage: [COLORS.sage, COLORS.sageSoft] as const,
  rose: [COLORS.blush, COLORS.rose] as const,
  lavender: [COLORS.blushLight, COLORS.lavender] as const,
  gold: [COLORS.gold, COLORS.goldBright] as const,
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
  // Gold fills (the gold glow variant, or the bordered variant once pressed
  // and inverted to a gold fill) are bright enough to need dark text; the
  // jewel-tone gradients (burgundy/emerald/purple/teal) stay dark-medium
  // enough for light text.
  const needsDarkText = (!useGradient && pressed) || glow === 'gold';
  const contentColor = needsDarkText ? COLORS.bg : COLORS.ink;

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
        {useGradient ? (
          <LinearGradient
            colors={GRADIENT_BY_GLOW[glow as Exclude<GlowColor, 'none'>]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              StyleSheet.absoluteFillObject, fillStyle,
              GLOW_STYLES[glow],
              { opacity: pressed ? 0.85 : 1 },
            ]}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFillObject, fillStyle,
              { backgroundColor: pressed ? COLORS.gold : COLORS[tone] },
              styles.border,
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
  border: {
    borderWidth: 1.5,
    borderColor: COLORS.goldDull,
  },
  disabled: {
    opacity: 0.5,
  },
});
