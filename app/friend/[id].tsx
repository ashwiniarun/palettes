import { SerifText, Text } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { computeTwinScore } from '@/lib/twinScore';
import { Look, Profile } from '@/lib/types';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';

const PLUM = '#5B2333';
const BG = '#FAF6F2';
const BORDER = '#E9E1DC';
const PLUM_TINT = '#F1E1E5';

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [looks, setLooks] = useState<Look[]>([]);
  const [twin, setTwin] = useState<{ score: number; sharedCount: number; strongCategory: string | null; weakCategory: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) { setLoading(false); return; }

      const [{ data: profileData, error: profileError }, { data: looksData, error: looksError }, twinResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('looks').select('*').eq('user_id', id).order('created_at', { ascending: false }),
        computeTwinScore(user.id, id as string),
      ]);
      if (profileError) console.log('Loading friend profile failed:', profileError.message);
      if (looksError) console.log('Loading friend looks failed:', looksError.message);
      if (!active) return;
      setProfile(profileData as Profile);
      setLooks((looksData as Look[]) || []);
      setTwin(twinResult);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]));

  if (loading || !profile) return <View style={styles.center}><ActivityIndicator color={PLUM} /></View>;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      data={looks}
      keyExtractor={l => l.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 10 }}
      ListHeaderComponent={
        <View>
          <View style={styles.head}>
            <View style={[styles.avatar, { backgroundColor: profile.avatar_color }]}>
              <Text style={styles.avatarText}>{profile.handle.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View>
              <SerifText style={styles.handle}>{profile.handle}</SerifText>
              {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
            </View>
          </View>

          {twin && (
            <View style={styles.twinCard}>
              <SerifText style={styles.twinScore}>{twin.score}%</SerifText>
              <Text style={styles.twinLabel}>closet twins</Text>
              <Text style={styles.twinBreakdown}>
                {twin.sharedCount} shared product{twin.sharedCount === 1 ? '' : 's'}
                {twin.strongCategory ? ` · strong on ${twin.strongCategory}` : ''}
                {twin.weakCategory ? ` · no overlap on ${twin.weakCategory}` : ''}
              </Text>
            </View>
          )}

          <View style={styles.btnRow}>
            <Pressable style={styles.closetBtn} onPress={() => router.push(`/friend-closet/${id}`)}>
              <Text style={styles.closetBtnText}>view closet</Text>
            </Pressable>
            <Pressable style={styles.closetBtn} onPress={() => router.push({ pathname: '/rankings/[id]', params: { id: id as string, handle: profile.handle } })}>
              <Text style={styles.closetBtnText}>rankings</Text>
            </Pressable>
          </View>

          <SerifText style={styles.sectionTitle}>{profile.handle}'s looks</SerifText>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable style={styles.lookTile} onPress={() => router.push(`/look/${item.id}`)}>
          <Image source={{ uri: item.photo_url }} style={styles.lookImage} />
          <Text numberOfLines={1} style={styles.lookCaption}>{item.caption}</Text>
        </Pressable>
      )}
      ListEmptyComponent={<Text style={styles.empty}>no looks posted yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  handle: { fontSize: 20, fontWeight: '700' },
  bio: { fontSize: 12, color: '#6B615F', marginTop: 2 },
  twinCard: { backgroundColor: PLUM_TINT, borderRadius: 14, padding: 16, marginBottom: 16, alignItems: 'center' },
  twinScore: { fontSize: 32, fontWeight: '700', color: PLUM },
  twinLabel: { fontSize: 12, color: PLUM, fontWeight: '700', marginTop: 2, marginBottom: 8 },
  twinBreakdown: { fontSize: 11, color: '#6B4055', textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  closetBtn: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  closetBtnText: { fontWeight: '600', fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  lookTile: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 8, marginBottom: 10 },
  lookImage: { width: '100%', aspectRatio: 1, borderRadius: 8, marginBottom: 6, backgroundColor: PLUM_TINT },
  lookCaption: { fontSize: 11 },
  empty: { textAlign: 'center', color: '#6B615F', padding: 30 },
});