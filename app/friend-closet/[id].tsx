import GlassCard from '@/components/GlassCard';
import { SerifText, Text } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { COLORS, GLASS_TINTS, GRADIENTS, RADII } from '@/lib/theme';
import { CATEGORY_ORDER, ClosetItem, costPerWear } from '@/lib/types';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

const ROW_TINTS: (keyof typeof GLASS_TINTS)[] = ['sage', 'coral', 'blush'];

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

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.sage} /></View>;

  return (
    <View style={styles.screen}>
      <LinearGradient colors={GRADIENTS.vivid} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={grouped}
        keyExtractor={g => g.cat}
        renderItem={({ item: group, index: groupIndex }) => (
          <Animated.View entering={FadeInUp.delay(groupIndex * 40).springify()} style={{ marginBottom: 12 }}>
            <SerifText style={styles.categoryTitle}>{group.cat}</SerifText>
            {group.items.map((ci, i) => (
              <GlassCard
                key={ci.id}
                onPress={() => router.push(`/product/${ci.id}`)}
                tint={ROW_TINTS[i % ROW_TINTS.length]}
                radius="md"
                padding={12}
                style={{ marginBottom: 8 }}
              >
                <View style={styles.itemInner}>
                  <View style={[styles.swatch, { backgroundColor: ci.color || ci.product.default_color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{ci.product.brand} — {ci.product.name}</Text>
                    <Text style={styles.itemSub}>worn {ci.times_worn} times{costPerWear(ci) ? ` · $${costPerWear(ci)}/wear` : ''}</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </Animated.View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>nothing shared yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  categoryTitle: { fontSize: 13, fontWeight: '700', color: COLORS.ink, marginBottom: 8, textTransform: 'uppercase' },
  itemInner: { flexDirection: 'row', alignItems: 'center' },
  swatch: { width: 36, height: 36, borderRadius: RADII.sm, marginRight: 12 },
  itemName: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  itemSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, padding: 40 },
});
