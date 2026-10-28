// Builds the PWA / app icons from tools/art-source/icon.webp (Xin Yi's portrait).
// Run with `npm run icons` after replacing the source image.
//   icon-192.png, icon-512.png     rounded square, for browsers and desktop installs
//   icon-maskable-512.png          full-bleed square; Android crops it to the launcher's shape
//   favicon.png                    small browser-tab icon
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'tools/art-source/icon.webp');
const OUT = path.join(root, 'public/icons');
const BG = { top: '#4a2d7a', bottom: '#2b1d4e' }; // app twilight purple, fills transparent gaps
fs.mkdirSync(OUT, { recursive: true });

const background = (size) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BG.top}"/><stop offset="1" stop-color="${BG.bottom}"/></linearGradient></defs>
      <rect width="${size}" height="${size}" fill="url(#g)"/></svg>`,
  );

const roundedMask = (size) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#fff"/></svg>`);

async function icon(size, { rounded }) {
  const art = await sharp(SRC).resize(size, size, { fit: 'cover' }).toBuffer();
  let img = sharp(background(size)).composite([{ input: art }]);
  if (rounded) {
    const flat = await img.png().toBuffer();
    img = sharp(flat).composite([{ input: roundedMask(size), blend: 'dest-in' }]);
  }
  return img.png({ compressionLevel: 9 }).toBuffer();
}

const jobs = [
  ['icon-192.png', 192, true],
  ['icon-512.png', 512, true],
  ['icon-maskable-512.png', 512, false],
  ['favicon.png', 64, true],
];
for (const [name, size, rounded] of jobs) {
  const buf = await icon(size, { rounded });
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`${name}: ${size}x${size} (${(buf.length / 1024).toFixed(0)} KB)`);
}
