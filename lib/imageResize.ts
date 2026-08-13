import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'react-native';

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

// Camera/library photos are routinely several MB at full resolution — way
// more than a feed photo needs, and slow to upload over mobile data. Caps the
// long edge instead of upscaling anything already smaller.
export async function resizeForUpload(uri: string, maxWidth = 1080): Promise<string> {
  const { width } = await getImageSize(uri);
  const context = ImageManipulator.manipulate(uri);
  if (width > maxWidth) context.resize({ width: maxWidth });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return result.uri;
}
