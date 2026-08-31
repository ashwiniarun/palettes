import GlassHighlight from '@/components/GlassHighlight';
import { COLORS, SHADOWS, TAB_BAR_BASE_HEIGHT } from '@/lib/theme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

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
      <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.tint} />
      {containerWidth > 0 && (
        <Animated.View style={[styles.indicator, indicatorStyle]}>
          <View style={styles.indicatorPill}>
            <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.indicatorTint} />
            <GlassHighlight />
          </View>
        </Animated.View>
      )}
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const color = focused ? COLORS.coral : COLORS.sage;

          function onPress() {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          }

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab}>
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
    borderTopWidth: 1, borderTopColor: SHADOWS.glassBorder,
    overflow: 'hidden',
  },
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(171,172,136,0.22)' },
  row: { flex: 1, flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  indicator: {
    position: 'absolute', top: 0, left: 0, height: TAB_BAR_BASE_HEIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  indicatorPill: {
    width: 40, height: 40, borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)',
    shadowColor: '#FFFFFF', shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  indicatorTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  iconGlow: { ...SHADOWS.glowCoral, borderRadius: 20 },
});
