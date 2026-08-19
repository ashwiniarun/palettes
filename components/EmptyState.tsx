import { Text } from '@/components/ThemedText';
import { COLORS } from '@/lib/theme';
import { Image, StyleSheet, View } from 'react-native';

// Primary first-run empty states get a small gilded flourish above the
// message — secondary/minor empties (no search matches, nothing rated yet,
// etc.) stay plain text, matching the "ornament on singular moments, not
// every list state" restraint used elsewhere in the Deco system.
export default function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.wrap}>
      <Image source={require('@/assets/images/deco-flourish.png')} style={styles.icon} resizeMode="contain" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', padding: 40 },
  icon: { width: 72, height: 60, marginBottom: 10, opacity: 0.85 },
  text: { textAlign: 'center', color: COLORS.textSecondary },
});
