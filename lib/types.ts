export const CATEGORY_ORDER = [
  'skincare', 'base', 'face', 'contour', 'blush',
  'eyes', 'brow', 'lips', 'setting spray',
] as const;

export type Category = typeof CATEGORY_ORDER[number];

export type Product = {
  id: string;
  brand: string;
  name: string;
  category: Category;
  default_color: string;
  barcode: string | null;
  link: string | null;
};

export type ClosetItem = {
  id: string;
  user_id: string;
  product_id: string;
  color: string | null;
  price: number | null;
  status: 'active' | 'low' | 'empty';
  times_worn: number;
  last_used: string | null;
  rating: number | null;
  review: string | null;
  product: Product; // joined in via the Supabase query
};

export function costPerWear(item: ClosetItem): string | null {
  if (!item.price || !item.times_worn) return null;
  return (item.price / item.times_worn).toFixed(2);
}

// So a saved link always opens directly — people will paste "amazon.com/..."
// without a scheme as often as not.
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export type Look = {
  id: string;
  user_id: string;
  caption: string;
  photo_url: string;
  likes_count: number;
  created_at: string;
};

export type Profile = {
  id: string;
  handle: string;
  bio: string | null;
  avatar_color: string;
};

export type FeedLook = {
  id: string;
  caption: string;
  photo_url: string;
  created_at: string;
  poster: Profile;
  look_products: {
    closet_item: {
      id: string;
      product_id: string;
      price: number | null;
      product: { brand: string; name: string; category: string; default_color: string };
    };
  }[];
  likes: { count: number }[];
};

export type Dupe = {
  id: string;
  closet_item_id: string;
  dupe_product_id: string;
  dupe_product: Product;
};