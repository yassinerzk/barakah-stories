import { Platform, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const JPEG_QUALITY = 0.95;

/**
 * The full-screen picture at the phone's own resolution: the view is laid
 * out at screen size, and the capture keeps its pixel density.
 */
export function captureWallpaper(ref: React.RefObject<View | null>): Promise<string> {
  return captureRef(ref as never, {
    format: 'jpg',
    quality: JPEG_QUALITY,
    result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
  });
}

/**
 * Where the app can't set the wallpaper itself. iOS gets the share sheet,
 * whose "Save Image" puts the picture in Photos (and Photos can then use it
 * as the wallpaper); the web downloads the file.
 */
export async function saveWallpaper(ref: React.RefObject<View | null>, fileName: string, title: string): Promise<'saved' | 'unavailable'> {
  const uri = await captureWallpaper(ref);
  if (Platform.OS === 'web') {
    const link = document.createElement('a');
    link.href = uri;
    link.download = `${fileName}.jpg`;
    link.click();
    return 'saved';
  }
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg', dialogTitle: title });
  return 'saved';
}
