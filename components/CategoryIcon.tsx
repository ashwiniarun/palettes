import { Category } from '@/lib/types';
import { Image, ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';

// Small illustrated Deco product badges (cropped from a commissioned flat-
// lay), one per closet category — require() targets must be static string
// literals for Metro to bundle them, hence the explicit map rather than a
// template path built from `category`.
const ICONS: Record<Category, ImageSourcePropType> = {
  skincare: require('@/assets/images/icon-skincare.png'),
  base: require('@/assets/images/icon-base.png'),
  face: require('@/assets/images/icon-face.png'),
  contour: require('@/assets/images/icon-contour.png'),
  blush: require('@/assets/images/icon-blush.png'),
  eyes: require('@/assets/images/icon-eyes.png'),
  brow: require('@/assets/images/icon-brow.png'),
  lips: require('@/assets/images/icon-lips.png'),
  'setting spray': require('@/assets/images/icon-setting-spray.png'),
};

export default function CategoryIcon({ category, size = 28, style }: {
  category: Category; size?: number; style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={ICONS[category]}
      resizeMode="cover"
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
    />
  );
}
