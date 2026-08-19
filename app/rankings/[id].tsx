import DecoPageBorder from '@/components/DecoPageBorder';
import GlassCard from '@/components/GlassCard';
import { SerifText, Text } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { COLORS, GLASS_TINTS, GRADIENTS, RADII } from '@/lib/theme';
import { CATEGORY_ORDER, Category, ClosetItem } from '@/lib/types';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

const ROW_TINTS: (keyof typeof GLASS_TINTS)[] = ['lavender', 'coral', 'sage', 'blush'];

type RankRow = { cat: Category; item: ClosetItem };

export default function RankingsScreen() {
  const { id, handle } = useLocalSearchParams<{ id: string; handle?: string }>();
  const [rows, setRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      setLoading(true);
      if (!id) { setLoading(false); return; }
      const { data, error } = await supabase
        .from('closet_items')
        .select('*, product:products(*)')
        .eq('user_id', id)
        .not('rating', 'is', null);
      if (error) console.log('Loading rankings failed:', error.message);
      if (!active) return;

      const items = (data as unknown as ClosetItem[]) || [];
      const ranked = CATEGORY_ORDER
        .map(cat => {
          const inCat = items.filter(i => i.product.category === cat);
          if (inCat.length === 0) return null;
          const top = [...inCat].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
          return { cat, item: top };
        })
        .filter((r): r is RankRow => r !== null);

      setRows(ranked);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]));

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.sage} /></View>;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: handle ? `${handle}'s rankings` : 'your rankings' }} />
      <LinearGradient colors={GRADIENTS.vivid} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <DecoPageBorder />
      <Image
        source={require('@/assets/images/vanity-mirror.png')}
        style={styles.mirrorWatermark}
        resizeMode="contain"
      />
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={rows}
        keyExtractor={r => r.cat}
        ListHeaderComponent={
          <SerifText style={styles.sectionTitle}>
            {handle ? `${handle}'s` : 'your'} top rated, by category
          </SerifText>
        }
        renderItem={({ item: { cat, item }, index }) => (
          <Animated.View entering={FadeInUp.delay(index * 40).springify()}>
            <GlassCard tint={ROW_TINTS[index % ROW_TINTS.length]} glow={index === 0 ? 'lavender' : 'none'} radius="lg" padding={12} style={{ marginBottom: 10 }}>
              <View style={styles.row}>
                <View style={[styles.swatch, { backgroundColor: item.color || item.product.default_color }]} />
                <View style={styles.info}>
                  <Text style={styles.cat}>top {cat}</Text>
                  <Text style={styles.name}>{item.product.brand} — {item.product.name}</Text>
                  {item.review ? <Text style={styles.review}>&ldquo;{item.review}&rdquo;</Text> : null}
                </View>
                <SerifText style={styles.score}>{item.rating}/10</SerifText>
              </View>
            </GlassCard>
          </Animated.View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>no rated products yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  mirrorWatermark: {
    position: 'absolute', top: 40, alignSelf: 'center', width: 280, height: 329, opacity: 0.42,
  },
  sectionTitle: { fontSize: 15, marginBottom: 10, color: COLORS.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatch: { width: 40, height: 40, borderRadius: RADII.sm, flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  cat: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, color: COLORS.textSecondary, marginBottom: 2 },
  name: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  review: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  score: { fontSize: 15, fontWeight: '700', color: COLORS.ink, flexShrink: 0 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, padding: 40 },
});
