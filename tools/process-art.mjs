// Prepares character art for the game: trims empty margins, removes a plain white
// background if the image has no transparency, clears stray specks, resizes, and writes
// WebP into public/assets. Effect layers (e.g. Huojin's flame) are cropped with their character.
//
// Usage: npm run art
// Add new art to tools/art-source/ and list it in JOBS below (heroes and enemies).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const JOBS = [
  { src: 'tools/art-source/xinyi.webp', out: 'public/assets/characters/xinyi.webp', height: 420 },
  { src: 'tools/art-source/mei.webp', out: 'public/assets/characters/mei.webp', height: 420 },
  { src: 'tools/art-source/ruizhe.webp', out: 'public/assets/characters/ruizhe.webp', height: 420 },
  { src: 'tools/art-source/fuyun.webp', out: 'public/assets/characters/fuyun.webp', height: 420 },
  // Effect layers share the character's canvas: both are cropped to the same box so they stay aligned.
  {
    src: 'tools/art-source/huojin.webp', out: 'public/assets/characters/huojin.webp', height: 420,
    layers: [{ src: 'tools/art-source/huojin-fire.webp', out: 'public/assets/characters/huojin-fire.webp' }],
  },
  // Enemies (supply ~2x their on-stage size)
  { src: 'tools/art-source/inkdragon.webp', out: 'public/assets/enemies/inkdragon.webp', height: 440 },
  { src: 'tools/art-source/zombie.webp', out: 'public/assets/enemies/zombie.webp', height: 280 },
  { src: 'tools/art-source/crab.webp', out: 'public/assets/enemies/crab.webp', height: 200 },
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

/** Clears stray specks: opaque islands smaller than `minArea` pixels. */
function despeckle(data, w, h, minArea) {
  const label = new Int32Array(w * h).fill(-1);
  for (let start = 0; start < w * h; start++) {
    if (label[start] !== -1 || data[start * 4 + 3] === 0) continue;
    const members = [];
    const stack = [start];
    label[start] = start;
    while (stack.length) {
      const p = stack.pop();
      members.push(p);
      const x = p % w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
        if (q < 0 || q >= w * h || label[q] !== -1 || data[q * 4 + 3] === 0) continue;
        label[q] = start;
        stack.push(q);
      }
    }
    if (members.length < minArea) for (const p of members) data[p * 4 + 3] = 0;
  }
}

/** Bounding box of visible pixels: { left, top, width, height }. */
function opaqueBox(data, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < 8) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

async function loadClean(src, minArea) {
  const { data, info } = await sharp(path.join(root, src)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opaque = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 250) opaque++;
  if (opaque / (info.width * info.height) > 0.98) removeWhiteBackground(data, info.width, info.height);
  despeckle(data, info.width, info.height, minArea);
  return { data, w: info.width, h: info.height };
}

const union = (a, b) => {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  return { left, top, width: Math.max(a.left + a.width, b.left + b.width) - left, height: Math.max(a.top + a.height, b.top + b.height) - top };
};

async function write(img, box, height, out) {
  const res = await sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } })
    .extract(box)
    .resize({ height })
    .webp({ quality: 90, alphaQuality: 100 })
    .toBuffer({ resolveWithObject: true });
  fs.mkdirSync(path.dirname(path.join(root, out)), { recursive: true });
  fs.writeFileSync(path.join(root, out), res.data);
  console.log(`${out}: ${res.info.width}x${res.info.height} (${(res.data.length / 1024).toFixed(0)} KB)`);
}

for (const job of JOBS) {
  const main = await loadClean(job.src, 400);
  // small particles (sparks, embers) are expected in effect layers, so only drop dust there
  const layers = await Promise.all((job.layers || []).map((l) => loadClean(l.src, 12)));
  let box = opaqueBox(main.data, main.w, main.h);
  for (const l of layers) box = union(box, opaqueBox(l.data, l.w, l.h));
  await write(main, box, job.height, job.out);
  for (let i = 0; i < layers.length; i++) await write(layers[i], box, job.height, job.layers[i].out);
}
