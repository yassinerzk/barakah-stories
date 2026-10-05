import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { create } from 'zustand';
import type { AudioPlayer } from 'expo-audio';
import { parseMediaManifest, type MediaAsset, type MediaManifest } from '@barakah/core';

/**
 * The video and sound library. The manifest and the files live on the app's
 * site (built by scripts/build-media.mjs), so new backgrounds and sounds can be
 * added without an app update. Each file downloads the first time it is picked
 * and is kept on the device; the manifest is cached so the pickers work offline.
 */
export const MEDIA_BASE = 'https://yassinerzk.github.io/barakah-stories/media/';

const isNative = Platform.OS !== 'web';
const dir = () => new Directory(Paths.document, 'media');
/** "video/river.mp4" → "video-river.mp4": one flat, predictable folder. */
const localFile = (path: string) => new File(dir(), path.replace('/', '-'));

export const remoteUrl = (path: string) => MEDIA_BASE + path;

interface MediaState {
  manifest: MediaManifest | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** asset file path → local file:// URI, once downloaded. */
  local: Record<string, string>;
  /** asset file paths currently downloading. */
  downloading: Record<string, true>;
  load: () => Promise<void>;
  /** The asset on the device, downloading it first if needed; null if that fails. */
  ensure: (asset: MediaAsset) => Promise<string | null>;
}

function knownLocal(manifest: MediaManifest): Record<string, string> {
  if (!isNative) return {};
  const out: Record<string, string> = {};
  for (const a of [...manifest.videos, ...manifest.sounds]) {
    const f = localFile(a.file);
    if (f.exists) out[a.file] = f.uri;
  }
  return out;
}

export const useMediaStore = create<MediaState>()((set, get) => ({
  manifest: null,
  status: 'idle',
  local: {},
  downloading: {},

  load: async () => {
    if (get().status === 'loading') return;
    set({ status: 'loading' });
    const cached = isNative ? new File(dir(), 'manifest.json') : null;
    // Offline first: show what we had, then refresh from the site.
    if (cached?.exists && !get().manifest) {
      try {
        const m = parseMediaManifest(JSON.parse(await cached.text()));
        if (m) set({ manifest: m, local: knownLocal(m) });
      } catch {
        // A corrupt cache is ignored; the network copy replaces it.
      }
    }
    try {
      const res = await fetch(remoteUrl('manifest.json'), { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const m = parseMediaManifest(JSON.parse(text));
      if (!m) throw new Error('Invalid manifest');
      if (cached) {
        dir().create({ idempotent: true, intermediates: true });
        cached.write(text);
      }
      set({ manifest: m, local: knownLocal(m), status: 'ready' });
    } catch {
      set({ status: get().manifest ? 'ready' : 'error' });
    }
  },

  ensure: async (asset) => {
    if (!isNative) return remoteUrl(asset.file);
    const have = get().local[asset.file];
    if (have) return have;
    if (get().downloading[asset.file]) return null;
    set({ downloading: { ...get().downloading, [asset.file]: true } });
    try {
      dir().create({ idempotent: true, intermediates: true });
      const target = localFile(asset.file);
      await File.downloadFileAsync(remoteUrl(asset.file), target, { idempotent: true });
      set({ local: { ...get().local, [asset.file]: target.uri } });
      return target.uri;
    } catch {
      return null;
    } finally {
      const { [asset.file]: _done, ...rest } = get().downloading;
      set({ downloading: rest });
    }
  },
}));

export const findVideo = (m: MediaManifest | null, id: string | null) =>
  (id && m?.videos.find((v) => v.id === id)) || null;
export const findSound = (m: MediaManifest | null, id: string | null) =>
  (id && m?.sounds.find((s) => s.id === id)) || null;

/*
 * Audio players from useAudioPlayer are released by the hook when the source
 * changes or the component unmounts (and again on every fast refresh), and any
 * call on a released player throws. These helpers make a late call a no-op.
 */
export function safePause(p: AudioPlayer): void {
  try {
    p.pause();
  } catch {
    // Already released: it is silent anyway.
  }
}

export function safePlay(p: AudioPlayer): void {
  try {
    p.play();
  } catch {
    // Released before it could start.
  }
}

/** Loops and plays. A plain function, so the React Compiler sees no mutation of hook state. */
export function playLooping(p: AudioPlayer): void {
  try {
    p.loop = true;
    p.play();
  } catch {
    // Released before it could start.
  }
}
