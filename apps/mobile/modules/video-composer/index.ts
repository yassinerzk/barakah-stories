import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

type EventSubscription = { remove(): void };

export interface ComposeInput {
  backgroundUri: string;
  overlayUri: string;
  soundUri: string | null;
  durationMs: number;
  clipDurationMs: number;
}

interface VideoComposerNative {
  compose(input: ComposeInput): Promise<string>;
  cancel(): Promise<void>;
  addListener(event: 'onProgress', listener: (e: { progress: number }) => void): EventSubscription;
}

/** Android only for now (Media3 Transformer); iOS will use AVFoundation later. */
const native = Platform.OS === 'android' ? requireOptionalNativeModule<VideoComposerNative>('VideoComposer') : null;

export const videoExportSupported = native !== null;

/** Renders the story to an MP4 on the device and resolves to its file:// URI. */
export async function composeVideo(input: ComposeInput, onProgress?: (p: number) => void): Promise<string> {
  if (!native) throw new Error('Video export is not available on this device yet');
  const sub = onProgress ? native.addListener('onProgress', (e) => onProgress(e.progress)) : null;
  try {
    return await native.compose(input);
  } finally {
    sub?.remove();
  }
}

export function cancelVideo(): void {
  void native?.cancel().catch(() => undefined);
}
