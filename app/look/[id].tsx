import { SerifText, Text, TextInput } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { CATEGORY_ORDER, ClosetItem } from '@/lib/types';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

const PLUM = '#5B2333';
const BG = '#FAF6F2';
const BORDER = '#E9E1DC';
const SAGE_TINT = '#E7EBE0';
const PLACEHOLDER = '#8A8078';
const INK = '#231F20';

type LookDetail = {
  id: string; user_id: string; caption: string; photo_url: string;
  poster: { handle: string };
  look_products: { closet_item: { id: string; price: number | null; product: { brand: string; name: string } } }[];
};

export default function LookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [look, setLook] = useState<LookDetail | null>(null);
  const [isYours, setIsYours] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!id) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('looks')
      .select(`
        id, user_id, caption, photo_url,
        poster:profiles!looks_user_id_fkey(handle),
        look_products(closet_item:closet_items(id, price, product:products(brand, name)))
      `)
      .eq('id', id)
      .single();
    if (error) console.log('Loading look detail failed:', error.message);
    const lookData = data as unknown as LookDetail;
    setLook(lookData);
    setIsYours(!!user && lookData?.user_id === user.id);
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmDelete() {
    Alert.alert(
      'delete this look?',
      "this can't be undone.",
      [
        { text: 'cancel', style: 'cancel' },
        { text: 'delete', style: 'destructive', onPress: deleteLook },
      ]
    );
  }

  async function deleteLook() {
    if (!look) return;
    const { error } = await supabase.from('looks').delete().eq('id', look.id);
    if (error) { console.log('Deleting look failed:', error.message); return; }
    router.back();
  }

  if (loading || !look) return <View style={styles.center}><ActivityIndicator color={PLUM} /></View>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.handle}>{look.poster.handle}</Text>
      <Text style={styles.caption}>{look.caption}</Text>
      <Image source={{ uri: look.photo_url }} style={styles.photo} />

      {isYours && (
        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={() => setEditOpen(true)}>
            <Text style={styles.actionBtnText}>edit</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={confirmDelete}>
            <Text style={styles.deleteText}>delete</Text>
          </Pressable>
        </View>
      )}

      <SerifText style={styles.sectionTitle}>products used</SerifText>
      {look.look_products.map((lp, i) => (
        <View key={i} style={styles.productRow}>
          <Text style={styles.productName}>{lp.closet_item.product.brand} {lp.closet_item.product.name}</Text>
          {lp.closet_item.price ? <Text style={styles.productPrice}>${lp.closet_item.price}</Text> : null}
        </View>
      ))}

      <EditLookModal
        visible={editOpen}
        look={look}
        onClose={() => setEditOpen(false)}
        onSaved={() => { setEditOpen(false); load(); }}
      />
    </ScrollView>
  );
}

function EditLookModal({ visible, look, onClose, onSaved }: {
  visible: boolean; look: LookDetail; onClose: () => void; onSaved: () => void;
}) {
  const [caption, setCaption] = useState(look.caption);
  const [closetItems, setClosetItems] = useState<ClosetItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(look.look_products.map(lp => lp.closet_item.id)));
  const [loadingCloset, setLoadingCloset] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCaption(look.caption);
    setSelected(new Set(look.look_products.map(lp => lp.closet_item.id)));
    (async () => {
      setLoadingCloset(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingCloset(false); return; }
      const { data, error } = await supabase
        .from('closet_items').select('*, product:products(*)')
        .eq('user_id', user.id).neq('status', 'empty');
      if (error) console.log('Loading closet for look edit failed:', error.message);
      setClosetItems((data as unknown as ClosetItem[]) || []);
      setLoadingCloset(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, look]);

  function toggleProduct(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function handleSave() {
    if (!caption.trim() || selected.size === 0) return;
    setSaving(true);

    const { error: captionError } = await supabase.from('looks').update({ caption: caption.trim() }).eq('id', look.id);
    if (captionError) console.log('Updating caption failed:', captionError.message);

    const { error: deleteError } = await supabase.from('look_products').delete().eq('look_id', look.id);
    if (deleteError) console.log('Clearing old tags failed:', deleteError.message);

    const rows = [...selected].map(closet_item_id => ({ look_id: look.id, closet_item_id }));
    const { error: insertError } = await supabase.from('look_products').insert(rows);
    if (insertError) console.log('Re-tagging products failed:', insertError.message);

    setSaving(false);
    onSaved();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.modal} contentContainerStyle={{ padding: 20 }}>
        <SerifText style={styles.modalTitle}>edit look</SerifText>

        <TextInput
          style={styles.input}
          placeholder="caption this look..."
          placeholderTextColor={PLACEHOLDER}
          value={caption}
          onChangeText={setCaption}
          multiline
        />

        <Text style={styles.tagCount}>{selected.size} product{selected.size === 1 ? '' : 's'} tagged</Text>

        {loadingCloset ? (
          <ActivityIndicator color={PLUM} style={{ marginTop: 20 }} />
        ) : (
          CATEGORY_ORDER.map(cat => {
            const items = closetItems.filter(c => c.product.category === cat);
            if (items.length === 0) return null;
            return (
              <View key={cat}>
                <Text style={styles.catLabel}>{cat}</Text>
                {items.map(item => (
                  <Pressable key={item.id} style={styles.tagRow} onPress={() => toggleProduct(item.id)}>
                    <View style={[styles.checkbox, selected.has(item.id) && styles.checkboxChecked]} />
                    <View style={[styles.swatchSm, { backgroundColor: item.color || item.product.default_color }]} />
                    <Text style={styles.tagName}>{item.product.brand} — {item.product.name}</Text>
                  </Pressable>
                ))}
              </View>
            );
          })
        )}

        <Pressable
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          disabled={saving || !caption.trim() || selected.size === 0}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>{saving ? 'saving...' : 'save changes'}</Text>
        </Pressable>
        <Pressable onPress={onClose}><Text style={styles.cancelText}>cancel</Text></Pressable>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  handle: { fontSize: 15, fontWeight: '700' },
  caption: { fontSize: 13, color: '#6B615F', marginBottom: 12 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 14, marginBottom: 16, backgroundColor: '#F1E1E5' },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  actionBtn: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 9, paddingVertical: 8, alignItems: 'center', backgroundColor: '#fff' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#6B615F' },
  deleteText: { fontSize: 12, fontWeight: '600', color: '#B3403A' },
  sectionTitle: { fontSize: 15, marginBottom: 10 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: SAGE_TINT, borderRadius: 9, padding: 10, marginBottom: 6 },
  productName: { fontSize: 12, fontWeight: '600', flex: 1 },
  productPrice: { fontSize: 12, color: '#6B615F' },
  modal: { flex: 1, backgroundColor: BG },
  modalTitle: { fontSize: 18, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: BORDER, borderRadius: 9, padding: 10, marginBottom: 12, backgroundColor: '#fff', minHeight: 44, color: INK },
  tagCount: { fontSize: 11, color: '#6B615F', marginBottom: 8 },
  catLabel: { fontSize: 11, fontWeight: '700', color: PLUM, textTransform: 'uppercase', marginTop: 10, marginBottom: 6 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', padding: 8, borderRadius: 9, marginBottom: 6 },
  checkbox: { width: 16, height: 16, borderWidth: 1, borderColor: BORDER, borderRadius: 4 },
  checkboxChecked: { backgroundColor: PLUM, borderColor: PLUM },
  swatchSm: { width: 22, height: 22, borderRadius: 6 },
  tagName: { fontSize: 12, flex: 1 },
  saveBtn: { backgroundColor: PLUM, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  cancelText: { textAlign: 'center', color: '#6B615F', marginTop: 12, marginBottom: 20 },
});
