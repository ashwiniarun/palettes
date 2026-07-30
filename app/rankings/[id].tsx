import { SerifText, Text } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { CATEGORY_ORDER, Category, ClosetItem } from '@/lib/types';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

const PLUM = '#5B2333';
const BG = '#FAF6F2';
const BORDER = '#E9E1DC';

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

  if (loading) return <View style={styles.center}><ActivityIndicator color={PLUM} /></View>;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      data={rows}
      keyExtractor={r => r.cat}
      ListHeaderComponent={
        <SerifText style={styles.sectionTitle}>
          {handle ? `${handle}'s` : 'your'} top rated, by category
        </SerifText>
      }
      renderItem={({ item: { cat, item } }) => (
        <View style={styles.row}>
          <View style={[styles.swatch, { backgroundColor: item.color || item.product.default_color }]} />
          <View style={styles.info}>
            <Text style={styles.cat}>top {cat}</Text>
            <Text style={styles.name}>{item.product.brand} — {item.product.name}</Text>
            {item.review ? <Text style={styles.review}>&ldquo;{item.review}&rdquo;</Text> : null}
          </View>
          <SerifText style={styles.score}>{item.rating}/10</SerifText>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>no rated products yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  sectionTitle: { fontSize: 15, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 12, marginBottom: 10 },
  swatch: { width: 40, height: 40, borderRadius: 10, flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  cat: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, color: '#6B615F', marginBottom: 2 },
  name: { fontSize: 13, fontWeight: '600' },
  review: { fontSize: 11, color: '#6B615F', marginTop: 4 },
  score: { fontSize: 15, color: PLUM, flexShrink: 0 },
  empty: { textAlign: 'center', color: '#6B615F', padding: 40 },
});
