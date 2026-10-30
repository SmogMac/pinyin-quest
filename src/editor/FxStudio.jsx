// FX Studio: edit every battle effect, cue, projectile and character pose with a live preview on
// the real battle screen, then Compile (write src/fx/fx.json and pack the sprite sheets) and
// Publish (test, build, commit, push). See docs/FX_STUDIO.md.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fx, setFx, VFX_FPS } from '../fx/config.js';
import { vfxDuration, SheetFrames } from '../components/Vfx.jsx';
import BattleScreen from '../components/BattleScreen.jsx';
import Preview from './Preview.jsx';
import Library from './Library.jsx';
import { Num, Pick, Toggle, Text, Section, ItemList } from './parts.jsx';
import { HEROES } from '../game/data/heroes.js';
import { ENEMIES } from '../game/data/enemies.js';
import { BIOMES } from '../game/data/biomes.js';
import { newRun } from '../game/run.js';
import { SIGNATURES } from '../game/data/signatures.js';
import { ITEMS } from '../game/data/items.js';

const KEY = 'fx-studio-draft';
const clone = (x) => structuredClone(x);
const SOUNDS = ['hit', 'crit', 'spell', 'heal', 'shield', 'dodge', 'die', 'pick', 'click', 'reveal', 'correct', 'wrong', 'levelUp'];
const ANCHORS = [['', '(effect default)'], ['mid', 'mid · body centre'], ['ground', 'ground · feet'], ['head', 'head · above'], ['beside', 'beside · shoulder'], ['front', 'front · ahead']];
const ATTACH = [['target', 'target (who it happens to)'], ['source', 'source (who did it)'], ['hero', 'hero'], ['world', 'world (fixed spot)']];
const MIRROR = [['auto', 'auto · point along the action'], ['reverse', 'reverse · against the action'], ['facing', 'facing · where the unit looks'], ['never', 'never mirror']];
const LAYERS = ['ground', 'unit', 'air', 'front'];
const BLENDS = [['', 'normal'], ['screen', 'screen (glow)'], ['lighten', 'lighten'], ['plus-lighter', 'add']];
const LOOKS = ['orb', 'dart', 'fire', 'ice', 'water', 'earth', 'wind', 'dark', 'light', 'physical', 'fruit', 'inherit'];
const CLASSIC = ['spell', 'slam', 'ring', 'guard', 'whiff', 'burst'];
const SPELL_KINDS = ['bladearc', 'bladewave', 'cheer', 'drain', 'flames', 'frenzy', 'glint', 'gust', 'iaido', 'passion', 'quake', 'repel', 'scroll', 'sparkle', 'swing', 'wave'];
const EASES = ['ease-out', 'ease-in', 'ease-in-out', 'linear', 'cubic-bezier(0.3, 0, 0.3, 1)', 'cubic-bezier(0.2, 1.4, 0.4, 1)'];
const LAYER_TYPES = { effect: '✦', pose: '🏃', classic: '◎', shake: '〰', punch: '⤧', sound: '♪' };
const FPS = 30; // scrubbing steps (sprite effects change every 2 steps at their 15 FPS)
const FRAME = 1000 / FPS;
const TRAILS = [['none', 'none'], ['glow', 'glow dots'], ['echo', 'echoes of the projectile']];
// What happens at a signature's impact frame, for the preview: the engine's own phase cues (with
// their built-in delays, ms) and when its hits land. The Test fight plays the real thing.
const SIG_RESULT = {
  patient_blade: { phases: [['windup', 0], ['strike', 450]], hit: 450 },
  burning_passion: { phases: [['aura', 0]] },
  deny_danger: { phases: [['scroll', 0], ['repel', 0]], hit: 0 },
  go_all_out: { phases: [['frenzy', 0]] },
  knockback: { phases: [['swing', 0], ['blast', 350]] },
  fruit_salad: { fruit: 'watermelon' },
};
// Test fight item sets (to see item visuals and clones in a real fight)
const RARE_ITEMS = Object.keys(ITEMS).filter((id) => ITEMS[id].rarity === 'epic');
const ITEM_SETS = [['none', 'no items'], ['random', '10 random items'], ['epic', 'all epic items'], ['all', 'every item (absurd)']];
const sigOf = (cueName) => cueName.match(/^sig\.(\w+)\./)?.[1];

/** How long a layer runs (ms). */
function layerMs(L, c) {
  switch (L.type || 'effect') {
    case 'effect':
      return vfxDuration(L.effect, L.speed ?? 1) * (L.loops ?? c.effects[L.effect]?.loops ?? 1);
    case 'pose':
      return L.dur ?? c.poses[L.state]?.dur ?? 300;
    case 'sound':
      return 120;
    default:
      return L.dur || 600;
  }
}
const cueMs = (q, c) => Math.max(200, q.impact || 0, ...q.layers.map((L) => (L.delay || 0) + layerMs(L, c)));
function layerName(L) {
  const t = L.type || 'effect';
  if (t === 'effect') return L.effect;
  if (t === 'pose') return `pose: ${L.state}`;
  if (t === 'classic') return `${L.fx}${L.kind ? `: ${L.kind}` : ''}`;
  if (t === 'sound') return `sound: ${L.sound}`;
  return `${t} ${L.dur}ms`;
}
/** Who a cue happens to in the preview (most cues: the enemy). */
const heroCue = (name) => !/^sig\..*\.hit$/.test(name) && /^(sig\.|hero\.|shield\.|buff\.|unit\.heal|attack\.hero|enemy\.cast|fruit\.throw)/.test(name);

function loadDraft() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s?.dirty && s.draft?.cues) return s;
  } catch {
    /* no saved draft */
  }
  return null;
}

export default function FxStudio() {
  const saved = useMemo(loadDraft, []);
  const [draft, setDraft] = useState(() => saved?.draft || clone(fx()));
  const [dirty, setDirty] = useState(Boolean(saved));
  const hist = useRef({ past: [], future: [] });
  const draftRef = useRef(draft);
  draftRef.current = draft;
  useEffect(() => setFx(draft), [draft]);
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify({ draft, dirty }));
      } catch {
        /* storage full or blocked */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [draft, dirty]);

  /** Every change goes through here: undoable, live in the preview at once. */
  const edit = useCallback((fn) => {
    const next = clone(draftRef.current);
    fn(next);
    hist.current.past.push(draftRef.current);
    if (hist.current.past.length > 200) hist.current.past.shift();
    hist.current.future = [];
    setDraft(next);
    setDirty(true);
  }, []);
  const undo = () => {
    const p = hist.current.past.pop();
    if (!p) return;
    hist.current.future.push(draftRef.current);
    setDraft(p);
    setDirty(true);
  };
  const redo = () => {
    const f = hist.current.future.pop();
    if (!f) return;
    hist.current.past.push(draftRef.current);
    setDraft(f);
    setDirty(true);
  };

  const [tab, setTab] = useState('cues');
  const [sel, setSel] = useState({ cues: 'hit.melee', effects: 'hit_melee', projectiles: 'orb', poses: 'attack' });
  const [layerIdx, setLayerIdx] = useState(0);
  const [keyIdx, setKeyIdx] = useState(0);
  const [search, setSearch] = useState('');
  const [opts, setOpts] = useState({ hero: 'xinyi', enemy: 'goblin', biome: 'bamboo', dist: 34, slow: 1, loop: false, reverse: false });
  const [catalog, setCatalog] = useState(null);
  const [library, setLibrary] = useState(null); // { onPick, title }
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // 'publish' | 'fight' | 'help'
  const api = useRef(null);
  const [apiTick, setApiTick] = useState(0);

  useEffect(() => {
    fetch('/__fx/catalog')
      .then((r) => r.json())
      .then((j) => setCatalog(j.sheets || []))
      .catch(() => setCatalog([]));
  }, []);
  const say = (text, bad = false) => {
    setToast({ text, bad, key: Date.now() });
    setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 4000);
  };

  // ---------------------------------------------------------------- preview playback
  const foeId = () => api.current?.units().find((u) => u.side === 1)?.id;
  const ctxFor = (name) => {
    const foe = foeId();
    const toHero = heroCue(name) !== opts.reverse;
    return toHero ? { tgt: 'hero', src: foe, toward: 'left' } : { tgt: foe, src: 'hero', toward: 'right' };
  };
  /** Starts the selection on the stage (no clearing); returns how long it runs in ms. */
  const startSel = useCallback(() => {
    const a = api.current;
    if (!a) return 0;
    const c = draftRef.current;
    const id = sel[tab];
    const foe = foeId();
    if (tab === 'cues') {
      const q = c.cues[id];
      if (!q) return 0;
      const sig = sigOf(id);
      const heroCtx = { tgt: 'hero', src: 'hero', toward: 'right' };
      if (sig && id.endsWith('.cast')) {
        // the cast animation, then (at the impact frame) what the move does
        a.cue(id, { ...heroCtx, lock: true });
        const r = SIG_RESULT[sig] || {};
        a.after(q.impact || 0, () => {
          for (const [phase, d] of r.phases || []) a.after(d, () => a.cue(`sig.${sig}.${phase}`, heroCtx));
          if (r.hit !== undefined) a.after(r.hit, () => a.cue(`sig.${sig}.hit`, { tgt: foe, src: 'hero', toward: 'right' }));
          if (r.fruit) a.throwFruit(r.fruit, foe);
        });
        const tail = Math.max(0, ...(r.phases || []).map(([p, d]) => d + (c.cues[`sig.${sig}.${p}`] ? cueMs(c.cues[`sig.${sig}.${p}`], c) : 0)), r.fruit ? 1300 : 0);
        return Math.max(cueMs(q, c), (q.impact || 0) + tail);
      }
      if (id.startsWith('sig.') && !id.endsWith('.hit')) a.cue(id, heroCtx);
      else if (id.startsWith('attack.hero')) a.cue(id, heroCtx);
      else if (id === 'attack.enemy' || id === 'enemy.telegraph') a.cue(id, { tgt: foe, src: foe, toward: 'left' });
      else if (id.startsWith('fruit.') && id !== 'fruit.throw' && !q.layers.some((L) => L.state === 'eat')) a.throwFruit(id.slice(6), foe);
      else if (id.startsWith('fruit.')) a.cue(id, { tgt: 'hero', src: 'hero', toward: 'right' });
      else a.cue(id, ctxFor(id));
      return cueMs(q, c) + (id.startsWith('fruit.') && id !== 'fruit.throw' ? 900 : 0);
    }
    if (tab === 'effects') {
      const ctx = opts.reverse ? { tgt: 'hero', src: foe, toward: 'left' } : { tgt: foe, src: 'hero', toward: 'right' };
      a.layer({ type: 'effect', effect: id }, ctx);
      return vfxDuration(id) * (c.effects[id]?.loops || 1);
    }
    if (tab === 'projectiles') {
      const [s, t] = opts.reverse ? [foe, 'hero'] : ['hero', foe];
      const p = c.projectiles[id];
      return a.projectile(id, s, t, { emoji: '🍉', style: 'dark' }) + (p?.trail?.count || 0) * (p?.trail?.gap || 0) + 150;
    }
    if (tab === 'poses') {
      a.pose('hero', id);
      if (foe) a.pose(foe, id);
      return c.poses[id]?.dur || 300;
    }
    return 0;
  }, [sel, tab, opts.reverse]); // eslint-disable-line react-hooks/exhaustive-deps
  const [scrubT, setScrubT] = useState(null); // ms into the selection while scrubbing; null = live
  const [lenMs, setLenMs] = useState(600);
  const playNow = useCallback(() => {
    const a = api.current;
    if (!a) return 0;
    a.live();
    a.setSlow(opts.slow);
    a.clear();
    setScrubT(null);
    const ms = startSel();
    setLenMs(ms);
    return ms;
  }, [startSel, opts.slow]);
  /** Shows the selection frozen `T` ms in (replayed from the start on a virtual clock). */
  const scrubTo = useCallback(
    (T) => {
      const a = api.current;
      if (!a) return;
      a.setSlow(1);
      let len = lenMs;
      a.scrub(Math.max(0, T), () => {
        len = startSel();
      });
      setLenMs(len);
      setScrubT(Math.max(0, T));
      setOpts((o) => (o.loop ? { ...o, loop: false } : o));
    },
    [startSel, lenMs],
  );
  const step = (n) => scrubTo(Math.max(0, Math.round(((scrubT ?? 0) + n * FRAME) / FRAME) * FRAME));
  const [playhead, setPlayhead] = useState(null); // { start, ms }
  const play = useCallback(() => {
    const ms = playNow();
    setPlayhead({ start: performance.now(), ms: ms * opts.slow });
  }, [playNow, opts.slow]);
  // loop: replay after each run finishes
  useEffect(() => {
    if (!opts.loop) return undefined;
    let t;
    const go = () => {
      const ms = playNow();
      setPlayhead({ start: performance.now(), ms: ms * opts.slow });
      t = setTimeout(go, Math.max(500, ms * opts.slow + 500));
    };
    go();
    return () => clearTimeout(t);
  }, [opts.loop, playNow, opts.slow, apiTick]);
  // replay when the selection changes, so every click shows the thing
  useEffect(() => {
    if (!opts.loop) play();
  }, [sel, tab, apiTick]); // eslint-disable-line react-hooks/exhaustive-deps
  // while a frame is frozen, edits redraw that same frame
  useEffect(() => {
    if (scrubT !== null) scrubTo(scrubT);
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  // keyboard: Space play · Ctrl+Z undo · Ctrl+Y / Ctrl+Shift+Z redo
  useEffect(() => {
    const k = (e) => {
      const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === ' ' && !typing) {
        e.preventDefault();
        play();
      } else if ((e.key === 'ArrowRight' || e.key === '.') && !typing) {
        e.preventDefault();
        step(e.shiftKey ? 5 : 1);
      } else if ((e.key === 'ArrowLeft' || e.key === ',') && !typing) {
        e.preventDefault();
        step(e.shiftKey ? -5 : -1);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  // ---------------------------------------------------------------- library → sheets / effects
  /** Adds a pack animation to the config's sheets (pending until compiled); returns its key. */
  const sheetFor = (c, s) => {
    const have = Object.entries(c.sheets).find(([, v]) => v.path === s.path);
    if (have) return have[0];
    let key = s.variant.replace(/[^\w]/g, '_');
    while (c.sheets[key]) key += '_';
    c.sheets[key] = { path: s.path, w: s.w, h: s.h, frames: s.frames, cols: s.cols, rows: s.rows, sw: s.sw, sh: s.sh, pending: true };
    return key;
  };
  const newEffectName = (c, base) => {
    let n = base.replace(/[^\w]/g, '_').replace(/_(large|small)_/, '_');
    let i = 2;
    while (c.effects[n]) n = `${base}_${i++}`;
    return n;
  };

  // ---------------------------------------------------------------- compile / publish
  const [busy, setBusy] = useState(null);
  const compile = async () => {
    setBusy('compile');
    try {
      const r = await fetch('/__fx/compile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: draftRef.current }) });
      const j = await r.json();
      if (!r.ok) {
        say(`${j.error}${j.errors ? `: ${j.errors.slice(0, 4).join(' · ')}` : ''}`, true);
        return false;
      }
      setDraft(j.config);
      setDirty(false);
      say(`Compiled: the game now uses these effects. ${j.log.filter((l) => !l.startsWith('wrote')).slice(-1)[0] || ''}`);
      return true;
    } catch (e) {
      say(`Compile failed: ${e.message}. Is the dev server running?`, true);
      return false;
    } finally {
      setBusy(null);
    }
  };
  const revert = () => {
    if (!confirm('Throw away every change since the last Compile?')) return;
    fetch(`/src/fx/fx.json?t=${Date.now()}`)
      .then((r) => r.json())
      .then((j) => {
        hist.current.past.push(draftRef.current);
        setDraft(j);
        setDirty(false);
        say('Reverted to the compiled version.');
      });
  };

  const c = draft;
  const id = sel[tab];
  const select = (v) => {
    setSel((s) => ({ ...s, [tab]: v }));
    setLayerIdx(0);
    setKeyIdx(0);
    setScrubT(null);
    // a signature move is previewed on its own hero
    const sig = tab === 'cues' && sigOf(v);
    if (sig && SIGNATURES[sig] && opts.hero !== SIGNATURES[sig].hero) setOpts((o) => ({ ...o, hero: SIGNATURES[sig].hero }));
  };

  // ---------------------------------------------------------------- lists
  const items = useMemo(() => {
    if (tab === 'cues') return Object.entries(c.cues).map(([k, q]) => ({ id: k, label: q.label || k, group: q.group || 'Other' }));
    if (tab === 'effects') {
      const used = {};
      for (const q of Object.values(c.cues)) for (const L of q.layers) if (L.effect) used[L.effect] = (used[L.effect] || 0) + 1;
      return Object.keys(c.effects)
        .sort()
        .map((k) => ({ id: k, label: k, group: used[k] ? 'Used in cues' : 'Not used by any cue' }));
    }
    if (tab === 'projectiles') return Object.entries(c.projectiles).map(([k, p]) => ({ id: k, label: p.label || k, group: '' }));
    return Object.entries(c.poses)
      .map(([k, p]) => ({ id: k, label: k, group: p.group || (p.hold ? 'Held poses' : 'Actions') }))
      .sort((x, y) => x.group.localeCompare(y.group));
  }, [tab, c]);

  const dragTarget = useMemo(() => {
    if (tab !== 'cues') return null;
    const L = c.cues[id]?.layers[layerIdx];
    if (!L || (L.type || 'effect') !== 'effect') return null;
    return {
      onDelta: (dx, dy) => {
        const a = api.current;
        if (!a) return;
        const ctx = ctxFor(id);
        const att = L.attach || 'target';
        const unit = att === 'hero' ? 'hero' : att === 'source' ? ctx.src : att === 'world' ? null : ctx.tgt;
        edit((d) => {
          const LL = d.cues[id].layers[layerIdx];
          if (!unit) {
            LL.worldX = Math.round(((LL.worldX ?? 50) + (dx / a.stage().clientWidth) * 100) * 10) / 10;
            return;
          }
          const g = a.geo(unit);
          if (!g) return;
          LL.x = Math.round(((LL.x || 0) + (g.facing * dx) / g.w) * 100) / 100;
          LL.y = Math.round(((LL.y || 0) - dy / g.h) * 100) / 100;
        });
        setTimeout(play, 30);
      },
    };
  }, [tab, id, layerIdx, c]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fs-app">
      <header className="fs-top">
        <b className="fs-title">Moyu FX Studio</b>
        <nav className="fs-tabs">
          {[
            ['cues', 'Cues'],
            ['effects', 'Effects'],
            ['projectiles', 'Projectiles'],
            ['poses', 'Animations'],
          ].map(([k, l]) => (
            <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </nav>
        <span className="fs-spacer" />
        <button type="button" className="fs-btn" onClick={undo} disabled={!hist.current.past.length} title="Undo (Ctrl+Z)">
          ↶
        </button>
        <button type="button" className="fs-btn" onClick={redo} disabled={!hist.current.future.length} title="Redo (Ctrl+Y)">
          ↷
        </button>
        <span className={`fs-state ${dirty ? 'dirty' : ''}`}>{dirty ? 'Changes not compiled' : 'Compiled'}</span>
        {dirty && (
          <button type="button" className="fs-btn" onClick={revert}>
            Revert
          </button>
        )}
        <button type="button" className="fs-btn" onClick={() => setModal('fight')} title="Play a real fight with these effects">
          ⚔ Test fight
        </button>
        <button type="button" className="fs-btn primary" onClick={compile} disabled={busy === 'compile'} title="Write the changes into the game (src/fx/fx.json) and pack the sprite sheets">
          {busy === 'compile' ? 'Compiling…' : '⚙ Compile'}
        </button>
        <button type="button" className="fs-btn publish" onClick={() => setModal('publish')} title="Test, build, commit and push to GitHub">
          ⬆ Publish
        </button>
        <button type="button" className="fs-btn" onClick={() => setModal('help')} title="How it works">
          ?
        </button>
      </header>

      <div className="fs-body">
        <aside className="fs-left">
          <ItemList
            items={items}
            selected={id}
            onSelect={select}
            search={search}
            onSearch={setSearch}
            footer={<ListActions tab={tab} c={c} id={id} edit={edit} select={select} setLibrary={setLibrary} sheetFor={sheetFor} newEffectName={newEffectName} />}
          />
        </aside>

        <main className="fs-center">
          <div className="fs-preview-bar">
            <Pick label="Hero" value={opts.hero} options={Object.keys(HEROES).map((h) => [h, HEROES[h].en])} onChange={(v) => setOpts({ ...opts, hero: v })} />
            <Pick
              label="Enemy"
              value={opts.enemy}
              options={Object.keys(ENEMIES).map((e) => [e, `${ENEMIES[e].name}${ENEMIES[e].flying ? ' (flying)' : ''}`])}
              onChange={(v) => setOpts({ ...opts, enemy: v })}
            />
            <Pick label="Map" value={opts.biome} options={Object.keys(BIOMES).map((b) => [b, BIOMES[b].en])} onChange={(v) => setOpts({ ...opts, biome: v })} />
            <Pick label="Fight items" value={opts.items || 'none'} options={ITEM_SETS} hint="Items the hero holds in Test fight" onChange={(v) => setOpts({ ...opts, items: v })} />
          </div>
          <Preview opts={opts} drag={dragTarget} onApi={(a) => ((api.current = a), setApiTick((x) => x + 1))} />
          <div className="fs-preview-bar">
            <button type="button" className="fs-btn primary" onClick={play} title="Play (Space)">
              ▶ Play
            </button>
            <Toggle label="Loop" value={opts.loop} onChange={(v) => setOpts({ ...opts, loop: v })} />
            <Toggle label="Enemy → hero" value={opts.reverse} onChange={(v) => setOpts({ ...opts, reverse: v })} hint="Swap who does it and who it happens to" />
            <Pick label="Speed" value={String(opts.slow)} options={[['1', '1×'], ['2', '½×'], ['4', '¼×'], ['10', '⅒×']]} onChange={(v) => setOpts({ ...opts, slow: Number(v) })} />
            <Num label="Distance" value={opts.dist} min={8} max={80} step={1} onChange={(v) => setOpts({ ...opts, dist: v })} />
          </div>
          <Scrubber t={scrubT} len={lenMs} onScrub={scrubTo} onStep={step} onLive={play} />
          {tab === 'cues' && c.cues[id] && <CueTimeline c={c} id={id} edit={edit} idx={layerIdx} setIdx={setLayerIdx} playhead={scrubT === null ? playhead : null} scrubT={scrubT} onScrub={scrubTo} slow={opts.slow} />}
          {tab === 'poses' && c.poses[id] && <PoseTimeline p={c.poses[id]} id={id} edit={edit} idx={keyIdx} setIdx={setKeyIdx} playhead={scrubT === null ? playhead : null} scrubT={scrubT} onScrub={scrubTo} slow={opts.slow} />}
          {dragTarget && <p className="fs-muted small center">Tip: drag on the stage to move the selected effect.</p>}
        </main>

        <aside className="fs-right">
          {tab === 'cues' && c.cues[id] && <CueInspector c={c} id={id} idx={layerIdx} setIdx={setLayerIdx} edit={edit} setLibrary={setLibrary} sheetFor={sheetFor} newEffectName={newEffectName} />}
          {tab === 'effects' && c.effects[id] && <EffectInspector c={c} id={id} edit={edit} setLibrary={setLibrary} sheetFor={sheetFor} goCue={(q) => (setTab('cues'), setSel((s) => ({ ...s, cues: q })))} />}
          {tab === 'projectiles' && c.projectiles[id] && <ProjectileInspector c={c} id={id} edit={edit} />}
          {tab === 'poses' && c.poses[id] && <PoseInspector c={c} id={id} edit={edit} idx={keyIdx} setIdx={setKeyIdx} />}
        </aside>
      </div>

      {library && <Library catalog={catalog} sheets={c.sheets} title={library.title} onClose={() => setLibrary(null)} onPick={(s) => (library.onPick(s), setLibrary(null))} />}
      {modal === 'publish' && <PublishDialog dirty={dirty} compile={compile} onClose={() => setModal(null)} />}
      {modal === 'fight' && <TestFight opts={opts} onClose={() => setModal(null)} />}
      {modal === 'help' && <Help onClose={() => setModal(null)} />}
      {toast && (
        <div key={toast.key} className={`fs-toast ${toast.bad ? 'bad' : ''}`} role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------ left column actions
function ListActions({ tab, c, id, edit, select, setLibrary, sheetFor, newEffectName }) {
  const add = (kind) => {
    if (tab === 'cues') {
      const name = prompt('Name of the new cue (it plays when the game calls it by this name):', 'custom.my_cue');
      if (!name || c.cues[name]) return;
      edit((d) => (d.cues[name] = { label: name, group: 'Custom', layers: [] }));
      select(name);
    } else if (tab === 'effects' && kind === 'new') {
      setLibrary({
        title: 'New effect from the pack',
        onPick: (s) => {
          let name;
          edit((d) => {
            name = newEffectName(d, s.variant);
            d.effects[name] = { sheet: sheetFor(d, s), scale: 0.6, anchor: 'mid', dir: null, layer: 'unit' };
          });
          setTimeout(() => select(name), 0);
        },
      });
    } else if (tab === 'poses') {
      const name = prompt('Name of the new animation (a unit state, e.g. "taunt"):', 'taunt');
      if (!name || c.poses[name]) return;
      const group = prompt('Group (e.g. "Signature · Lei"; empty for Actions):', '') || undefined;
      edit((d) => (d.poses[name] = { dur: 400, ease: 'ease-out', origin: 50, keys: [{ at: 0.5, y: -8 }], ...(group ? { group } : {}) }));
      select(name);
    } else if (tab === 'projectiles') {
      const name = prompt('Name of the new projectile type:', 'custom');
      if (!name || c.projectiles[name]) return;
      edit((d) => (d.projectiles[name] = { ...clone(d.projectiles.orb), label: name }));
      select(name);
    }
  };
  const dup = () => {
    const coll = { cues: 'cues', effects: 'effects', projectiles: 'projectiles', poses: 'poses' }[tab];
    let name = `${id}_copy`;
    while (c[coll][name]) name += '_';
    edit((d) => (d[coll][name] = clone(d[coll][id])));
    select(name);
  };
  const del = () => {
    const coll = tab;
    if (tab === 'effects') {
      const users = Object.entries(c.cues).filter(([, q]) => q.layers.some((L) => L.effect === id)).map(([k]) => k);
      const proj = Object.entries(c.projectiles).filter(([, p]) => p.sprite === id).map(([k]) => k);
      if (users.length || proj.length) return alert(`Still used by: ${[...users, ...proj].join(', ')}`);
    }
    if (tab === 'cues' && !(c.cues[id].group === 'Custom')) {
      if (!confirm('The game plays this cue on an event. Delete it anyway (the event then shows nothing)?')) return;
    }
    if (tab === 'poses' && Object.values(c.cues).some((q) => q.layers.some((L) => L.state === id))) return alert('A cue still uses this animation.');
    if (tab === 'projectiles' && ['orb', 'thrown', 'fruit.shot', 'fruit.throw'].includes(id)) return alert('The game needs this projectile type.');
    edit((d) => delete d[coll][id]);
  };
  return (
    <div className="fs-list-actions">
      <button type="button" className="fs-btn" onClick={() => add('new')}>
        + New
      </button>
      <button type="button" className="fs-btn" onClick={dup} disabled={!id}>
        Duplicate
      </button>
      <button type="button" className="fs-btn danger" onClick={del} disabled={!id}>
        Delete
      </button>
    </div>
  );
}

// ------------------------------------------------------------------------------ cue timeline
function useNow(active) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    let r;
    const f = () => {
      set((x) => x + 1);
      r = requestAnimationFrame(f);
    };
    r = requestAnimationFrame(f);
    return () => cancelAnimationFrame(r);
  }, [active]);
  return performance.now();
}

function CueTimeline({ c, id, edit, idx, setIdx, playhead, scrubT, onScrub, slow }) {
  const q = c.cues[id];
  const total = Math.max(800, cueMs(q, c) * 1.15);
  const ref = useRef(null);
  const drag = useRef(null);
  const ruler = useRef(null);
  const msAt = (x) => {
    const r = ruler.current.getBoundingClientRect();
    return Math.max(0, Math.min(total, ((x - r.left) / r.width) * total));
  };
  const rulerDrag = useRef(null); // 'scrub' | 'impact'
  const now = useNow(Boolean(playhead));
  const ph = playhead && now - playhead.start < playhead.ms + 50 ? (now - playhead.start) / slow : null;
  const addLayer = (L) => {
    edit((d) => d.cues[id].layers.push(L));
    setIdx(q.layers.length);
  };
  const pct = (ms) => `${(ms / total) * 100}%`;
  return (
    <div className="fs-timeline">
      <div className="fs-tl-head">
        <b>{q.label}</b>
        <span className="fs-muted small">{Math.round(cueMs(q, c))} ms · drag a bar to change when it starts</span>
        <span className="fs-spacer" />
        <button type="button" className="fs-btn" onClick={() => addLayer({ type: 'effect', effect: Object.keys(c.effects)[0], attach: 'target' })}>
          + Effect
        </button>
        <button type="button" className="fs-btn" onClick={() => addLayer({ type: 'pose', state: 'cast', attach: 'target' })}>
          + Animation
        </button>
        <button type="button" className="fs-btn" onClick={() => addLayer({ type: 'shake', dur: 300 })}>
          + Shake
        </button>
        <button type="button" className="fs-btn" onClick={() => addLayer({ type: 'punch', dur: 180 })}>
          + Punch
        </button>
        <button type="button" className="fs-btn" onClick={() => addLayer({ type: 'sound', sound: 'hit' })}>
          + Sound
        </button>
        <button type="button" className="fs-btn" onClick={() => addLayer({ type: 'classic', fx: 'spell', kind: 'sparkle', attach: 'target', dur: 600 })}>
          + Classic
        </button>
      </div>
      <div className="fs-tl-row fs-tl-ruler-row">
        <span className="fs-tl-name fs-muted small">{scrubT !== null ? `frame ${Math.round(scrubT / FRAME)} · ${Math.round(scrubT)} ms` : 'drag here to scrub'}</span>
        <span
          className="fs-tl-ruler"
          ref={ruler}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            rulerDrag.current = 'scrub';
            onScrub(Math.round(msAt(e.clientX) / FRAME) * FRAME);
          }}
          onPointerMove={(e) => {
            if (!rulerDrag.current) return;
            const ms = Math.round(msAt(e.clientX) / FRAME) * FRAME;
            if (rulerDrag.current === 'impact') edit((d) => (d.cues[id].impact = Math.round(ms)));
            else onScrub(ms);
          }}
          onPointerUp={() => (rulerDrag.current = null)}
        >
          {Array.from({ length: Math.floor(total / 100) + 1 }, (_, i) => (
            <i key={i} className={i % 5 ? '' : 'major'} style={{ left: pct(i * 100) }}>
              {i % 5 ? '' : i * 100}
            </i>
          ))}
          {q.impact !== undefined && (
            <b
              className="fs-impact-handle"
              style={{ left: pct(q.impact) }}
              title="Impact: the move takes effect here. Drag to move it."
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.parentElement.setPointerCapture?.(e.pointerId);
                rulerDrag.current = 'impact';
              }}
            >
              💥 {q.impact} ms
            </b>
          )}
        </span>
        <span />
      </div>
      <div
        className="fs-tl-rows"
        ref={ref}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const w = ref.current.querySelector('.fs-tl-track').clientWidth;
          const ms = Math.max(0, Math.round((d.delay + ((e.clientX - d.x) / w) * total) / 10) * 10);
          if (ms !== d.last) {
            d.last = ms;
            edit((dd) => (dd.cues[id].layers[d.i].delay = ms));
          }
        }}
        onPointerUp={() => (drag.current = null)}
      >
        {q.layers.map((L, i) => {
          const len = layerMs(L, c);
          return (
            <div key={i} className={`fs-tl-row ${i === idx ? 'on' : ''} ${L.off ? 'off' : ''}`} onClick={() => setIdx(i)}>
              <span className="fs-tl-name" title={layerName(L)}>
                <i>{LAYER_TYPES[L.type || 'effect']}</i> {layerName(L)}
              </span>
              <span className="fs-tl-track">
                <span
                  className={`fs-tl-bar t-${L.type || 'effect'}`}
                  style={{ left: pct(L.delay || 0), width: pct(Math.max(30, len)) }}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                    drag.current = { i, x: e.clientX, delay: L.delay || 0, last: L.delay || 0 };
                    setIdx(i);
                  }}
                >
                  {L.delay ? `${L.delay}` : ''}
                </span>
              </span>
              <span className="fs-tl-tools">
                <button type="button" title={L.off ? 'Turn on' : 'Turn off'} onClick={(e) => (e.stopPropagation(), edit((d) => (d.cues[id].layers[i].off = !L.off || undefined)))}>
                  {L.off ? '◌' : '●'}
                </button>
                <button type="button" title="Duplicate" onClick={(e) => (e.stopPropagation(), edit((d) => d.cues[id].layers.splice(i + 1, 0, clone(L))))}>
                  ⧉
                </button>
                <button type="button" title="Delete" onClick={(e) => (e.stopPropagation(), edit((d) => d.cues[id].layers.splice(i, 1)), setIdx(Math.max(0, i - 1)))}>
                  ✕
                </button>
              </span>
            </div>
          );
        })}
        {!q.layers.length && <p className="fs-muted small">Empty: this event shows nothing. Add a layer above.</p>}
        {q.impact !== undefined && <span className="fs-impact-line" style={{ left: `calc(var(--tl-name) + (100% - var(--tl-name) - var(--tl-tools)) * ${Math.min(1, q.impact / total)})` }} />}
        {ph !== null && <span className="fs-playhead" style={{ left: `calc(var(--tl-name) + (100% - var(--tl-name) - var(--tl-tools)) * ${Math.min(1, ph / total)})` }} />}
        {scrubT !== null && <span className="fs-playhead frozen" style={{ left: `calc(var(--tl-name) + (100% - var(--tl-name) - var(--tl-tools)) * ${Math.min(1, scrubT / total)})` }} />}
      </div>
    </div>
  );
}

/** Frame-by-frame control: a slider over the selection's length, step buttons, back to live. */
function Scrubber({ t, len, onScrub, onStep, onLive }) {
  const frames = Math.max(1, Math.ceil(len / FRAME));
  return (
    <div className="fs-scrubber">
      <button type="button" className="fs-btn" title="First frame" onClick={() => onScrub(0)}>
        ⏮
      </button>
      <button type="button" className="fs-btn" title="Previous frame (← or ,)" onClick={() => onStep(-1)}>
        ◀
      </button>
      <input type="range" min={0} max={frames} step={1} value={t === null ? 0 : Math.round(t / FRAME)} onChange={(e) => onScrub(Number(e.target.value) * FRAME)} aria-label="Scrub" />
      <button type="button" className="fs-btn" title="Next frame (→ or .)" onClick={() => onStep(1)}>
        ▶
      </button>
      <span className="fs-frame">{t === null ? `${frames} frames · ${Math.round(len)} ms` : `frame ${Math.round(t / FRAME)} / ${frames} · ${Math.round(t)} ms`}</span>
      {t !== null && (
        <button type="button" className="fs-btn primary" onClick={onLive}>
          ● Live
        </button>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------ cue layer inspector
function EffectPicker({ c, value, onChange, onBrowse }) {
  const def = c.effects[value];
  const sh = def && c.sheets[def.sheet];
  return (
    <div className="fs-effect-pick">
      {sh && (
        <span className="fs-thumb small" style={{ width: 54, height: (54 * sh.h) / sh.w }}>
          <SheetFrames sheetKey={def.sheet} sh={sh} hue={def.hue || 0} dur={(sh.frames / (def.fps || VFX_FPS)) * 1000} />
        </span>
      )}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {Object.keys(c.effects)
          .sort()
          .map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
      </select>
      <button type="button" className="fs-btn" onClick={onBrowse} title="Pick any animation from the pack">
        Browse pack…
      </button>
    </div>
  );
}

function CueInspector({ c, id, idx, edit, setLibrary, sheetFor, newEffectName }) {
  const q = c.cues[id];
  const L = q.layers[idx];
  const set = (k, v) =>
    edit((d) => {
      const LL = d.cues[id].layers[idx];
      if (v === undefined || v === '') delete LL[k];
      else LL[k] = v;
    });
  return (
    <div className="fs-inspector">
      <Section title="Cue">
        <Text label="Label" value={q.label} onChange={(v) => edit((d) => (d.cues[id].label = v))} />
        <Text label="Group" value={q.group} onChange={(v) => edit((d) => (d.cues[id].group = v))} />
        <p className="fs-muted small">
          The game plays <code>{id}</code> on its event. Every layer below starts after its own delay.
        </p>
        {q.impact !== undefined && (
          <>
            <Num label="Impact at" value={q.impact} min={0} max={2000} step={10} unit="ms" hint="When the move takes effect (damage, shields, knockback…)" onChange={(v) => edit((d) => (d.cues[id].impact = v))} />
            <p className="fs-muted small">
              The signature move’s effect (damage, shields, knockback…) happens at the 💥 impact. Until then the hero holds still and only this cue’s animations play on them. 0 = at once.
            </p>
          </>
        )}
      </Section>
      {!L && <p className="fs-muted">Select or add a layer.</p>}
      {L && (L.type || 'effect') === 'effect' && (
        <Section title="Effect layer">
          <EffectPicker
            c={c}
            value={L.effect}
            onChange={(v) => set('effect', v)}
            onBrowse={() =>
              setLibrary({
                title: 'Swap this layer’s effect',
                onPick: (s) =>
                  edit((d) => {
                    const old = d.effects[d.cues[id].layers[idx].effect] || { scale: 0.6, anchor: 'mid', layer: 'unit' };
                    const name = newEffectName(d, s.variant);
                    d.effects[name] = { ...clone(old), sheet: sheetFor(d, s), dir: null };
                    delete d.effects[name].hue;
                    d.cues[id].layers[idx].effect = name;
                  }),
              })
            }
          />
          <Pick label="Attached to" value={L.attach || 'target'} options={ATTACH} onChange={(v) => set('attach', v)} />
          {L.attach === 'world' && <Num label="World x" value={L.worldX ?? 50} min={0} max={100} step={0.5} unit="%" onChange={(v) => set('worldX', v)} />}
          <Pick label="Anchor" value={L.anchor || ''} options={ANCHORS} onChange={(v) => set('anchor', v)} />
          <Num label="Offset x" value={L.x ?? 0} min={-2} max={2} step={0.01} hint="Forward (+) or back (−), in body widths" onChange={(v) => set('x', v || undefined)} />
          <Num label="Offset y" value={L.y ?? 0} min={-2} max={2} step={0.01} hint="Up (+) or down (−), in body heights" onChange={(v) => set('y', v || undefined)} />
          <Num label="Scale" value={L.scale ?? 1} min={0.1} max={4} step={0.05} unit="×" onChange={(v) => set('scale', v === 1 ? undefined : v)} />
          <Num label="Speed" value={L.speed ?? 1} min={0.1} max={4} step={0.05} unit="×" onChange={(v) => set('speed', v === 1 ? undefined : v)} />
          <Num label="Delay" value={L.delay ?? 0} min={0} max={3000} step={10} unit="ms" onChange={(v) => set('delay', v || undefined)} />
          <Num label="Loops" value={L.loops} min={1} max={12} step={1} clearable hint="Empty: the effect's own setting" onChange={(v) => set('loops', v)} />
          <Num label="Rotate" value={L.rotate ?? 0} min={-180} max={180} step={1} unit="°" onChange={(v) => set('rotate', v || undefined)} />
          <Num label="Opacity" value={L.opacity ?? 1} min={0} max={1} step={0.05} onChange={(v) => set('opacity', v === 1 ? undefined : v)} />
          <Num label="Hue shift" value={L.hue ?? 0} min={-180} max={180} step={1} unit="°" onChange={(v) => set('hue', v || undefined)} />
          <Pick label="Mirror" value={L.mirror || 'auto'} options={MIRROR} onChange={(v) => set('mirror', v === 'auto' ? undefined : v)} />
          <Toggle label="Follow the unit" value={L.follow} hint="Moves with the unit it is attached to (auras, flames)" onChange={(v) => set('follow', v || undefined)} />
        </Section>
      )}
      {L?.type === 'pose' && (
        <Section title="Animation layer">
          <Pick label="Animation" value={L.state} options={Object.keys(c.poses)} onChange={(v) => set('state', v)} />
          <Pick label="Who" value={L.attach || 'target'} options={ATTACH.slice(0, 3)} onChange={(v) => set('attach', v)} />
          <Num label="Delay" value={L.delay ?? 0} min={0} max={3000} step={10} unit="ms" onChange={(v) => set('delay', v || undefined)} />
          <Num label="Hold for" value={L.dur} min={50} max={3000} step={10} unit="ms" clearable hint="How long the unit stays in this animation (empty: the animation's length)" onChange={(v) => set('dur', v)} />
        </Section>
      )}
      {L?.type === 'classic' && (
        <Section title="Built-in effect">
          <Pick label="Kind" value={L.fx} options={CLASSIC} onChange={(v) => set('fx', v)} />
          {L.fx === 'spell' && <Pick label="Look" value={L.kind} options={SPELL_KINDS} onChange={(v) => set('kind', v)} />}
          <Pick label="At" value={L.attach || 'target'} options={ATTACH} onChange={(v) => set('attach', v)} />
          <Pick label="Position" value={L.at || 'unit'} options={[['unit', 'on the unit'], ['center', 'stage centre']]} onChange={(v) => set('at', v === 'unit' ? undefined : v)} />
          <Num label="Shift x" value={L.dx ?? 0} min={-50} max={50} step={0.5} unit="%" onChange={(v) => set('dx', v || undefined)} />
          <Num label="Delay" value={L.delay ?? 0} min={0} max={3000} step={10} unit="ms" onChange={(v) => set('delay', v || undefined)} />
          <Num label="Lasts" value={L.dur ?? 600} min={50} max={3000} step={10} unit="ms" onChange={(v) => set('dur', v)} />
          <Text label="Colour" value={L.color} placeholder="#ff7a3d" onChange={(v) => set('color', v || undefined)} />
        </Section>
      )}
      {(L?.type === 'shake' || L?.type === 'punch') && (
        <Section title={L.type === 'shake' ? 'Screen shake' : 'Camera punch'}>
          <Num label="Delay" value={L.delay ?? 0} min={0} max={3000} step={10} unit="ms" onChange={(v) => set('delay', v || undefined)} />
          <Num label="Lasts" value={L.dur} min={40} max={1500} step={10} unit="ms" onChange={(v) => set('dur', v)} />
          <p className="fs-muted small">Skipped for players with Reduced motion on.</p>
        </Section>
      )}
      {L?.type === 'sound' && (
        <Section title="Sound">
          <Pick label="Sound" value={L.sound} options={SOUNDS} onChange={(v) => set('sound', v)} />
          <Num label="Delay" value={L.delay ?? 0} min={0} max={3000} step={10} unit="ms" onChange={(v) => set('delay', v || undefined)} />
        </Section>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------ effect inspector
function EffectInspector({ c, id, edit, setLibrary, sheetFor, goCue }) {
  const e = c.effects[id];
  const sh = c.sheets[e.sheet];
  const set = (k, v) =>
    edit((d) => {
      if (v === undefined || v === '' || v === null) delete d.effects[id][k];
      else d.effects[id][k] = v;
    });
  const users = Object.entries(c.cues).filter(([, q]) => q.layers.some((L) => L.effect === id));
  return (
    <div className="fs-inspector">
      <Section title={`Effect: ${id}`}>
        {sh && (
          <div className="fs-sheet-card">
            <span className="fs-thumb" style={{ width: 120, height: (120 * sh.h) / sh.w }}>
              <SheetFrames sheetKey={e.sheet} sh={sh} hue={e.hue || 0} dur={(sh.frames / (e.fps || VFX_FPS)) * 1000} />
            </span>
            <small>
              {sh.path}
              <br />
              {sh.frames} frames · {sh.w}×{sh.h}
              {sh.pending ? ' · not packed yet (Compile)' : ''}
            </small>
          </div>
        )}
        <button
          type="button"
          className="fs-btn wide"
          onClick={() => setLibrary({ title: `Swap the animation of ${id} (everywhere it is used)`, onPick: (s) => edit((d) => (d.effects[id].sheet = sheetFor(d, s))) })}
        >
          Swap animation…
        </button>
        <Num label="Scale" value={e.scale} min={0.05} max={3} step={0.01} unit="×" onChange={(v) => set('scale', v)} />
        <Pick label="Anchor" value={e.anchor} options={ANCHORS.slice(1)} onChange={(v) => set('anchor', v)} />
        <Pick label="Art points" value={e.dir || ''} options={[['', 'nowhere (symmetric)'], ['right', 'right'], ['left', 'left']]} onChange={(v) => set('dir', v || null)} />
        <Pick label="Layer" value={e.layer || 'unit'} options={LAYERS} onChange={(v) => set('layer', v)} />
        <Num label="Frame rate" value={e.fps ?? VFX_FPS} min={4} max={40} step={1} unit="fps" onChange={(v) => set('fps', v === VFX_FPS ? undefined : v)} />
        <Num label="Loops" value={e.loops ?? 1} min={1} max={12} step={1} onChange={(v) => set('loops', v === 1 ? undefined : v)} />
        <Num label="Hue" value={e.hue ?? 0} min={-180} max={180} step={1} unit="°" hint="Recolour (baked into the file on Compile)" onChange={(v) => set('hue', v || undefined)} />
        <Pick label="Blend" value={e.blend || ''} options={BLENDS} onChange={(v) => set('blend', v || undefined)} />
        <Num label="Opacity" value={e.opacity ?? 1} min={0} max={1} step={0.05} onChange={(v) => set('opacity', v === 1 ? undefined : v)} />
      </Section>
      <Section title={`Used in ${users.length} cue${users.length === 1 ? '' : 's'}`}>
        {users.map(([k, q]) => (
          <button key={k} type="button" className="fs-link" onClick={() => goCue(k)}>
            {q.label}
          </button>
        ))}
        {!users.length && <p className="fs-muted small">Add it to a cue on the Cues tab.</p>}
      </Section>
    </div>
  );
}

// ------------------------------------------------------------------------------ projectile inspector
function ProjectileInspector({ c, id, edit }) {
  const p = c.projectiles[id];
  const set = (k, v) =>
    edit((d) => {
      if (v === undefined) delete d.projectiles[id][k];
      else d.projectiles[id][k] = v;
    });
  return (
    <div className="fs-inspector">
      <Section title={p.label || id}>
        <Text label="Label" value={p.label} onChange={(v) => set('label', v)} />
        <Pick label="Look" value={p.look} options={LOOKS} hint="The built-in projectile drawing (inherit: the shooter's own)" onChange={(v) => set('look', v)} />
        <Pick label="Sprite" value={p.sprite || ''} options={[['', '(none: use the look)'], ...Object.keys(c.effects).sort()]} hint="Fly a looping effect instead" onChange={(v) => set('sprite', v || null)} />
        <Num label="Size" value={p.size ?? 1} min={0.2} max={4} step={0.05} unit="×" onChange={(v) => set('size', v)} />
      </Section>
      <Section title="Flight">
        <Num label="Speed" value={p.msPerPct} min={1} max={20} step={0.1} unit="ms/%" hint="Milliseconds per percent of stage crossed (lower = faster)" onChange={(v) => set('msPerPct', v)} />
        <Num label="Shortest" value={p.minMs} min={40} max={2000} step={10} unit="ms" onChange={(v) => set('minMs', v)} />
        <Num label="Longest" value={p.maxMs} min={40} max={3000} step={10} unit="ms" onChange={(v) => set('maxMs', Math.max(v, p.minMs))} />
        <Num label="Release delay" value={p.delay ?? 0} min={0} max={1000} step={10} unit="ms" hint="Wait after the throw animation starts (thrown fruit)" onChange={(v) => set('delay', v)} />
        <Toggle label="Arc" value={p.arc} onChange={(v) => set('arc', v)} />
        {p.arc && <Num label="Arc height" value={p.apex ?? 1} min={0} max={4} step={0.05} unit="×" onChange={(v) => set('apex', v)} />}
        {p.arc && <Num label="Spin" value={p.spin ?? 540} min={-1440} max={1440} step={10} unit="°" onChange={(v) => set('spin', v)} />}
        {!p.arc && <Toggle label="Point along the path" value={p.tilt} onChange={(v) => set('tilt', v)} />}
      </Section>
      <Section title="Trail">
        <Pick label="Trail" value={p.trail?.style || 'none'} options={TRAILS} hint="Copies that fly the same path behind it, so they follow any arc" onChange={(v) => edit((d) => (d.projectiles[id].trail = { count: 6, gap: 16, size: 1.2, opacity: 0.55, color: '#ffffff', ...d.projectiles[id].trail, style: v }))} />
        {p.trail && p.trail.style !== 'none' && (
          <>
            <Num label="Length" value={p.trail.count} min={1} max={24} step={1} hint="How many copies" onChange={(v) => edit((d) => (d.projectiles[id].trail.count = v))} />
            <Num label="Spacing" value={p.trail.gap} min={4} max={80} step={1} unit="ms" onChange={(v) => edit((d) => (d.projectiles[id].trail.gap = v))} />
            <Num label="Size" value={p.trail.size ?? 1} min={0.2} max={4} step={0.05} unit="×" onChange={(v) => edit((d) => (d.projectiles[id].trail.size = v))} />
            <Num label="Opacity" value={p.trail.opacity ?? 0.6} min={0.05} max={1} step={0.05} onChange={(v) => edit((d) => (d.projectiles[id].trail.opacity = v))} />
            {p.trail.style === 'glow' && (
              <label className="fs-row">
                <span className="fs-label">Colour</span>
                <input type="color" value={p.trail.color || '#ffffff'} onChange={(e) => edit((d) => (d.projectiles[id].trail.color = e.target.value))} />
              </label>
            )}
            <Toggle label="Glow (screen blend)" value={p.trail.blend} onChange={(v) => edit((d) => (d.projectiles[id].trail.blend = v || undefined))} />
          </>
        )}
        <Toggle label="Built-in tail" value={p.tail !== false} hint="The short tail drawn as part of the projectile art" onChange={(v) => set('tail', v ? undefined : false)} />
      </Section>
      <Section title="Launch">
        <Num label="Launch x" value={p.launchX ?? 0.3} min={-1} max={1.5} step={0.01} hint="Ahead of the body, in body widths" onChange={(v) => set('launchX', v)} />
        <Num label="Launch y" value={p.launchY ?? 0} min={-0.6} max={0.6} step={0.01} hint="Above the body's middle, in body heights" onChange={(v) => set('launchY', v)} />
        <Pick label="Launch cue" value={p.launch || ''} options={[['', '(none)'], ...Object.keys(c.cues).sort()]} onChange={(v) => set('launch', v || null)} />
        {id === 'thrown' && (
          <Text label="Throwers" value={(p.enemies || []).join(', ')} hint="Enemy ids whose shots are thrown" onChange={(v) => set('enemies', v.split(',').map((x) => x.trim()).filter(Boolean))} />
        )}
      </Section>
    </div>
  );
}

// ------------------------------------------------------------------------------ poses (animations)
function PoseTimeline({ p, id, edit, idx, setIdx, playhead, scrubT, onScrub, slow }) {
  const ref = useRef(null);
  const drag = useRef(null);
  const now = useNow(Boolean(playhead));
  const ph = playhead && now - playhead.start < playhead.ms + 50 ? Math.min(1, (now - playhead.start) / slow / p.dur) : null;
  return (
    <div className="fs-timeline">
      <div className="fs-tl-head">
        <b>{id}</b>
        <span className="fs-muted small">{p.dur} ms · drag a keyframe; click the track to add one</span>
        <span className="fs-spacer" />
      </div>
      <div
        className="fs-pose-track"
        ref={ref}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const r = ref.current.getBoundingClientRect();
          const at = Math.max(0, Math.min(1, Math.round(((e.clientX - r.left) / r.width) * 100) / 100));
          if (at !== d.last) {
            d.last = at;
            edit((dd) => (dd.poses[id].keys[d.i].at = at));
          }
        }}
        onPointerUp={() => (drag.current = null)}
        onDoubleClick={(e) => {
          const r = ref.current.getBoundingClientRect();
          const at = Math.round(((e.clientX - r.left) / r.width) * 100) / 100;
          edit((d) => d.poses[id].keys.push({ at }));
          setIdx(p.keys.length);
        }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <span key={t} className="fs-tick" style={{ left: `${t * 100}%` }}>
            {Math.round(t * p.dur)}
          </span>
        ))}
        {p.keys.map((k, i) => (
          <button
            key={i}
            type="button"
            className={`fs-key ${i === idx ? 'on' : ''}`}
            style={{ left: `${k.at * 100}%` }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.setPointerCapture?.(e.pointerId);
              drag.current = { i, last: k.at };
              setIdx(i);
            }}
            title={`${Math.round(k.at * 100)}%`}
          />
        ))}
        {ph !== null && <span className="fs-playhead" style={{ left: `${ph * 100}%` }} />}
        {scrubT !== null && <span className="fs-playhead frozen" style={{ left: `${Math.min(1, scrubT / p.dur) * 100}%` }} />}
      </div>
      <input
        className="fs-pose-scrub"
        type="range"
        min={0}
        max={p.dur}
        step={FRAME}
        value={scrubT ?? 0}
        onChange={(e) => onScrub(Number(e.target.value))}
        aria-label="Scrub the animation"
      />
      <p className="fs-muted small">Double-click the track to add a keyframe. Values are for the hero facing right; enemies are mirrored.</p>
    </div>
  );
}

function PoseInspector({ c, id, edit, idx, setIdx }) {
  const p = c.poses[id];
  const k = p.keys[idx];
  const setP = (key, v) => edit((d) => (v === undefined ? delete d.poses[id][key] : (d.poses[id][key] = v)));
  const setK = (key, v) =>
    edit((d) => {
      const kk = d.poses[id].keys[idx];
      if (v === undefined) delete kk[key];
      else kk[key] = v;
    });
  return (
    <div className="fs-inspector">
      <Section title={`Animation: ${id}`}>
        <Num label="Length" value={p.dur} min={60} max={3000} step={10} unit="ms" onChange={(v) => setP('dur', v)} />
        <Pick label="Easing" value={EASES.includes(p.ease) ? p.ease : p.ease} options={[...new Set([...EASES, p.ease])]} onChange={(v) => setP('ease', v)} />
        <Num label="Pivot x" value={p.origin ?? 50} min={0} max={100} step={1} unit="%" hint="Where on the feet it rotates and squashes from" onChange={(v) => setP('origin', v)} />
        <Toggle label="Hold last frame" value={p.hold} onChange={(v) => setP('hold', v || undefined)} />
        <Text label="Group" value={p.group} placeholder="e.g. Signature · Lei" onChange={(v) => setP('group', v || undefined)} />
      </Section>
      {k && (
        <Section
          title={`Keyframe at ${Math.round(k.at * 100)}%`}
          right={
            <button type="button" className="fs-btn danger" onClick={() => (edit((d) => d.poses[id].keys.splice(idx, 1)), setIdx(Math.max(0, idx - 1)))}>
              Delete
            </button>
          }
        >
          <Num label="Time" value={k.at} min={0} max={1} step={0.01} onChange={(v) => setK('at', v)} />
          <Num label="Move x" value={k.x} min={-60} max={60} step={1} unit="px" clearable onChange={(v) => setK('x', v)} />
          <Num label="Move y" value={k.y} min={-60} max={60} step={1} unit="px" clearable hint="Negative = up" onChange={(v) => setK('y', v)} />
          <Num label="Rotate" value={k.rot} min={-90} max={90} step={1} unit="°" clearable onChange={(v) => setK('rot', v)} />
          <Num label="Stretch x" value={k.sx} min={0.5} max={1.6} step={0.01} clearable onChange={(v) => setK('sx', v)} />
          <Num label="Stretch y" value={k.sy} min={0.5} max={1.6} step={0.01} clearable onChange={(v) => setK('sy', v)} />
          <Num label="Brightness" value={k.bright} min={0.2} max={3} step={0.05} clearable onChange={(v) => setK('bright', v)} />
          <Num label="Opacity" value={k.opacity} min={0} max={1} step={0.05} clearable onChange={(v) => setK('opacity', v)} />
        </Section>
      )}
      <Section title="Used by">
        {Object.entries(c.cues)
          .filter(([, q]) => q.layers.some((L) => L.state === id))
          .map(([n, q]) => (
            <small key={n} className="fs-chip">
              {q.label}
            </small>
          ))}
      </Section>
    </div>
  );
}

// ------------------------------------------------------------------------------ dialogs
function PublishDialog({ dirty, compile, onClose }) {
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState('Tune battle effects in the FX Studio');
  const [log, setLog] = useState('');
  const [state, setState] = useState('idle'); // idle | running | done | failed
  const pre = useRef(null);
  useEffect(() => {
    fetch('/__fx/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ error: true }));
  }, [dirty]);
  useEffect(() => {
    if (pre.current) pre.current.scrollTop = pre.current.scrollHeight;
  }, [log]);
  const go = async () => {
    if (dirty && !(await compile())) return;
    setState('running');
    setLog('');
    const r = await fetch('/__fx/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) });
    if (!r.ok || !r.body) {
      const j = await r.json().catch(() => ({}));
      setLog(j.error || 'Publish could not start.');
      setState('failed');
      return;
    }
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let all = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      all += dec.decode(value, { stream: true });
      setLog(all.replace(/\n\[\[(DONE|FAILED)\]\]\n?/, ''));
    }
    setState(all.includes('[[DONE]]') ? 'done' : 'failed');
  };
  return (
    <div className="fs-modal" role="dialog" aria-label="Publish">
      <div className="fs-modal-box fs-publish">
        <h3>Publish to GitHub</h3>
        <p className="small">
          Runs the tests and a build, then commits <b>every changed file</b> in the project and pushes it. Pushing to <code>main</code> deploys the live site.
        </p>
        {status?.branch && (
          <p className="small">
            Branch: <b>{status.branch}</b>
            {status.branch !== 'main' && ' (not main: the live site will not update)'}
          </p>
        )}
        <pre className="fs-status">{status ? status.status || '(no changes yet)' : 'Checking…'}</pre>
        {dirty && <p className="small fs-warn">You have changes that are not compiled: Publish compiles them first.</p>}
        <label className="fs-row">
          <span className="fs-label">Message</span>
          <input type="text" value={msg} onChange={(e) => setMsg(e.target.value)} disabled={state === 'running'} />
        </label>
        {log && (
          <pre className="fs-log" ref={pre}>
            {log}
          </pre>
        )}
        <div className="fs-actions">
          <button type="button" className="fs-btn" onClick={onClose} disabled={state === 'running'}>
            {state === 'done' ? 'Close' : 'Cancel'}
          </button>
          {state !== 'done' && (
            <button type="button" className="fs-btn publish" onClick={go} disabled={state === 'running' || !msg.trim()}>
              {state === 'running' ? 'Publishing…' : state === 'failed' ? 'Try again' : 'Test, commit and push'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TestFight({ opts, onClose }) {
  const run = useMemo(() => {
    const r = newRun({ seed: (Date.now() % 1e6) | 0, heroId: opts.hero });
    r.battle = { type: 'battle', enemies: [opts.enemy, opts.enemy, 'slime'], seed: (Date.now() % 1e6) | 0, biome: opts.biome };
    r.floor = 3;
    const all = Object.keys(ITEMS);
    if (opts.items === 'all') r.items = all;
    else if (opts.items === 'epic') r.items = RARE_ITEMS;
    else if (opts.items === 'random') r.items = [...all].sort(() => Math.random() - 0.5).slice(0, 10);
    return r;
  }, [opts]);
  return (
    <div className="fs-modal fs-fight" role="dialog" aria-label="Test fight">
      <div className="fs-fight-box">
        <header>
          <b>Test fight</b> <span className="fs-muted small">a real battle with your current (even uncompiled) effects</span>
          <span className="fs-spacer" />
          <button type="button" className="fs-btn" onClick={onClose}>
            Close
          </button>
        </header>
        <BattleScreen run={run} accountLevel={10} onResolve={() => {}} onContinue={onClose} onInventory={() => {}} />
      </div>
    </div>
  );
}

function Help({ onClose }) {
  return (
    <div className="fs-modal" role="dialog" aria-label="How the FX Studio works" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fs-modal-box fs-help">
        <h3>How the FX Studio works</h3>
        <ul>
          <li>
            <b>Cues</b> are what plays on each battle event (a hit, a dodge, each signature move…). A cue is a timeline of layers: sprite effects, character animations, built-in effects, screen shake, camera punch
            and sounds. Drag bars to retime them; drag on the stage to move an effect.
          </li>
          <li>
            <b>Effects</b> are named looks (an animation from the pack plus scale, anchor, direction, layer, colour). Changing an effect changes it in every cue that uses it. <i>Swap animation…</i> replaces
            the picture everywhere.
          </li>
          <li>
            <b>Projectiles</b>: speed, arc, spin, launch point and launch cue per projectile type; a looping effect can replace the drawn projectile.
          </li>
          <li>
            <b>Animations</b>: the characters’ action poses (attack, hurt, cast, throw…) as keyframes.
          </li>
          <li>
            Everything shows at once here and in <b>Test fight</b>. <b>Compile</b> writes it into the game (<code>src/fx/fx.json</code>) and packs only the sheets in use into <code>public/assets/vfx</code>.{' '}
            <b>Publish</b> tests, builds, commits and pushes.
          </li>
          <li>Space plays · Ctrl+Z undo · Ctrl+Y redo. Unsaved work survives a reload (it is kept in this browser until you compile).</li>
        </ul>
        <button type="button" className="fs-btn primary" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}

