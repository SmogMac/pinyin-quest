// Prepares character art for the game: trims empty margins, removes a plain white
// background if the image has no transparency, resizes, and writes WebP into public/assets.
//
// Usage: npm run art
// Add new art to tools/art-source/ and list it in JOBS below.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const JOBS = [
  { src: 'tools/art-source/xinyi.webp', out: 'public/assets/characters/xinyi.webp', height: 420 },
  { src: 'tools/art-source/mei.webp', out: 'public/assets/characters/mei.webp', height: 420 },
];

/** Flood-fills near-white pixels connected to the image border and makes them transparent. */
function removeWhiteBackground(data, w, h) {
  const isBg = (i) => data[i + 3] > 0 && data[i] > 238 && data[i + 1] > 238 && data[i + 2] > 238;
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    seen[p] = 1;
    if (!isBg(p * 4)) continue;
    data[p * 4 + 3] = 0;
    const x = p % w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (p >= w) stack.push(p - w);
    if (p < w * (h - 1)) stack.push(p + w);
  }
}

for (const job of JOBS) {
  const input = sharp(path.join(root, job.src)).ensureAlpha();
  const { data, info } = await input.raw().toBuffer({ resolveWithObject: true });
  let opaque = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 250) opaque++;
  if (opaque / (info.width * info.height) > 0.98) removeWhiteBackground(data, info.width, info.height);
  const out = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 })
    .resize({ height: job.height })
    .webp({ quality: 90, alphaQuality: 100 })
    .toBuffer({ resolveWithObject: true });
  fs.mkdirSync(path.dirname(path.join(root, job.out)), { recursive: true });
  fs.writeFileSync(path.join(root, job.out), out.data);
  console.log(`${job.out}: ${out.info.width}x${out.info.height} (${(out.data.length / 1024).toFixed(0)} KB)`);
}
