import { supabase } from './supabase';
import { CATEGORY_ORDER } from './types';

type MiniItem = { product_id: string; category: string; rating: number | null };

async function fetchMiniCloset(userId: string): Promise<MiniItem[]> {
  const { data, error } = await supabase
    .from('closet_items')
    .select('product_id, rating, product:products(category)')
    .eq('user_id', userId);
  if (error) { console.log('Twin score closet fetch failed:', error.message); return []; }
  return (data || []).map((d: any) => ({
    product_id: d.product_id,
    category: d.product?.category,
    rating: d.rating,
  }));
}

export async function computeTwinScore(myId: string, friendId: string) {
  const [mine, theirs] = await Promise.all([fetchMiniCloset(myId), fetchMiniCloset(friendId)]);

  const mineIds = new Set(mine.map(i => i.product_id));
  const theirIds = new Set(theirs.map(i => i.product_id));
  const shared = [...mineIds].filter(id => theirIds.has(id));
  const union = new Set([...mineIds, ...theirIds]);
  const overlap = union.size ? shared.length / union.size : 0;

  let alignSum = 0, alignCount = 0;
  shared.forEach(id => {
    const a = mine.find(i => i.product_id === id);
    const b = theirs.find(i => i.product_id === id);
    if (a?.rating && b?.rating) {
      alignSum += (10 - Math.abs(a.rating - b.rating)) / 10;
      alignCount++;
    }
  });
  const alignment = alignCount ? alignSum / alignCount : null;

  const shareOf = (items: MiniItem[]) => {
    const total = items.length || 1;
    const counts: Record<string, number> = {};
    items.forEach(i => { if (i.category) counts[i.category] = (counts[i.category] || 0) + 1; });
    const shares: Record<string, number> = {};
    Object.keys(counts).forEach(c => shares[c] = counts[c] / total);
    return shares;
  };
  const mineShare = shareOf(mine);
  const theirShare = shareOf(theirs);
  let catSim = 0, strong: string | null = null, strongVal = -1, weak: string | null = null;
  CATEGORY_ORDER.forEach(cat => {
    const m = mineShare[cat] || 0, t = theirShare[cat] || 0;
    catSim += Math.min(m, t);
    if (m > 0 && t > 0 && Math.min(m, t) > strongVal) { strongVal = Math.min(m, t); strong = cat; }
    if ((m > 0) !== (t > 0)) weak = cat;
  });

  const score = alignment === null
    ? Math.round((overlap * 0.7 + catSim * 0.3) * 100)
    : Math.round((overlap * 0.5 + alignment * 0.3 + catSim * 0.2) * 100);

  return { score, sharedCount: shared.length, strongCategory: strong, weakCategory: weak };
}