import { Ionicons } from '@expo/vector-icons';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import CategoryIcon from '@/components/CategoryIcon';
import EmptyState from '@/components/EmptyState';
import DecoPageBorder from '@/components/DecoPageBorder';
import GlassCard from '@/components/GlassCard';
import NeumorphicButton from '@/components/NeumorphicButton';
import Sheet from '@/components/Sheet';
import { SerifText, Text, TextInput } from '@/components/ThemedText';
import { lookupBarcode } from '@/lib/barcodeLookup';
import { supabase } from '@/lib/supabase';
import { orIlike } from '@/lib/supabaseFilters';
import { COLORS, GLASS_TINTS, GRADIENTS, RADII, TAB_BAR_BASE_HEIGHT } from '@/lib/theme';
import { CATEGORY_ORDER, ClosetItem, normalizeUrl, Product, costPerWear } from '@/lib/types';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, View, useWindowDimensions,
} from 'react-native';
import Animated, {
  Extrapolation, FadeInUp, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ROW_TINTS: (keyof typeof GLASS_TINTS)[] = ['sage', 'coral', 'blush'];

const PLACEHOLDER = COLORS.inkSoft;
const BANNER_HEIGHT = 210;

export default function ClosetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [emptyOpen, setEmptyOpen] = useState(false);
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler(e => { scrollY.value = e.contentOffset.y; });
  const bannerStyle = useAnimatedStyle(() => {
    // Image lags behind the list at half-speed for a parallax feel, and
    // stretches on iOS overscroll (scrollY < 0) instead of leaving a gap.
    const translateY = interpolate(
      scrollY.value, [0, BANNER_HEIGHT], [0, -BANNER_HEIGHT * 0.5], Extrapolation.CLAMP
    );
    const scale = interpolate(scrollY.value, [-BANNER_HEIGHT, 0], [1.8, 1], Extrapolation.CLAMP);
    return { transform: [{ translateY }, { scale }] };
  });

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

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.sage} /></View>;

  return (
    <View style={styles.screen}>
      <LinearGradient colors={GRADIENTS.vivid} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <Animated.Image
        source={require('@/assets/images/closet-banner.png')}
        resizeMode="cover"
        style={[styles.closetBannerAbs, { width: windowWidth }, bannerStyle]}
      />
      <DecoPageBorder />

      <Animated.FlatList
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        data={grouped}
        keyExtractor={g => g.cat}
        contentContainerStyle={{ paddingTop: BANNER_HEIGHT + 8, paddingHorizontal: 16, paddingBottom: 100 }}
        ListHeaderComponent={
          <SerifText style={styles.title}>your closet</SerifText>
        }
        renderItem={({ item: group, index: groupIndex }) => (
          <Animated.View entering={FadeInUp.delay(groupIndex * 40).springify()} style={{ marginBottom: 12 }}>
            <View style={styles.categoryRow}>
              <CategoryIcon category={group.cat} size={26} />
              <SerifText style={styles.categoryTitle}>{group.cat}</SerifText>
            </View>
            {group.items.map((item, i) => (
              <ClosetRow key={item.id} item={item} tint={ROW_TINTS[i % ROW_TINTS.length]} onPress={() => router.push(`/product/${item.id}`)} />
            ))}
          </Animated.View>
        )}
        ListEmptyComponent={
          grouped.length === 0 ? <EmptyState message="nothing in your closet yet — add your first product." /> : null
        }
        ListFooterComponent={
          <View>
            <Pressable style={styles.toggleRow} onPress={() => setEmptyOpen(o => !o)}>
              <SerifText style={styles.sectionTitle}>empty products ({emptyItems.length})</SerifText>
              <Ionicons name={emptyOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.ink} />
            </Pressable>
            {emptyOpen && (
              emptyItems.length > 0 ? emptyItems.map((item, i) => (
                <ClosetRow key={item.id} item={item} tint={ROW_TINTS[i % ROW_TINTS.length]} onPress={() => router.push(`/product/${item.id}`)} showEmptyPill />
              )) : <Text style={styles.empty}>nothing finished yet — log a product when you use it up.</Text>
            )}
          </View>
        }
      />

      <NeumorphicButton
        variant="fab"
        icon="add"
        glow="coral"
        onPress={() => setAddOpen(true)}
        style={[styles.fab, { bottom: TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, 10) + 16 }]}
      />

      <AddProductModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => { setAddOpen(false); loadCloset(); }}
      />
    </View>
  );
}

function ClosetRow({ item, onPress, showEmptyPill, tint }: {
  item: ClosetItem; onPress: () => void; showEmptyPill?: boolean; tint: keyof typeof GLASS_TINTS;
}) {
  return (
    <GlassCard onPress={onPress} tint={tint} radius="md" padding={12} plaque style={styles.rowCard}>
      <View style={styles.rowContent}>
        <View style={[styles.swatch, { backgroundColor: item.color || item.product.default_color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName}>{item.product.brand} — {item.product.name}</Text>
          <Text style={styles.itemSub}>
            {item.last_used || `worn ${item.times_worn} times`}
            {costPerWear(item) ? ` · $${costPerWear(item)}/wear` : ''}
          </Text>
        </View>
        {showEmptyPill && <View style={styles.emptyPill}><Text style={styles.emptyPillText}>empty</Text></View>}
      </View>
    </GlassCard>
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
  const [newLink, setNewLink] = useState('');
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
        .insert({
          brand: newBrand.trim(), name: fullName, category: newCategory, barcode: scannedBarcode,
          link: newLink.trim() ? normalizeUrl(newLink) : null,
        })
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
    setQuery(''); setSelected(null); setNewBrand(''); setNewName(''); setNewShade(''); setNewLink(''); setPrice(''); setScannedBarcode(null);
    onAdded();
  }

  function handleClose() {
    setScannedBarcode(null);
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={handleClose}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        <SerifText style={styles.modalTitle}>add a product</SerifText>

        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="search brand or product..."
            placeholderTextColor={PLACEHOLDER}
            value={query}
            onChangeText={t => { setQuery(t); setSelected(null); setMatchedFromScan(false); }}
          />
          <NeumorphicButton
            variant="circular"
            icon="barcode-outline"
            glow="sage"
            onPress={() => setScannerOpen(true)}
          />
        </View>
        {scanLoading && (
          <View style={styles.scanLoadingRow}>
            <ActivityIndicator size="small" color={COLORS.sage} />
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
                <NeumorphicButton
                  key={cat}
                  variant="pill"
                  label={cat}
                  glow={newCategory === cat ? 'coral' : 'none'}
                  onPress={() => setNewCategory(cat)}
                  style={{ marginRight: 6, marginBottom: 6 }}
                />
              ))}
            </View>
            <Text style={styles.newProductLabel}>link to buy (optional) — shown to anyone who views this product</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. sephora.com/product/..."
              placeholderTextColor={PLACEHOLDER}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              value={newLink}
              onChangeText={setNewLink}
            />
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

        <NeumorphicButton
          label={saving ? 'adding...' : 'add to closet'}
          glow="coral"
          disabled={saving || (!selected && (!newBrand.trim() || !newName.trim()))}
          onPress={handleAdd}
          style={{ marginTop: 8 }}
        />

        <Pressable onPress={handleClose}><Text style={styles.cancelText}>cancel</Text></Pressable>
      </ScrollView>

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleBarcodeScanned}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  title: {
    fontSize: 20, color: COLORS.ink, marginTop: -64, marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },
  closetBannerAbs: { position: 'absolute', top: 0, left: 0, height: BANNER_HEIGHT },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  categoryTitle: { fontSize: 13, fontWeight: '700', color: COLORS.ink, textTransform: 'uppercase' },
  rowCard: { marginBottom: 10 },
  rowContent: { flexDirection: 'row', alignItems: 'center' },
  swatch: { width: 36, height: 36, borderRadius: RADII.sm, marginRight: 12 },
  itemName: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  itemSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, padding: 40 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 15, color: COLORS.ink },
  emptyPill: { backgroundColor: COLORS.oatLatte, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8, flexShrink: 0 },
  emptyPillText: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },
  fab: { position: 'absolute', right: 20 },
  modalTitle: { fontSize: 18, marginBottom: 16, color: COLORS.ink },
  input: {
    borderRadius: RADII.md, padding: 10, marginBottom: 8, backgroundColor: COLORS.cream, color: COLORS.ink,
    shadowColor: COLORS.sageDeep, shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: -2, height: -2 },
  },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  scanLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  scanLoadingText: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 8 },
  matchBanner: { backgroundColor: COLORS.blushLight, borderRadius: RADII.sm, padding: 10, marginBottom: 8 },
  matchBannerText: { fontSize: 11, color: COLORS.rose },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: COLORS.cream, borderRadius: RADII.sm, marginBottom: 4 },
  resultCategory: { color: COLORS.textSecondary, fontSize: 11 },
  newProductBox: { marginBottom: 8 },
  newProductLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  cancelText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 12, marginBottom: 20 },
});
