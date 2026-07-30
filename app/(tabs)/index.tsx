import { Text } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { FeedLook } from '@/lib/types';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View,
} from 'react-native';

const PLUM = '#5B2333';
const BG = '#FAF6F2';
const BORDER = '#E9E1DC';
const SAGE_TINT = '#E7EBE0';
const GOLD_TINT = '#F5E9D2';

export default function FeedScreen() {
  const [looks, setLooks] = useState<FeedLook[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [myProductIds, setMyProductIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: friendships, error: friendError } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    if (friendError) console.log('Loading friendships failed:', friendError.message);

    const friendIds = (friendships || []).map(f =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    if (friendIds.length === 0) {
      setLooks([]);
      setLoading(false);
      return;
    }

    const { data: myCloset, error: closetError } = await supabase
      .from('closet_items')
      .select('product_id')
      .eq('user_id', user.id);
    if (closetError) console.log('Loading your closet for feed matching failed:', closetError.message);
    setMyProductIds(new Set((myCloset || []).map(c => c.product_id)));

    const { data: looksData, error: looksError } = await supabase
      .from('looks')
      .select(`
        id, caption, photo_url, created_at,
        poster:profiles!looks_user_id_fkey(id, handle, bio, avatar_color),
        look_products(
          closet_item:closet_items(
            id, product_id, price,
            product:products(brand, name, category, default_color)
          )
        ),
        likes(count)
      `)
      .in('user_id', friendIds)
      .order('created_at', { ascending: false });

    if (looksError) console.log('Loading feed failed:', looksError.message);
    const feedLooks = (looksData as unknown as FeedLook[]) || [];
    setLooks(feedLooks);

    if (feedLooks.length > 0) {
      const { data: myLikes, error: likesError } = await supabase
        .from('likes')
        .select('look_id')
        .eq('user_id', user.id)
        .in('look_id', feedLooks.map(l => l.id));
      if (likesError) console.log('Loading your likes failed:', likesError.message);
      setLikedIds(new Set((myLikes || []).map(l => l.look_id)));
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleLike(lookId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const isLiked = likedIds.has(lookId);

    // Optimistic UI update first, so it feels instant
    setLikedIds(prev => {
      const next = new Set(prev);
      isLiked ? next.delete(lookId) : next.add(lookId);
      return next;
    });
    setLooks(prev => prev.map(l => {
      if (l.id !== lookId) return l;
      const currentCount = l.likes[0]?.count ?? 0;
      return { ...l, likes: [{ count: currentCount + (isLiked ? -1 : 1) }] };
    }));

    if (isLiked) {
      const { error } = await supabase.from('likes').delete().eq('user_id', user.id).eq('look_id', lookId);
      if (error) console.log('Unlike failed:', error.message);
    } else {
      const { error } = await supabase.from('likes').insert({ user_id: user.id, look_id: lookId });
      if (error) console.log('Like failed:', error.message);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={PLUM} /></View>;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      data={looks}
      keyExtractor={l => l.id}
      renderItem={({ item }) => {
        const likeCount = item.likes[0]?.count ?? 0;
        const isLiked = likedIds.has(item.id);
        return (
          <View style={styles.card}>
            <View style={styles.who}>
              <View style={[styles.avatar, { backgroundColor: item.poster.avatar_color }]}>
                <Text style={styles.avatarText}>{item.poster.handle.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.handle}>{item.poster.handle}</Text>
                <Text style={styles.caption}>{item.caption}</Text>
              </View>
            </View>

            <Image source={{ uri: item.photo_url }} style={styles.photo} />

            <View style={{ marginTop: 10, gap: 6 }}>
              {item.look_products.map((lp, i) => {
                const inCloset = myProductIds.has(lp.closet_item.product_id);
                return (
                  <View key={i} style={[styles.productRow, { backgroundColor: inCloset ? SAGE_TINT : GOLD_TINT }]}>
                    <Text style={styles.productName}>{lp.closet_item.product.brand} {lp.closet_item.product.name}</Text>
                    <Text style={styles.productSub}>
                      {lp.closet_item.price ? `$${lp.closet_item.price} · ` : ''}
                      {inCloset ? 'in your closet' : 'not in your closet'}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Pressable style={styles.likeBtn} onPress={() => toggleLike(item.id)}>
              <Text style={[styles.likeText, isLiked && { color: '#E8846B' }]}>
                {isLiked ? '♥' : '♡'} {likeCount}
              </Text>
            </Pressable>
          </View>
        );
      }}
      ListEmptyComponent={
        <Text style={styles.empty}>your feed is friends-only — add friends to start seeing their looks.</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 16, padding: 14, marginBottom: 16 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  handle: { fontSize: 13, fontWeight: '700' },
  caption: { fontSize: 12, color: '#6B615F' },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#F1E1E5' },
  productRow: { padding: 8, borderRadius: 9 },
  productName: { fontSize: 12, fontWeight: '600' },
  productSub: { fontSize: 11, color: '#6B615F', marginTop: 1 },
  likeBtn: { marginTop: 10, alignSelf: 'flex-start' },
  likeText: { fontSize: 14 },
  empty: { textAlign: 'center', color: '#6B615F', padding: 60 },
});