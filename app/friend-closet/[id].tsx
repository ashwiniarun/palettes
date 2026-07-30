import { supabase } from '@/lib/supabase';
import { CATEGORY_ORDER, ClosetItem, costPerWear } from '@/lib/types';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

const PLUM = '#5B2333';
const BG = '#FAF6F2';
const BORDER = '#E9E1DC';

export default function FriendClosetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      setLoading(true);
      if (!id) { setLoading(false); return; }
      const { data, error } = await supabase
        .from('closet_items').select('*, product:products(*)')
        .eq('user_id', id).neq('status', 'empty').order('created_at', { ascending: false });
      if (error) console.log('Loading friend closet failed:', error.message);
      if (!active) return;
      setItems((data as unknown as ClosetItem[]) || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]));

  const grouped = CATEGORY_ORDER.map(cat => ({ cat, items: items.filter(i => i.product.category === cat) })).filter(g => g.items.length > 0);

  if (loading) return <View style={styles.center}><ActivityIndicator color={PLUM} /></View>;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      data={grouped}
      keyExtractor={g => g.cat}
      renderItem={({ item: group }) => (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.categoryTitle}>{group.cat}</Text>
          {group.items.map(ci => (
            <Pressable key={ci.id} style={styles.itemRow} onPress={() => router.push(`/product/${ci.id}`)}>
              <View style={[styles.swatch, { backgroundColor: ci.color || ci.product.default_color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{ci.product.brand} — {ci.product.name}</Text>
                <Text style={styles.itemSub}>worn {ci.times_worn} times{costPerWear(ci) ? ` · $${costPerWear(ci)}/wear` : ''}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>nothing shared yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  categoryTitle: { fontSize: 13, fontWeight: '700', color: PLUM, marginBottom: 8, textTransform: 'uppercase' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 12, marginBottom: 8 },
  swatch: { width: 36, height: 36, borderRadius: 9 },
  itemName: { fontSize: 13, fontWeight: '600' },
  itemSub: { fontSize: 11, color: '#6B615F', marginTop: 2 },
  empty: { textAlign: 'center', color: '#6B615F', padding: 40 },
});