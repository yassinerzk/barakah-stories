import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { arabicLetterCount, getWallpaper, WALLPAPERS, wallpaperTextSize } from './wallpapers';
import { BACKGROUND_MAP } from './backgrounds';
import { THEME_MAP } from './themes';
import { DHIKR_PRESETS } from './practice';
import { DIVINE_NAMES } from './names99';
import { getChapterMeta } from './quran';

const verseText = (surah: number, ayah: number): string | undefined => {
  const file = join(__dirname, '..', '..', 'assets', 'quran', 'chapters', `${surah}.json`);
  const chapter = JSON.parse(readFileSync(file, 'utf8')) as { verses: { id: number; text: string }[] };
  return chapter.verses.find((v) => v.id === ayah)?.text;
};

describe('wallpaper catalogue', () => {
  it('gives every wallpaper its own id', () => {
    const ids = WALLPAPERS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(12);
  });

  it('only uses photos and themes the app ships', () => {
    for (const w of WALLPAPERS) {
      if (w.base.kind === 'photo') expect(BACKGROUND_MAP[w.base.background]).toBeDefined();
      else expect(THEME_MAP[w.base.theme]).toBeDefined();
    }
  });

  it('points every dhikr and Name at an entry that exists', () => {
    for (const w of WALLPAPERS) {
      if (w.words.kind === 'dhikr') {
        const id = w.words.id;
        expect(DHIKR_PRESETS.some((p) => p.id === id)).toBe(true);
      }
      if (w.words.kind === 'name') {
        const n = w.words.n;
        expect(DIVINE_NAMES.some((d) => d.n === n)).toBe(true);
      }
    }
  });

  it('quotes whole ayahs that are in the bundled Quran text', () => {
    const ayahs = WALLPAPERS.flatMap((w) => (w.words.kind === 'ayah' ? [w.words] : []));
    expect(ayahs.length).toBeGreaterThan(0);
    for (const { surah, ayah } of ayahs) {
      const meta = getChapterMeta(surah);
      expect(meta).toBeDefined();
      expect(ayah).toBeGreaterThanOrEqual(1);
      expect(ayah).toBeLessThanOrEqual(meta!.total_verses);
      expect(verseText(surah, ayah)?.trim()).toBeTruthy();
    }
  });

  it('mixes photos with patterns, and keeps a few without words', () => {
    expect(WALLPAPERS.some((w) => w.base.kind === 'photo')).toBe(true);
    expect(WALLPAPERS.some((w) => w.base.kind === 'theme')).toBe(true);
    expect(WALLPAPERS.some((w) => w.words.kind === 'none')).toBe(true);
  });

  it('finds a wallpaper by id, and nothing for an unknown one', () => {
    expect(getWallpaper(WALLPAPERS[0].id)).toBe(WALLPAPERS[0]);
    expect(getWallpaper('no-such-wallpaper')).toBeNull();
  });
});

describe('arabicLetterCount', () => {
  it('counts letters, not vowel marks, Quranic signs or spaces', () => {
    expect(arabicLetterCount('سُبْحَانَ ٱللَّٰهِ')).toBe(9);
    expect(arabicLetterCount('سبحان الله')).toBe(9);
    expect(arabicLetterCount('فَإِنَّ مَعَ ٱلۡعُسۡرِ يُسۡرًا')).toBe(14);
  });
});

describe('wallpaperTextSize', () => {
  it('sets short phrases large and long ayahs smaller', () => {
    const short = wallpaperTextSize('ٱللَّٰهُ أَكْبَرُ');
    const long = wallpaperTextSize('فَٱذۡكُرُونِيٓ أَذۡكُرۡكُمۡ وَٱشۡكُرُواْ لِي وَلَا تَكۡفُرُونِ');
    expect(short).toBeGreaterThan(long);
  });

  it('stays within a size that fits the screen width', () => {
    for (const text of ['ٱللَّٰهُ', 'قُلۡ هُوَ ٱللَّهُ أَحَدٌ', 'ب'.repeat(400)]) {
      const size = wallpaperTextSize(text);
      expect(size).toBeGreaterThanOrEqual(0.07);
      expect(size).toBeLessThanOrEqual(0.13);
    }
  });
});
