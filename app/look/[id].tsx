import GlassCard from '@/components/GlassCard';
import NeumorphicButton from '@/components/NeumorphicButton';
import Sheet from '@/components/Sheet';
import { SerifText, Text, TextInput } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { COLORS, GRADIENTS, RADII } from '@/lib/theme';
import { CATEGORY_ORDER, ClosetItem } from '@/lib/types';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

const PLACEHOLDER = COLORS.inkSoft;

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

  if (loading || !look) return <View style={styles.center}><ActivityIndicator color={COLORS.sage} /></View>;

  return (
    <View style={styles.screen}>
      <LinearGradient colors={GRADIENTS.vivid} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.handle}>{look.poster.handle}</Text>
        <Text style={styles.caption}>{look.caption}</Text>
        <Image source={{ uri: look.photo_url }} style={styles.photo} />

        {isYours && (
          <View style={styles.actionRow}>
            <NeumorphicButton label="edit" glow="sage" onPress={() => setEditOpen(true)} style={{ flex: 1 }} />
            <NeumorphicButton onPress={confirmDelete} style={{ flex: 1 }}>
              <Text style={styles.deleteText}>delete</Text>
            </NeumorphicButton>
          </View>
        )}

        <SerifText style={styles.sectionTitle}>products used</SerifText>
        {look.look_products.map((lp, i) => (
          <GlassCard key={i} tint={i % 2 === 0 ? 'sage' : 'coral'} radius="md" padding={10} style={{ marginBottom: 6 }}>
            <View style={styles.productRow}>
              <Text style={styles.productName}>{lp.closet_item.product.brand} {lp.closet_item.product.name}</Text>
              {lp.closet_item.price ? <Text style={styles.productPrice}>${lp.closet_item.price}</Text> : null}
            </View>
          </GlassCard>
        ))}

        <EditLookModal
          visible={editOpen}
          look={look}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); load(); }}
        />
      </ScrollView>
    </View>
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
    <Sheet visible={visible} onClose={onClose}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
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
          <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
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

        <NeumorphicButton
          label={saving ? 'saving...' : 'save changes'}
          glow="coral"
          disabled={saving || !caption.trim() || selected.size === 0}
          onPress={handleSave}
          style={{ marginTop: 16 }}
        />
        <Pressable onPress={onClose}><Text style={styles.cancelText}>cancel</Text></Pressable>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  handle: { fontSize: 15, fontWeight: '700', color: COLORS.ink },
  caption: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: RADII.lg, marginBottom: 16, backgroundColor: COLORS.blushLight },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  deleteText: { fontSize: 13, fontWeight: '600', color: COLORS.danger },
  sectionTitle: { fontSize: 15, marginBottom: 10, color: COLORS.ink },
  productRow: { flexDirection: 'row', justifyContent: 'space-between' },
  productName: { fontSize: 12, fontWeight: '600', flex: 1, color: COLORS.ink },
  productPrice: { fontSize: 12, color: COLORS.textSecondary },
  modalTitle: { fontSize: 18, marginBottom: 16, color: COLORS.ink },
  input: {
    borderRadius: RADII.md, padding: 10, marginBottom: 12, backgroundColor: COLORS.cream, minHeight: 44, color: COLORS.ink,
    shadowColor: COLORS.sageDeep, shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: -2, height: -2 },
  },
  tagCount: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 8 },
  catLabel: { fontSize: 11, fontWeight: '700', color: COLORS.sageDeep, textTransform: 'uppercase', marginTop: 10, marginBottom: 6 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.cream, padding: 8, borderRadius: RADII.sm, marginBottom: 6 },
  checkbox: { width: 16, height: 16, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4 },
  checkboxChecked: { backgroundColor: COLORS.coral, borderColor: COLORS.coral },
  swatchSm: { width: 22, height: 22, borderRadius: 6 },
  tagName: { fontSize: 12, flex: 1, color: COLORS.ink },
  cancelText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 12, marginBottom: 20 },
});
