// The living sky of the card of the day: assets-src/wetter/himmel-<kind>.mp4 (the user's films, 4:3, about 6 s) ->
// public/img/wetter/himmel-<kind>.mp4 (480 px wide, silent, a seamless loop: the last second fades into the first)
// and himmel-<kind>.webp (its first frame, shown before the film plays and where motion is not wanted).
// Usage: node scripts/optimize-himmel.mjs      Kinds shown by the app: HIMMEL in src/ui/Tageskarte.tsx.
import { execFileSync } from 'child_process'; import fs from 'fs'; import path from 'path';
const SRC = 'assets-src/wetter', OUT = 'public/img/wetter', X = 1; fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(SRC).filter((n) => /^himmel-[a-z-]+\.mp4$/.test(n))) {
  const src = path.join(SRC, f), out = path.join(OUT, f);
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]).toString());
  const end = Math.floor(dur * 10) / 10 - 0.1;
  const g = `[0:v]fps=24,scale=480:-2:flags=lanczos,split=3[a0][b0][c0];[a0]trim=0:${X},setpts=PTS-STARTPTS[a];[b0]trim=${X}:${end - X},setpts=PTS-STARTPTS[b];[c0]trim=${end - X}:${end},setpts=PTS-STARTPTS[c];[c][a]xfade=transition=fade:duration=${X}:offset=0[x];[b][x]concat=n=2:v=1[v]`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-filter_complex', g, '-map', '[v]', '-an', '-c:v', 'libx264', '-profile:v', 'main', '-crf', '27', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '72', out.replace(/\.mp4$/, '.webp')]);
  console.log(f, (fs.statSync(out).size / 1024).toFixed(0) + ' kB');
}
