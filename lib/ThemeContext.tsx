import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { DEFAULT_THEME_ID, getTheme, Theme, ThemeId } from './theme';

const STORAGE_KEY = 'facetags.themeId';

type ThemeContextValue = {
  theme: Theme;
  setThemeId: (id: ThemeId) => void;
  ready: boolean; // false until the saved choice has been read from storage
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: getTheme(DEFAULT_THEME_ID),
  setThemeId: () => {},
  ready: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(saved => { if (saved) setThemeIdState(getTheme(saved).id); })
      .catch(e => console.log('Loading saved theme failed:', e?.message))
      .finally(() => setReady(true));
  }, []);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(e => console.log('Saving theme failed:', e?.message));
  }, []);

  const value = useMemo(() => ({ theme: getTheme(themeId), setThemeId, ready }), [themeId, setThemeId, ready]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useColors() {
  return useContext(ThemeContext).theme.colors;
}

// Theme-aware replacement for a module-level StyleSheet.create: define the
// styles as a function of the theme, then call the returned hook inside the
// component. Styles are rebuilt only when the theme actually changes.
// (Same generic shape as StyleSheet.create itself, so style literals like
// flexDirection: 'row' keep their narrow types.)
type StyleDefs = Parameters<typeof StyleSheet.create>[0];

export function makeStyles<S extends StyleDefs>(build: (theme: Theme) => S & StyleDefs) {
  const cache = new Map<string, Readonly<S>>();
  return function useStyles(): Readonly<S> {
    const { theme } = useTheme();
    let styles = cache.get(theme.id);
    if (!styles) {
      styles = StyleSheet.create(build(theme));
      cache.set(theme.id, styles);
    }
    return styles;
  };
}
