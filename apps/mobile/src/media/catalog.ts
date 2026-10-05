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
  /** Fetches the catalog; `force` re-fetches even when one is loaded. */
  load: (force?: boolean) => Promise<void>;
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

  load: async (force = false) => {
    if (get().status === 'loading') return;
    if (!force && get().status === 'ready' && get().manifest) return;
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
      // The query string defeats the CDN's 10-minute cache: a stale catalog would
      // point at file names that no longer exist after the library is rebuilt.
      const res = await fetch(`${remoteUrl('manifest.json')}?v=${Date.now()}`, { cache: 'no-store' });
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
    const first = await download(asset);
    if (first) return first;
    // The file may have been renamed by a library rebuild: refresh the catalog
    // and try the same asset under its current name, once.
    await get().load(true);
    const m = get().manifest;
    const current = m && [...m.videos, ...m.sounds].find((a) => a.id === asset.id && a.file !== asset.file);
    return current ? download(current) : null;
  },
}));

/** Downloads one asset (or returns the copy on disk). Null if it fails. */
async function download(asset: MediaAsset): Promise<string | null> {
  const { local, downloading } = useMediaStore.getState();
  const have = local[asset.file];
  if (have) return have;
  if (downloading[asset.file]) return null;
  useMediaStore.setState({ downloading: { ...downloading, [asset.file]: true } });
  const target = localFile(asset.file);
  try {
    dir().create({ idempotent: true, intermediates: true });
    await File.downloadFileAsync(remoteUrl(asset.file), target, { idempotent: true });
    // A missing file can come back as a small error page; never keep that.
    if (!target.exists || (target.size ?? 0) < MIN_ASSET_BYTES) throw new Error('Incomplete download');
    useMediaStore.setState({ local: { ...useMediaStore.getState().local, [asset.file]: target.uri } });
    return target.uri;
  } catch {
    try {
      if (target.exists) target.delete();
    } catch {
      // Nothing to clean up.
    }
    return null;
  } finally {
    const { [asset.file]: _done, ...rest } = useMediaStore.getState().downloading;
    useMediaStore.setState({ downloading: rest });
  }
}

/** Smaller than any real clip or sound: anything below is an error response. */
const MIN_ASSET_BYTES = 10_000;

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
