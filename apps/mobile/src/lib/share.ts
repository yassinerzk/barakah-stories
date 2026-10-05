import { Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { STORY_HEIGHT, STORY_WIDTH } from '../components/StoryCard';

export type ShareOutcome = 'shared' | 'unavailable';

/**
 * Rasterises the on-screen card at the WhatsApp status size and opens the
 * native share sheet, where WhatsApp offers "My status".
 */
export async function shareCard(ref: React.RefObject<unknown>, title: string): Promise<ShareOutcome> {
  const uri = await captureRef(ref as never, {
    format: 'png',
    quality: 1,
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
    result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
  });
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: title });
  return 'shared';
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Renders and shares a video story: the transparent card (text only) is
 * captured at full size, then the device encoder lays it over the looping
 * background with the chosen sound. Everything happens on the phone.
 */
export async function shareVideoStory(
  overlayRef: React.RefObject<unknown>,
  input: {
    backgroundUri: string;
    soundUri: string | null;
    soundDurationMs: number;
    lengthSec: number;
    clipDurationMs: number;
    title: string;
  },
  onProgress: (p: number) => void,
): Promise<ShareOutcome> {
  const { composeVideo } = await import('../../modules/video-composer');
  const overlayUri = await captureRef(overlayRef as never, {
    format: 'png',
    quality: 1,
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
    result: 'tmpfile',
  });
  const video = await composeVideo(
    {
      backgroundUri: input.backgroundUri,
      overlayUri,
      soundUri: input.soundUri,
      durationMs: input.lengthSec * 1000,
      clipDurationMs: input.clipDurationMs,
      soundDurationMs: input.soundDurationMs,
    },
    onProgress,
  );
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(video, { mimeType: 'video/mp4', UTI: 'public.mpeg-4', dialogTitle: input.title });
  return 'shared';
}
