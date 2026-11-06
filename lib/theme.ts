// Palette themes. Each theme is built from one source palette's swatches
// (kept on `swatches` so the theme picker can show them exactly), and every
// swatch has ONE fixed job — so screens look the same everywhere instead of
// cycling colors card to card:
//
//   base    the screen background (always a mid-tone swatch, never white)
//   glows   2–3 swatches painted as soft light pools behind the content —
//           this is what the glass panels blur, so they read as glass
//   glass   the palette's lightest swatch, translucent, tinting every panel
//   primary the deepest swatch — CTAs, focused tab, checkboxes
//   secondary  a mid swatch — chips, tags, secondary buttons
//
// Readability wins over palette fidelity for text: body text is each
// palette's darkest swatch deepened until it clears ~7:1 against the worst
// surface it sits on (glass over the darkest color pool), and muted text
// keeps ~5:1. `primaryText` is the primary swatch deepened the same way for
// the places it's used as a text color rather than a fill.

export type ThemeId = 'blush' | 'beach' | 'strawberryMatcha' | 'sunset';

type ThemeColors = {
  bg: string;
  glows: string[];
  glass: string; // standard glass panel tint (cards, tab bar, header)
  glassStrong: string; // denser glass: sheets, inputs, hero cards
  glassEdge: string; // the bright rim along a glass panel's edge
  text: string;
  textMuted: string;
  primaryText: string; // primary, deepened enough to read as text
  icon: string; // inline icons, unfocused tab icons
  primary: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  border: string; // hairlines, checkbox outlines, empty stars
  danger: string;
};

export type Theme = {
  id: ThemeId;
  name: string;
  swatches: { name: string; hex: string }[];
  colors: ThemeColors;
  shadows: ReturnType<typeof makeShadows>;
};

function makeShadows(colors: Pick<ThemeColors, 'text' | 'primary'>) {
  return {
    // soft drop shadow under every glass panel
    card: {
      shadowColor: colors.text, shadowOpacity: 0.08, shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 }, elevation: 3,
    },
    // neumorphic dual-shadow pair — needs two stacked views, one shadow prop can't do both directions
    neuLight: {
      shadowColor: '#FFFFFF', shadowOpacity: 0.6, shadowRadius: 8,
      shadowOffset: { width: -4, height: -4 },
    },
    neuDark: {
      shadowColor: colors.text, shadowOpacity: 0.12, shadowRadius: 8,
      shadowOffset: { width: 4, height: 4 },
    },
    // ambient glow for primary CTAs / FABs / hero cards
    glow: {
      shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 }, elevation: 8,
    },
  };
}

function rgba(hex: string, alpha: number) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
}

function makeTheme(
  id: ThemeId, name: string, swatches: Theme['swatches'],
  c: Omit<ThemeColors, 'glass' | 'glassStrong' | 'glassEdge' | 'textMuted' | 'border'> & {
    glassSource: string;
    mutedAlpha: number; // opacity of `text` used for muted text, tuned per theme to stay readable
  },
): Theme {
  const { glassSource, mutedAlpha, ...rest } = c;
  const colors: ThemeColors = {
    ...rest,
    glass: rgba(glassSource, 0.45),
    glassStrong: rgba(glassSource, 0.78),
    glassEdge: 'rgba(255,255,255,0.55)',
    textMuted: rgba(c.text, mutedAlpha),
    border: rgba(c.text, 0.14),
  };
  return { id, name, swatches, colors, shadows: makeShadows(colors) };
}

const blush = makeTheme('blush', 'blush', [
  { name: 'eggshell', hex: '#F1E7DF' },
  { name: 'renaissance fresco', hex: '#EAC7BB' },
  { name: 'lipstick pink', hex: '#BC9091' },
  { name: 'passive pink', hex: '#DFA29F' },
  { name: 'roman coffee', hex: '#855552' },
], {
  bg: '#EAC7BB', // renaissance fresco
  glows: ['#DFA29F', '#BC9091', '#F1E7DF'], // passive pink, lipstick pink, eggshell
  glassSource: '#F1E7DF', // eggshell
  text: '#180E0D', // deepened roman coffee
  mutedAlpha: 0.79,
  icon: '#855552',
  primary: '#855552', // roman coffee
  primaryText: '#3F2827',
  onPrimary: '#F1E7DF',
  secondary: '#DFA29F', // passive pink
  onSecondary: '#180E0D',
  danger: '#3F2827',
});

const beach = makeTheme('beach', 'beach', [
  { name: 'cool cerulean', hex: '#8EB1D1' },
  { name: 'baby blue eyes', hex: '#A7C7E7' },
  { name: 'midnight blue', hex: '#1C2B48' },
  { name: 'platinum', hex: '#E8ECEF' },
  { name: 'light blue grey', hex: '#C4D8E5' },
], {
  bg: '#C4D8E5', // light blue grey
  glows: ['#A7C7E7', '#8EB1D1', '#E8ECEF'], // baby blue eyes, cool cerulean, platinum
  glassSource: '#E8ECEF', // platinum
  text: '#18253D', // deepened midnight blue
  mutedAlpha: 0.83,
  icon: '#1C2B48',
  primary: '#1C2B48', // midnight blue
  primaryText: '#1C2B48',
  onPrimary: '#E8ECEF',
  secondary: '#A7C7E7', // baby blue eyes
  onSecondary: '#18253D',
  danger: '#1C2B48',
});

const strawberryMatcha = makeTheme('strawberryMatcha', 'strawberry matcha', [
  { name: 'savory sage', hex: '#818263' },
  { name: 'avocado smoothie', hex: '#C2C395' },
  { name: 'blush beet', hex: '#DDBAAE' },
  { name: 'peach protein', hex: '#EFD7CF' },
  { name: 'oat latte', hex: '#DCD4C1' },
], {
  bg: '#DDBAAE', // blush beet
  glows: ['#C2C395', '#EFD7CF', '#DCD4C1'], // avocado smoothie, peach protein, oat latte
  glassSource: '#EFD7CF', // peach protein
  text: '#323326', // deepened savory sage
  mutedAlpha: 0.85,
  icon: '#323326',
  primary: '#707156', // savory sage, deepened so white labels on it read clearly
  primaryText: '#484937',
  onPrimary: '#FFFFFF',
  secondary: '#C2C395', // avocado smoothie
  onSecondary: '#323326',
  danger: '#484937',
});

const sunset = makeTheme('sunset', 'sunset', [
  { name: 'lavender haze', hex: '#B5B0C5' },
  { name: 'sunset coral', hex: '#EF9980' },
  { name: 'dusty rose', hex: '#CC8E8C' },
  { name: 'twilight mauve', hex: '#A08190' },
  { name: 'golden cream', hex: '#F5E0CC' },
], {
  bg: '#B5B0C5', // lavender haze — the sky
  glows: ['#EF9980', '#CC8E8C', '#F5E0CC'], // sunset coral, dusty rose, golden cream
  glassSource: '#F5E0CC', // golden cream
  text: '#161114', // deepened twilight mauve
  mutedAlpha: 0.8,
  icon: '#362C31',
  primary: '#826875', // twilight mauve, deepened so white labels on it read clearly
  primaryText: '#362C31',
  onPrimary: '#FFFFFF',
  secondary: '#EF9980', // sunset coral
  onSecondary: '#161114',
  danger: '#362C31',
});

export const THEMES: Theme[] = [blush, beach, strawberryMatcha, sunset];
export const DEFAULT_THEME_ID: ThemeId = 'blush';

export function getTheme(id: string | null | undefined): Theme {
  return THEMES.find(t => t.id === id) ?? blush;
}

// GlassTabBar's own content height, excluding the safe-area inset it also
// adds — shared here so screens can position a FAB above the tab bar without
// duplicating this number and having it drift out of sync.
export const TAB_BAR_BASE_HEIGHT = 58;

export const RADII = {
  sm: 12, // chips/tags
  md: 18, // buttons, inputs
  lg: 24, // cards
  xl: 32, // large hero cards, modals
};

export const FONTS = {
  serif: 'Fraunces_600SemiBold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
};
