// Real-time battle: steps the combat engine at a fixed rate and renders units, attacks, statuses,
// reactions and terrain at display rate. The player has one signature move: tapping it opens the
// hero's own Mandarin minigame while the fight continues (optionally slowed in Relaxed Casting mode).
//
// Battle flow (one-way, safe against repeated events):
//   FIGHTING  – the loop steps the engine; events are drained every frame (player actions emit
//               outside of steps, e.g. a signature move that kills the last enemy)
//   RESOLVED  – the engine has a result: the outcome is reported once via onResolve (the run is
//               saved at this moment, so a reload never replays a finished fight) and the
//               Victory/Defeat overlay is shown
//   → onContinue when the player taps Continue (rewards / map / end screen)
//
// Rendering: the simulation runs at COMBAT.dt (20 Hz) in world units (0…COMBAT.worldW); the camera
// maps world x to stage % and scales sprites to the stage width, separately from gameplay. Unit
// positions are interpolated between the last two steps so motion is smooth at any display rate.
// Static layers (backdrop, sprites, the puzzle sheet, effects) are memoised so a frame only
// re-renders what moves. The field stays uncluttered: no enemy names or health bars (tap an enemy
// or the eye button to inspect it); bosses get one bar at the top.
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Battle } from '../game/combat.js';
import { COMBAT } from '../game/data/balance.js';
import { ELEMENTS, STATUSES, TERRAIN } from '../game/data/elements.js';
import { BIOMES } from '../game/data/biomes.js';
import { ENEMIES } from '../game/data/enemies.js';
import { FRUITS, generateSigPuzzle } from '../learn/signaturePuzzles.js';
import { heroFor } from '../game/run.js';
import { heroDef } from '../game/data/heroes.js';
import { wraithWords } from '../game/unlocks.js';
import { useStore, update, getState } from '../store/store.js';
import { play } from '../audio/sfx.js';
import Sprite from './Sprite.jsx';
import SignaturePuzzle from './SignaturePuzzle.jsx';
import SigIcon from './SigIcon.jsx';
import { VfxSprite, SheetFrames, vfxDuration, vfxSize, preloadVfx } from './Vfx.jsx';
import { fx, onFx, effectDef, cueDef, projDef, poseMs, throwers } from '../fx/config.js';
import { installPoses } from '../fx/poses.js';
import { SPRITES } from '../assets/manifest.js';
import Bi from './Bi.jsx';
import Icon from '../assets/icons/Icons.jsx';
import { BgSky, BgFar, BgMid, BgGround, BgDecor } from '../assets/backgrounds/Backgrounds.jsx';

const STATUS_GLYPH = { burn: 'flame', chill: 'snow', frozen: 'snow', wet: 'drop', shock: 'bolt', curse: 'skull', stun: 'star', dazzle: 'sun', bleed: 'drop', slow: 'turtle', weaken: 'x', mark: 'eye' };
const FRUIT_EMOJI = Object.fromEntries(FRUITS.map((f) => [f.id, f.emoji]));
// signature buffs that show an aura on the hero and a timer under the button
const SIG_AURA = { passion: 'aura-fire', frenzy: 'aura-frenzy', mango: 'aura-fruit', pear: 'aura-fruit', roar: 'aura-fire' };
/** World x → stage percent (the camera). */
const P = (x) => (x * 100) / COMBAT.worldW;
// sprite size relative to the old 100-unit field: the wider world is shown zoomed out
const CAM_BASE = 100 / COMBAT.worldW;
const MAX_FX = 64;
// unit feet on the stage (bottom %): the same values the units are drawn with
const GROUND_PCT = 13;
const AIR_PCT = 30;
const MAX_FLOATS = 24;
const MELEE_FX = new Set(['slash', 'dagger', 'chain']);
// number of particle elements per effect (CSS `.sp-<kind>`)
const SPELL_PARTS = { cheer: 6, gust: 3, iaido: 2, bladearc: 3, scroll: 3, repel: 3, frenzy: 4, quake: 5, swing: 3, passion: 6, sparkle: 6 };
let fxSeq = 0;
let puzzleSeq = 0;

/** A jagged lightning polyline across a 100×20 box (endpoints centred). */
function zapPoints() {
  const pts = ['0,10'];
  for (let i = 1; i < 8; i++) pts.push(`${(i * 100) / 8},${(4 + Math.random() * 12).toFixed(1)}`);
  pts.push('100,10');
  return pts.join(' ');
}

const Backdrop = memo(function Backdrop({ theme, worldColor }) {
  return (
    <div className="bg-stack" style={worldColor < 1 ? { filter: `saturate(${0.35 + 0.65 * worldColor})` } : undefined}>
      <div className="bg-layer">
        <BgSky theme={theme} />
      </div>
      <div className="bg-layer far">
        <BgFar theme={theme} />
        <BgFar theme={theme} />
      </div>
      <div className="bg-layer mid">
        <BgMid theme={theme} />
        <BgMid theme={theme} />
      </div>
      <div className="bg-layer decor">
        <BgDecor theme={theme} />
      </div>
      <div className="bg-layer ground">
        <BgGround theme={theme} />
        <BgGround theme={theme} />
      </div>
    </div>
  );
});

/**
 * `sandbox` (FX Studio only): { onReady(api) } shows the stage without simulating or any HUD; the
 * editor plays cues, projectiles and poses on it through the api.
 */
export default function BattleScreen({ run: runProp, accountLevel, worldColor = 1, onResolve, onContinue, onInventory, sandbox = null }) {
  const s = useStore();
  const speed = s.settings.battleSpeed === 2 ? 2 : 1;
  const reduced = s.settings.reducedMotion;
  // The run is read once: after the battle resolves the saved run moves on (rewards), but this
  // screen keeps showing the finished fight until Continue.
  const run = useRef(runProp).current;
  const theme = BIOMES[run.battle.biome].theme;

  const bRef = useRef(null);
  if (!bRef.current) {
    bRef.current = new Battle({
      hero: heroFor(run, accountLevel),
      heroHp: run.hp,
      enemies: run.battle.enemies,
      biome: run.battle.biome,
      floor: run.floor,
      seed: run.battle.seed,
      ascension: run.ascension || 0,
      // the signature lands on its cast animation's impact frame (FX Studio)
      sigImpact: (cueDef(`sig.${heroDef(run.heroId).signature}.cast`)?.impact || 0) / 1000,
      runState: { ...run.runState, wraithWords: wraithWords(getState()) },
    });
  }
  const b = bRef.current;
  const H = b.hero;
  const heroFx = H.hdef.attack?.fx || 'orb';
  const heroMelee = MELEE_FX.has(heroFx);
  const meter = H.hdef.passive?.meter;

  const [, setFrame] = useState(0);
  const [puzzle, setPuzzle] = useState(null); // { puzzle, id }
  const puzzleRef = useRef(null);
  puzzleRef.current = puzzle;
  const lastTarget = useRef(null);
  const practiced = useRef(new Set()); // words already counted for spaced repetition this battle
  const stats = useRef({ casts: 0, fizzles: 0 });
  const vis = useRef({ floats: [], effects: [], attached: {}, lock: {}, unitFx: {}, flash: {}, gates: {}, pend: {}, later: [], dead: {}, banner: null, stageFx: null, shake: 0 });
  const slowRef = useRef(1);
  const alpha = useRef(1);
  const phase = useRef('fighting'); // fighting -> resolved (never back)
  const [ended, setEnded] = useState(null);
  const endedRef = useRef(null);
  const [inspect, setInspect] = useState(null); // enemy id or 'all'
  // camera: zoom adapts to the stage width (phones show the whole arena; wide screens a bit closer)
  const stageRef = useRef(null);
  const [cam, setCam] = useState(CAM_BASE);
  // event handlers run inside the long-lived loop closure, so they read camera/stage size via refs
  const camRef = useRef(CAM_BASE);
  const stageSize = useRef({ w: 400, h: 300 });
  useEffect(() => {
    preloadVfx();
    installPoses(fx(), onFx);
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => {
      const c = CAM_BASE * Math.min(1.25, Math.max(1, e.contentRect.width / 420));
      camRef.current = c;
      stageSize.current = { w: e.contentRect.width, h: e.contentRect.height };
      setCam(c);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // the loop closure is created once, so it reads the latest callback through a ref
  const onResolveRef = useRef(onResolve);
  onResolveRef.current = onResolve;
  const perf = useRef({ frames: 0, windowStart: 0, fps: 0, worst: 0, worstShown: 0, simMs: 0, renderMs: 0, renderStart: 0 });

  // ---------------------------------------------------------------- event -> visuals
  const xOf = (id) => {
    if (id === 'hero') return P(H.x);
    const u = b.units.find((x) => x.id === id);
    return P(u ? u.x : COMBAT.worldW * 0.6);
  };
  const lastLabel = useRef({});
  // FX Studio scrubbing runs the visuals on a virtual clock (null = real time)
  const clockRef = useRef(null);
  const now = () => clockRef.current ?? performance.now();
  function pushFx(e) {
    const v = vis.current;
    v.effects.push({ id: ++fxSeq, born: now(), ...e });
    if (v.effects.length > MAX_FX) v.effects.shift();
  }
  function float(x, text, kind, color) {
    const v = vis.current;
    if (v.floats.length >= MAX_FLOATS - 4 && kind !== 'crit' && kind !== 'taken') return; // keep the field readable
    v.floats.push({ id: ++fxSeq, x: x + (Math.random() * 4 - 2), text, kind, color, until: now() + 950 });
    if (v.floats.length > MAX_FLOATS) v.floats.shift();
  }
  /** Puts a unit in an animation state. `lock` (signature cast animations) keeps others out meanwhile. */
  function unitState(id, state, ms, lock = false) {
    const v = vis.current;
    const t = now();
    if (!lock && (v.lock[id] || 0) > t) return;
    if (lock) v.lock[id] = t + ms;
    v.unitFx[id] = { state, until: t + ms, born: t };
  }
  function flash(id) {
    // one red flash per ~0.25s per unit, so rapid hits don't strobe
    const v = vis.current;
    if ((v.flash[id] || 0) > now()) return;
    v.flash[id] = now() + 240;
  }
  /** Runs fn after ms of real time (visual timing only; the simulation never waits for it). */
  function later(ms, fn) {
    if (ms <= 0) fn();
    else vis.current.later.push({ at: now() + ms, fn });
  }
  // ---- unit geometry: where a unit's body actually is on the stage (from its sprite and scale)
  const unitOf = (id) => (id === 'hero' ? H : b.units.find((x) => x.id === id));
  const unitScale = (u) => camRef.current * (u === H ? 0.8 : u.side === 0 ? 0.64 : (u.edef?.scale || 1) * (u.boss ? 0.8 : 0.72));
  function geo(id) {
    const u = unitOf(id);
    if (!u) return null;
    const sp = SPRITES[u === H || u.sprite === 'shade' ? H.sprite : u.sprite] || { w: 90, h: 110 };
    const k = unitScale(u);
    return { x: P(u.x), base: u.flying ? AIR_PCT : GROUND_PCT, w: sp.w * k, h: sp.h * k, side: u.side, facing: u.side === 0 ? 1 : -1 };
  }
  /** A unit's midpoint height above the stage floor, in px (for projectile paths). */
  const midPx = (g) => (g.base / 100) * stageSize.current.h + g.h * 0.5;
  // FX Studio slow motion: stretches every delay and duration (always 1 in the game)
  const slow = () => slowRef.current;
  /** Per-target rate limit for frequent effects (so rapid hits or ticks never pile up). */
  function gate(key, ms) {
    const v = vis.current;
    const t = now();
    if ((v.gates[key] || 0) > t) return false;
    v.gates[key] = t + ms;
    return true;
  }

  // ---- cues: what plays on each event comes from the FX config (src/fx/fx.json, FX Studio)
  // ctx: { tgt, src (unit ids), toward ('left' | 'right': the direction of the action), scale }
  /** The unit a layer attaches to: the event's target or source, the hero, or none (the world). */
  function attachTo(L, ctx) {
    const a = L.attach || 'target';
    if (a === 'world') return null;
    if (a === 'hero') return 'hero';
    return a === 'source' ? ctx.src : ctx.tgt;
  }
  /**
   * One sprite-effect layer. Placement follows the anchor (mid: body midpoint · ground: feet ·
   * head · beside: behind the shoulder, for buffs · front: ahead, for launches), then the layer's
   * offsets: x forward of where the unit faces and y up, both in the unit's body widths / heights.
   * World layers sit on the ground at worldX (stage %). `follow` layers move with their unit.
   */
  function effectLayer(L, ctx) {
    const def = effectDef(L.effect);
    if (!def) return;
    const id = attachTo(L, ctx);
    const cam = camRef.current;
    const g = id ? geo(id) : { x: L.worldX ?? ctx.worldX ?? 50, base: GROUND_PCT, w: 100 * cam, h: 100 * cam, facing: 1 };
    if (!g) return;
    const { w, h } = vfxSize(L.effect, cam, (L.scale ?? 1) * (ctx.scale ?? 1));
    let xPx = 0;
    let yPx;
    switch (L.anchor || def.anchor) {
      case 'ground':
        yPx = -h * 0.1;
        break;
      case 'head':
        yPx = g.h * 0.92;
        break;
      case 'beside':
        xPx = -g.facing * g.w * 0.4;
        yPx = g.h * 0.62 - h / 2;
        break;
      case 'front':
        xPx = g.facing * g.w * 0.42;
        yPx = g.h * 0.5 - h / 2;
        break;
      default:
        yPx = g.h * 0.5 - h / 2;
    }
    xPx += g.facing * (L.x || 0) * g.w;
    yPx += (L.y || 0) * g.h;
    // directional art is mirrored to point the way of the action (auto), against it (reverse),
    // the way the unit faces (facing), or never
    const toward = L.mirror === 'facing' ? (g.facing > 0 ? 'right' : 'left') : ctx.toward;
    let flip = false;
    if (def.dir && toward && L.mirror !== 'never') flip = L.mirror === 'reverse' ? def.dir === toward : def.dir !== toward;
    const speed = (L.speed ?? 1) / slow();
    const loops = L.loops ?? def.loops ?? 1;
    const e = { type: 'vfx', name: L.effect, w, h, flip, loops, speed, rotate: L.rotate || 0, opacity: L.opacity, hue: L.hue || 0, until: now() + vfxDuration(L.effect, speed) * loops + 40 };
    if (L.follow && id) {
      const v = vis.current;
      v.attached[id] = [...(v.attached[id] || []), { ...e, id: ++fxSeq, born: now(), left: `calc(50% + ${xPx}px)`, bottom: `${yPx}px` }];
    } else pushFx({ ...e, left: `calc(${g.x}% + ${xPx}px)`, bottom: `calc(${g.base}% + ${yPx}px)` });
  }
  /** A built-in CSS effect (sword arcs, rings, slams …) placed at a unit or the stage centre. */
  function classicLayer(L, ctx) {
    const id = attachTo(L, ctx);
    const x0 = id ? xOf(id) : (L.worldX ?? ctx.worldX ?? 50);
    const x = (L.at === 'center' ? 50 : x0) + (L.dx || 0);
    const until = now() + (L.dur || 600) * slow();
    if (L.fx === 'spell') pushFx({ type: 'spell', kind: L.kind, x, from: x0, color: L.color, until });
    else if (L.fx === 'slam') pushFx({ type: 'slam', x, pts: [zapPoints(), zapPoints(), zapPoints()], until });
    else pushFx({ type: L.fx, x, color: L.color, big: L.big, until });
  }
  function playLayer(L, ctx) {
    const v = vis.current;
    switch (L.type || 'effect') {
      case 'effect':
        effectLayer(L, ctx);
        break;
      case 'pose': {
        const id = attachTo(L, ctx);
        if (id) unitState(id, L.state, (L.dur ?? poseMs(L.state)) * slow(), Boolean(ctx.lock));
        break;
      }
      case 'shake':
        if (!calm()) v.shake = now() + L.dur * slow();
        v.stageBorn = now();
        break;
      case 'punch':
        if (!calm()) v.punch = now() + L.dur * slow();
        v.stageBorn = now();
        break;
      case 'sound':
        play(L.sound);
        break;
      case 'classic':
        classicLayer(L, ctx);
        break;
      default:
    }
  }
  /** Plays a named cue: each of its layers after its own delay. */
  function cue(name, ctx = {}) {
    const c = cueDef(name);
    if (!c) return;
    for (const L of c.layers) if (!L.off) later((L.delay || 0) * slow(), () => playLayer(L, ctx));
  }
  const calm = () => getState().settings.reducedMotion;

  /** The impact for a hit: by crit, signature move, element, then melee or ranged. */
  function impact(e) {
    if (e.kind === 'dot' || !(e.amount > 0 || e.absorbed > 0)) return;
    const ctx = { tgt: e.tgt, src: e.src, toward: e.tgt === 'hero' ? 'left' : 'right' };
    // the hero's signature move has its own hit look (FX Studio: sig.<move>.hit)
    const sigHit = `sig.${b.sig.id}.hit`;
    if (e.kind === 'spell' && e.src === 'hero' && cueDef(sigHit)) {
      if (e.crit || gate(`hit:${e.tgt}`, 90)) cue(sigHit, ctx);
      return;
    }
    if (e.crit) {
      cue(e.kind === 'spell' ? 'hit.crit.spell' : b.buffActive('frenzy') ? 'hit.crit.frenzy' : 'hit.crit', ctx);
      return;
    }
    if (!gate(`hit:${e.tgt}`, 90)) return;
    if (e.kind === 'spell') cue('hit.spell', ctx);
    else if (cueDef(`hit.${e.element}`)) cue(`hit.${e.element}`, ctx);
    else if ((e.src === 'hero' && heroMelee) || (e.tgt === 'hero' && (unitOf(e.src)?.range || 0) <= 20)) cue('hit.melee', ctx);
    else cue('hit.ranged', ctx);
  }

  /**
   * A projectile from one unit's body to another's, flown as its type in the FX config says:
   * straight shots travel in a line and point along it; arcing ones rise to an apex and fall onto
   * the target. The target's hit visuals are held back until it lands (v.pend). Returns the
   * flight time in ms.
   */
  function projectile(type, srcId, tgtId, opts = {}) {
    const cfg = projDef(type);
    const gs = geo(srcId);
    const gt = geo(tgtId);
    if (!cfg || !gs || !gt) return 0;
    const W = stageSize.current.w || 400;
    // launch from slightly ahead of the body (the hand / weapon), aim at the target's midpoint
    const fromX = gs.x + ((gs.facing * gs.w * (cfg.launchX ?? 0.3)) / W) * 100;
    const toX = gt.x;
    const y0 = midPx(gs) + gs.h * (cfg.launchY || 0);
    const dy = midPx(gt) - y0; // px, up is positive
    const dxPx = ((toX - fromX) / 100) * W;
    // tilt along the line of travel (the art is mirrored for leftward shots, so the sign flips)
    const tilt = cfg.tilt && !cfg.arc ? Math.max(-40, Math.min(40, (Math.atan2(-dy, Math.abs(dxPx) || 1) * 180) / Math.PI)) * (dxPx < 0 ? -1 : 1) : 0;
    const ms = Math.round(Math.max(cfg.minMs, Math.min(cfg.maxMs, Math.abs(toX - fromX) * cfg.msPerPct)) * slow());
    const top = Math.max(36, Math.abs(dxPx) * 0.32) * (cfg.apex ?? 1);
    const look = cfg.look === 'inherit' ? opts.style || 'orb' : cfg.look;
    const size = (cfg.size || 1) * (opts.size || 1);
    const sprite = cfg.sprite && effectDef(cfg.sprite) ? { name: cfg.sprite, ...vfxSize(cfg.sprite, camRef.current, size) } : null;
    pushFx({
      type: look === 'fruit' ? 'fruit' : 'proj', style: look, sprite, size, spin: cfg.spin, emoji: opts.emoji, x: fromX, to: toX, y0, dy, tilt, arc: cfg.arc,
      apex: top, big: opts.big, small: opts.small, ms, notail: cfg.tail === false, trail: trail(cfg, slow()),
      until: now() + ms + 30 + (cfg.trail?.count || 0) * (cfg.trail?.gap || 0) * slow(),
    });
    if (cfg.launch && !opts.small) cue(cfg.launch, { tgt: srcId, src: srcId, toward: gs.facing > 0 ? 'right' : 'left', scale: opts.big ? 1.45 : 1 });
    vis.current.pend[tgtId] = now() + ms;
    return ms;
  }
  /** Lightning bolts run from the shooter's body height to the target's. */
  function zapHeights(srcId, tgtId) {
    const gs = geo(srcId);
    const gt = geo(tgtId);
    if (!gs || !gt) return {};
    const y0 = midPx(gs);
    const y1 = midPx(gt);
    const [yL, yR] = gs.x <= gt.x ? [y0, y1] : [y1, y0];
    const wPx = Math.max(8, (Math.abs(gt.x - gs.x) / 100) * (stageSize.current.w || 400));
    return { y0, y1, skew: (Math.atan((yL - yR) / wPx) * 180) / Math.PI };
  }
  /** Xinyi's thrown fruit: the throw pose, the fruit's flight, then its own landing cue. */
  function throwFruit(fruit, tgt) {
    cue('fruit.throw', { tgt: 'hero', src: 'hero', toward: 'right' });
    if (!tgt) return;
    const emoji = FRUIT_EMOJI[fruit] || '🍎';
    later((projDef('fruit.throw')?.delay || 0) * slow(), () => {
      const ms = projectile('fruit.throw', 'hero', tgt, { emoji });
      later(ms, () => cue(`fruit.${fruit}`, { tgt, src: 'hero', toward: 'right' }));
    });
  }

  function handle(events) {
    const v = vis.current;
    for (const e of events) {
      switch (e.type) {
        case 'shot': {
          const from = xOf(e.src);
          const to = xOf(e.tgt);
          const t = now();
          if (e.fruit) {
            projectile('fruit.shot', e.src, e.tgt, { emoji: FRUIT_EMOJI[e.fruit] || '🍎', small: e.small });
            break;
          }
          if (e.src === 'hero' && heroMelee && !e.spell) {
            pushFx({ type: 'melee', style: heroFx, x: to, from, until: t + (heroFx === 'chain' ? 420 : 280) });
            break;
          }
          const el = e.element || 'physical';
          if (el === 'lightning' || e.bolt) {
            pushFx({ type: 'zap', x: from, to, pts: zapPoints(), big: e.big || e.spell, until: t + 200, ...zapHeights(e.src, e.tgt) });
            break;
          }
          const style = el !== 'physical' ? el : e.src === 'hero' ? heroFx : 'orb';
          const shooter = unitOf(e.src);
          const thrown = shooter && shooter !== H && throwers().has(shooter.enemyId);
          projectile(thrown ? 'thrown' : projDef(style) ? style : 'orb', e.src, e.tgt, { style, big: e.big || e.spell, small: e.small });
          break;
        }
        case 'attack': {
          const name = e.src !== 'hero' ? 'attack.enemy' : heroFx === 'chain' ? 'attack.hero.heavy' : heroMelee ? 'attack.hero.melee' : 'attack.hero.ranged';
          cue(name, { tgt: e.src, src: e.src });
          if (e.big) play('crit');
          break;
        }
        case 'hit': {
          // a hit carried by a projectile shows when the projectile arrives, not when it leaves
          const arrive = v.pend[e.tgt] || 0;
          delete v.pend[e.tgt];
          later(arrive - now(), () => {
            const x = xOf(e.tgt);
            if (e.amount > 0 || e.absorbed > 0) {
              const kind = e.tgt === 'hero' ? 'taken' : e.crit ? 'crit' : e.kind === 'dot' ? 'dot' : e.kind === 'spell' ? 'spell' : 'dmg';
              if (e.amount > 0 && (e.kind !== 'dot' || e.amount >= 3)) float(x, e.crit ? `${e.amount}!` : `${e.amount}`, kind, e.element !== 'physical' ? ELEMENTS[e.element]?.color : null);
            }
            if (e.kind !== 'dot' && e.amount > 0) {
              flash(e.tgt);
              cue('unit.hurt', { tgt: e.tgt, src: e.src });
            }
            if (e.kind === 'attack' || e.kind === 'spell' || e.kind === 'proc') impact(e);
            if (e.kind === 'attack' || e.kind === 'spell') play(e.crit ? 'crit' : 'hit');
          });
          break;
        }
        case 'reaction':
          float(xOf(e.tgt), `${e.text}!`, 'reaction');
          if (cueDef(`reaction.${e.id}`)) cue(`reaction.${e.id}`, { tgt: e.tgt });
          else pushFx({ type: 'burst', x: xOf(e.tgt), color: '#fff', until: now() + 450 });
          break;
        case 'status':
          if (e.isNew && cueDef(`status.${e.status}`) && gate(`st:${e.tgt}:${e.status}`, 1200)) cue(`status.${e.status}`, { tgt: e.tgt });
          break;
        case 'shield': {
          const u = unitOf(e.tgt);
          if (u && e.amount >= Math.max(8, u.maxHp * 0.05) && gate(`shield:${e.tgt}`, 1500)) cue('shield.gain', { tgt: e.tgt });
          break;
        }
        case 'shieldBreak':
          cue('shield.break', { tgt: e.tgt });
          break;
        case 'buff':
          if (e.tgt === 'hero' && cueDef(`buff.${e.id}`) && e.dur > 1.5 && gate(`buff:${e.id}`, 1200)) cue(`buff.${e.id}`, { tgt: 'hero' });
          break;
        case 'spawn':
          cue('unit.summon', { tgt: e.unit.id });
          break;
        case 'label': {
          if (e.tgt === 'field') {
            v.banner = { text: e.text, until: now() + 1400, small: true };
            break;
          }
          // at most one shout per character every ~0.7s, so labels never pile up
          const t = now();
          if ((lastLabel.current[e.tgt] || 0) > t) break;
          lastLabel.current[e.tgt] = t + 700;
          float(xOf(e.tgt), e.text, e.kind === 'enemy' ? 'enemy' : e.kind === 'good' ? 'good' : 'proc');
          break;
        }
        case 'heal': {
          if (e.amount >= 2) float(xOf(e.tgt), `+${e.amount}`, 'heal');
          const u = unitOf(e.tgt);
          if (u && e.amount >= u.maxHp * 0.05 && gate(`heal:${e.tgt}`, 1500)) cue('unit.heal', { tgt: e.tgt });
          break;
        }
        case 'dodge':
          // the hop itself (a 'hop' event) shows the dodge; no text
          cue('unit.dodge', { tgt: e.tgt });
          play('dodge');
          break;
        case 'miss':
          pushFx({ type: 'whiff', x: xOf(e.tgt), until: now() + 300 });
          break;
        case 'block':
          cue('hero.block', { tgt: 'hero' });
          break;
        case 'hop':
          cue('move.hop', { tgt: e.tgt });
          break;
        case 'knock': {
          if (e.d >= COMBAT.heavyKb) cue(e.pull ? 'move.pull' : 'move.knock', { tgt: e.tgt });
          // a big push: a directional burst on the body (in the push direction) and dust kicked up
          // behind the feet (trailing opposite to the motion)
          const u = unitOf(e.tgt);
          if (u && e.d >= 8 && gate(`knock:${e.tgt}`, 300)) cue('move.knock.big', { tgt: e.tgt, toward: (u.side === 1) !== Boolean(e.pull) ? 'right' : 'left' });
          break;
        }
        case 'land':
          if (!e.hop && gate(`land:${e.tgt}`, 400)) cue('move.land', { tgt: e.tgt });
          break;
        case 'cast':
          if (e.enemy) cue(cueDef(`enemy.cast.${e.element}`) ? `enemy.cast.${e.element}` : 'enemy.cast', { tgt: 'hero', toward: 'left' });
          else if (e.spell === 'gust') pushFx({ type: 'spell', kind: 'gust', x: xOf('hero'), color: ELEMENTS[e.element]?.color, until: now() + 800 });
          else if (e.spell === 'wave' || e.spell === 'burst') pushFx({ type: 'ring', x: xOf('hero'), color: ELEMENTS[e.element]?.color, big: true, until: now() + 700 });
          else if (e.spell === 'iaido') pushFx({ type: 'spell', kind: 'iaido', x: 50, until: now() + 700 });
          else if (e.sig) {
            pushFx({ type: 'ring', x: xOf('hero'), color: ELEMENTS[e.element]?.color, until: now() + 600 });
            if (e.echo) float(xOf('hero'), 'huí shēng', 'proc');
            play('spell');
          }
          break;
        case 'sigCast':
          // the cast animation; the move itself lands at its impact frame (engine: sigImpact)
          cue(`sig.${e.id}.cast`, { tgt: 'hero', src: 'hero', toward: 'right', lock: true });
          break;
        case 'sig':
          cue(`sig.${e.id}.${e.phase}`, { tgt: 'hero', src: 'hero', toward: 'right' });
          if (e.id === 'burning_passion') v.banner = { text: 'rè qíng rán shāo!', until: now() + 1200, small: true };
          if (e.id === 'go_all_out') v.banner = { text: 'quán lì yǐ fù!', until: now() + 1100, small: true };
          break;
        case 'fruit': {
          if (e.thrown) throwFruit(e.fruit, e.tgt);
          else {
            pushFx({ type: 'nom', emoji: FRUIT_EMOJI[e.fruit] || '🍎', x: xOf('hero'), until: now() + 1000 });
            cue(`fruit.${e.fruit}`, { tgt: 'hero', src: 'hero', toward: 'right' });
          }
          float(xOf('hero'), FRUITS.find((f) => f.id === e.fruit)?.py || '', 'good');
          break;
        }
        case 'wallHit':
          // ground-aligned: the slam bursts up from the floor at the wall, with a dust ring
          cue('wall.hit', { tgt: e.tgt });
          if (H.heroId === 'lei' && gate('leiwall', 250)) cue('wall.hit.lei', { tgt: e.tgt });
          break;
        case 'collide':
          cue('unit.collide', { tgt: e.tgt });
          break;
        case 'itemFx': {
          // passive item visuals (FX Studio cues item.<kind>); placed on a unit or on the ground at x
          const fxTgt = e.tgt && unitOf(e.tgt) ? e.tgt : null;
          if (!gate(`item:${e.kind}:${fxTgt || e.x}`, 120)) break;
          cue(`item.${e.kind}`, { tgt: fxTgt, src: e.src, worldX: e.x !== null && e.x !== undefined ? P(e.x) : undefined, toward: 'right' });
          break;
        }
        case 'mirror':
          pushFx({ type: 'melee', style: 'slash', x: xOf(e.tgt), from: xOf(e.tgt) + 8, mirror: true, until: now() + 260 });
          break;
        case 'decoy':
          pushFx({ type: 'whiff', x: xOf(e.tgt), until: now() + 300 });
          break;
        case 'slam':
          cue('enemy.slam', { tgt: e.tgt });
          break;
        case 'burst':
          pushFx({ type: 'tburst', x: xOf(e.tgt), pts: [zapPoints(), zapPoints()], until: now() + 380 });
          break;
        case 'telegraph':
          float(xOf(e.src), e.text, e.friendly ? 'good' : 'warn');
          if (!e.friendly) cue('enemy.telegraph', { tgt: e.src });
          break;
        case 'phase':
          v.banner = { text: e.text, until: now() + 2200 };
          play('levelUp');
          break;
        case 'biome':
          v.stageFx = { kind: e.kind, until: now() + 650 };
          if (e.text) v.banner = { text: e.text, until: now() + 1200, small: true };
          if (e.tgt && cueDef(`biome.${e.kind}`)) cue(`biome.${e.kind}`, { tgt: e.tgt });
          break;
        case 'fizzle':
          float(xOf('hero'), 'shī bài · Fizzle', 'enemy');
          cue('sig.fizzle', { tgt: 'hero' });
          break;
        case 'sigReady':
          if (!puzzleRef.current) play('pick');
          break;
        case 'corrupt':
          v.banner = { text: 'Your signature move was corrupted!', until: now() + 1600, small: true };
          break;
        case 'silence':
          v.banner = { text: `Passives silenced for ${e.dur}s`, until: now() + 1600, small: true };
          break;
        case 'death':
          v.dead[e.tgt] = now();
          if (e.tgt !== 'hero' && !e.ally) cue('unit.death', { tgt: e.tgt });
          play('die');
          break;
        case 'revive':
          // the reviving effect labels itself (phoenix, lucky streak, rising zombie)
          delete v.dead[e.tgt];
          cue('unit.revive', { tgt: e.tgt });
          break;
        default:
      }
    }
  }

  // ---- FX Studio sandbox: the editor drives this same screen (nothing is simulated)
  useEffect(() => {
    if (!sandbox) return;
    sandbox.onReady?.({
      cue,
      layer: (L, ctx) => playLayer(L, ctx),
      after: (ms, fn) => later(ms * slow(), fn),
      projectile,
      throwFruit,
      geo,
      hero: H,
      units: () => b.units,
      pose: (id, state) => unitState(id, state, poseMs(state) * slow()),
      setSlow: (f) => (slowRef.current = f),
      /**
       * Shows the frame `T` ms after `start()` (which plays something): replays it from 0 on the
       * virtual clock, running every scheduled layer up to T; the render then freezes each CSS
       * animation at its own age (see the layout effect below).
       */
      scrub: (T, start) => {
        const v = vis.current;
        clockRef.current = 0;
        v.effects = [];
        v.attached = {};
        v.later = [];
        v.unitFx = {};
        v.lock = {};
        v.shake = 0;
        v.punch = 0;
        start();
        for (let guard = 0; guard < 500; guard++) {
          const due = v.later.filter((l) => l.at <= T);
          if (!due.length) break;
          const l = due.reduce((a, x) => (x.at < a.at ? x : a));
          v.later.splice(v.later.indexOf(l), 1);
          clockRef.current = l.at;
          l.fn();
        }
        clockRef.current = T;
        v.effects = v.effects.filter((f) => f.until > T);
        for (const id in v.attached) v.attached[id] = v.attached[id].filter((f) => f.until > T);
        setFrame((x) => x + 1);
      },
      /** Back to real time (after scrubbing). */
      live: () => {
        clockRef.current = null;
        const st = stageRef.current;
        if (st) for (const a of st.getAnimations({ subtree: true })) a.play();
      },
      setX: (id, x) => {
        const u = unitOf(id);
        if (u) u.x = u.px = x;
      },
      clear: () => {
        const v = vis.current;
        v.effects = [];
        v.attached = {};
        v.later = [];
        v.unitFx = {};
      },
      stage: () => stageRef.current,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Drains pending engine events and moves the screen to RESOLVED exactly once. */
  function pump() {
    const evs = b.drain();
    if (evs.length) handle(evs);
    if (b.result && phase.current === 'fighting') {
      phase.current = 'resolved';
      endedRef.current = b.result;
      setEnded(b.result);
      setPuzzle(null);
      play(b.result === 'win' ? 'victory' : 'defeat');
      onResolveRef.current?.({
        result: b.result,
        heroHp: H.hp,
        kills: b.kills,
        casts: stats.current.casts,
        fizzles: stats.current.fizzles,
        runState: { phoenixUsed: !!b.runState.phoenixUsed },
      });
    }
  }

  // ---------------------------------------------------------------- main loop (combat never pauses)
  useEffect(() => {
    let raf;
    let last = performance.now();
    let acc = 0;
    const dt = COMBAT.dt;
    const loop = (t) => {
      const t0 = performance.now();
      const frameMs = t - last;
      const real = Math.min(0.1, frameMs / 1000);
      last = t;
      const st = getState().settings;
      let sp = st.battleSpeed === 2 ? 2 : 1;
      if (puzzleRef.current && st.relaxedCasting) sp *= 0.4;
      if (!b.result && !sandbox) {
        acc += real * sp;
        let steps = 0;
        while (acc >= dt && !b.result && steps < 8) {
          for (const u of b.units) u.px = u.x;
          handle(b.step(dt));
          acc -= dt;
          steps++;
        }
        if (steps === 8) acc = 0; // a long stall: drop the backlog instead of fast-forwarding
      }
      pump();
      alpha.current = b.result ? 1 : Math.min(1, acc / dt);
      const v = vis.current;
      const n = now();
      if (v.later.length) {
        const due = v.later.filter((l) => l.at <= n);
        if (due.length) {
          v.later = v.later.filter((l) => l.at > n);
          for (const l of due) l.fn();
        }
      }
      if (v.floats.length) v.floats = v.floats.filter((f) => f.until > n);
      if (v.effects.length) v.effects = v.effects.filter((f) => f.until > n);
      for (const id in v.attached) v.attached[id] = v.attached[id].filter((f) => f.until > n);
      // perf stats (shown with Settings → Performance overlay)
      const p = perf.current;
      p.frames++;
      p.worst = Math.max(p.worst, frameMs);
      p.simMs = p.simMs * 0.9 + (performance.now() - t0) * 0.1;
      if (t - p.windowStart >= 500) {
        p.fps = Math.round((p.frames * 1000) / (t - p.windowStart));
        p.worstShown = Math.round(p.worst);
        p.frames = 0;
        p.worst = 0;
        p.windowStart = t;
      }
      p.renderStart = performance.now();
      setFrame((x) => (x + 1) % 1e9);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // scrubbing: freeze every animation on the stage at its age on the virtual clock
  useLayoutEffect(() => {
    const T = clockRef.current;
    const st = stageRef.current;
    if (T === null || !st) return;
    const v = vis.current;
    for (const a of st.getAnimations({ subtree: true })) a.pause();
    for (const a of st.getAnimations()) a.currentTime = Math.max(0, T - (v.stageBorn || 0));
    const at = (el, born) => {
      for (const a of el.getAnimations({ subtree: true })) a.currentTime = Math.max(0, T - born);
    };
    for (const el of st.querySelectorAll('[data-born]')) at(el, Number(el.dataset.born));
    for (const el of st.querySelectorAll('.unit2[data-unit]')) {
      const fx = v.unitFx[el.dataset.unit];
      const sp = el.querySelector(':scope > .sprite');
      if (fx && sp) for (const a of sp.getAnimations()) a.currentTime = Math.max(0, T - fx.born);
    }
  });
  useLayoutEffect(() => {
    const p = perf.current;
    if (p.renderStart) p.renderMs = p.renderMs * 0.9 + (performance.now() - p.renderStart) * 0.1;
  });

  // ---------------------------------------------------------------- signature move
  // puzzle generation (learn/signaturePuzzles.js) → validation (SignaturePuzzle) → b.finishCast
  // (effect, passives, cooldown) — combat never pauses in between
  const newPuzzle = () => {
    const pz = generateSigPuzzle(b.sig.def.template, { save: getState(), soundless: getState().settings.soundless, last: lastTarget.current, level: run.ascension || 0 });
    lastTarget.current = pz.target;
    return { puzzle: { ...pz, sigId: b.sig.id }, id: ++puzzleSeq };
  };
  const openCast = () => {
    if (endedRef.current || puzzleRef.current || !b.beginCast()) return;
    play('click');
    setPuzzle(newPuzzle());
  };
  const onPuzzleDone = useCallback((ok, choice) => {
    if (!puzzleRef.current) return;
    const res = b.finishCast(ok, { choice });
    if (ok) stats.current.casts += 1;
    else stats.current.fizzles += 1;
    if (res.retry && b.beginCast()) {
      setPuzzle(newPuzzle());
      return;
    }
    setPuzzle(null);
    pump(); // the move may have ended the fight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onPuzzleCancel = useCallback(() => {
    if (puzzleRef.current) b.cancelCast();
    setPuzzle(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keyboard: Space or 1 opens the signature puzzle (when none is open)
  const openCastRef = useRef(openCast);
  openCastRef.current = openCast;
  useEffect(() => {
    const k = (e) => {
      if (puzzleRef.current || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      if (e.key === '1' || e.key === ' ') {
        e.preventDefault();
        openCastRef.current();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const skip = () => {
    if (endedRef.current) return;
    if (puzzleRef.current) onPuzzleCancel();
    let guard = 0;
    while (!b.result && guard++ < 6000) handle(b.step(COMBAT.dt));
    if (!b.result) b.finish('lose');
    pump();
  };

  // ---------------------------------------------------------------- render
  const v = vis.current;
  const n = now();
  const a = alpha.current;
  const ix = (u) => P(u.px === undefined ? u.x : u.px + (u.x - u.px) * a);
  const terrain = Object.keys(b.terrain).filter((k) => b.terrain[k] > 0);
  const boss = b.units.find((u) => u.side === 1 && (u.boss || u.edef?.guardian) && u.alive);
  const visibleUnits = b.units.filter((u) => u.alive || n - (v.dead[u.id] || 0) < 700);
  const meterVal = meter ? b.state(`passive:${H.heroId}`)[meter.key] || 0 : 0;
  const sigBuff = H.buffs.find((x) => x.sig && x.until > b.t);
  const auras = H.buffs.filter((x) => x.until > b.t && SIG_AURA[x.id]).map((x) => SIG_AURA[x.id]);

  return (
    <div className={`battle2 ${reduced ? 'calm' : ''}`}>
      <div
        ref={stageRef}
        className={`stage stage2 theme-${theme} ${v.stageFx && v.stageFx.until > n ? `flash-${v.stageFx.kind}` : ''} ${v.shake > n ? 'shaking' : ''} ${(v.punch || 0) > n ? 'punch' : ''}`}
        style={slowRef.current !== 1 ? { '--slow': slowRef.current } : undefined}
      >
        <Backdrop theme={theme} worldColor={worldColor} />
        {/* the two territories: a faint wash on each half and a brush mark at the midpoint */}
        <div className="zone zone-hero" aria-hidden="true" />
        <div className="zone zone-enemy" aria-hidden="true" />
        <div className="zone-mark" aria-hidden="true" />
        {terrain.map((k) => (
          <div key={k} className={`terrain-tint terrain-${k}`} style={{ '--tc': TERRAIN[k].color }} />
        ))}
        {b.zones.map((z) => (
          <div key={z.id} className={`zone-fx zk-${z.kind}`} style={{ left: `${P(z.x - z.w)}%`, width: `${P(z.w * 2)}%` }} aria-hidden="true">
            {z.kind === 'peel' && <span>🍌</span>}
          </div>
        ))}
        <div className="terrain-chips">
          {terrain.map((k) => (
            <span key={k} className="terrain-chip" style={{ '--tc': TERRAIN[k].color }} title={TERRAIN[k].desc}>
              {TERRAIN[k].py}
            </span>
          ))}
        </div>
        {boss && <BossBar u={boss} />}

        {visibleUnits.map((u) => {
          const isHero = u === H;
          const fx = v.unitFx[u.id];
          const moving = u.alive && u.px !== undefined && Math.abs(u.x - u.px) > 0.0005;
          let state;
          if (!u.alive) state = 'dead';
          else if (u.statuses.frozen || u.statuses.stun) state = 'still';
          else if (fx && fx.until > n) state = fx.state;
          else if (isHero && ended === 'win') state = 'victory';
          else if (u.charging) state = 'cast';
          else if (moving) state = 'walk';
          else state = 'idle';
          const sprite = isHero ? H.sprite : u.sprite === 'shade' ? H.sprite : u.sprite;
          const scale = cam * (isHero ? 0.8 : u.side === 0 ? 0.64 : (u.edef?.scale || 1) * (u.boss ? 0.8 : 0.72));
          const stList = u.alive ? Object.keys(u.statuses) : [];
          return (
            <div
              key={u.id}
              data-unit={sandbox ? u.id : undefined}
              className={`unit2 ${u.side === 0 ? 'side-hero' : 'side-enemy'} ${u.sprite === 'shade' ? 'is-shade' : ''} ${u.decoy ? 'is-decoy' : ''} ${u.statuses.frozen ? 'is-frozen' : ''} ${u.charging ? 'is-charging' : ''} ${(v.flash[u.id] || 0) > n ? 'hit-flash' : ''} ${isHero ? auras.join(' ') : ''}`}
              style={{ transform: `translateX(calc(${ix(u)}cqw - 50%))`, bottom: u.flying ? '30%' : '13%' }}
              onClick={u.side === 1 && u.alive ? () => setInspect(u.id) : undefined}
            >
              {u.alive && u.momentum && <Momentum side={u.side} granted={!u.invading} />}
              {isHero && u.alive && (
                <div className="unit-head hero-head">
                  {meter && (
                    <div className={`meter-pips ${meterVal >= meter.max ? 'full' : ''}`} style={{ '--mc': meter.color }} title={`${H.hdef.passive.py} · ${H.hdef.passive.en}`}>
                      {Array.from({ length: meter.max }, (_, i) => (
                        <i key={i} className={i < meterVal ? 'on' : ''} />
                      ))}
                    </div>
                  )}
                  <HpBar hp={u.hp} max={u.maxHp} shield={u.shield} hero />
                </div>
              )}
              {/* Word Eater's wraiths carry a learned word: that label is the point, so it stays */}
              {u.side === 1 && u.alive && u.label && <span className="unit-word">{u.label}</span>}
              {stList.length > 0 && (
                <div className="status-pips">
                  {stList.slice(0, 5).map((k) => (
                    <span key={k} className="status-pip" style={{ background: STATUSES[k].color }} title={`${STATUSES[k].py} · ${STATUSES[k].name}`}>
                      <Icon name={STATUS_GLYPH[k]} size={10} />
                    </span>
                  ))}
                </div>
              )}
              {u.shield > 0 && u.alive && isHero && <div className="shield-bubble" />}
              {u.charging && <div className="charge-ring" />}
              <Sprite id={sprite} state={u.frozen ? 'still' : state} scale={scale} flip={Boolean(u.mirror)} className={`${u.edef?.tint ? `tint-${u.edef.tint}` : ''} ${u.frozen ? 'afterimage' : ''}`} />
              {v.attached[u.id]?.map((e) => (
                <span key={e.id} data-born={e.born} style={{ display: 'contents' }}>
                  <VfxSprite e={e} />
                </span>
              ))}
            </div>
          );
        })}

        {v.effects.map((e) => (
          <span key={e.id} data-born={e.born} style={{ display: 'contents' }}>
            <Effect e={e} />
          </span>
        ))}
        {v.floats.map((f) => (
          <div key={f.id} className={`float float-${f.kind}`} style={{ left: `${f.x}%`, color: f.color || undefined }}>
            {f.text}
          </div>
        ))}
        {v.banner && v.banner.until > n && <div className={`battle-banner ${v.banner.small ? 'small' : ''}`}>{v.banner.text}</div>}
        {s.settings.perfOverlay && <PerfOverlay p={perf.current} fx={v.effects} floats={v.floats.length} units={b.units.length} />}
        {inspect && <EnemyPanel b={b} focus={inspect} onClose={() => setInspect(null)} />}

        {ended && (
          <div className={`battle-result ${ended} pop-in`}>
            <b>
              <Bi k={ended === 'win' ? 'victory' : 'defeat'} />
            </b>
            <button type="button" className="btn btn-primary" onClick={() => onContinue?.()} autoFocus>
              <Bi k="continue" />
            </button>
          </div>
        )}
      </div>

      {!sandbox && (
      <div className="battle-hud2">
        <div className="hud-row hud-controls">
          <button type="button" className="chip small" onClick={onInventory} aria-label="Items and synergies">
            <Icon name="chest" size={14} /> {run.items.length}
          </button>
          <button type="button" className="chip small" onClick={() => setInspect('all')} aria-label="Inspect enemies">
            <Icon name="eye" size={14} />
          </button>
          {Object.keys(H.statuses).map((k) => (
            <span key={k} className="status-pip big" style={{ background: STATUSES[k].color }} title={STATUSES[k].name}>
              <Icon name={STATUS_GLYPH[k]} size={12} />
            </span>
          ))}
          {H.momentum && (
            <span className="momentum-chip" title="Momentum: +25% attack speed">
              <Momentum side={0} granted={!H.invading} inline /> <Bi py="shì tóu" en="Momentum" inline />
            </span>
          )}
          {b.silenced() && <span className="buff bad">Silenced</span>}
          <span className="spacer" />
          <button
            type="button"
            className={`chip small ${s.settings.soundless ? 'on' : ''}`}
            onClick={() => update((x) => (x.settings.soundless = !x.settings.soundless))}
            aria-label="Toggle Soundless Mode"
            title="Soundless Mode"
          >
            <Icon name={s.settings.soundless ? 'x' : 'speaker'} size={14} />
          </button>
          {[1, 2].map((x) => (
            <button key={x} type="button" className={`chip small ${speed === x ? 'on' : ''}`} onClick={() => update((st) => (st.settings.battleSpeed = x))}>
              {x}×
            </button>
          ))}
          {!ended && (
            <button type="button" className="chip small" onClick={skip} title="Finish the fight instantly (no signature moves)">
              <Icon name="skip" size={12} /> <Bi k="skip" inline />
            </button>
          )}
        </div>
        <SigButton b={b} ended={ended} puzzle={puzzle} buff={sigBuff} onOpen={openCast} />
      </div>
      )}

      {puzzle && !ended && (
        <SignaturePuzzle key={puzzle.id} puzzle={puzzle.puzzle} sig={b.sig.def} practiced={practiced.current} onDone={onPuzzleDone} onCancel={onPuzzleCancel} />
      )}
    </div>
  );
}

/**
 * The one signature move button: hero-specific icon, cooldown dial, ready pulse, compact pinyin
 * name, and a timer while one of its buffs is running.
 */
function SigButton({ b, ended, puzzle, buff, onOpen }) {
  const sg = b.sig;
  const def = sg.def;
  const ready = sg.state === 'ready' && !ended;
  const casting = sg.state === 'casting';
  const full = b.sigCooldown();
  const frac = sg.state === 'cooldown' ? 1 - sg.cdLeft / full : 1;
  const el = ELEMENTS[def.element] || ELEMENTS.physical;
  const left = buff ? Math.max(0, buff.until - b.t) : 0;
  return (
    <button
      type="button"
      className={`sig-btn ${ready ? 'ready' : ''} ${casting ? 'casting' : ''} ${sg.corrupted ? 'corrupted' : ''}`}
      style={{ '--el': el.color, '--el-glow': el.glow, '--cd': `${Math.max(0, Math.min(1, frac)) * 360}deg` }}
      disabled={!ready || Boolean(puzzle) || Boolean(ended)}
      onClick={onOpen}
      aria-label={`${def.en}${ready ? '' : ' (recharging)'}`}
    >
      {/* the cooldown sweeps over the move's own icon, with the seconds left on top */}
      <span className="sig-btn-icon">
        <SigIcon id={sg.id} size={68} />
        {sg.state === 'cooldown' && <span className="sig-cd-sweep" />}
        {!ready && !casting && <span className="sig-btn-cd">{Math.ceil(sg.cdLeft)}</span>}
      </span>
      <span className="sig-btn-text">
        <span className="sig-btn-py">{def.py}</span>
        <small>{def.en}</small>
      </span>
      {ready && !puzzle && <span className="sig-btn-go">GO</span>}
      {left > 0 && (
        <span className="sig-btn-buff" aria-label="Signature effect running">
          <i style={{ transform: `scaleX(${Math.min(1, left / (buff.dur || 1))})` }} />
        </span>
      )}
      <kbd>1</kbd>
    </button>
  );
}

/** Health bar drawn with transforms (no layout per frame); optional shield layer. */
function HpBar({ hp, max, shield = 0, hero = false }) {
  const f = Math.max(0, Math.min(1, hp / max));
  const sh = Math.max(0, Math.min(1, shield / max));
  return (
    <div
      className={`hpbar ${hero ? 'hero' : ''} ${f < 0.3 ? 'low' : ''}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(hp)}
      aria-label={hero ? 'Hero health' : 'Health'}
    >
      <div className="hpbar-lag" style={{ transform: `scaleX(${f})` }} />
      <div className="hpbar-fill" style={{ transform: `scaleX(${f})` }} />
      {sh > 0 && <div className="hpbar-shield" style={{ transform: `scaleX(${sh})` }} />}
      {hero && (
        <span className="hpbar-num">
          {Math.max(0, Math.round(hp))}
          {shield > 0 ? ` +${Math.round(shield)}` : ''}
        </span>
      )}
    </div>
  );
}

function BossBar({ u }) {
  const def = ENEMIES[u.enemyId];
  const f = Math.max(0, Math.min(1, u.hp / u.maxHp));
  const sh = Math.max(0, Math.min(1, u.shield / u.maxHp));
  const phases = u.edef?.phases || [];
  return (
    <div className="boss-bar2">
      <div className="bb-name">
        <span className="bb-tag">
          <Bi k="boss" inline />
        </span>
        <b>{def.py}</b> <span className="bb-zh">{def.zh}</span> <small>{def.name}</small>
        <span className="bb-num">
          {Math.max(0, Math.round(u.hp))}/{u.maxHp}
        </span>
      </div>
      <div className="bb-track">
        <div className="bb-lag" style={{ transform: `scaleX(${f})` }} />
        <div className="bb-fill" style={{ transform: `scaleX(${f})` }} />
        {sh > 0 && <div className="bb-shield" style={{ transform: `scaleX(${sh})` }} />}
        {phases.map((p, i) => (
          <i key={i} className={`bb-tick ${f <= p.at ? 'passed' : ''}`} style={{ left: `${p.at * 100}%` }} title={`Phase ${i + 2}`} />
        ))}
      </div>
    </div>
  );
}

/** One visual effect. Effects are immutable once created, so memo keeps them out of frame renders. */
/** A bolt between two heights: placed at their average and tilted to join them (skewY keeps x span). */
function zapPath(e) {
  if (e.y0 == null) return {};
  const mid = (e.y0 + e.y1) / 2;
  return { bottom: `${mid - (e.big ? 17 : 11)}px`, transform: `skewY(${e.skew || 0}deg)` };
}
/** Path variables for a projectile: start height, vertical travel, tilt, arc height, size, spin. */
function flight(e) {
  const base = e.big ? 16 : e.small ? 7 : 10;
  const o = { fontSize: `${base * (e.size || 1)}px`, '--spin': `${e.spin ?? 540}deg` };
  if (e.y0 == null) return o;
  return { ...o, bottom: `${e.y0}px`, '--dy': `${-e.dy}px`, '--tilt': `${e.arc ? 0 : e.tilt || 0}deg`, '--apex': `${e.apex || 40}px` };
}
/** A projectile's trail settings for one flight (scaled by the editor's slow motion). */
function trail(cfg, slowBy) {
  const t = cfg.trail;
  if (!t || !t.style || t.style === 'none' || !(t.count > 0)) return null;
  return { ...t, gap: (t.gap || 16) * slowBy };
}
/**
 * The trail: copies that fly the exact same path (straight or arcing) a little later, smaller and
 * fainter, so it always follows the projectile's real route. 'glow': soft dots in the trail colour;
 * 'echo': fading copies of the projectile's own look.
 */
function Trail({ e, style }) {
  const t = e.trail;
  if (!t) return null;
  const base = parseFloat(style.fontSize) || 10;
  return Array.from({ length: t.count }, (_, k) => {
    const f = 1 - (k + 1) / (t.count + 1);
    return (
      <div
        key={k}
        className={`fxp fxp-trail ${e.arc ? 'arc' : ''} ${e.to >= e.x ? 'dir-r' : 'dir-l'} ${t.style === 'echo' ? `p-${e.style} no-tail` : 't-glow'}`}
        style={{
          ...style,
          '--lag': `${(k + 1) * t.gap}ms`,
          '--o': (t.opacity ?? 0.6) * f,
          '--tc': t.color || '#ffffff',
          fontSize: `${base * (t.size ?? 1) * (0.45 + 0.55 * f)}px`,
          mixBlendMode: t.blend ? 'screen' : undefined,
        }}
      >
        <i />
      </div>
    );
  });
}
/** A projectile drawn with a looping sprite effect instead of its CSS look. */
function ProjSprite({ sprite }) {
  const def = effectDef(sprite.name);
  const sh = def && fx().sheets[def.sheet];
  if (!sh) return null;
  const dur = (sh.frames / (def.fps || 15)) * 1000;
  return (
    <span className="proj-sprite" style={{ width: sprite.w, height: sprite.h, left: -sprite.w / 2, top: -sprite.h / 2 }}>
      <SheetFrames sheetKey={def.sheet} sh={sh} hue={def.hue || 0} dur={dur} />
    </span>
  );
}
const Effect = memo(function Effect({ e }) {
  const style = { left: `${e.x}%`, '--c': e.color || '#fff' };
  switch (e.type) {
    case 'vfx':
      return <VfxSprite e={e} />;
    case 'proj':
      return (
        <>
          <Trail e={e} style={{ ...style, '--to': `${e.to - e.x}cqw`, '--dur': `${e.ms}ms`, ...flight(e) }} />
          <div
            className={`fxp ${e.sprite ? 'p-sprite' : `p-${e.style}`} ${e.to >= e.x ? 'dir-r' : 'dir-l'} ${e.arc ? 'arc' : ''} ${e.notail ? 'no-tail' : ''}`}
            style={{ ...style, '--to': `${e.to - e.x}cqw`, '--dur': `${e.ms}ms`, ...flight(e) }}
          >
            <i>{e.sprite && <ProjSprite sprite={e.sprite} />}</i>
          </div>
        </>
      );
    case 'zap':
      return (
        <svg
          className={`fx-zap ${e.big ? 'big' : ''}`}
          style={{ left: `${Math.min(e.x, e.to)}%`, width: `${Math.max(1, Math.abs(e.to - e.x))}%`, ...zapPath(e) }}
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline className="zap-glow" points={e.pts} />
          <polyline className="zap-core" points={e.pts} />
        </svg>
      );
    case 'fruit':
      return (
        <>
          <Trail e={e} style={{ ...style, '--to': `${e.to - e.x}cqw`, '--dur': `${e.ms}ms`, ...flight(e) }} />
          <div className={`fxp p-fruit ${e.arc ? 'arc' : ''} ${e.to >= e.x ? 'dir-r' : 'dir-l'}`} style={{ ...style, '--to': `${e.to - e.x}cqw`, '--dur': `${e.ms}ms`, ...flight(e) }}>
            <i>{e.sprite ? <ProjSprite sprite={e.sprite} /> : e.emoji}</i>
          </div>
        </>
      );
    case 'nom':
      return (
        <div className="fx-nom" style={style}>
          <i>{e.emoji}</i>
          <b>nom!</b>
        </div>
      );
    case 'splash':
    case 'wallhit':
      return (
        <div className={`fx-${e.type}`} style={style}>
          <i />
          <i />
          <i />
        </div>
      );
    case 'melee':
      return (
        <div className={`fx-melee m-${e.style} ${e.mirror ? 'mirror' : ''}`} style={style}>
          <i />
          <b />
        </div>
      );
    case 'impact':
      return (
        <div className={`fx-impact i-${e.el} ${e.crit ? 'crit' : ''} ${e.eff ? `eff-${e.eff}` : ''}`} style={style}>
          {e.eff === 'frenzy' && <em />}
          <i />
          <b />
        </div>
      );
    case 'slam':
      return (
        <div className="fx-slam" style={style}>
          <i className="slam-chain" />
          <i className="slam-ball" />
          <b className="slam-ring" />
          {e.pts.map((p, i) => (
            <svg key={i} className="slam-bolt" style={{ '--r': `${i * 55 - 55}deg` }} viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
              <polyline className="zap-core" points={p} />
            </svg>
          ))}
        </div>
      );
    case 'tburst':
      return (
        <div className="fx-tburst" style={style}>
          {e.pts.map((p, i) => (
            <svg key={i} className="slam-bolt" style={{ '--r': `${i * 90 + 30}deg` }} viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
              <polyline className="zap-core" points={p} />
            </svg>
          ))}
        </div>
      );
    case 'dust':
      return (
        <div className={`fx-dust ${e.small ? 'small' : ''}`} style={style}>
          <i />
          <i />
          <i />
        </div>
      );
    case 'spell':
      return (
        <div className={`fx-spell sp-${e.kind}`} style={{ ...style, '--from': `${(e.from ?? e.x) - e.x}cqw` }}>
          {Array.from({ length: SPELL_PARTS[e.kind] || 1 }, (_, i) => (
            <i key={i} style={{ '--i': i }} />
          ))}
        </div>
      );
    default:
      return <div className={`fx fx2-${e.type} ${e.big ? 'big' : ''}`} style={style} />;
  }
});

function PerfOverlay({ p, fx, floats, units }) {
  const proj = fx.filter((e) => e.type === 'proj' || e.type === 'zap').length;
  return (
    <div className="perf-overlay" aria-hidden="true">
      <b>{p.fps}</b> fps · worst {p.worstShown}ms
      <br />
      js {p.simMs.toFixed(1)}ms · render {p.renderMs.toFixed(1)}ms
      <br />
      fx {fx.length} · proj {proj} · text {floats} · units {units}
    </div>
  );
}

/** Momentum: two stacked orange chevrons with a black outline, beside the character
 * (left of heroes, right of enemies), pulsing gently upward. */
const Momentum = memo(function Momentum({ side, granted = false, inline = false }) {
  return (
    <svg className={`momentum ${side === 0 ? 'left' : 'right'} ${granted ? 'granted' : ''} ${inline ? 'inline' : ''}`} viewBox="0 0 16 20" aria-label="Momentum" role="img">
      {[3, 10].map((y) => (
        <g key={y}>
          <path d={`M2.5 ${y + 6} L8 ${y + 0.8} L13.5 ${y + 6}`} className="chev-outline" />
          <path d={`M2.5 ${y + 6} L8 ${y + 0.8} L13.5 ${y + 6}`} className="chev-fill" />
        </g>
      ))}
    </svg>
  );
});

/** Enemy inspection: traits and behaviour live here, not on the battlefield. */
function EnemyPanel({ b, focus, onClose }) {
  const list = b.foes().sort((a, c) => (a.id === focus ? -1 : c.id === focus ? 1 : a.x - c.x));
  return (
    <div className="enemy-panel" role="dialog" aria-label="Enemy information">
      <div className="ep-head">
        <b>
          <Bi py="dí rén" en="Enemies" inline />
        </b>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="x" size={16} />
        </button>
      </div>
      {list.map((u) => {
        const def = ENEMIES[u.enemyId];
        return (
          <div key={u.id} className={`ep-row ${u.id === focus ? 'on' : ''}`}>
            <div className="ep-name">
              <b>{def.py}</b> <span className="ep-zh">{def.zh}</span> <small>{def.name}</small>
              <span className="ep-hp">
                {Math.max(0, Math.round(u.hp))}/{u.maxHp}
              </span>
            </div>
            <div className="ep-tags">
              <span className="aff" style={{ '--c': ELEMENTS[u.attackElement]?.color }}>
                attacks: {ELEMENTS[u.attackElement]?.py} · {ELEMENTS[u.attackElement]?.name}
              </span>
              {Object.keys(u.statuses).map((k) => (
                <span key={k} className="aff" style={{ '--c': STATUSES[k].color }}>
                  {STATUSES[k].py} · {STATUSES[k].name}
                </span>
              ))}
              {u.kbRes > 0 && <span className="aff">sturdy: {Math.round(u.kbRes * 100)}% less knockback</span>}
              {u.stance !== 'normal' && <span className="aff">{u.stance === 'aggressive' ? 'aggressive: invades your half' : 'defensive: holds its half'}</span>}
            </div>
            {def.blurb && <p className="ep-blurb">{def.blurb}</p>}
          </div>
        );
      })}
    </div>
  );
}
