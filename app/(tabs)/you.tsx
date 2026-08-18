import GlassCard from '@/components/GlassCard';
import NeumorphicButton from '@/components/NeumorphicButton';
import Sheet from '@/components/Sheet';
import { SerifText, Text, TextInput } from '@/components/ThemedText';
import { resizeForUpload } from '@/lib/imageResize';
import { supabase } from '@/lib/supabase';
import { COLORS, GLASS_TINTS, GRADIENTS, RADII, TAB_BAR_BASE_HEIGHT } from '@/lib/theme';
import { CATEGORY_ORDER, ClosetItem, Look, Profile } from '@/lib/types';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Pressable,
  ScrollView, StyleSheet, View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PLACEHOLDER = COLORS.inkSoft;
const TILE_TINTS: (keyof typeof GLASS_TINTS)[] = ['coral', 'sage', 'blush'];

export default function YouScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [closet, setCloset] = useState<ClosetItem[]>([]);
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [
      { data: profileData, error: profileError },
      { data: closetData, error: closetError },
      { data: looksData, error: looksError },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('closet_items').select('*, product:products(*)').eq('user_id', user.id),
      supabase.from('looks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    if (profileError) console.log('Loading your profile failed:', profileError.message);
    if (closetError) console.log('Loading your closet failed:', closetError.message);
    if (looksError) console.log('Loading your looks failed:', looksError.message);
    setProfile((profileData as Profile) || null);
    setCloset((closetData as unknown as ClosetItem[]) || []);
    setLooks((looksData as Look[]) || []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const active = closet.filter(c => c.status !== 'empty');
  const empty = closet.filter(c => c.status === 'empty');
  const mostWorn = [...closet].sort((a, b) => b.times_worn - a.times_worn)[0];

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.sage} /></View>;

  return (
    <View style={styles.screen}>
      <LinearGradient colors={GRADIENTS.vivid} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {profile && (
          <GlassCard tint="blush" glow="coral" radius="xl" style={{ marginBottom: 16 }}>
            <View style={styles.profileHead}>
              <View style={[styles.avatar, { backgroundColor: profile.avatar_color }]}>
                <SerifText style={styles.avatarText}>{profile.handle.slice(0, 2).toUpperCase()}</SerifText>
              </View>
              <View style={{ flex: 1 }}>
                <SerifText style={styles.displayName}>{profile.handle}</SerifText>
                {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
                <Text style={styles.username}>@{profile.handle}</Text>
              </View>
            </View>
          </GlassCard>
        )}

        <View style={styles.statGrid}>
          <GlassCard tint="sage" radius="md" padding={12} style={{ flex: 1 }}>
            <View style={styles.statInner}>
              <SerifText style={styles.statNum}>{active.length}</SerifText>
              <Text style={styles.statLabel}>in closet</Text>
            </View>
          </GlassCard>
          <GlassCard tint="coral" radius="md" padding={12} style={{ flex: 1 }}>
            <View style={styles.statInner}>
              <SerifText style={styles.statNum}>{empty.length}</SerifText>
              <Text style={styles.statLabel}>empties</Text>
            </View>
          </GlassCard>
          <GlassCard tint="blush" radius="md" padding={12} style={{ flex: 1 }}>
            <View style={styles.statInner}>
              <SerifText style={styles.statNum} numberOfLines={1}>{mostWorn?.product.brand || '—'}</SerifText>
              <Text style={styles.statLabel}>most worn</Text>
            </View>
          </GlassCard>
        </View>

        {profile && (
          <GlassCard onPress={() => router.push(`/rankings/${profile.id}`)} tint="lavender" glow="lavender" radius="md" padding={12} style={{ marginBottom: 16 }}>
            <Text style={styles.rankingsText}>your rankings →</Text>
          </GlassCard>
        )}

        <SerifText style={styles.sectionTitle}>your looks</SerifText>
        <FlatList
          data={looks}
          keyExtractor={l => l.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInUp.delay(index * 40).springify()} style={{ flex: 1 }}>
              <GlassCard onPress={() => router.push(`/look/${item.id}`)} tint={TILE_TINTS[index % TILE_TINTS.length]} radius="md" padding={8} style={styles.lookTile}>
                <Image source={{ uri: item.photo_url }} style={styles.lookImage} />
                <Text style={styles.lookCaption} numberOfLines={1}>{item.caption}</Text>
                <Text style={styles.lookLikes}>{item.likes_count} likes</Text>
              </GlassCard>
            </Animated.View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>no looks posted yet.</Text>}
        />

        <Pressable onPress={() => setSwitchOpen(true)} style={{ marginTop: 20 }}>
          <Text style={styles.switchAccountText}>switch test account (dev)</Text>
        </Pressable>
      </ScrollView>

      <NeumorphicButton
        variant="fab"
        icon="camera"
        glow="coral"
        onPress={() => setPostOpen(true)}
        style={[styles.fab, { bottom: TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, 10) + 16 }]}
      />

      <PostLookModal
        visible={postOpen}
        closetItems={active}
        onClose={() => setPostOpen(false)}
        onPosted={() => { setPostOpen(false); load(); }}
      />

      <SwitchAccountModal
        visible={switchOpen}
        onClose={() => setSwitchOpen(false)}
        onSwitched={() => { setSwitchOpen(false); load(); }}
      />
    </View>
  );
}

function SwitchAccountModal({ visible, onClose, onSwitched }: {
  visible: boolean; onClose: () => void; onSwitched: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');

  async function handleSignIn() {
    if (!email.trim() || !password) return;
    setSigningIn(true);
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSigningIn(false);
    if (signInError) { setError(signInError.message); return; }
    setEmail(''); setPassword('');
    onSwitched();
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        <SerifText style={styles.modalTitle}>switch test account</SerifText>
        <Text style={styles.editHint}>
          dev-only utility for testing multiple accounts — signs the whole app into a different Supabase user.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="email"
          placeholderTextColor={PLACEHOLDER}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="password"
          placeholderTextColor={PLACEHOLDER}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.switchError}>{error}</Text> : null}

        <NeumorphicButton
          label={signingIn ? 'signing in...' : 'sign in'}
          glow="coral"
          disabled={signingIn || !email.trim() || !password}
          onPress={handleSignIn}
          style={{ marginTop: 8 }}
        />
        <Pressable onPress={onClose}><Text style={styles.cancelText}>cancel</Text></Pressable>
      </ScrollView>
    </Sheet>
  );
}

function PostLookModal({ visible, closetItems, onClose, onPosted }: {
  visible: boolean; closetItems: ClosetItem[]; onClose: () => void; onPosted: () => void;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);

  async function handlePicked(result: ImagePicker.ImagePickerResult) {
    if (result.canceled) return;
    setProcessingPhoto(true);
    const resized = await resizeForUpload(result.assets[0].uri);
    setImage(resized);
    setProcessingPhoto(false);
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    await handlePicked(result);
  }

  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    await handlePicked(result);
  }

  function choosePhoto() {
    Alert.alert('add a photo', undefined, [
      { text: 'take photo', onPress: takePhoto },
      { text: 'choose from library', onPress: pickFromLibrary },
      { text: 'cancel', style: 'cancel' },
    ]);
  }

  function toggleProduct(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function handlePost() {
    if (!image || !caption.trim() || selected.size === 0) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const fileName = `${user.id}/${Date.now()}.jpg`;
    const base64 = await FileSystem.readAsStringAsync(image, { encoding: FileSystem.EncodingType.Base64 });
    const { error: uploadError } = await supabase.storage
      .from('look-photos')
      .upload(fileName, decode(base64), { contentType: 'image/jpeg' });

    if (uploadError) { console.log('Photo upload failed:', uploadError.message); setSaving(false); return; }

    const { data: urlData } = supabase.storage.from('look-photos').getPublicUrl(fileName);

    const { data: look, error: lookError } = await supabase
      .from('looks')
      .insert({ user_id: user.id, caption: caption.trim(), photo_url: urlData.publicUrl })
      .select()
      .single();

    if (lookError || !look) { console.log('Look insert failed:', lookError?.message); setSaving(false); return; }

    const rows = [...selected].map(closet_item_id => ({ look_id: look.id, closet_item_id }));
    const { error: tagError } = await supabase.from('look_products').insert(rows);
    if (tagError) console.log('Tagging products failed:', tagError.message);

    setSaving(false);
    setImage(null); setCaption(''); setSelected(new Set());
    onPosted();
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        <SerifText style={styles.modalTitle}>post a look</SerifText>

        <Pressable style={styles.photoPicker} onPress={choosePhoto} disabled={processingPhoto}>
          {processingPhoto ? (
            <ActivityIndicator color={COLORS.sage} />
          ) : image ? (
            <Image source={{ uri: image }} style={styles.photoPreview} />
          ) : (
            <Text style={styles.photoPickerText}>+ add a photo</Text>
          )}
        </Pressable>
        {image && !processingPhoto && (
          <Pressable onPress={choosePhoto}><Text style={styles.retakeText}>retake / choose different photo</Text></Pressable>
        )}

        <TextInput
          style={styles.input}
          placeholder="caption this look..."
          placeholderTextColor={PLACEHOLDER}
          value={caption}
          onChangeText={setCaption}
          multiline
        />

        <Text style={styles.tagCount}>{selected.size} product{selected.size === 1 ? '' : 's'} tagged</Text>

        {CATEGORY_ORDER.map(cat => {
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
        })}

        <NeumorphicButton
          label={saving ? 'posting...' : 'post look'}
          glow="coral"
          disabled={saving || !image || !caption.trim() || selected.size === 0}
          onPress={handlePost}
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
  profileHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontSize: 18 },
  displayName: { fontSize: 20, color: COLORS.ink },
  bio: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  username: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, fontWeight: '600' },
  statGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statInner: { alignItems: 'center' },
  statNum: { fontSize: 17, color: COLORS.ink },
  statLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  rankingsText: { textAlign: 'center', fontWeight: '600', fontSize: 13, color: COLORS.ink },
  sectionTitle: { fontSize: 15, marginBottom: 10, color: COLORS.ink },
  lookTile: { marginBottom: 10 },
  lookImage: { width: '100%', aspectRatio: 1, borderRadius: RADII.sm, marginBottom: 6, backgroundColor: COLORS.blushLight },
  lookCaption: { fontSize: 11, color: COLORS.ink },
  lookLikes: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, padding: 30 },
  fab: { position: 'absolute', right: 20 },
  modalTitle: { fontSize: 18, marginBottom: 16, color: COLORS.ink },
  photoPicker: {
    width: '100%', aspectRatio: 1, borderWidth: 1, borderColor: COLORS.coral, borderStyle: 'dashed',
    borderRadius: RADII.lg, justifyContent: 'center', alignItems: 'center', marginBottom: 8, backgroundColor: COLORS.cream,
  },
  photoPickerText: { color: COLORS.textSecondary },
  photoPreview: { width: '100%', height: '100%', borderRadius: RADII.lg },
  retakeText: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginTop: -4, marginBottom: 10 },
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
  switchAccountText: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', textDecorationLine: 'underline' },
  editHint: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 16 },
  switchError: { fontSize: 12, color: COLORS.danger, marginBottom: 8 },
});
