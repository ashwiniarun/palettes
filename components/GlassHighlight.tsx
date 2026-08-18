import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

// The light-catching streak across the top-left of a glass surface — this is
// what separates "real glass" from "tinted blur." Reused across every glass
// surface (GlassCard, Sheet, tab bar, header) so the reflection reads the
// same way everywhere.
export default function GlassHighlight() {
  return (
    <LinearGradient
      colors={['rgba(255,255,255,0.65)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
      locations={[0, 0.35, 0.75]}
      start={{ x: 0.05, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}
