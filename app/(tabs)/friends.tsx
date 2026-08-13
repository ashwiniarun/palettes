import { SerifText, Text, TextInput } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, StyleSheet, View,
} from 'react-native';

const PLUM = '#5B2333';
const BG = '#FAF6F2';
const BORDER = '#E9E1DC';

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

  if (loading) return <View style={styles.center}><ActivityIndicator color={PLUM} /></View>;

  const incoming = rows.filter(r => r.status === 'pending' && r.addressee_id === myId);
  const accepted = rows.filter(r => r.status === 'accepted');

  return (
    <View style={styles.screen}>
      <TextInput
        style={styles.searchInput}
        placeholder="search by handle..."
        value={query}
        onChangeText={setQuery}
      />

      {query.trim() ? (
        <FlatList
          contentContainerStyle={{ padding: 16 }}
          data={searchResults}
          keyExtractor={p => p.id}
          renderItem={({ item }) => renderRow(item, statusFor(item.id))}
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
          renderItem={({ item }) => {
            if ('header' in item) return <SerifText style={styles.sectionTitle}>{item.header}</SerifText>;
            const row = item.row!;
            const otherId = row.requester_id === myId ? row.addressee_id : row.requester_id;
            const profile = profiles[otherId];
            if (!profile) return null;
            if (row.status === 'pending') {
              return (
                <View style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: profile.avatar_color }]}><Text style={styles.avatarText}>{profile.handle.slice(0,2).toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}><Text style={styles.handle}>{profile.handle}</Text><Text style={styles.sub}>wants to be friends</Text></View>
                  <Pressable style={styles.acceptBtn} onPress={() => sendOrAccept(otherId)}><Text style={styles.acceptText}>accept</Text></Pressable>
                  <Pressable style={styles.declineBtn} onPress={() => decline(row.id)}><Text style={styles.declineText}>decline</Text></Pressable>
                </View>
              );
            }
            return renderRow(profile, { type: 'friends' });
          }}
          ListEmptyComponent={<Text style={styles.empty}>no friends yet — search above to find people.</Text>}
        />
      )}
    </View>
  );

  function renderRow(profile: Profile, status: Status) {
    return (
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: profile.avatar_color }]}><Text style={styles.avatarText}>{profile.handle.slice(0,2).toUpperCase()}</Text></View>
        <Pressable style={{ flex: 1 }} onPress={() => router.push(`/friend/${profile.id}`)}>
          <Text style={styles.handle}>{profile.handle}</Text>
          {profile.bio ? <Text style={styles.sub}>{profile.bio}</Text> : null}
        </Pressable>
        {status.type === 'friends' && <Text style={styles.friendsLabel}>friends</Text>}
        {status.type === 'outgoing' && <Text style={styles.pendingLabel}>requested</Text>}
        {(status.type === 'none' || status.type === 'incoming') && (
          <Pressable style={styles.acceptBtn} onPress={() => sendOrAccept(profile.id)}>
            <Text style={styles.acceptText}>{status.type === 'incoming' ? 'accept' : 'add friend'}</Text>
          </Pressable>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  searchInput: { margin: 16, marginBottom: 0, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 11, backgroundColor: '#fff' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 11, marginBottom: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  handle: { fontSize: 13, fontWeight: '700' },
  sub: { fontSize: 11, color: '#6B615F', marginTop: 1 },
  friendsLabel: { fontSize: 11, color: '#6B615F' },
  pendingLabel: { fontSize: 11, color: '#6B615F' },
  acceptBtn: { backgroundColor: PLUM, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  acceptText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  declineBtn: { borderWidth: 1, borderColor: BORDER, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, marginLeft: 6 },
  declineText: { color: '#6B615F', fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#6B615F', padding: 40 },
});