import { COLORS, RADII, SHADOWS, TAB_BAR_BASE_HEIGHT } from '@/lib/theme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Solid dark Deco bar with a gold top rule, not frosted glass. The sliding
// indicator is a gold-outlined plate rather than a blurred circle. Every
// icon casts a small flat "puddle" shadow beneath it — drawn as an explicit
// dark shape rather than a native shadow, since native shadow silhouette
// tracing is unreliable across icon-font glyphs, Image-based icons, and
// Android (no shadow color control there at all) — a plain drawn ellipse
// looks the same everywhere.

export default function GlassTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const tabWidth = containerWidth / state.routes.length;
  const indicatorX = useSharedValue(0);

  useEffect(() => {
    if (tabWidth > 0) indicatorX.value = withSpring(state.index * tabWidth, { damping: 20, stiffness: 200 });
  }, [state.index, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: tabWidth,
  }));

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10), height: TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, 10) }]}
      onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {containerWidth > 0 && (
        <Animated.View style={[styles.indicator, indicatorStyle]}>
          <View style={styles.indicatorPlate} />
        </Animated.View>
      )}
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const color = focused ? COLORS.gold : COLORS.inkSoft;

          function onPress() {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          }

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab}>
              <View style={styles.iconCastShadow} />
              <View style={focused ? styles.iconGlow : undefined}>
                {options.tabBarIcon?.({ focused, color, size: 22 })}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopWidth: 2, borderTopColor: COLORS.goldDull,
    backgroundColor: COLORS.surface,
  },
  row: { flex: 1, flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconCastShadow: {
    position: 'absolute', bottom: 9, width: 18, height: 5, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)', transform: [{ scaleX: 1.3 }],
  },
  indicator: {
    position: 'absolute', top: 0, left: 0, height: TAB_BAR_BASE_HEIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  indicatorPlate: {
    width: 42, height: 42, borderRadius: RADII.sm,
    borderWidth: 1.5, borderColor: SHADOWS.cardBorder,
    backgroundColor: 'rgba(201,162,39,0.14)',
  },
  iconGlow: { ...SHADOWS.glowGold, borderRadius: 20 },
});
