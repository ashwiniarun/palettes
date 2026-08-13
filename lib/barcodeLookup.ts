import { Category, CATEGORY_ORDER } from './types';

export type BarcodeLookupResult = {
  brand: string;
  name: string;
  category: Category | null;
};

// Best-effort keyword match against a free-text blob (OBF category tags like
// "en:lipsticks", or a UPCitemdb taxonomy string like "Health & Beauty >
// Makeup > Face > Foundation"). Only fills in the category when a keyword
// clearly matches; otherwise the picker is left for the user to set.
const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  skincare: ['cleanser', 'moisturi', 'serum', 'toner', 'mask', 'sunscreen', 'spf', 'skin care', 'skincare', 'skin-care'],
  base: ['foundation', 'bb cream', 'bb-cream', 'cc cream', 'cc-cream', 'tinted moisturi'],
  face: ['concealer', 'powder', 'highlighter', 'primer'],
  contour: ['contour', 'bronzer'],
  blush: ['blush'],
  eyes: ['eyeshadow', 'eye shadow', 'eyeliner', 'eye liner', 'mascara', 'eye '],
  brow: ['eyebrow', 'brow'],
  lips: ['lipstick', 'lip gloss', 'lip-gloss', 'lip oil', 'lip balm', 'lip liner', 'lip '],
  'setting spray': ['setting spray', 'setting-spray', 'fixing spray'],
};

function guessCategory(text: string): Category | null {
  const lower = text.toLowerCase();
  for (const cat of CATEGORY_ORDER) {
    if (CATEGORY_KEYWORDS[cat].some(kw => lower.includes(kw))) return cat;
  }
  return null;
}

async function fetchOpenBeautyFacts(barcode: string): Promise<BarcodeLookupResult | null> {
  try {
    const res = await fetch(`https://world.openbeautyfacts.org/api/v2/product/${barcode}.json`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 1 || !json.product) return null;

    const brand = (json.product.brands || '').split(',')[0].trim();
    const name = (json.product.product_name || '').trim();
    if (!brand && !name) return null;

    const category = guessCategory((json.product.categories_tags || []).join(' '));
    return { brand, name, category };
  } catch (err) {
    console.log('Open Beauty Facts lookup failed:', err);
    return null;
  }
}

// Broad retail/e-commerce catalog (not beauty-specific) — used only as a
// fallback when OBF doesn't have the product, since indie/prestige beauty
// brands are poorly covered by OBF but often show up in general retail data.
// Free trial tier, no API key, capped around 100 lookups/day — treat any
// failure or rate-limit response as "nothing found" rather than an error.
async function fetchUpcItemDb(barcode: string): Promise<BarcodeLookupResult | null> {
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    if (!res.ok) return null;
    const json = await res.json();
    const item = json.items?.[0];
    if (json.code !== 'OK' || !item) return null;

    const brand = (item.brand || '').trim();
    let name = (item.title || '').trim();
    if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) {
      name = name.slice(brand.length).replace(/^[\s\-–—:]+/, '').trim();
    }
    // UPCitemdb titles are marketplace listing titles, not clean product
    // names — everything after the first comma is usually size/pack/color
    // cruft ("...Cream Mist, Size: 4.05 FL Oz, White Vibez").
    name = name.split(',')[0].trim();
    if (!brand && !name) return null;

    const category = guessCategory(item.category || '');
    return { brand, name: name || item.title || '', category };
  } catch (err) {
    console.log('UPCitemdb lookup failed:', err);
    return null;
  }
}

export async function lookupBarcode(barcode: string): Promise<BarcodeLookupResult | null> {
  const obf = await fetchOpenBeautyFacts(barcode);
  if (obf) return obf;
  return fetchUpcItemDb(barcode);
}
