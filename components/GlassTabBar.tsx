import { makeStyles, useTheme } from '@/lib/ThemeContext';
import { TAB_BAR_BASE_HEIGHT } from '@/lib/theme';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { ComponentProps, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Derived from expo-router's own `Tabs` component rather than imported from
// @react-navigation/bottom-tabs directly — expo-router vendors its own
// internal fork of BottomTabBarProps for the `tabBar` render prop, which is
// a structurally different (and not publicly exported) type from the
// standalone @react-navigation/bottom-tabs package. Deriving it this way
// always matches whatever expo-router actually expects, regardless of which
// navigation library it forks internally.
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export default function GlassTabBar({ state, descriptors, emitter, navigateToTab, insets }: TabBarProps) {
  const { theme } = useTheme();
  const styles = useStyles();
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
      <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.tint} />
      {containerWidth > 0 && (
        <Animated.View style={[styles.indicator, indicatorStyle]}>
          <View style={styles.indicatorPill} />
        </Animated.View>
      )}
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const color = focused ? theme.colors.onPrimary : theme.colors.icon;

          function onPress() {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          }

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab}>
              {options.tabBarIcon?.({ focused, color, size: 22 })}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadows }) => ({
  container: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopWidth: 1, borderTopColor: colors.glassEdge,
    overflow: 'hidden',
  },
  tint: { ...StyleSheet.absoluteFill, backgroundColor: colors.glass },
  row: { flex: 1, flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  indicator: {
    position: 'absolute', top: 0, left: 0, height: TAB_BAR_BASE_HEIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  indicatorPill: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primary,
    ...shadows.glow,
  },
}));
