import EmptyState from '@/components/EmptyState';
import DecoPageBorder from '@/components/DecoPageBorder';
import GlassCard from '@/components/GlassCard';
import NeumorphicButton from '@/components/NeumorphicButton';
import { SerifText, Text, TextInput } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { COLORS, GLASS_TINTS, GRADIENTS } from '@/lib/theme';
import { Profile } from '@/lib/types';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, StyleSheet, View,
} from 'react-native';

const PLACEHOLDER = COLORS.inkSoft;
const ROW_TINTS: (keyof typeof GLASS_TINTS)[] = ['sage', 'blush', 'coral'];

type FriendshipRow = { id: string; requester_id: string; addressee_id: string; status: 'pending' | 'accepted' };
type Status = { type: 'none' | 'friends' | 'outgoing' | 'incoming'; rowId?: string };

export default function FriendsScreen() {
  const [myId, setMyId] = useState<string | null>(null);
  const [rows, setRows] = useState<FriendshipRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setMyId(user.id);

    const { data: friendshipRows, error: rowsError } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    if (rowsError) console.log('Loading friendships failed:', rowsError.message);
    setRows((friendshipRows as FriendshipRow[]) || []);

    const otherIds = (friendshipRows || []).map(r => r.requester_id === user.id ? r.addressee_id : r.requester_id);
    if (otherIds.length > 0) {
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles').select('*').in('id', otherIds);
      if (profileError) console.log('Loading friend profiles failed:', profileError.message);
      const map: Record<string, Profile> = {};
      (profileRows || []).forEach(p => { map[p.id] = p as Profile; });
      setProfiles(map);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Live search against the profiles table
  useEffect(() => {
    if (!query.trim() || !myId) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('handle', `%${query.trim()}%`)
        .neq('id', myId)
        .limit(10);
      if (error) console.log('Search failed:', error.message);
      setSearchResults((data as Profile[]) || []);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, myId]);

  function statusFor(otherId: string): Status {
    const row = rows.find(r =>
      (r.requester_id === otherId && r.addressee_id === myId) ||
      (r.addressee_id === otherId && r.requester_id === myId)
    );
    if (!row) return { type: 'none' };
    if (row.status === 'accepted') return { type: 'friends', rowId: row.id };
    if (row.requester_id === myId) return { type: 'outgoing', rowId: row.id };
    return { type: 'incoming', rowId: row.id };
  }

  async function sendOrAccept(otherId: string) {
    const status = statusFor(otherId);
    if (status.type === 'incoming' && status.rowId) {
      const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', status.rowId);
      if (error) console.log('Accept failed:', error.message);
    } else if (status.type === 'none' && myId) {
      const { error } = await supabase.from('friendships').insert({ requester_id: myId, addressee_id: otherId, status: 'pending' });
      if (error) console.log('Send request failed:', error.message);
    }
    load();
  }

  async function decline(rowId: string) {
    const { error } = await supabase.from('friendships').delete().eq('id', rowId);
    if (error) console.log('Decline failed:', error.message);
    load();
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.sage} /></View>;

  const incoming = rows.filter(r => r.status === 'pending' && r.addressee_id === myId);
  const accepted = rows.filter(r => r.status === 'accepted');

  return (
    <View style={styles.screen}>
      <LinearGradient colors={GRADIENTS.vivid} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <DecoPageBorder />

      <TextInput
        style={styles.searchInput}
        placeholder="search by handle..."
        placeholderTextColor={PLACEHOLDER}
        value={query}
        onChangeText={setQuery}
      />

      {query.trim() ? (
        <FlatList
          contentContainerStyle={{ padding: 16 }}
          data={searchResults}
          keyExtractor={p => p.id}
          renderItem={({ item, index }) => renderRow(item, statusFor(item.id), index)}
          ListEmptyComponent={<Text style={styles.empty}>no matches</Text>}
        />
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16 }}
          data={[
            ...(incoming.length ? [{ header: 'requests' }] : []),
            ...incoming.map(r => ({ row: r })),
            { header: 'friends' },
            ...accepted.map(r => ({ row: r })),
          ]}
          keyExtractor={(item, i) => 'header' in item ? item.header! + i : item.row!.id}
          renderItem={({ item, index }) => {
            if ('header' in item) return <SerifText style={styles.sectionTitle}>{item.header}</SerifText>;
            const row = item.row!;
            const otherId = row.requester_id === myId ? row.addressee_id : row.requester_id;
            const profile = profiles[otherId];
            if (!profile) return null;
            if (row.status === 'pending') {
              return (
                <GlassCard tint={ROW_TINTS[index % ROW_TINTS.length]} radius="md" padding={11} style={{ marginBottom: 8 }}>
                  <View style={styles.rowInner}>
                    <View style={[styles.avatar, { backgroundColor: profile.avatar_color }]}><Text style={styles.avatarText}>{profile.handle.slice(0,2).toUpperCase()}</Text></View>
                    <View style={{ flex: 1 }}><Text style={styles.handle}>{profile.handle}</Text><Text style={styles.sub}>wants to be friends</Text></View>
                    <NeumorphicButton variant="pill" label="accept" glow="coral" onPress={() => sendOrAccept(otherId)} style={{ marginRight: 6 }} />
                    <NeumorphicButton variant="pill" label="decline" onPress={() => decline(row.id)} />
                  </View>
                </GlassCard>
              );
            }
            return renderRow(profile, { type: 'friends' }, index);
          }}
          ListEmptyComponent={<EmptyState message="no friends yet — search above to find people." />}
        />
      )}
    </View>
  );

  function renderRow(profile: Profile, status: Status, index: number) {
    return (
      <GlassCard tint={ROW_TINTS[index % ROW_TINTS.length]} radius="md" padding={11} style={{ marginBottom: 8 }}>
        <View style={styles.rowInner}>
          <View style={[styles.avatar, { backgroundColor: profile.avatar_color }]}><Text style={styles.avatarText}>{profile.handle.slice(0,2).toUpperCase()}</Text></View>
          <Pressable style={{ flex: 1 }} onPress={() => router.push(`/friend/${profile.id}`)}>
            <Text style={styles.handle}>{profile.handle}</Text>
            {profile.bio ? <Text style={styles.sub}>{profile.bio}</Text> : null}
          </Pressable>
          {status.type === 'friends' && <Text style={styles.friendsLabel}>friends</Text>}
          {status.type === 'outgoing' && <Text style={styles.pendingLabel}>requested</Text>}
          {(status.type === 'none' || status.type === 'incoming') && (
            <NeumorphicButton
              variant="pill"
              label={status.type === 'incoming' ? 'accept' : 'add friend'}
              glow="coral"
              onPress={() => sendOrAccept(profile.id)}
            />
          )}
        </View>
      </GlassCard>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  searchInput: {
    margin: 16, marginBottom: 0, borderRadius: 12, padding: 11, backgroundColor: COLORS.cream, color: COLORS.ink,
    shadowColor: COLORS.sageDeep, shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: -2, height: -2 },
  },
  sectionTitle: { fontSize: 15, marginTop: 14, marginBottom: 8, color: COLORS.ink },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  handle: { fontSize: 13, fontWeight: '700', color: COLORS.ink },
  sub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  friendsLabel: { fontSize: 11, color: COLORS.textSecondary },
  pendingLabel: { fontSize: 11, color: COLORS.textSecondary },
  empty: { textAlign: 'center', color: COLORS.textSecondary, padding: 40 },
});
