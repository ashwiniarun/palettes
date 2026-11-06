import { useTheme } from '@/lib/ThemeContext';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

// Shared screen backdrop: the theme's base swatch, plus its glow swatches as
// a few large soft pools of light. The pools are what the glass panels on
// top actually blur — over a flat color, glass has nothing to refract and
// just reads as a plain tinted box. Always the same placement on every
// screen, so the backdrop feels like one continuous surface.
const POOLS = [
  { x: 0.1, y: 0.08, r: 0.75 },
  { x: 0.95, y: 0.42, r: 0.65 },
  { x: 0.2, y: 0.88, r: 0.7 },
];

export default function AppBackground() {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const { bg, glows } = theme.colors;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          {glows.map((color, i) => (
            <RadialGradient key={i} id={`pool${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={color} stopOpacity={0.95} />
              <Stop offset="0.55" stopColor={color} stopOpacity={0.55} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {glows.map((_, i) => {
          const pool = POOLS[i % POOLS.length];
          return (
            <Circle
              key={i}
              cx={pool.x * width}
              cy={pool.y * height}
              r={pool.r * width}
              fill={`url(#pool${i})`}
            />
          );
        })}
      </Svg>
    </View>
  );
}
