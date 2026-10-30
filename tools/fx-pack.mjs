// Packs the sprite sheets the FX config uses: node tools/fx-pack.mjs  (npm run vfx)
// The FX Studio's Compile button runs the same code (tools/fx-editor-plugin.mjs).
//
// Source: vfx/ (Super Pixel Effects Gigapack, free version, by Will Tice / unTied Games; kept out of
// git: its license allows bundling with the game but not redistributing the pack itself).
//
// For every sheet in src/fx/fx.json that an effect uses:
//   · frame rectangles come from the pack's spritesheet.txt (never guessed; must be a row-major grid)
//   · public/assets/vfx/<key>.png is the sheet cropped to its frames (the pack pads to powers of two)
//   · each hue an effect asks for is baked into <key>@<hue>.png, so the game needs no CSS filter
// Sheets no effect uses are dropped from the config, and their files deleted.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export const PACK = 'vfx/spritesheet';
export const OUT = 'public/assets/vfx';
export const CONFIG = 'src/fx/fx.json';

/** Frame layout of one pack sheet folder (relative to vfx/spritesheet). */
export function readMeta(dir) {
  const lines = fs.readFileSync(path.join(PACK, dir, 'spritesheet.txt'), 'utf8').trim().split(/\r?\n/);
  const rects = lines.map((l) => l.split('=')[1].trim().split(/\s+/).map(Number));
  const [, , w, h] = rects[0];
  const cols = new Set(rects.map((r) => r[0])).size;
  const rows = new Set(rects.map((r) => r[1])).size;
  rects.forEach(([x, y, fw, fh], i) => {
    if (fw !== w || fh !== h || x !== (i % cols) * w || y !== Math.floor(i / cols) * h) throw new Error(`${dir}: frame ${i} is not in row-major grid order`);
  });
  return { w, h, frames: rects.length, cols, rows };
}

/** Width and height of a PNG from its header. */
export function pngSize(file) {
  const b = Buffer.alloc(24);
  const fd = fs.openSync(file, 'r');
  fs.readSync(fd, b, 0, 24, 0);
  fs.closeSync(fd);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

/**
 * Packs `config` in place (sheet metadata, baked hues; unused sheets removed) and writes the PNGs.
 * Returns log lines.
 */
export async function packSheets(config, { log = [] } = {}) {
  const used = new Set(Object.values(config.effects).map((e) => e.sheet));
  const hues = {};
  for (const e of Object.values(config.effects)) if (e.hue) (hues[e.sheet] ||= new Set()).add(e.hue);
  for (const key of Object.keys(config.sheets)) {
    if (!used.has(key)) {
      delete config.sheets[key];
      log.push(`dropped unused sheet ${key}`);
    }
  }
  fs.mkdirSync(OUT, { recursive: true });
  const keep = new Set();
  for (const [key, sh] of Object.entries(config.sheets)) {
    const src = path.join(PACK, sh.path, 'spritesheet.png');
    if (!fs.existsSync(src)) throw new Error(`sheet ${key}: ${sh.path} is not in the VFX pack (vfx/spritesheet)`);
    const m = readMeta(sh.path);
    const baked = [...(hues[key] || [])].sort((a, b) => a - b);
    const files = [[`${key}.png`, 0], ...baked.map((h) => [`${key}@${h}.png`, h])];
    for (const [file, hue] of files) {
      keep.add(file);
      const out = path.join(OUT, file);
      // skip work when the packed file is newer than its source and the config is unchanged
      const fresh = fs.existsSync(out) && fs.statSync(out).mtimeMs > fs.statSync(src).mtimeMs && !sh.pending;
      if (fresh) continue;
      let img = sharp(src);
      if (hue) img = img.modulate({ hue });
      await img.extract({ left: 0, top: 0, width: m.w * m.cols, height: m.h * m.rows }).png({ compressionLevel: 9, palette: true }).toFile(out);
      log.push(`packed ${file}`);
    }
    config.sheets[key] = { path: sh.path, ...m, ...(baked.length ? { baked } : {}) };
  }
  for (const f of fs.readdirSync(OUT)) {
    if (f.endsWith('.png') && !keep.has(f)) {
      fs.unlinkSync(path.join(OUT, f));
      log.push(`deleted ${f}`);
    }
  }
  const bytes = [...keep].reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
  log.push(`${keep.size} sheet files (${Math.round(bytes / 1024)} KB)`);
  return log;
}

// CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const log = await packSheets(config);
  fs.writeFileSync(CONFIG, `${JSON.stringify(config, null, 1)}\n`);
  console.log(log.join('\n'));
}
