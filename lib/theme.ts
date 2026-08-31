export const COLORS = {
  // greens (primary)
  sageDeep: '#575527',
  sage: '#ABAC88', // in-between "avocado smoothie" and the earlier muted tone, per feedback
  sageSoft: '#A0AB89',
  sageMuted: '#828C6A',
  oliveTone: '#928E5E',
  // pinks/blush (accent)
  coral: '#E69B97',
  rose: '#B97D7B',
  blush: '#EFC0BC',
  blushLight: '#F6E5E7',
  peach: '#EFD7CF',
  // extra accent, used sparingly for ratings/highlights so they don't fight
  // with coral (which is already doing a lot of work as the primary CTA/glow color)
  lavender: '#C9BFE0',
  lavenderTint: 'rgba(201,191,224,0.22)',
  // neutrals
  cream: '#F4F3E1',
  warmFog: '#DDD3C9',
  oatLatte: '#DCD4C1',
  ink: '#362B1D',
  inkSoft: 'rgba(54,43,29,0.6)',
  // semantic aliases — reach for these for a role, not the raw palette name
  bg: '#F4F3E1', // = cream
  surface: '#DDD3C9', // = warmFog — neutral resting bg where not glass/neumorphic
  border: '#DCD4C1', // = oatLatte
  textPrimary: '#362B1D', // = ink
  textSecondary: 'rgba(54,43,29,0.6)', // = inkSoft
  danger: '#B97D7B', // = rose — delete affordances, stays in-palette instead of an off-brand red
};

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

export const SHADOWS = {
  // soft colored shadow for flat neumorphic/gradient cards
  card: {
    shadowColor: COLORS.sageDeep, shadowOpacity: 0.1, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  // neumorphic dual-shadow pair — needs two stacked views, one shadow prop can't do both directions
  neuLight: {
    shadowColor: '#FFFFFF', shadowOpacity: 0.7, shadowRadius: 8,
    shadowOffset: { width: -4, height: -4 },
  },
  neuDark: {
    shadowColor: COLORS.sageDeep, shadowOpacity: 0.15, shadowRadius: 8,
    shadowOffset: { width: 4, height: 4 },
  },
  // ambient glow for primary CTAs / active tab / FABs / highlighted glass cards
  glowCoral: {
    shadowColor: COLORS.coral, shadowOpacity: 0.45, shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  glowSage: {
    shadowColor: COLORS.sage, shadowOpacity: 0.4, shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  glowRose: {
    shadowColor: COLORS.rose, shadowOpacity: 0.4, shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  glowLavender: {
    shadowColor: COLORS.lavender, shadowOpacity: 0.4, shadowRadius: 16,
    shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
  glassBorder: 'rgba(255,255,255,0.4)',
};

export const GRADIENTS = {
  hero: [COLORS.sageSoft, COLORS.blush] as const, // profile headers, hero backgrounds
  surface: [COLORS.cream, COLORS.blushLight] as const, // feed/list cards, look tiles
  cta: [COLORS.sage, COLORS.coral] as const, // primary buttons, FABs
  // saturated multi-stop wash for screen backgrounds — glass panels need real
  // color behind them to blur, or they just read as frosted neutral gray
  vivid: [COLORS.sage, COLORS.coral, COLORS.blush] as const,
};

// Colored glass tints for GlassCard — a plain white wash over blur reads as
// pale/neutral no matter how saturated the color underneath is, so glass
// panels need their OWN color to look "colorful," not just borrow it.
export const GLASS_TINTS = {
  coral: 'rgba(230,155,151,0.4)',
  sage: 'rgba(171,172,136,0.35)',
  blush: 'rgba(239,192,188,0.45)',
  rose: 'rgba(185,125,123,0.38)',
  lavender: 'rgba(201,191,224,0.4)',
  neutral: 'rgba(255,255,255,0.5)',
};

export const FONTS = {
  serif: 'Fraunces_600SemiBold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
};
