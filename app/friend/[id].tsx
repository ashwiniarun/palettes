import GlassCard from '@/components/GlassCard';
import NeumorphicButton from '@/components/NeumorphicButton';
import { SerifText, Text } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { COLORS, GLASS_TINTS, GRADIENTS, RADII } from '@/lib/theme';
import { computeTwinScore } from '@/lib/twinScore';
import { Look, Profile } from '@/lib/types';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

const TILE_TINTS: (keyof typeof GLASS_TINTS)[] = ['coral', 'sage', 'blush'];

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

  if (loading || !profile) return <View style={styles.center}><ActivityIndicator color={COLORS.sage} /></View>;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: profile.handle }} />
      <LinearGradient colors={GRADIENTS.vivid} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={looks}
        keyExtractor={l => l.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        ListHeaderComponent={
          <View>
            <GlassCard tint="blush" glow="coral" radius="xl" style={{ marginBottom: 16 }}>
              <View style={styles.head}>
                <View style={[styles.avatar, { backgroundColor: profile.avatar_color }]}>
                  <Text style={styles.avatarText}>{profile.handle.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View>
                  <SerifText style={styles.handle}>{profile.handle}</SerifText>
                  {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
                </View>
              </View>
            </GlassCard>

            {twin && (
              <GlassCard tint="lavender" glow="lavender" radius="xl" style={{ marginBottom: 16 }}>
                <View style={{ alignItems: 'center' }}>
                  <SerifText style={styles.twinScore}>{twin.score}%</SerifText>
                  <Text style={styles.twinLabel}>closet twins</Text>
                  <Text style={styles.twinBreakdown}>
                    {twin.sharedCount} shared product{twin.sharedCount === 1 ? '' : 's'}
                    {twin.strongCategory ? ` · strong on ${twin.strongCategory}` : ''}
                    {twin.weakCategory ? ` · no overlap on ${twin.weakCategory}` : ''}
                  </Text>
                </View>
              </GlassCard>
            )}

            <View style={styles.btnRow}>
              <NeumorphicButton label="view closet" glow="sage" onPress={() => router.push(`/friend-closet/${id}`)} style={{ flex: 1 }} />
              <NeumorphicButton
                label="rankings"
                glow="sage"
                onPress={() => router.push({ pathname: '/rankings/[id]', params: { id: id as string, handle: profile.handle } })}
                style={{ flex: 1 }}
              />
            </View>

            <SerifText style={styles.sectionTitle}>{profile.handle}'s looks</SerifText>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.delay(index * 40).springify()} style={{ flex: 1 }}>
            <GlassCard onPress={() => router.push(`/look/${item.id}`)} tint={TILE_TINTS[index % TILE_TINTS.length]} radius="md" padding={8} style={{ marginBottom: 10 }}>
              <Image source={{ uri: item.photo_url }} style={styles.lookImage} />
              <Text numberOfLines={1} style={styles.lookCaption}>{item.caption}</Text>
            </GlassCard>
          </Animated.View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>no looks posted yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  handle: { fontSize: 20, color: COLORS.ink },
  bio: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  twinScore: { fontSize: 32, color: COLORS.ink },
  twinLabel: { fontSize: 12, color: COLORS.ink, fontWeight: '700', marginTop: 2, marginBottom: 8 },
  twinBreakdown: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 15, marginBottom: 10, color: COLORS.ink },
  lookImage: { width: '100%', aspectRatio: 1, borderRadius: RADII.sm, marginBottom: 6, backgroundColor: COLORS.blushLight },
  lookCaption: { fontSize: 11, color: COLORS.ink },
  empty: { textAlign: 'center', color: COLORS.textSecondary, padding: 30 },
});
