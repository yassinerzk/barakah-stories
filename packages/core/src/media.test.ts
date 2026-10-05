import { loopsNeeded, parseMediaManifest, STORY_LENGTHS, isStoryLength } from './media';

const video = {
  id: 'river',
  name: { en: 'River', ar: 'نهر' },
  file: 'video/river.mp4',
  poster: 'video/river.jpg',
  durationMs: 8000,
  bytes: 3_400_000,
  source: { site: 'Pexels', url: 'https://www.pexels.com/video/4937376/', author: null, license: 'Pexels License' },
};
const sound = {
  id: 'stream',
  group: 'nature',
  name: { en: 'Stream' },
  file: 'sound/stream.m4a',
  durationMs: 45000,
  bytes: 560_000,
  source: { site: 'Freesound', url: 'https://freesound.org/s/433589/', author: 'jackthemurray', license: 'CC0 1.0' },
};

describe('media manifest', () => {
  it('accepts a well-formed manifest', () => {
    const m = parseMediaManifest({ version: 1, videos: [video], sounds: [sound] });
    expect(m?.videos[0].id).toBe('river');
    expect(m?.sounds[0].group).toBe('nature');
  });

  it('rejects anything that is not a manifest', () => {
    expect(parseMediaManifest(null)).toBeNull();
    expect(parseMediaManifest('nope')).toBeNull();
    expect(parseMediaManifest({ version: 2, videos: [], sounds: [] })).toBeNull();
  });

  it('drops individual entries that are malformed instead of the whole catalog', () => {
    const m = parseMediaManifest({
      version: 1,
      videos: [video, { ...video, id: '' }, { ...video, id: 'bad', durationMs: -1 }],
      sounds: [sound, { ...sound, id: 'x', group: 'music' }],
    });
    expect(m?.videos.map((v) => v.id)).toEqual(['river']);
    expect(m?.sounds.map((s) => s.id)).toEqual(['stream']);
  });

  it('refuses paths that try to leave the media folder', () => {
    const m = parseMediaManifest({
      version: 1,
      videos: [{ ...video, file: '../secret.mp4' }, { ...video, id: 'abs', file: 'https://evil.example/x.mp4' }],
      sounds: [],
    });
    expect(m?.videos).toEqual([]);
  });

  it('keeps ids unique', () => {
    const m = parseMediaManifest({ version: 1, videos: [video, video], sounds: [] });
    expect(m?.videos).toHaveLength(1);
  });
});

describe('story length', () => {
  it('offers 10, 15 and 30 seconds', () => {
    expect(STORY_LENGTHS).toEqual([10, 15, 30]);
    expect(isStoryLength(15)).toBe(true);
    expect(isStoryLength(20)).toBe(false);
  });

  it('works out how many loops of a clip fill a story', () => {
    expect(loopsNeeded(8000, 15)).toBe(2);
    expect(loopsNeeded(8000, 16)).toBe(2);
    expect(loopsNeeded(8000, 30)).toBe(4);
    expect(loopsNeeded(10_000, 10)).toBe(1);
  });
});
