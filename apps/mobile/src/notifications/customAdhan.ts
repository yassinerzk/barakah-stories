import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import type { AudioSource } from 'expo-audio';
import { isPro } from '@barakah/core';
import { useEntitlementStore } from '../monetization/store';
import { proLocksActive } from '../monetization/adapter';

/*
 * A Pro member's own adhan recording, played in the app instead of the
 * bundled one (from a prayer alert, or "Play adhan"). The file is copied into
 * the app's own storage, so it keeps working if the original is moved.
 * The notification's short sound is unchanged.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const DEFAULT_ADHAN: AudioSource = require('../../assets/sounds/adhan_full.mp3');

/** A full adhan is a few MB; this leaves plenty of room for high-quality files. */
export const MAX_ADHAN_BYTES = 20 * 1024 * 1024;
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|opus|flac)$/i;

export type AdhanPickOutcome = 'picked' | 'cancelled' | 'tooLarge' | 'notAudio' | 'error';

interface CustomAdhanState {
  uri: string | null;
  /** The file's original name, shown in settings. */
  name: string | null;
  pick: () => Promise<AdhanPickOutcome>;
  clear: () => void;
}

const folder = () => new Directory(Paths.document, 'adhan');

function deleteQuietly(uri: string | null): void {
  if (!uri || Platform.OS === 'web') return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // An old copy that can't be removed only costs a little space.
  }
}

export const useCustomAdhanStore = create<CustomAdhanState>()(
  persist(
    (set, get) => ({
      uri: null,
      name: null,
      pick: async () => {
        try {
          const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true, multiple: false });
          if (result.canceled || !result.assets[0]) return 'cancelled';
          const asset = result.assets[0];
          if ((asset.size ?? 0) > MAX_ADHAN_BYTES) return 'tooLarge';
          if (!(asset.mimeType?.startsWith('audio/') || AUDIO_EXT.test(asset.name))) return 'notAudio';
          if (Platform.OS === 'web') {
            // The browser preview keeps it for this session only.
            set({ uri: asset.uri, name: asset.name });
            return 'picked';
          }
          const dir = folder();
          if (!dir.exists) dir.create();
          const ext = asset.name.match(AUDIO_EXT)?.[0].toLowerCase() ?? '.mp3';
          const target = new File(dir, `custom-${Date.now()}${ext}`);
          new File(asset.uri).copy(target);
          deleteQuietly(get().uri);
          set({ uri: target.uri, name: asset.name });
          return 'picked';
        } catch {
          return 'error';
        }
      },
      clear: () => {
        deleteQuietly(get().uri);
        set({ uri: null, name: null });
      },
    }),
    {
      name: 'barakah.customAdhan',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ uri: s.uri, name: s.name }),
    },
  ),
);

/** The adhan to play: the member's own while they have Pro and the file is there, otherwise the default. */
export function useAdhanSource(): AudioSource {
  const uri = useCustomAdhanStore((s) => s.uri);
  // Read straight from the store: the player lives outside the navigator.
  const locked = useEntitlementStore((s) => proLocksActive && !isPro(s.entitlements));
  if (!uri || locked) return DEFAULT_ADHAN;
  if (Platform.OS !== 'web' && !new File(uri).exists) return DEFAULT_ADHAN;
  return { uri };
}
