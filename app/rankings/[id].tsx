import AppBackground from '@/components/AppBackground';
import GlassCard from '@/components/GlassCard';
import { SerifText, Text } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { makeStyles, useColors } from '@/lib/ThemeContext';
import { RADII } from '@/lib/theme';
import { CATEGORY_ORDER, Category, ClosetItem } from '@/lib/types';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

type RankRow = { cat: Category; item: ClosetItem };

export default function RankingsScreen() {
  const colors = useColors();
  const styles = useStyles();
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

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: handle ? `${handle}'s rankings` : 'your rankings' }} />
      <AppBackground />
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
            <GlassCard glow={index === 0} radius="lg" padding={12} style={{ marginBottom: 10 }}>
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

const useStyles = makeStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  sectionTitle: { fontSize: 15, marginBottom: 10, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatch: { width: 40, height: 40, borderRadius: RADII.sm, flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  cat: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, color: colors.textMuted, marginBottom: 2 },
  name: { fontSize: 13, fontWeight: '600', color: colors.text },
  review: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  score: { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 0 },
  empty: { textAlign: 'center', color: colors.textMuted, padding: 40 },
}));
