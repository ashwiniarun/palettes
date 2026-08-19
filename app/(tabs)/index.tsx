import DecoPhotoFrame from '@/components/DecoPhotoFrame';
import EmptyState from '@/components/EmptyState';
import DecoPageBorder from '@/components/DecoPageBorder';
import GlassCard from '@/components/GlassCard';
import { Text } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { COLORS, GLASS_TINTS, GRADIENTS, RADII } from '@/lib/theme';
import { FeedLook } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

const CARD_TINTS: (keyof typeof GLASS_TINTS)[] = ['sage', 'coral', 'blush'];

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

  useFocusEffect(useCallback(() => { load(); }, [load]));

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

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.sage} /></View>;

  return (
    <View style={styles.screen}>
      <LinearGradient colors={GRADIENTS.vivid} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <DecoPageBorder />
      <Image
        source={require('@/assets/images/deco-sunburst.png')}
        style={styles.sunburst}
        resizeMode="contain"
      />
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={looks}
        keyExtractor={l => l.id}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.delay(index * 40).springify()}>
            <LookCard
              look={item}
              tint={CARD_TINTS[index % CARD_TINTS.length]}
              myProductIds={myProductIds}
              isLiked={likedIds.has(item.id)}
              likeCount={item.likes[0]?.count ?? 0}
              onToggleLike={() => toggleLike(item.id)}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          <EmptyState message="your feed is friends-only — add friends to start seeing their looks." />
        }
      />
    </View>
  );
}

function LookCard({ look, tint, myProductIds, isLiked, likeCount, onToggleLike }: {
  look: FeedLook; tint: keyof typeof GLASS_TINTS; myProductIds: Set<string>;
  isLiked: boolean; likeCount: number; onToggleLike: () => void;
}) {
  const [tagsOpen, setTagsOpen] = useState(false);
  const count = look.look_products.length;

  return (
    <GlassCard tint={tint} radius="lg" style={{ marginBottom: 16 }}>
      <View style={styles.who}>
        <View style={[styles.avatar, { backgroundColor: look.poster.avatar_color }]}>
          <Text style={styles.avatarText}>{look.poster.handle.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.handle}>{look.poster.handle}</Text>
          <Text style={styles.caption}>{look.caption}</Text>
        </View>
      </View>

      <DecoPhotoFrame uri={look.photo_url} radius="lg" style={styles.photo} />

      {count > 0 && (
        <Pressable style={styles.tagsToggle} onPress={() => setTagsOpen(o => !o)}>
          <Ionicons name="pricetag-outline" size={13} color={COLORS.ink} />
          <Text style={styles.tagsToggleText}>{count} product{count === 1 ? '' : 's'} tagged</Text>
          <Ionicons name={tagsOpen ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.ink} />
        </Pressable>
      )}

      {tagsOpen && (
        <View style={styles.tagWrap}>
          {look.look_products.map((lp, i) => {
            const inCloset = myProductIds.has(lp.closet_item.product_id);
            return (
              <View
                key={i}
                style={[styles.tag, { backgroundColor: inCloset ? COLORS.sageSoft + '33' : COLORS.lavenderTint }]}
              >
                <Text style={styles.tagName}>{lp.closet_item.product.brand} {lp.closet_item.product.name}</Text>
                <Text style={styles.tagDetail}>
                  {lp.closet_item.price ? `$${lp.closet_item.price} · ` : ''}
                  {inCloset ? 'in your closet' : 'not in your closet'}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <Pressable style={styles.likeBtn} onPress={onToggleLike}>
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={16}
          color={isLiked ? COLORS.rose : COLORS.ink}
          style={isLiked ? styles.likeGlow : undefined}
        />
        <Text style={[styles.likeText, isLiked && { color: COLORS.rose }]}>{likeCount}</Text>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  sunburst: {
    position: 'absolute', top: -50, alignSelf: 'center', width: 340, height: 322, opacity: 0.16,
  },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  handle: { fontSize: 13, fontWeight: '700', color: COLORS.ink },
  caption: { fontSize: 12, color: COLORS.textSecondary },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: COLORS.blushLight },
  tagsToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start' },
  tagsToggleText: { fontSize: 12, fontWeight: '600', color: COLORS.ink },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: RADII.sm, maxWidth: '100%' },
  tagName: { fontSize: 11, fontWeight: '600', color: COLORS.ink },
  tagDetail: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  likeBtn: { marginTop: 12, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5 },
  likeGlow: { shadowColor: COLORS.rose, shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  likeText: { fontSize: 13, color: COLORS.ink },
});
