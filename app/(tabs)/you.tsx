import { SerifText, Text, TextInput } from '@/components/ThemedText';
import { resizeForUpload } from '@/lib/imageResize';
import { supabase } from '@/lib/supabase';
import { CATEGORY_ORDER, ClosetItem, Look, Profile } from '@/lib/types';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Modal, Pressable,
  ScrollView, StyleSheet, View,
} from 'react-native';

const PLUM = '#5B2333';
const BG = '#FAF6F2';
const BORDER = '#E9E1DC';
const PLACEHOLDER = '#8A8078';
const INK = '#231F20';

export default function YouScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [closet, setCloset] = useState<ClosetItem[]>([]);
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [postOpen, setPostOpen] = useState(false);

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

  if (loading) return <View style={styles.center}><ActivityIndicator color={PLUM} /></View>;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {profile && (
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
        )}

        <View style={styles.statGrid}>
          <View style={styles.statCard}><SerifText style={styles.statNum}>{active.length}</SerifText><Text style={styles.statLabel}>in closet</Text></View>
          <View style={styles.statCard}><SerifText style={styles.statNum}>{empty.length}</SerifText><Text style={styles.statLabel}>empties</Text></View>
          <View style={styles.statCard}><SerifText style={styles.statNum} numberOfLines={1}>{mostWorn?.product.brand || '—'}</SerifText><Text style={styles.statLabel}>most worn</Text></View>
        </View>

        <View style={styles.actionRow}>
          {profile && (
            <Pressable style={styles.actionBtn} onPress={() => router.push(`/rankings/${profile.id}`)}>
              <Text style={styles.actionBtnText}>your rankings</Text>
            </Pressable>
          )}
          <Pressable style={styles.actionBtn} onPress={() => setPostOpen(true)}>
            <Text style={styles.actionBtnText}>+ post a look</Text>
          </Pressable>
        </View>

        <SerifText style={styles.sectionTitle}>your looks</SerifText>
        <FlatList
          data={looks}
          keyExtractor={l => l.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Pressable style={styles.lookTile} onPress={() => router.push(`/look/${item.id}`)}>
              <Image source={{ uri: item.photo_url }} style={styles.lookImage} />
              <Text style={styles.lookCaption} numberOfLines={1}>{item.caption}</Text>
              <Text style={styles.lookLikes}>{item.likes_count} likes</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>no looks posted yet.</Text>}
        />
      </ScrollView>

      <PostLookModal
        visible={postOpen}
        closetItems={active}
        onClose={() => setPostOpen(false)}
        onPosted={() => { setPostOpen(false); load(); }}
      />
    </View>
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.modal} contentContainerStyle={{ padding: 20 }}>
        <SerifText style={styles.modalTitle}>post a look</SerifText>

        <Pressable style={styles.photoPicker} onPress={choosePhoto} disabled={processingPhoto}>
          {processingPhoto ? (
            <ActivityIndicator color={PLUM} />
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

        <Pressable
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          disabled={saving || !image || !caption.trim() || selected.size === 0}
          onPress={handlePost}
        >
          <Text style={styles.saveBtnText}>{saving ? 'posting...' : 'post look'}</Text>
        </Pressable>
        <Pressable onPress={onClose}><Text style={styles.cancelText}>cancel</Text></Pressable>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  profileHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontSize: 18 },
  displayName: { fontSize: 20, color: INK },
  bio: { fontSize: 12, color: '#6B615F', marginTop: 2 },
  username: { fontSize: 12, color: '#6B615F', marginTop: 4, fontWeight: '600' },
  statGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 12, alignItems: 'center' },
  statNum: { fontSize: 17, color: INK },
  statLabel: { fontSize: 10, color: '#6B615F', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  actionBtn: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  actionBtnText: { fontWeight: '600', fontSize: 13 },
  sectionTitle: { fontSize: 15, marginBottom: 10 },
  lookTile: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 8, marginBottom: 10 },
  lookImage: { width: '100%', aspectRatio: 1, borderRadius: 8, marginBottom: 6, backgroundColor: '#F1E1E5' },
  lookCaption: { fontSize: 11 },
  lookLikes: { fontSize: 10, color: '#6B615F', marginTop: 2 },
  empty: { textAlign: 'center', color: '#6B615F', padding: 30 },
  modal: { flex: 1, backgroundColor: BG },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  photoPicker: { width: '100%', aspectRatio: 1, borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8, backgroundColor: '#fff' },
  photoPickerText: { color: '#6B615F' },
  photoPreview: { width: '100%', height: '100%', borderRadius: 12 },
  retakeText: { fontSize: 11, color: '#6B615F', textAlign: 'center', marginTop: -4, marginBottom: 10 },
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