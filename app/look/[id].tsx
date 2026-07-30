import { SerifText, Text } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';

const PLUM = '#5B2333';
const BG = '#FAF6F2';
const BORDER = '#E9E1DC';
const SAGE_TINT = '#E7EBE0';

type LookDetail = {
  id: string; caption: string; photo_url: string;
  poster: { handle: string };
  look_products: { closet_item: { price: number | null; product: { brand: string; name: string } } }[];
};

export default function LookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [look, setLook] = useState<LookDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      setLoading(true);
      if (!id) { setLoading(false); return; }
      const { data, error } = await supabase
        .from('looks')
        .select(`
          id, caption, photo_url,
          poster:profiles!looks_user_id_fkey(handle),
          look_products(closet_item:closet_items(price, product:products(brand, name)))
        `)
        .eq('id', id)
        .single();
      if (error) console.log('Loading look detail failed:', error.message);
      if (!active) return;
      setLook(data as unknown as LookDetail);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]));

  if (loading || !look) return <View style={styles.center}><ActivityIndicator color={PLUM} /></View>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.handle}>{look.poster.handle}</Text>
      <Text style={styles.caption}>{look.caption}</Text>
      <Image source={{ uri: look.photo_url }} style={styles.photo} />
      <SerifText style={styles.sectionTitle}>products used</SerifText>
      {look.look_products.map((lp, i) => (
        <View key={i} style={styles.productRow}>
          <Text style={styles.productName}>{lp.closet_item.product.brand} {lp.closet_item.product.name}</Text>
          {lp.closet_item.price ? <Text style={styles.productPrice}>${lp.closet_item.price}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  handle: { fontSize: 15, fontWeight: '700' },
  caption: { fontSize: 13, color: '#6B615F', marginBottom: 12 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 14, marginBottom: 16, backgroundColor: '#F1E1E5' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: SAGE_TINT, borderRadius: 9, padding: 10, marginBottom: 6 },
  productName: { fontSize: 12, fontWeight: '600', flex: 1 },
  productPrice: { fontSize: 12, color: '#6B615F' },
});