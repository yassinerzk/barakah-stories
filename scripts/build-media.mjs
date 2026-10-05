#!/usr/bin/env node
/**
 * Builds the video-story media library served from GitHub Pages.
 *
 *   node scripts/build-media.mjs <raw videos dir> <raw sounds dir>
 *
 * Raw files are named by id (river.mp4, stream.mp3, adhan.ogg …) and listed in
 * scripts/media-sources.json, which is also the provenance record: source,
 * author and licence for every asset. Requires ffmpeg and ffprobe on PATH.
 *
 * Videos → apps/web/public/media/video/<id>.mp4 + <id>.jpg
 *   1080x1920, 30 fps, H.264, no audio, LOOP_S seconds. The last second is
 *   cross-faded into the first, so the clip loops without a visible seam —
 *   the encoder in the app can then repeat it to any story length.
 * Sounds → apps/web/public/media/sound/<id>.m4a
 *   Up to SOUND_MAX_S seconds, loudness-normalised, the end cross-faded into the
 *   start for the same seamless loop.
 * Manifest → apps/web/public/media/manifest.json, read by the app.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const LOOP_S = 8;
const XFADE_S = 1;
const SOUND_MAX_S = 45;
const MANIFEST_VERSION = 1;

const root = resolve(import.meta.dirname, '..');
const [rawVideos, rawSounds] = process.argv.slice(2).map((p) => resolve(p));
if (!rawVideos || !rawSounds) {
  console.error('usage: node scripts/build-media.mjs <raw videos dir> <raw sounds dir>');
  process.exit(1);
}
const out = join(root, 'apps/web/public/media');
mkdirSync(join(out, 'video'), { recursive: true });
mkdirSync(join(out, 'sound'), { recursive: true });
const sources = JSON.parse(readFileSync(join(root, 'scripts/media-sources.json'), 'utf8'));

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${cmd} failed: ${r.stderr.slice(-800)}`);
  return r.stdout;
}
const duration = (file) =>
  Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim());
const findRaw = (dir, id) => readdirSync(dir).map((f) => join(dir, f)).find((f) => f.split(/[\\/]/).pop().startsWith(`${id}.`));

const videos = [];
for (const v of sources.videos) {
  const src = findRaw(rawVideos, v.id);
  if (!src) throw new Error(`missing raw video for ${v.id}`);
  const start = v.start ?? 0;
  const loop = Math.min(LOOP_S, duration(src) - start - XFADE_S - 0.2);
  const mp4 = join(out, 'video', `${v.id}.mp4`);
  const jpg = join(out, 'video', `${v.id}.jpg`);
  const graph =
    `[0:v]fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,format=yuv420p,split[a][b];` +
    `[a]trim=start=${XFADE_S}:end=${XFADE_S + loop},setpts=PTS-STARTPTS[main];` +
    `[b]trim=start=0:end=${XFADE_S},setpts=PTS-STARTPTS[head];` +
    `[main][head]xfade=transition=fade:duration=${XFADE_S}:offset=${loop - XFADE_S}[v]`;
  run('ffmpeg', [
    '-v', 'error', '-y', '-ss', String(start), '-t', String(loop + XFADE_S + 0.5), '-i', src,
    '-filter_complex', graph, '-map', '[v]', '-an',
    '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-crf', '24',
    '-maxrate', '4M', '-bufsize', '8M', '-movflags', '+faststart', mp4,
  ]);
  run('ffmpeg', ['-v', 'error', '-y', '-ss', '1', '-i', mp4, '-frames:v', '1', '-vf', 'scale=360:640', '-q:v', '4', jpg]);
  videos.push({
    id: v.id,
    name: v.name,
    file: `video/${v.id}.mp4`,
    poster: `video/${v.id}.jpg`,
    durationMs: Math.round(duration(mp4) * 1000),
    bytes: statSync(mp4).size,
    source: { site: 'Pexels', url: `https://www.pexels.com/video/${v.pexels}/`, author: v.author, license: 'Pexels License' },
  });
  console.log(`video ${v.id.padEnd(18)} ${(statSync(mp4).size / 1e6).toFixed(1)} MB`);
}

const sounds = [];
for (const s of sources.sounds) {
  const src = findRaw(rawSounds, s.id);
  if (!src) throw new Error(`missing raw sound for ${s.id}`);
  const total = duration(src);
  const len = Math.max(2, Math.min(SOUND_MAX_S, total - XFADE_S - 0.3));
  const m4a = join(out, 'sound', `${s.id}.m4a`);
  const graph =
    `[0:a]aresample=44100,asplit[a][b];` +
    `[a]atrim=start=${XFADE_S}:end=${XFADE_S + len},asetpts=PTS-STARTPTS[main];` +
    `[b]atrim=start=0:end=${XFADE_S},asetpts=PTS-STARTPTS[head];` +
    `[main][head]acrossfade=d=${XFADE_S}:c1=tri:c2=tri,loudnorm=I=-20:TP=-2:LRA=11[o]`;
  run('ffmpeg', ['-v', 'error', '-y', '-i', src, '-filter_complex', graph, '-map', '[o]', '-ac', '2', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', m4a]);
  const source = s.freesound
    ? { site: 'Freesound', url: `https://freesound.org/s/${s.freesound}/`, author: s.author, license: 'CC0 1.0' }
    : { site: 'Wikimedia Commons', url: `https://commons.wikimedia.org/wiki/${s.commons}`, author: s.author, license: 'CC0 1.0' };
  sounds.push({
    id: s.id,
    group: s.group,
    name: s.name,
    file: `sound/${s.id}.m4a`,
    durationMs: Math.round(duration(m4a) * 1000),
    bytes: statSync(m4a).size,
    source,
  });
  console.log(`sound ${s.id.padEnd(18)} ${(statSync(m4a).size / 1e6).toFixed(2)} MB`);
}

writeFileSync(join(out, 'manifest.json'), JSON.stringify({ version: MANIFEST_VERSION, videos, sounds }, null, 2) + '\n');
const total = [...videos, ...sounds].reduce((n, a) => n + a.bytes, 0);
console.log(`manifest: ${videos.length} videos, ${sounds.length} sounds, ${(total / 1e6).toFixed(1)} MB`);
if (!existsSync(join(out, 'manifest.json'))) process.exit(1);
