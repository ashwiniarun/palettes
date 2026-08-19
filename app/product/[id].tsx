import DecoPageBorder from '@/components/DecoPageBorder';
import GlassCard from '@/components/GlassCard';
import NeumorphicButton from '@/components/NeumorphicButton';
import Sheet from '@/components/Sheet';
import { SerifText, Text, TextInput } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { orIlike } from '@/lib/supabaseFilters';
import { COLORS, GRADIENTS, RADII } from '@/lib/theme';
import { CATEGORY_ORDER, ClosetItem, Dupe, normalizeUrl, Product, costPerWear } from '@/lib/types';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';

const PLACEHOLDER = COLORS.inkSoft;

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
  const [editLink, setEditLink] = useState('');
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
    setEditLink(item.product.link || '');
    setEditPrice(item.price != null ? String(item.price) : '');
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!item) return;
    setSavingEdit(true);
    const fullName = editShade.trim() ? `${editName.trim()} · ${editShade.trim()}` : editName.trim();

    const { error: productError } = await supabase
      .from('products')
      .update({
        brand: editBrand.trim(), name: fullName, category: editCategory,
        link: editLink.trim() ? normalizeUrl(editLink) : null,
      })
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

  if (loading || !item) return <View style={styles.center}><ActivityIndicator color={COLORS.sage} /></View>;

  return (
    <View style={styles.screen}>
      <LinearGradient colors={GRADIENTS.vivid} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <DecoPageBorder />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <GlassCard tint="blush" radius="lg" ornate style={{ marginBottom: 16 }}>
          <View style={styles.head}>
            <View style={[styles.swatch, { backgroundColor: item.color || item.product.default_color }]} />
            <View style={styles.headInfo}>
              <SerifText style={styles.title}>{item.product.brand} — {item.product.name}</SerifText>
              <Text style={styles.sub}>{item.product.category} · worn {item.times_worn} times{costPerWear(item) ? ` · $${costPerWear(item)}/wear` : ''}</Text>
            </View>
          </View>
        </GlassCard>

        {item.product.link && (
          <NeumorphicButton
            label="buy this product"
            icon="cart-outline"
            glow="coral"
            onPress={() => Linking.openURL(item.product.link!)}
            style={{ marginBottom: 16 }}
          />
        )}

        {isYours && (
          <View style={styles.actionRow}>
            {item.status !== 'empty' ? (
              <NeumorphicButton label="log empty" onPress={logEmpty} style={{ flex: 1 }} />
            ) : (
              <View style={[styles.actionBtn, styles.emptyBadge]}><Text style={styles.emptyBadgeText}>marked empty</Text></View>
            )}
            <NeumorphicButton label="edit" glow="sage" onPress={openEdit} style={{ flex: 1 }} />
            <NeumorphicButton
              onPress={confirmDelete}
              style={{ flex: 1 }}
            >
              <Text style={styles.deleteText}>delete</Text>
            </NeumorphicButton>
          </View>
        )}

        <GlassCard tint="lavender" glow="lavender" radius="lg" style={{ marginBottom: 16 }}>
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
              <NeumorphicButton label="save rating" glow="coral" onPress={saveRating} />
            </>
          ) : item.rating ? (
            <>
              <View style={styles.starRow}>
                {Array.from({ length: 10 }).map((_, i) => <Text key={i} style={[styles.star, i < item.rating! && styles.starFilled]}>★</Text>)}
              </View>
              <Text style={styles.readOnly}>{item.review || 'no written review'}</Text>
            </>
          ) : <Text style={styles.emptyText}>not rated yet.</Text>}
        </GlassCard>

        <GlassCard tint="sage" radius="lg" style={{ marginBottom: 16 }}>
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
        </GlassCard>

        <SerifText style={styles.sectionTitle}>looks using this product</SerifText>
        {usedIn.length === 0 && <Text style={styles.emptyText}>no posted looks use this yet.</Text>}
        {usedIn.map(l => (
          <GlassCard key={l.look_id} tint="coral" radius="md" padding={10} style={{ marginBottom: 8 }}>
            <Text style={styles.usedInHandle}>{l.poster_handle}</Text>
            <Text style={styles.usedInCaption}>{l.caption}</Text>
          </GlassCard>
        ))}
      </ScrollView>

      <Sheet visible={editOpen} onClose={() => setEditOpen(false)}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
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
              <NeumorphicButton
                key={cat}
                variant="pill"
                label={cat}
                glow={editCategory === cat ? 'coral' : 'none'}
                onPress={() => setEditCategory(cat)}
                style={{ marginRight: 6, marginBottom: 6 }}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>link to buy (optional) — shown to anyone who views this product</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. sephora.com/product/..."
            placeholderTextColor={PLACEHOLDER}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={editLink}
            onChangeText={setEditLink}
          />

          <Text style={styles.fieldLabel}>price</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={editPrice} onChangeText={setEditPrice} />

          <NeumorphicButton
            label={savingEdit ? 'saving...' : 'save changes'}
            glow="coral"
            disabled={savingEdit}
            onPress={saveEdit}
            style={{ marginTop: 8 }}
          />
          <Pressable onPress={() => setEditOpen(false)}><Text style={styles.cancelText}>cancel</Text></Pressable>
        </ScrollView>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatch: { width: 48, height: 48, borderRadius: RADII.sm, flexShrink: 0 },
  headInfo: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, fontWeight: '700', flexShrink: 1, color: COLORS.ink },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  actionBtn: { flex: 1, borderRadius: RADII.md, paddingVertical: 12, alignItems: 'center', backgroundColor: COLORS.cream },
  deleteText: { fontSize: 13, fontWeight: '600', color: COLORS.danger },
  emptyBadge: { backgroundColor: COLORS.oatLatte },
  emptyBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  sectionTitle: { fontSize: 14, marginBottom: 10, color: COLORS.ink },
  starRow: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  star: { fontSize: 22, color: COLORS.oatLatte },
  starFilled: { color: COLORS.ink },
  textarea: {
    borderRadius: RADII.md, padding: 10, minHeight: 60, backgroundColor: COLORS.cream, marginBottom: 10, color: COLORS.ink,
    shadowColor: COLORS.sageDeep, shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: -2, height: -2 },
  },
  readOnly: { fontSize: 12, color: COLORS.textSecondary },
  emptyText: { fontSize: 12, color: COLORS.textSecondary },
  dupeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  dupeName: { fontSize: 12, flex: 1, color: COLORS.ink },
  removeText: { fontSize: 11, color: COLORS.textSecondary },
  input: {
    borderRadius: RADII.md, padding: 10, backgroundColor: COLORS.cream, marginTop: 8, color: COLORS.ink,
    shadowColor: COLORS.sageDeep, shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: -2, height: -2 },
  },
  dupeResultRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.warmFog, borderRadius: RADII.sm, padding: 8, marginTop: 6 },
  addText: { fontSize: 11, fontWeight: '700', color: COLORS.sageDeep },
  usedInHandle: { fontSize: 12, fontWeight: '700', color: COLORS.ink },
  usedInCaption: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  modalTitle: { fontSize: 18, marginBottom: 8, color: COLORS.ink },
  editHint: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 16 },
  fieldLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  cancelText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 12, marginBottom: 20 },
});
