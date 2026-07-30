import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

const PLUM = '#5B2333';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: PLUM,
      headerTitleStyle: { fontFamily: 'Fraunces_600SemiBold', fontSize: 22 },
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          headerTitle: 'palettes',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="closet"
        options={{
          title: 'Closet',
          headerTitle: 'palettes',
          tabBarIcon: ({ color, size }) => <Ionicons name="shirt-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          headerTitle: 'palettes',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          headerTitle: 'palettes',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
