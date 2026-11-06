import GlassHeaderBackground from '@/components/GlassHeaderBackground';
import GlassTabBar from '@/components/GlassTabBar';
import ThemePickerButton from '@/components/ThemePicker';
import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Image } from 'react-native';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      tabBar={props => <GlassTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: theme.colors.onPrimary,
        headerTitleStyle: { fontFamily: 'Fraunces_600SemiBold', fontSize: 22, color: theme.colors.text },
        headerBackground: () => <GlassHeaderBackground />,
        headerRight: () => <ThemePickerButton />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          headerTitle: 'palettes',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="closet"
        options={{
          title: 'Closet',
          headerTitle: 'palettes',
          tabBarIcon: ({ color, size }) => (
            <Image
              source={require('@/assets/images/closet-tab-icon.png')}
              style={{ width: size, height: size, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          headerTitle: 'palettes',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          headerTitle: 'palettes',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
