import { supabase } from '@/lib/supabase';
import { ClosetItem, Dupe, Product, costPerWear } from '@/lib/types';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';

const PLUM = '#5B2333';
const BG = '#FAF6F2';
const BORDER = '#E9E1DC';
const GOLD = '#B8862E';
const SAGE_TINT = '#E7EBE0';
const INK = '#231F20';
const PLACEHOLDER = '#8A8078';

type UsedInLook = { look_id: string; caption: string; poster_handle: string };

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<ClosetItem | null>(null);
  const [isYours, setIsYours] = useState(false);
  const [dupes, setDupes] = useState<Dupe[]>([]);
  const [usedIn, setUsedIn] = useState<UsedInLook[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState('');
  const [dupeQuery, setDupeQuery] = useState('');
  const [dupeResults, setDupeResults] = useState<Product[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !id) { setLoading(false); return; }

    const { data: itemData, error: itemError } = await supabase
      .from('closet_items').select('*, product:products(*)').eq('id', id).single();
    if (itemError) { console.log('Loading product detail failed:', itemError.message); setLoading(false); return; }

    const ci = itemData as unknown as ClosetItem;
    setItem(ci);
    setIsYours(ci.user_id === user.id);
    setRating(ci.rating);
    setReview(ci.review || '');

    const { data: dupeData, error: dupeError } = await supabase
      .from('dupes')
      .select('id, closet_item_id, dupe_product_id, dupe_product:products(*)')
      .eq('closet_item_id', id);
    if (dupeError) console.log('Loading dupes failed:', dupeError.message);
    setDupes((dupeData as unknown as Dupe[]) || []);

    const { data: matchingItems, error: matchError } = await supabase
      .from('closet_items').select('id').eq('product_id', ci.product_id);
    if (matchError) console.log('Finding matching closet items failed:', matchError.message);
    const matchIds = (matchingItems || []).map(m => m.id);

    if (matchIds.length > 0) {
      const { data: usedInData, error: usedInError } = await supabase
        .from('look_products')
        .select('look:looks(id, caption, poster:profiles!looks_user_id_fkey(handle))')
        .in('closet_item_id', matchIds);
      if (usedInError) console.log('Loading "used in looks" failed:', usedInError.message);
      const mapped = ((usedInData as any[]) || [])
        .filter(row => row.look)
        .map(row => ({ look_id: row.look.id, caption: row.look.caption, poster_handle: row.look.poster?.handle || 'unknown' }));
      setUsedIn(mapped);
    } else {
      setUsedIn([]);
    }

    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function saveRating() {
    if (!item) return;
    const { error } = await supabase.from('closet_items').update({ rating, review: review.trim() || null }).eq('id', item.id);
    if (error) console.log('Saving rating failed:', error.message);
    else load();
  }

  async function logEmpty() {
    if (!item) return;
    const { error } = await supabase.from('closet_items').update({ status: 'empty' }).eq('id', item.id);
    if (error) console.log('Logging empty failed:', error.message);
    else load();
  }

  async function searchDupes(text: string) {
    setDupeQuery(text);
    if (!text.trim()) { setDupeResults([]); return; }
    const { data, error } = await supabase.from('products').select('*').or(`brand.ilike.%${text}%,name.ilike.%${text}%`).limit(8);
    if (error) console.log('Dupe search failed:', error.message);
    setDupeResults((data as Product[]) || []);
  }

  async function addDupe(product: Product) {
    if (!item) return;
    const { error } = await supabase.from('dupes').insert({ closet_item_id: item.id, dupe_product_id: product.id });
    if (error) console.log('Adding dupe failed:', error.message);
    setDupeQuery(''); setDupeResults([]);
    load();
  }

  async function removeDupe(dupeId: string) {
    const { error } = await supabase.from('dupes').delete().eq('id', dupeId);
    if (error) console.log('Removing dupe failed:', error.message);
    load();
  }

  if (loading || !item) return <View style={styles.center}><ActivityIndicator color={PLUM} /></View>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.head}>
        <View style={[styles.swatch, { backgroundColor: item.color || item.product.default_color }]} />
        <View>
          <Text style={styles.title}>{item.product.brand} — {item.product.name}</Text>
          <Text style={styles.sub}>{item.product.category} · worn {item.times_worn} times{costPerWear(item) ? ` · $${costPerWear(item)}/wear` : ''}</Text>
        </View>
      </View>

      {isYours && item.status !== 'empty' && (
        <Pressable style={styles.logEmptyBtn} onPress={logEmpty}>
          <Text style={styles.logEmptyText}>log empty</Text>
        </Pressable>
      )}
      {isYours && item.status === 'empty' && (
        <View style={styles.emptyBadge}><Text style={styles.emptyBadgeText}>marked empty</Text></View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{isYours ? 'your rating' : 'rating'}</Text>
        {isYours ? (
          <>
            <View style={styles.starRow}>
              {Array.from({ length: 10 }).map((_, i) => (
                <Pressable key={i} onPress={() => setRating(i + 1)}>
                  <Text style={[styles.star, i < (rating || 0) && styles.starFilled]}>★</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.textarea}
              placeholder="write a short review..."
              placeholderTextColor={PLACEHOLDER}
              value={review}
              onChangeText={setReview}
              multiline
            />
            <Pressable style={styles.saveBtn} onPress={saveRating}><Text style={styles.saveBtnText}>save rating</Text></Pressable>
          </>
        ) : item.rating ? (
          <>
            <View style={styles.starRow}>
              {Array.from({ length: 10 }).map((_, i) => <Text key={i} style={[styles.star, i < item.rating! && styles.starFilled]}>★</Text>)}
            </View>
            <Text style={styles.readOnly}>{item.review || 'no written review'}</Text>
          </>
        ) : <Text style={styles.emptyText}>not rated yet.</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{isYours ? "dupes you've logged" : 'logged dupes'}</Text>
        {dupes.length === 0 && <Text style={styles.emptyText}>{isYours ? "you haven't logged one yet." : 'no dupes logged.'}</Text>}
        {dupes.map(d => (
          <View key={d.id} style={styles.dupeRow}>
            <Text style={styles.dupeName}>{d.dupe_product.brand} — {d.dupe_product.name}</Text>
            {isYours && <Pressable onPress={() => removeDupe(d.id)}><Text style={styles.removeText}>remove</Text></Pressable>}
          </View>
        ))}
        {isYours && (
          <>
            <TextInput
              style={styles.input}
              placeholder="search a dupe brand or product..."
              placeholderTextColor={PLACEHOLDER}
              value={dupeQuery}
              onChangeText={searchDupes}
            />
            {dupeResults.map(p => (
              <Pressable key={p.id} style={styles.dupeResultRow} onPress={() => addDupe(p)}>
                <Text style={styles.dupeName}>{p.brand} — {p.name}</Text>
                <Text style={styles.addText}>+ add</Text>
              </Pressable>
            ))}
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>looks using this product</Text>
      {usedIn.length === 0 && <Text style={styles.emptyText}>no posted looks use this yet.</Text>}
      {usedIn.map(l => (
        <View key={l.look_id} style={styles.usedInRow}>
          <Text style={styles.usedInHandle}>{l.poster_handle}</Text>
          <Text style={styles.usedInCaption}>{l.caption}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  swatch: { width: 48, height: 48, borderRadius: 12 },
  title: { fontSize: 17, fontWeight: '700' },
  sub: { fontSize: 12, color: '#6B615F', marginTop: 2 },
  logEmptyBtn: { borderWidth: 1, borderColor: BORDER, borderRadius: 9, paddingVertical: 8, alignItems: 'center', marginBottom: 16, backgroundColor: '#fff' },
  logEmptyText: { fontSize: 12, fontWeight: '600', color: '#6B615F' },
  emptyBadge: { backgroundColor: BORDER, borderRadius: 9, paddingVertical: 8, alignItems: 'center', marginBottom: 16 },
  emptyBadgeText: { fontSize: 12, fontWeight: '600', color: '#6B615F' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 14, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  starRow: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  star: { fontSize: 22, color: BORDER },
  starFilled: { color: GOLD },
  textarea: { borderWidth: 1, borderColor: BORDER, borderRadius: 9, padding: 10, minHeight: 60, backgroundColor: BG, marginBottom: 10, color: INK },
  saveBtn: { backgroundColor: PLUM, borderRadius: 10, padding: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  readOnly: { fontSize: 12, color: '#6B615F' },
  emptyText: { fontSize: 12, color: '#6B615F' },
  dupeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  dupeName: { fontSize: 12, flex: 1 },
  removeText: { fontSize: 11, color: '#6B615F' },
  input: { borderWidth: 1, borderColor: BORDER, borderRadius: 9, padding: 10, backgroundColor: BG, marginTop: 8, color: INK },
  dupeResultRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: SAGE_TINT, borderRadius: 8, padding: 8, marginTop: 6 },
  addText: { fontSize: 11, fontWeight: '700', color: PLUM },
  usedInRow: { backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 10, marginBottom: 8 },
  usedInHandle: { fontSize: 12, fontWeight: '700' },
  usedInCaption: { fontSize: 11, color: '#6B615F', marginTop: 2 },
});