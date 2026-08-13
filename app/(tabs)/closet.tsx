import { Ionicons } from '@expo/vector-icons';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import { SerifText, Text, TextInput } from '@/components/ThemedText';
import { lookupBarcode } from '@/lib/barcodeLookup';
import { supabase } from '@/lib/supabase';
import { orIlike } from '@/lib/supabaseFilters';
import { CATEGORY_ORDER, ClosetItem, Product, costPerWear } from '@/lib/types';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';

const PLUM = '#5B2333';
const BG = '#FAF6F2';
const BORDER = '#E9E1DC';
const INK = '#231F20';
const INK_SOFT = '#6B615F';
const PLACEHOLDER = '#8A8078';

export default function ClosetScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [emptyOpen, setEmptyOpen] = useState(false);

  const loadCloset = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('closet_items')
      .select('*, product:products(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) console.log('Loading closet failed:', error.message);
    if (!error && data) setItems(data as unknown as ClosetItem[]);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadCloset(); }, [loadCloset]));

  const grouped = CATEGORY_ORDER
    .map(cat => ({ cat, items: items.filter(i => i.product.category === cat && i.status !== 'empty') }))
    .filter(g => g.items.length > 0);
  const emptyItems = items.filter(i => i.status === 'empty');

  if (loading) return <View style={styles.center}><ActivityIndicator color={PLUM} /></View>;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <SerifText style={styles.title}>your closet</SerifText>
        <Pressable style={styles.addBtn} onPress={() => setAddOpen(true)}>
          <Text style={styles.addBtnText}>+ add product</Text>
        </Pressable>
      </View>

      <FlatList
        data={grouped}
        keyExtractor={g => g.cat}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item: group }) => (
          <View style={{ marginBottom: 12 }}>
            <SerifText style={styles.categoryTitle}>{group.cat}</SerifText>
            {group.items.map(item => (
              <Pressable key={item.id} style={styles.itemRow} onPress={() => router.push(`/product/${item.id}`)}>
                <View style={[styles.swatch, { backgroundColor: item.color || item.product.default_color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.product.brand} — {item.product.name}</Text>
                  <Text style={styles.itemSub}>
                    {item.last_used || `worn ${item.times_worn} times`}
                    {costPerWear(item) ? ` · $${costPerWear(item)}/wear` : ''}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
        ListEmptyComponent={
          grouped.length === 0 ? <Text style={styles.empty}>nothing in your closet yet — add your first product.</Text> : null
        }
        ListFooterComponent={
          <View>
            <Pressable style={styles.toggleRow} onPress={() => setEmptyOpen(o => !o)}>
              <SerifText style={styles.sectionTitle}>empty products ({emptyItems.length})</SerifText>
              <Ionicons name={emptyOpen ? 'chevron-up' : 'chevron-down'} size={16} color={INK_SOFT} />
            </Pressable>
            {emptyOpen && (
              emptyItems.length > 0 ? emptyItems.map(item => (
                <Pressable key={item.id} style={styles.itemRow} onPress={() => router.push(`/product/${item.id}`)}>
                  <View style={[styles.swatch, { backgroundColor: item.color || item.product.default_color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.product.brand} — {item.product.name}</Text>
                    <Text style={styles.itemSub}>
                      {item.last_used || `worn ${item.times_worn} times`}
                      {costPerWear(item) ? ` · $${costPerWear(item)}/wear` : ''}
                    </Text>
                  </View>
                  <View style={styles.emptyPill}><Text style={styles.emptyPillText}>empty</Text></View>
                </Pressable>
              )) : <Text style={styles.empty}>nothing finished yet — log a product when you use it up.</Text>
            )}
          </View>
        }
      />

      <AddProductModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => { setAddOpen(false); loadCloset(); }}
      />
    </View>
  );
}

function AddProductModal({ visible, onClose, onAdded }: {
  visible: boolean; onClose: () => void; onAdded: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [newBrand, setNewBrand] = useState('');
  const [newName, setNewName] = useState('');
  const [newShade, setNewShade] = useState('');
  const [newCategory, setNewCategory] = useState<typeof CATEGORY_ORDER[number]>('face');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [matchedFromScan, setMatchedFromScan] = useState(false);

  async function handleBarcodeScanned(code: string) {
    setScannerOpen(false);
    setScanLoading(true);

    const { data: existing, error } = await supabase
      .from('products').select('*').eq('barcode', code).maybeSingle();
    if (error) console.log('Barcode lookup in catalog failed:', error.message);

    if (existing) {
      setSelected(existing as Product);
      setQuery(`${existing.brand} — ${existing.name}`);
      setResults([]);
      setMatchedFromScan(true);
      setScanLoading(false);
      return;
    }

    setScannedBarcode(code);
    setSelected(null);
    setMatchedFromScan(false);
    const lookup = await lookupBarcode(code);
    if (lookup) {
      setNewBrand(lookup.brand);
      setNewName(lookup.name);
      if (lookup.category) setNewCategory(lookup.category);
      if (lookup.brand && lookup.name) setQuery(`${lookup.brand} — ${lookup.name}`);
    }
    setScanLoading(false);
  }

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(orIlike(['brand', 'name'], query))
        .limit(8);
      if (error) console.log('Product search failed:', error.message);
      setResults((data as Product[]) || []);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  async function handleAdd() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    let productId = selected?.id;

    if (!productId) {
      const fullName = newShade.trim() ? `${newName.trim()} · ${newShade.trim()}` : newName.trim();
      const { data: newProduct, error } = await supabase
        .from('products')
        .insert({ brand: newBrand.trim(), name: fullName, category: newCategory, barcode: scannedBarcode })
        .select()
        .single();
      if (error || !newProduct) {
        console.log('Product insert failed:', error?.message);
        setSaving(false);
        return;
      }
      productId = newProduct.id;
    } else if (scannedBarcode && selected && !selected.barcode) {
      // Backfill the barcode onto a product that already existed but hadn't been scanned before —
      // so the next person to scan this exact item gets an instant match.
      const { error } = await supabase.from('products').update({ barcode: scannedBarcode }).eq('id', productId);
      if (error) console.log('Backfilling barcode failed:', error.message);
    }

    const { error: closetError } = await supabase.from('closet_items').insert({
      user_id: user.id,
      product_id: productId,
      price: price ? parseFloat(price) : null,
      status: 'active',
    });
    if (closetError) console.log('Closet insert failed:', closetError.message);

    setSaving(false);
    setQuery(''); setSelected(null); setNewBrand(''); setNewName(''); setNewShade(''); setPrice(''); setScannedBarcode(null);
    onAdded();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.modal} contentContainerStyle={{ padding: 20 }}>
        <SerifText style={styles.modalTitle}>add a product</SerifText>

        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="search brand or product..."
            placeholderTextColor={PLACEHOLDER}
            value={query}
            onChangeText={t => { setQuery(t); setSelected(null); setMatchedFromScan(false); }}
          />
          <Pressable style={styles.scanBtn} onPress={() => setScannerOpen(true)}>
            <Ionicons name="barcode-outline" size={20} color="#fff" />
          </Pressable>
        </View>
        {scanLoading && (
          <View style={styles.scanLoadingRow}>
            <ActivityIndicator size="small" color={PLUM} />
            <Text style={styles.scanLoadingText}>looking up barcode...</Text>
          </View>
        )}
        {scannedBarcode && !scanLoading && (
          <Text style={styles.scanLoadingText}>barcode {scannedBarcode} will be saved with this product.</Text>
        )}
        {matchedFromScan && selected && !scanLoading && (
          <View style={styles.matchBanner}>
            <Text style={styles.matchBannerText}>
              matched <Text style={{ fontWeight: '700' }}>{selected.brand} — {selected.name}</Text> from a previous scan — already in the catalog, so brand/name/category are locked in. just add a price below if you want one.
            </Text>
          </View>
        )}

        {results.map(p => (
          <Pressable
            key={p.id}
            style={styles.resultRow}
            onPress={() => { setSelected(p); setQuery(`${p.brand} — ${p.name}`); setResults([]); setMatchedFromScan(false); }}
          >
            <Text>{p.brand} — {p.name}</Text>
            <Text style={styles.resultCategory}>{p.category}</Text>
          </Pressable>
        ))}

        {!selected && (query.trim().length > 1 || !!scannedBarcode) && (
          <View style={styles.newProductBox}>
            <Text style={styles.newProductLabel}>
              {scannedBarcode && !newBrand && !newName
                ? "couldn't find this barcode anywhere — add it as new:"
                : 'no exact match — add it as new:'}
            </Text>
            <TextInput style={styles.input} placeholder="brand" placeholderTextColor={PLACEHOLDER} value={newBrand} onChangeText={setNewBrand} />
            <TextInput style={styles.input} placeholder="product name" placeholderTextColor={PLACEHOLDER} value={newName} onChangeText={setNewName} />
            <TextInput style={styles.input} placeholder="shade (optional)" placeholderTextColor={PLACEHOLDER} value={newShade} onChangeText={setNewShade} />
            <View style={styles.chipRow}>
              {CATEGORY_ORDER.map(cat => (
                <Pressable
                  key={cat}
                  style={[styles.chip, newCategory === cat && styles.chipActive]}
                  onPress={() => setNewCategory(cat)}
                >
                  <Text style={[styles.chipText, newCategory === cat && styles.chipTextActive]}>{cat}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="price (optional)"
          placeholderTextColor={PLACEHOLDER}
          keyboardType="decimal-pad"
          value={price}
          onChangeText={setPrice}
        />

        <Pressable
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          disabled={saving || (!selected && (!newBrand.trim() || !newName.trim()))}
          onPress={handleAdd}
        >
          <Text style={styles.saveBtnText}>{saving ? 'adding...' : 'add to closet'}</Text>
        </Pressable>

        <Pressable onPress={() => { setScannedBarcode(null); onClose(); }}><Text style={styles.cancelText}>cancel</Text></Pressable>
      </ScrollView>

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleBarcodeScanned}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 0 },
  title: { fontSize: 20, fontWeight: '600', color: INK },
  addBtn: { borderWidth: 1, borderColor: BORDER, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  addBtnText: { fontSize: 12, fontWeight: '600' },
  categoryTitle: { fontSize: 13, fontWeight: '700', color: PLUM, marginBottom: 8, textTransform: 'uppercase' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 12, marginBottom: 8 },
  swatch: { width: 36, height: 36, borderRadius: 9 },
  itemName: { fontSize: 13, fontWeight: '600' },
  itemSub: { fontSize: 11, color: '#6B615F', marginTop: 2 },
  empty: { textAlign: 'center', color: '#6B615F', padding: 40 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 15 },
  emptyPill: { backgroundColor: BORDER, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8, flexShrink: 0 },
  emptyPillText: { fontSize: 10, fontWeight: '600', color: '#6B615F' },
  modal: { flex: 1, backgroundColor: BG },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: BORDER, borderRadius: 9, padding: 10, marginBottom: 8, backgroundColor: '#fff', color: INK },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  scanBtn: { backgroundColor: PLUM, borderRadius: 9, width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },
  scanLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  scanLoadingText: { fontSize: 11, color: '#6B615F', marginBottom: 8 },
  matchBanner: { backgroundColor: '#E7EBE0', borderRadius: 9, padding: 10, marginBottom: 8 },
  matchBannerText: { fontSize: 11, color: '#4A5240' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: '#fff', borderRadius: 8, marginBottom: 4 },
  resultCategory: { color: '#6B615F', fontSize: 11 },
  newProductBox: { marginBottom: 8 },
  newProductLabel: { fontSize: 11, color: '#6B615F', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: { borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#fff' },
  chipActive: { backgroundColor: PLUM, borderColor: PLUM },
  chipText: { fontSize: 11, color: INK },
  chipTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: PLUM, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  cancelText: { textAlign: 'center', color: '#6B615F', marginTop: 12 },
});