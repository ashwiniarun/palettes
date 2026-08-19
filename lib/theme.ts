// Art Deco jewel-tone system. Every screen already reaches for these tokens
// semantically (COLORS.ink for "primary text," COLORS.sage for "the sapphire
// accent," GLASS_TINTS.coral for "which jewel tone to fill this panel with")
// rather than hardcoding hex — so this redesign happens almost entirely here
// and in the handful of shared components, without touching call sites.
//
// One real constraint drove several of the choices below: some tokens are
// used as a PANEL FILL (paired with light COLORS.ink text drawn on top, so
// they can stay dark-medium) and some are used as a STANDALONE text/icon/glow
// color directly against the near-black app background (COLORS.rose for the
// like button, COLORS.sageDeep for category labels) — those need to be bright
// enough to read on their own, not just dark-medium jewel tones.

export const COLORS = {
  // deep jewel backgrounds — pushed closer to black than the first pass, to
  // read more like unlit marble/lacquer with light only at accent points
  // (gold linework, glows), matching the moody supper-club reference
  bg: '#0B0C14',          // near-black navy, app background
  surface: '#161320',     // panel/card fill
  surfaceAlt: '#1C1626',  // slightly lighter panel variant for layering

  // metal — the primary Deco accent
  gold: '#C9A227',
  goldBright: '#E8C766',
  goldDull: '#8A6B34', // muted antique brass — for BORDERS/frames specifically, so linework recedes into the dark instead of popping bright everywhere

  // jewel accents, kept under their OLD pastel key names so every existing
  // tint="sage" / glow="coral" call site keeps working unchanged.
  // Darkened a shade further than the first pass — panels should read as
  // jewel tones glimpsed in low light, not lit from the front.
  coral: '#420E1C',       // panel fill — burgundy
  sage: '#122A4D',        // panel fill — sapphire blue (was emerald)
  sageDeep: '#5B8DEF',    // BRIGHT sapphire — standalone text (category labels), must read on dark bg
  sageSoft: '#254B80',    // mid sapphire, used in gradient pairs
  blush: '#28173C',       // panel fill — royal purple
  blushLight: '#4A2D6B',  // lighter royal purple, gradient pairs / image placeholders
  rose: '#C6415F',        // BRIGHT rose — standalone text/icon/glow (likes, danger), must read on dark bg
  lavender: '#0C332F',    // panel fill — deep teal (kept as a 5th accent family)
  lavenderTint: 'rgba(77,216,209,0.18)', // brighter teal at low alpha, for small chip fills

  // dark-mode-appropriate input/row fills (paired with COLORS.ink text on top)
  cream: '#191420',       // input/button fill
  warmFog: '#1F1929',     // secondary row fill
  oatLatte: '#5C5040',    // dim/tarnished metal — "empty" state indicator

  // text (on dark)
  ink: '#F4EFE3',         // = textPrimary, warm ivory
  inkSoft: 'rgba(244,239,227,0.62)', // = textSecondary

  border: 'rgba(201,162,39,0.5)', // gold at reduced opacity — general outline token
  danger: '#C6415F',      // = rose
  textPrimary: '#F4EFE3',
  textSecondary: 'rgba(244,239,227,0.62)',
};

// GlassTabBar's own content height, excluding the safe-area inset it also
// adds — shared here so screens can position a FAB above the tab bar without
// duplicating this number and having it drift out of sync.
export const TAB_BAR_BASE_HEIGHT = 58;

// Crisp/architectural, not the soft pill-heavy scale from the previous
// glassmorphic system — Deco panels read as cut rectangles, not soft blobs.
export const RADII = {
  sm: 4,  // chips/tags
  md: 8,  // buttons, inputs
  lg: 12, // cards
  xl: 16, // large hero cards, modals
};

export const SHADOWS = {
  // ambient glows — pushed a bit bigger/hotter than the first pass so they
  // read like the pendant-lamp pools of light in the reference: a small
  // bright source doing real work against a mostly-black room
  glowCoral: { shadowColor: '#E0567A', shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  glowSage: { shadowColor: '#5B8DEF', shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  glowRose: { shadowColor: '#C6415F', shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  glowLavender: { shadowColor: '#4DD8D1', shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  glowGold: { shadowColor: '#C9A227', shadowOpacity: 0.6, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  cardBorder: 'rgba(138,107,52,0.65)', // dull antique-brass border for panels/frames (was glassBorder)
};

export const GRADIENTS = {
  // 4-stop black-to-jewel wash for screen backgrounds — black for roughly
  // the first three-quarters, with the jewel color only surfacing right at
  // the far corner, like a single dim light source in an unlit room rather
  // than an evenly-lit wash
  vivid: ['#000000', '#040308', '#0F0817', '#3A0F1B'] as const,
  hero: ['#28173C', '#420E1C'] as const, // royal purple → burgundy
  cta: ['#C9A227', '#E8C766'] as const,   // solid metallic gold — primary buttons/FABs
};

// Which solid jewel fill a panel uses. Kept under the same object/key names
// as the previous translucent-glass version — GlassCard no longer blurs, so
// these are now solid fills, not rgba overlays.
export const GLASS_TINTS = {
  coral: COLORS.coral,
  sage: COLORS.sage,
  blush: COLORS.blush,
  rose: COLORS.rose,
  lavender: COLORS.lavender,
  gold: '#241A0C', // deep warm bronze — for hero cards wanting a gilded fill
  neutral: COLORS.surfaceAlt,
};

export const FONTS = {
  serif: 'Fraunces_600SemiBold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
};
