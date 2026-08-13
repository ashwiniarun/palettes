import { SerifText, Text, TextInput } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { orIlike } from '@/lib/supabaseFilters';
import { CATEGORY_ORDER, ClosetItem, Dupe, Product, costPerWear } from '@/lib/types';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View,
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
  const router = useRouter();
  const [item, setItem] = useState<ClosetItem | null>(null);
  const [isYours, setIsYours] = useState(false);
  const [dupes, setDupes] = useState<Dupe[]>([]);
  const [usedIn, setUsedIn] = useState<UsedInLook[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState('');
  const [dupeQuery, setDupeQuery] = useState('');
  const [dupeResults, setDupeResults] = useState<Product[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editBrand, setEditBrand] = useState('');
  const [editName, setEditName] = useState('');
  const [editShade, setEditShade] = useState('');
  const [editCategory, setEditCategory] = useState<typeof CATEGORY_ORDER[number]>('face');
  const [editPrice, setEditPrice] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

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

  function openEdit() {
    if (!item) return;
    const [namePart, shadePart] = item.product.name.split('·').map(s => s.trim());
    setEditBrand(item.product.brand);
    setEditName(namePart || item.product.name);
    setEditShade(shadePart || '');
    setEditCategory(item.product.category);
    setEditPrice(item.price != null ? String(item.price) : '');
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!item) return;
    setSavingEdit(true);
    const fullName = editShade.trim() ? `${editName.trim()} · ${editShade.trim()}` : editName.trim();

    const { error: productError } = await supabase
      .from('products')
      .update({ brand: editBrand.trim(), name: fullName, category: editCategory })
      .eq('id', item.product_id);
    if (productError) console.log('Updating product failed:', productError.message);

    const { error: closetError } = await supabase
      .from('closet_items')
      .update({ price: editPrice ? parseFloat(editPrice) : null })
      .eq('id', item.id);
    if (closetError) console.log('Updating closet item failed:', closetError.message);

    setSavingEdit(false);
    setEditOpen(false);
    load();
  }

  function confirmDelete() {
    const usedInCount = usedIn.length;
    Alert.alert(
      'delete this product?',
      usedInCount > 0
        ? `this will also remove it from ${usedInCount} posted look${usedInCount === 1 ? '' : 's'}. this can't be undone.`
        : "this can't be undone.",
      [
        { text: 'cancel', style: 'cancel' },
        { text: 'delete', style: 'destructive', onPress: deleteItem },
      ]
    );
  }

  async function deleteItem() {
    if (!item) return;
    const { error } = await supabase.from('closet_items').delete().eq('id', item.id);
    if (error) { console.log('Deleting closet item failed:', error.message); return; }
    router.back();
  }

  async function searchDupes(text: string) {
    setDupeQuery(text);
    if (!text.trim()) { setDupeResults([]); return; }
    const { data, error } = await supabase.from('products').select('*').or(orIlike(['brand', 'name'], text)).limit(8);
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
        <View style={styles.headInfo}>
          <SerifText style={styles.title}>{item.product.brand} — {item.product.name}</SerifText>
          <Text style={styles.sub}>{item.product.category} · worn {item.times_worn} times{costPerWear(item) ? ` · $${costPerWear(item)}/wear` : ''}</Text>
        </View>
      </View>

      {isYours && (
        <View style={styles.actionRow}>
          {item.status !== 'empty' ? (
            <Pressable style={styles.actionBtn} onPress={logEmpty}>
              <Text style={styles.logEmptyText}>log empty</Text>
            </Pressable>
          ) : (
            <View style={[styles.actionBtn, styles.emptyBadge]}><Text style={styles.emptyBadgeText}>marked empty</Text></View>
          )}
          <Pressable style={styles.actionBtn} onPress={openEdit}>
            <Text style={styles.logEmptyText}>edit</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={confirmDelete}>
            <Text style={styles.deleteText}>delete</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.card}>
        <SerifText style={styles.sectionTitle}>{isYours ? 'your rating' : 'rating'}</SerifText>
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
        <SerifText style={styles.sectionTitle}>{isYours ? "dupes you've logged" : 'logged dupes'}</SerifText>
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

      <SerifText style={styles.sectionTitle}>looks using this product</SerifText>
      {usedIn.length === 0 && <Text style={styles.emptyText}>no posted looks use this yet.</Text>}
      {usedIn.map(l => (
        <View key={l.look_id} style={styles.usedInRow}>
          <Text style={styles.usedInHandle}>{l.poster_handle}</Text>
          <Text style={styles.usedInCaption}>{l.caption}</Text>
        </View>
      ))}

      <Modal visible={editOpen} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal} contentContainerStyle={{ padding: 20 }}>
          <SerifText style={styles.modalTitle}>edit product</SerifText>
          <Text style={styles.editHint}>
            brand, name, and category are shared with anyone else who has this product — changes apply everywhere.
          </Text>

          <Text style={styles.fieldLabel}>brand</Text>
          <TextInput style={styles.input} value={editBrand} onChangeText={setEditBrand} />

          <Text style={styles.fieldLabel}>product name</Text>
          <TextInput style={styles.input} value={editName} onChangeText={setEditName} />

          <Text style={styles.fieldLabel}>shade (optional)</Text>
          <TextInput style={styles.input} value={editShade} onChangeText={setEditShade} />

          <Text style={styles.fieldLabel}>category</Text>
          <View style={styles.chipRow}>
            {CATEGORY_ORDER.map(cat => (
              <Pressable
                key={cat}
                style={[styles.chip, editCategory === cat && styles.chipActive]}
                onPress={() => setEditCategory(cat)}
              >
                <Text style={[styles.chipText, editCategory === cat && styles.chipTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>price</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={editPrice} onChangeText={setEditPrice} />

          <Pressable style={[styles.saveBtn, savingEdit && { opacity: 0.6 }]} disabled={savingEdit} onPress={saveEdit}>
            <Text style={styles.saveBtnText}>{savingEdit ? 'saving...' : 'save changes'}</Text>
          </Pressable>
          <Pressable onPress={() => setEditOpen(false)}><Text style={styles.cancelText}>cancel</Text></Pressable>
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  swatch: { width: 48, height: 48, borderRadius: 12, flexShrink: 0 },
  headInfo: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  sub: { fontSize: 12, color: '#6B615F', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  actionBtn: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 9, paddingVertical: 8, alignItems: 'center', backgroundColor: '#fff' },
  logEmptyText: { fontSize: 12, fontWeight: '600', color: '#6B615F' },
  deleteText: { fontSize: 12, fontWeight: '600', color: '#B3403A' },
  emptyBadge: { backgroundColor: BORDER },
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
  modal: { flex: 1, backgroundColor: BG },
  modalTitle: { fontSize: 18, marginBottom: 8 },
  editHint: { fontSize: 11, color: '#6B615F', marginBottom: 16 },
  fieldLabel: { fontSize: 11, color: '#6B615F', marginBottom: 4, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: { borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#fff' },
  chipActive: { backgroundColor: PLUM, borderColor: PLUM },
  chipText: { fontSize: 11, color: INK },
  chipTextActive: { color: '#fff' },
  cancelText: { textAlign: 'center', color: '#6B615F', marginTop: 12, marginBottom: 20 },
});