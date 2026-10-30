// Dev-server endpoints for the FX Studio (editor.html). Only active under `npm run dev` and only
// answered for requests from this computer, since they write files and can push to GitHub.
//
//   GET  /__fx/catalog            every animation in the VFX pack: { path, category, anim, variant,
//                                 w, h, frames, cols, rows, sw, sh (image size) }
//   GET  /__fx/raw/<path>/spritesheet.png   a pack sheet, for previews before it is packed
//   POST /__fx/compile  {config}  validates, packs the sheets it uses, writes src/fx/fx.json
//   GET  /__fx/status             `git status --short` (what Publish would commit)
//   POST /__fx/publish  {message} tests, build, commit everything, push to GitHub (streamed log)
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { PACK, CONFIG, readMeta, pngSize, packSheets } from './fx-pack.mjs';

const local = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((ok, bad) => {
    let s = '';
    req.on('data', (c) => (s += c));
    req.on('end', () => {
      try {
        ok(JSON.parse(s || '{}'));
      } catch (e) {
        bad(e);
      }
    });
  });

let catalog = null;
function buildCatalog() {
  const out = [];
  if (!fs.existsSync(PACK)) return out;
  for (const category of fs.readdirSync(PACK)) {
    const cdir = path.join(PACK, category);
    if (!fs.statSync(cdir).isDirectory()) continue;
    for (const anim of fs.readdirSync(cdir)) {
      const adir = path.join(cdir, anim);
      if (!fs.statSync(adir).isDirectory()) continue;
      for (const variant of fs.readdirSync(adir)) {
        const rel = `${category}/${anim}/${variant}`;
        if (!fs.existsSync(path.join(PACK, rel, 'spritesheet.txt'))) continue;
        try {
          const m = readMeta(rel);
          const img = pngSize(path.join(PACK, rel, 'spritesheet.png'));
          out.push({ path: rel, category, anim, variant, ...m, sw: img.w, sh: img.h });
        } catch {
          // a sheet that is not a plain grid can't be played; leave it out
        }
      }
    }
  }
  return out;
}

/** Checks a config before it is written: every reference resolves, every number is a number. */
export function validate(c) {
  const errs = [];
  for (const k of ['sheets', 'effects', 'cues', 'projectiles', 'poses']) if (!c[k] || typeof c[k] !== 'object') errs.push(`missing ${k}`);
  if (errs.length) return errs;
  for (const [n, e] of Object.entries(c.effects)) {
    if (!c.sheets[e.sheet]) errs.push(`effect ${n}: unknown sheet ${e.sheet}`);
    if (!(e.scale > 0)) errs.push(`effect ${n}: scale must be above 0`);
  }
  for (const [n, q] of Object.entries(c.cues)) {
    for (const [i, L] of (q.layers || []).entries()) {
      if ((L.type || 'effect') === 'effect' && !c.effects[L.effect]) errs.push(`cue ${n} layer ${i + 1}: unknown effect ${L.effect}`);
      if (L.type === 'pose' && !c.poses[L.state]) errs.push(`cue ${n} layer ${i + 1}: unknown pose ${L.state}`);
    }
  }
  for (const [n, p] of Object.entries(c.projectiles)) {
    if (p.sprite && !c.effects[p.sprite]) errs.push(`projectile ${n}: unknown sprite effect ${p.sprite}`);
    if (p.launch && !c.cues[p.launch]) errs.push(`projectile ${n}: unknown launch cue ${p.launch}`);
    if (!(p.minMs > 0 && p.maxMs >= p.minMs)) errs.push(`projectile ${n}: flight time range is invalid`);
  }
  for (const [n, p] of Object.entries(c.poses)) if (!(p.dur > 0) || !Array.isArray(p.keys)) errs.push(`pose ${n}: needs a duration and keyframes`);
  return errs;
}

/** Runs a command, streaming its output into `write`. Resolves with the exit code. */
function run(cmd, args, write) {
  return new Promise((ok) => {
    write(`\n$ ${cmd} ${args.join(' ')}\n`);
    const p = spawn(cmd, args, { shell: process.platform === 'win32', cwd: process.cwd(), env: { ...process.env, FORCE_COLOR: '0' } });
    p.stdout.on('data', (d) => write(String(d)));
    p.stderr.on('data', (d) => write(String(d)));
    p.on('close', (code) => ok(code));
    p.on('error', (e) => {
      write(`${e.message}\n`);
      ok(1);
    });
  });
}

let busy = false;

export default function fxEditor() {
  return {
    name: 'fx-editor',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/__fx/')) return next();
        if (!local(req)) return json(res, 403, { error: 'The FX Studio only answers this computer.' });
        const url = decodeURIComponent(req.url.split('?')[0]);
        try {
          if (url === '/__fx/catalog') {
            catalog ||= buildCatalog();
            return json(res, 200, { pack: fs.existsSync(PACK), sheets: catalog });
          }
          if (url.startsWith('/__fx/raw/')) {
            const rel = url.slice('/__fx/raw/'.length);
            const file = path.resolve(PACK, rel);
            if (!file.startsWith(path.resolve(PACK)) || !file.endsWith('.png') || !fs.existsSync(file)) return json(res, 404, { error: 'not found' });
            res.setHeader('Content-Type', 'image/png');
            return fs.createReadStream(file).pipe(res);
          }
          if (url === '/__fx/compile' && req.method === 'POST') {
            if (busy) return json(res, 409, { error: 'Busy: wait for the current compile or publish.' });
            busy = true;
            try {
              const { config } = await readBody(req);
              const errs = validate(config);
              if (errs.length) return json(res, 400, { error: 'The config has problems', errors: errs });
              const log = await packSheets(config);
              fs.writeFileSync(CONFIG, `${JSON.stringify(config, null, 1)}\n`);
              log.push(`wrote ${CONFIG}`);
              return json(res, 200, { ok: true, log, config });
            } finally {
              busy = false;
            }
          }
          if (url === '/__fx/status') {
            let out = '';
            await run('git', ['status', '--short'], (s) => (out += s));
            const branch = await new Promise((ok) => {
              let b = '';
              run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], (s) => (b += s)).then(() => ok(b.split('\n').filter(Boolean).pop()));
            });
            return json(res, 200, { status: out.split('\n').slice(2).join('\n').replace(/^\n+|\s+$/g, ''), branch });
          }
          if (url === '/__fx/publish' && req.method === 'POST') {
            if (busy) return json(res, 409, { error: 'Busy: wait for the current compile or publish.' });
            const { message } = await readBody(req);
            if (!message || !String(message).trim()) return json(res, 400, { error: 'A commit message is needed.' });
            busy = true;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            const write = (s) => res.write(s);
            try {
              const steps = [
                ['npm', ['test']],
                ['npm', ['run', 'build']],
                ['git', ['add', '-A']],
                ['git', ['commit', '-m', String(message).trim()]],
                ['git', ['push']],
              ];
              for (const [cmd, args] of steps) {
                const code = await run(cmd, args, write);
                if (code !== 0) {
                  write(`\n✖ stopped: ${cmd} ${args[0]} failed (exit ${code}). Nothing after this step ran.\n`);
                  return res.end('\n[[FAILED]]\n');
                }
              }
              write('\n✔ Published. GitHub Actions now builds and deploys the site (a few minutes).\n');
              return res.end('\n[[DONE]]\n');
            } finally {
              busy = false;
            }
          }
          return json(res, 404, { error: 'unknown FX Studio endpoint' });
        } catch (e) {
          busy = false;
          return json(res, 500, { error: e.message });
        }
      });
    },
  };
}
