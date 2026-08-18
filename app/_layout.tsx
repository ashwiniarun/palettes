import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import GlassHeaderBackground from '@/components/GlassHeaderBackground';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/theme';

const PalettesTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.bg,
    card: COLORS.bg,
    text: COLORS.ink,
    border: COLORS.border,
    primary: COLORS.coral,
  },
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
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
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

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

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : PalettesTheme}>
      <Stack
        screenOptions={{
          headerBackground: () => <GlassHeaderBackground />,
          headerTitleStyle: { fontFamily: 'Fraunces_600SemiBold', color: COLORS.ink },
          headerTintColor: COLORS.coral,
          headerBackTitle: 'back',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: 'product details' }} />
        <Stack.Screen name="look/[id]" options={{ title: 'look' }} />
        <Stack.Screen name="friend-closet/[id]" options={{ title: 'closet' }} />
      </Stack>
    </ThemeProvider>
  );
}
