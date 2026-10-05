import type { Localized } from './types';

/**
 * Video backgrounds and ambient sounds for video stories.
 *
 * They are not bundled: the catalog is a manifest built by scripts/build-media.mjs
 * and served from the app's site, so new videos and sounds can be added without
 * shipping a new version. The manifest arrives over the network, so everything
 * in it is validated here before the app trusts a single field.
 */

export type StoryLength = 10 | 15 | 30;
export const STORY_LENGTHS: readonly StoryLength[] = [10, 15, 30];
export const DEFAULT_STORY_LENGTH: StoryLength = 15;

export function isStoryLength(n: unknown): n is StoryLength {
  return typeof n === 'number' && (STORY_LENGTHS as readonly number[]).includes(n);
}

export type SoundGroup = 'nature' | 'islamic';
export const SOUND_GROUPS: readonly SoundGroup[] = ['nature', 'islamic'];

export interface MediaSource {
  site: string;
  url: string;
  author: string | null;
  license: string;
}

export interface MediaAsset {
  id: string;
  name: Localized;
  /** Path relative to the media folder, e.g. "video/river.mp4". */
  file: string;
  durationMs: number;
  bytes: number;
  source: MediaSource;
}

export interface MediaVideo extends MediaAsset {
  /** Still frame for pickers, relative like `file`. */
  poster: string;
}

export interface MediaSound extends MediaAsset {
  group: SoundGroup;
}

export interface MediaManifest {
  version: 1;
  videos: MediaVideo[];
  sounds: MediaSound[];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** A relative path inside the media folder: no scheme, no "..", no leading slash. */
function isMediaPath(v: unknown): v is string {
  return isText(v) && /^[a-z0-9-]+\/[a-z0-9._-]+$/i.test(v) && !v.includes('..');
}

function parseName(v: unknown): Localized | null {
  if (!isObject(v) || !isText(v.en)) return null;
  const out: Record<string, string> = {};
  for (const [k, text] of Object.entries(v)) if (isText(text)) out[k] = text;
  return out as Localized;
}

function parseSource(v: unknown): MediaSource | null {
  if (!isObject(v) || !isText(v.site) || !isText(v.url) || !isText(v.license)) return null;
  return { site: v.site, url: v.url, author: isText(v.author) ? v.author : null, license: v.license };
}

function parseAsset(v: unknown): MediaAsset | null {
  if (!isObject(v) || !isText(v.id) || !isMediaPath(v.file) || !isCount(v.durationMs) || !isCount(v.bytes)) return null;
  const name = parseName(v.name);
  const source = parseSource(v.source);
  if (!name || !source) return null;
  return { id: v.id, name, file: v.file, durationMs: v.durationMs, bytes: v.bytes, source };
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((i) => !seen.has(i.id) && seen.add(i.id));
}

/**
 * Validates a downloaded manifest. A bad entry is dropped on its own; only a
 * manifest that is not one at all (or a future version this build cannot read)
 * returns null.
 */
export function parseMediaManifest(raw: unknown): MediaManifest | null {
  if (!isObject(raw) || raw.version !== 1 || !Array.isArray(raw.videos) || !Array.isArray(raw.sounds)) return null;
  const videos: MediaVideo[] = [];
  for (const v of raw.videos) {
    const asset = parseAsset(v);
    if (asset && isObject(v) && isMediaPath(v.poster)) videos.push({ ...asset, poster: v.poster });
  }
  const sounds: MediaSound[] = [];
  for (const s of raw.sounds) {
    const asset = parseAsset(s);
    if (asset && isObject(s) && SOUND_GROUPS.includes(s.group as SoundGroup)) {
      sounds.push({ ...asset, group: s.group as SoundGroup });
    }
  }
  return { version: 1, videos: uniqueById(videos), sounds: uniqueById(sounds) };
}

/** How many times a looping clip repeats to cover a story (the last copy is trimmed). */
export function loopsNeeded(clipMs: number, storySec: number): number {
  return Math.max(1, Math.ceil((storySec * 1000) / clipMs));
}
