import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import GlassHeaderBackground from '@/components/GlassHeaderBackground';
import { supabase } from '@/lib/supabase';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';

// The ThemeProvider here is the app's own palette theme (lib/ThemeContext),
// not react-navigation's — expo-router (SDK 56+) mounts that one internally,
// and every screen paints its own background + custom header/tab-bar chrome
// from the palette theme directly, so a navigation theme has nothing to add.

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  anchor: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
  SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  Fraunces_600SemiBold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
});
  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    supabase.auth.signInWithPassword({
      email: 'test@facetags.dev',
      password: process.env.EXPO_PUBLIC_TEST_PASSWORD || '',
    }).then(({ error }) => {
      if (error) console.log('Stopgap login failed:', error.message);
    });
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const { theme, ready } = useTheme();

  // Keep the splash screen up until the saved palette is known, so a
  // non-default theme doesn't flash the default one first.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerBackground: () => <GlassHeaderBackground />,
        headerTitleStyle: { fontFamily: 'Fraunces_600SemiBold', color: theme.colors.text },
        headerTintColor: theme.colors.primaryText,
        headerBackTitle: 'back',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ title: 'product details' }} />
      <Stack.Screen name="look/[id]" options={{ title: 'look' }} />
      <Stack.Screen name="friend-closet/[id]" options={{ title: 'closet' }} />
    </Stack>
  );
}
