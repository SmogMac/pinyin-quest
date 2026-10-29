// Real-time battle: steps the combat engine at a fixed rate and renders units, attacks, statuses,
// reactions and terrain at display rate. The player casts two spells (signature + pickup) by solving
// Mandarin puzzles while the fight continues (optionally slowed in Relaxed Casting mode).
//
// Battle flow (one-way, safe against repeated events):
//   FIGHTING  – the loop steps the engine; events are drained every frame (player actions emit
//               outside of steps, e.g. a spell that kills the last enemy)
//   RESOLVED  – the engine has a result: the outcome is reported once via onResolve (the run is
//               saved at this moment, so a reload never replays a finished fight) and the
//               Victory/Defeat overlay is shown
//   → onContinue when the player taps Continue (rewards / map / end screen)
//
// Rendering: the simulation runs at COMBAT.dt (20 Hz); unit positions are interpolated between the
// last two steps so motion is smooth at any display rate. Static layers (backdrop, sprites, the
// puzzle sheet, effects) are memoised so a frame only re-renders what moves.
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Battle } from '../game/combat.js';
import { COMBAT } from '../game/data/balance.js';
import { ELEMENTS, STATUSES, TERRAIN } from '../game/data/elements.js';
import { BIOMES } from '../game/data/biomes.js';
import { ENEMIES } from '../game/data/enemies.js';
import { SPELL_SLOTS } from '../game/data/spells.js';
import { heroFor } from '../game/run.js';
import { wraithWords } from '../game/unlocks.js';
import { generatePuzzle } from '../learn/puzzles.js';
import { useStore, update, getState } from '../store/store.js';
import { play } from '../audio/sfx.js';
import Sprite, { ItemIcon } from './Sprite.jsx';
import CastPuzzle from './CastPuzzle.jsx';
import Bi from './Bi.jsx';
import Icon from '../assets/icons/Icons.jsx';
import { BgSky, BgFar, BgMid, BgGround, BgDecor } from '../assets/backgrounds/Backgrounds.jsx';

const STATUS_GLYPH = { burn: 'flame', chill: 'snow', frozen: 'snow', wet: 'drop', shock: 'bolt', curse: 'skull', stun: 'star', dazzle: 'sun' };
const MAX_FX = 48;
const MAX_FLOATS = 24;
const MELEE_FX = new Set(['slash', 'dagger', 'chain']);
// spell id -> cast effect (CSS `.sp-<kind>`); `at`: where it plays
const SPELL_FX = {
  jiayou: { kind: 'cheer', at: 'hero' },
  badao: { kind: 'iaido', at: 'field' },
  dianhuo: { kind: 'flames', at: 'foes' },
  xuanfeng: { kind: 'whirl', at: 'hero' },
  huoqiu: { kind: 'windup', at: 'hero' },
  dongtian: { kind: 'nova', at: 'hero' },
  xiayu: { kind: 'rain', at: 'hero' },
  qiang: { kind: 'wall', at: 'hero' },
  heiye: { kind: 'night', at: 'field' },
  dafeng: { kind: 'gust', at: 'hero' },
  yangguang: { kind: 'rays', at: 'hero' },
  dahai: { kind: 'wave', at: 'field' },
  dizhen: { kind: 'quake', at: 'field' },
  xixue: { kind: 'drain', at: 'front' },
  xingxing: { kind: 'star', at: 'front' },
  kuaipao: { kind: 'speed', at: 'hero' },
  zhishi: { kind: 'scrolls', at: 'hero' },
};
// number of particle elements per spell effect
const SPELL_PARTS = { rain: 10, wall: 3, flames: 3, cheer: 6, scrolls: 3, speed: 4, whirl: 3, gust: 3, drain: 4, quake: 5, nova: 2, iaido: 2 };
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

export default function BattleScreen({ run: runProp, accountLevel, worldColor = 1, onResolve, onContinue, onInventory }) {
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
      runState: { ...run.runState, wraithWords: wraithWords(getState()) },
    });
  }
  const b = bRef.current;
  const H = b.hero;
  const heroFx = H.hdef.attack?.fx || 'orb';
  const heroMelee = MELEE_FX.has(heroFx);
  const meter = H.hdef.passive?.meter;

  const [, setFrame] = useState(0);
  const [puzzle, setPuzzle] = useState(null); // { slot, puzzle, id }
  const puzzleRef = useRef(null);
  puzzleRef.current = puzzle;
  const lastType = useRef(null);
  const stats = useRef({ casts: 0, fizzles: 0 });
  const vis = useRef({ floats: [], effects: [], unitFx: {}, flash: {}, impactAt: {}, dead: {}, banner: null, stageFx: null, shake: 0 });
  const alpha = useRef(1);
  const phase = useRef('fighting'); // fighting -> resolved (never back)
  const [ended, setEnded] = useState(null);
  const endedRef = useRef(null);
  // the loop closure is created once, so it reads the latest callback through a ref
  const onResolveRef = useRef(onResolve);
  onResolveRef.current = onResolve;
  const perf = useRef({ frames: 0, windowStart: 0, fps: 0, worst: 0, worstShown: 0, simMs: 0, renderMs: 0, renderStart: 0 });

  // ---------------------------------------------------------------- event -> visuals
  const xOf = (id) => {
    if (id === 'hero') return H.x;
    const u = b.units.find((x) => x.id === id);
    return u ? u.x : 60;
  };
  const now = () => performance.now();
  function pushFx(e) {
    const v = vis.current;
    v.effects.push({ id: ++fxSeq, ...e });
    if (v.effects.length > MAX_FX) v.effects.shift();
  }
  function float(x, text, kind, color) {
    const v = vis.current;
    v.floats.push({ id: ++fxSeq, x: x + (Math.random() * 4 - 2), text, kind, color, until: now() + 950 });
    if (v.floats.length > MAX_FLOATS) v.floats.shift();
  }
  function unitState(id, state, ms) {
    vis.current.unitFx[id] = { state, until: now() + ms };
  }
  function flash(id) {
    // one red flash per ~0.25s per unit, so rapid hits don't strobe
    const v = vis.current;
    if ((v.flash[id] || 0) > now()) return;
    v.flash[id] = now() + 240;
  }
  function impact(id, element, crit) {
    const v = vis.current;
    const t = now();
    if (!crit && (v.impactAt[id] || 0) > t) return;
    v.impactAt[id] = t + 90;
    pushFx({ type: 'impact', el: element || 'physical', x: xOf(id), crit, until: t + (crit ? 420 : 320) });
  }
  function spellFx(spell, element) {
    const cfg = SPELL_FX[spell];
    if (!cfg) return;
    const t = now();
    const color = ELEMENTS[element]?.color;
    if (cfg.at === 'foes') for (const f of b.foes()) pushFx({ type: 'spell', kind: cfg.kind, x: f.x, color, until: t + 900 });
    else if (cfg.at === 'front') {
      const f = b.front();
      pushFx({ type: 'spell', kind: cfg.kind, x: f ? f.x : 60, from: H.x, color, until: t + 1500 });
    } else if (cfg.at === 'field') {
      pushFx({ type: 'spell', kind: cfg.kind, x: 50, color, until: t + 1000 });
      if (cfg.kind === 'quake' && !getState().settings.reducedMotion) vis.current.shake = t + 600;
    } else pushFx({ type: 'spell', kind: cfg.kind, x: H.x, color, until: t + 1000 });
  }

  function handle(events) {
    const v = vis.current;
    for (const e of events) {
      switch (e.type) {
        case 'shot': {
          const from = xOf(e.src);
          const to = xOf(e.tgt);
          const t = now();
          if (e.src === 'hero' && heroMelee && !e.spell) {
            pushFx({ type: 'melee', style: heroFx, x: to, from, until: t + (heroFx === 'chain' ? 420 : 280) });
            break;
          }
          const el = e.element || 'physical';
          if (el === 'lightning' || e.bolt) {
            pushFx({ type: 'zap', x: from, to, pts: zapPoints(), big: e.big || e.spell, until: t + 200 });
            break;
          }
          const style = el !== 'physical' ? el : e.src === 'hero' ? heroFx : 'orb';
          const dist = Math.abs(to - from);
          const ms = Math.round(Math.max(160, Math.min(380, dist * 6)) * (el === 'earth' ? 1.25 : el === 'wind' ? 1.15 : 1));
          pushFx({ type: 'proj', style, x: from, to, big: e.big || e.spell, small: e.small, ms, until: t + ms });
          break;
        }
        case 'attack':
          if (e.src === 'hero') unitState('hero', heroFx === 'chain' ? 'smash' : heroMelee ? 'attack' : 'shoot', heroFx === 'chain' ? 420 : 280);
          else unitState(e.src, 'attack', 280);
          if (e.big) play('crit');
          break;
        case 'hit': {
          const x = xOf(e.tgt);
          if (e.amount > 0 || e.absorbed > 0) {
            const kind = e.tgt === 'hero' ? 'taken' : e.crit ? 'crit' : e.kind === 'dot' ? 'dot' : e.kind === 'spell' ? 'spell' : 'dmg';
            if (e.amount > 0) float(x, e.crit ? `${e.amount}!` : `${e.amount}`, kind, e.element !== 'physical' ? ELEMENTS[e.element]?.color : null);
            if (e.absorbed > 0) float(x, `(${e.absorbed})`, 'absorb');
          }
          if (e.eff === 'weak') float(x, 'Weak!', 'weak');
          else if (e.eff === 'resist' || e.eff === 'immune') float(x, e.eff === 'immune' ? 'Immune' : 'Resist', 'resist');
          if (e.kind !== 'dot' && e.amount > 0) {
            flash(e.tgt);
            unitState(e.tgt, 'hurt', 220);
          }
          if (e.kind === 'attack' || e.kind === 'spell') {
            impact(e.tgt, e.element, e.crit);
            play(e.crit ? 'crit' : 'hit');
          }
          break;
        }
        case 'reaction':
          float(xOf(e.tgt), `${e.text}!`, 'reaction');
          pushFx({ type: 'burst', x: xOf(e.tgt), color: '#fff', until: now() + 450 });
          break;
        case 'label':
          if (e.tgt === 'field') v.banner = { text: e.text, until: now() + 1400, small: true };
          else float(xOf(e.tgt), e.text, e.kind === 'enemy' ? 'enemy' : e.kind === 'good' ? 'good' : 'proc');
          break;
        case 'heal':
          if (e.amount >= 2) float(xOf(e.tgt), `+${e.amount}`, 'heal');
          break;
        case 'dodge':
          float(xOf(e.tgt), 'Dodge', 'dodge');
          unitState(e.tgt, 'dodge', 340);
          play('dodge');
          break;
        case 'miss':
          float(xOf(e.tgt), 'Miss', 'dodge');
          break;
        case 'block':
          float(xOf('hero'), 'Block', 'dodge');
          unitState('hero', 'block', 320);
          pushFx({ type: 'guard', x: H.x, until: now() + 320 });
          break;
        case 'cast':
          if (e.enemy) pushFx({ type: 'burst', x: xOf('hero'), color: ELEMENTS[e.element]?.color || '#7a4dff', until: now() + 550 });
          else {
            unitState('hero', e.spell === 'leiting' ? 'smash' : 'cast', e.spell === 'leiting' ? 520 : 420);
            pushFx({ type: 'ring', x: H.x, color: ELEMENTS[e.element]?.color, until: now() + 600 });
            if (!e.echo) spellFx(e.spell, e.element);
            play('spell');
          }
          break;
        case 'slam':
          pushFx({ type: 'slam', x: xOf(e.tgt), pts: [zapPoints(), zapPoints(), zapPoints()], until: now() + 700 });
          if (!getState().settings.reducedMotion) v.shake = now() + 300;
          break;
        case 'burst':
          pushFx({ type: 'tburst', x: xOf(e.tgt), pts: [zapPoints(), zapPoints()], until: now() + 380 });
          break;
        case 'telegraph':
          float(xOf(e.src), e.text, e.friendly ? 'good' : 'warn');
          break;
        case 'phase':
          v.banner = { text: e.text, until: now() + 2200 };
          play('levelUp');
          break;
        case 'biome':
          v.stageFx = { kind: e.kind, until: now() + 650 };
          if (e.text) v.banner = { text: e.text, until: now() + 1200, small: true };
          if (e.kind === 'lightning' && e.tgt) pushFx({ type: 'strike', x: xOf(e.tgt), until: now() + 400 });
          break;
        case 'fizzle':
          float(xOf('hero'), 'shī bài · Fizzle', 'enemy');
          break;
        case 'corrupt':
          v.banner = { text: 'A spell was corrupted!', until: now() + 1600, small: true };
          break;
        case 'silence':
          v.banner = { text: `Passives silenced for ${e.dur}s`, until: now() + 1600, small: true };
          break;
        case 'death':
          v.dead[e.tgt] = now();
          play('die');
          break;
        case 'revive':
          // the reviving effect labels itself (phoenix, lucky streak, rising zombie)
          delete v.dead[e.tgt];
          unitState(e.tgt, 'cast', 380);
          break;
        default:
      }
    }
  }

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
      if (!b.result) {
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
      if (v.floats.length) v.floats = v.floats.filter((f) => f.until > n);
      if (v.effects.length) v.effects = v.effects.filter((f) => f.until > n);
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
  useLayoutEffect(() => {
    const p = perf.current;
    if (p.renderStart) p.renderMs = p.renderMs * 0.9 + (performance.now() - p.renderStart) * 0.1;
  });

  // ---------------------------------------------------------------- spellcasting
  const openCast = (slot) => {
    if (endedRef.current || puzzleRef.current || !b.beginCast(slot)) return;
    play('click');
    const pz = generatePuzzle({ spellId: b.spells[slot].id, save: getState(), soundless: getState().settings.soundless, last: lastType.current });
    lastType.current = pz.type;
    setPuzzle({ slot, puzzle: pz, id: ++puzzleSeq });
  };
  const onPuzzleDone = useCallback((ok) => {
    const p = puzzleRef.current;
    if (!p) return;
    const res = b.finishCast(p.slot, ok);
    if (ok) stats.current.casts += 1;
    else stats.current.fizzles += 1;
    if (res.retry && b.beginCast(p.slot)) {
      const pz = generatePuzzle({ spellId: b.spells[p.slot].id, save: getState(), soundless: getState().settings.soundless, last: p.puzzle.type });
      setPuzzle({ slot: p.slot, puzzle: pz, id: ++puzzleSeq });
      return;
    }
    setPuzzle(null);
    pump(); // the spell may have ended the fight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onPuzzleCancel = useCallback(() => {
    const p = puzzleRef.current;
    if (p) b.cancelCast(p.slot);
    setPuzzle(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const swapForSoundless = useCallback(() => {
    const p = puzzleRef.current;
    if (!p) return;
    const pz = generatePuzzle({ spellId: b.spells[p.slot].id, save: getState(), soundless: true, last: p.puzzle.type });
    setPuzzle({ slot: p.slot, puzzle: pz, id: ++puzzleSeq });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keyboard: 1/2 cast (when no puzzle open)
  const openCastRef = useRef(openCast);
  openCastRef.current = openCast;
  useEffect(() => {
    const k = (e) => {
      if (puzzleRef.current || e.target.tagName === 'INPUT') return;
      const n = Number(e.key);
      if (n >= 1 && n <= SPELL_SLOTS) openCastRef.current(n - 1);
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
  const ix = (u) => (u.px === undefined ? u.x : u.px + (u.x - u.px) * a);
  const terrain = Object.keys(b.terrain).filter((k) => b.terrain[k] > 0);
  const boss = b.units.find((u) => u.side === 1 && (u.boss || u.edef?.guardian) && u.alive);
  const visibleUnits = b.units.filter((u) => u.alive || n - (v.dead[u.id] || 0) < 700);
  const meterVal = meter ? b.state(`passive:${H.heroId}`)[meter.key] || 0 : 0;

  return (
    <div className={`battle2 ${reduced ? 'calm' : ''}`}>
      <div className={`stage stage2 theme-${theme} ${v.stageFx && v.stageFx.until > n ? `flash-${v.stageFx.kind}` : ''} ${v.shake > n ? 'shaking' : ''}`}>
        <Backdrop theme={theme} worldColor={worldColor} />
        {terrain.map((k) => (
          <div key={k} className={`terrain-tint terrain-${k}`} style={{ '--tc': TERRAIN[k].color }} />
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
          const scale = isHero ? 0.62 : u.side === 0 ? 0.5 : (u.edef?.scale || 1) * (u.boss ? 0.62 : 0.56);
          const stList = u.alive ? Object.keys(u.statuses) : [];
          const isBoss = u === boss;
          return (
            <div
              key={u.id}
              className={`unit2 ${u.side === 0 ? 'side-hero' : 'side-enemy'} ${u.sprite === 'shade' ? 'is-shade' : ''} ${u.statuses.frozen ? 'is-frozen' : ''} ${u.charging ? 'is-charging' : ''} ${(v.flash[u.id] || 0) > n ? 'hit-flash' : ''}`}
              style={{ transform: `translateX(calc(${ix(u)}cqw - 50%))`, bottom: u.flying ? '30%' : '13%' }}
            >
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
              {u.side === 1 && u.alive && (
                <div className="unit-head">
                  {!isBoss && <span className="unit-name">{u.label || u.py}</span>}
                  {!isBoss && <HpBar hp={u.hp} max={u.maxHp} shield={u.shield} />}
                  <AffinityPips u={u} />
                </div>
              )}
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
              <Sprite id={sprite} state={state} scale={scale} />
            </div>
          );
        })}

        {v.effects.map((e) => (
          <Effect key={e.id} e={e} />
        ))}
        {v.floats.map((f) => (
          <div key={f.id} className={`float float-${f.kind}`} style={{ left: `${f.x}%`, color: f.color || undefined }}>
            {f.text}
          </div>
        ))}
        {v.banner && v.banner.until > n && <div className={`battle-banner ${v.banner.small ? 'small' : ''}`}>{v.banner.text}</div>}
        {s.settings.perfOverlay && <PerfOverlay p={perf.current} fx={v.effects} floats={v.floats.length} units={b.units.length} />}

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

      <div className="battle-hud2">
        <div className="hud-row hud-controls">
          <button type="button" className="chip small" onClick={onInventory} aria-label="Items and synergies">
            <Icon name="chest" size={14} /> {run.items.length}
          </button>
          {Object.keys(H.statuses).map((k) => (
            <span key={k} className="status-pip big" style={{ background: STATUSES[k].color }} title={STATUSES[k].name}>
              <Icon name={STATUS_GLYPH[k]} size={12} />
            </span>
          ))}
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
            <button type="button" className="chip small" onClick={skip} title="Finish the fight instantly (no spells)">
              <Icon name="skip" size={12} /> <Bi k="skip" inline />
            </button>
          )}
        </div>
        <div className="spell-bar two">
          {Array.from({ length: SPELL_SLOTS }, (_, slot) => {
            const sp = b.spells[slot];
            const kindLabel = <span className="slot-kind">{slot === 0 ? <Bi k="signature" inline /> : <Bi k="pickup" inline />}</span>;
            if (!sp) {
              return (
                <div key={`e${slot}`} className="spell-btn empty" aria-label="Empty pickup slot">
                  {kindLabel}
                  <span className="spell-name">
                    <Bi k="empty" />
                  </span>
                  <small className="empty-hint">Find spells on your route</small>
                </div>
              );
            }
            const ready = sp.state === 'ready' && !ended;
            const casting = sp.state === 'casting';
            const frac = sp.state === 'cooldown' ? 1 - sp.cdLeft / (sp.def.cd * (1 - (H.cdr || 0)) * (sp.corrupted ? 1.5 : 1)) : 1;
            const el = ELEMENTS[sp.def.element];
            return (
              <button
                key={sp.slot}
                type="button"
                className={`spell-btn ${slot === 0 ? 'sig' : 'pick'} ${ready ? 'ready' : ''} ${casting ? 'casting' : ''} ${sp.corrupted ? 'corrupted' : ''}`}
                style={{ '--el': el.color, '--cd': `${Math.max(0, Math.min(1, frac)) * 360}deg` }}
                disabled={!ready || Boolean(puzzle) || Boolean(ended)}
                onClick={() => openCast(sp.slot)}
                aria-label={`Cast ${sp.def.en}${ready ? '' : ' (recharging)'}`}
              >
                {kindLabel}
                <span className="spell-dial" />
                <ItemIcon kind="spell" id={sp.id} def={sp.def} size={38} />
                {/* while a puzzle is open, show English names so the bar never reveals an answer */}
                <span className="spell-name">{puzzle ? sp.def.en : sp.def.py}</span>
                {sp.signature && <span className="seal" title="Signature spell">印</span>}
                {!ready && !casting && <span className="spell-cd">{Math.ceil(sp.cdLeft)}</span>}
                <kbd>{sp.slot + 1}</kbd>
              </button>
            );
          })}
        </div>
      </div>

      {puzzle && !ended && (
        <CastPuzzle key={puzzle.id} puzzle={puzzle.puzzle} onDone={onPuzzleDone} onCancel={onPuzzleCancel} onSoundlessSwap={swapForSoundless} />
      )}
    </div>
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
const Effect = memo(function Effect({ e }) {
  const style = { left: `${e.x}%`, '--c': e.color || '#fff' };
  switch (e.type) {
    case 'proj':
      return (
        <div
          className={`fxp p-${e.style} ${e.to >= e.x ? 'dir-r' : 'dir-l'} ${e.big ? 'big' : ''} ${e.small ? 'small' : ''}`}
          style={{ ...style, '--to': `${e.to - e.x}cqw`, '--dur': `${e.ms}ms` }}
        >
          <i />
        </div>
      );
    case 'zap':
      return (
        <svg
          className={`fx-zap ${e.big ? 'big' : ''}`}
          style={{ left: `${Math.min(e.x, e.to)}%`, width: `${Math.max(1, Math.abs(e.to - e.x))}%` }}
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline className="zap-glow" points={e.pts} />
          <polyline className="zap-core" points={e.pts} />
        </svg>
      );
    case 'melee':
      return (
        <div className={`fx-melee m-${e.style}`} style={style}>
          <i />
          <b />
        </div>
      );
    case 'impact':
      return (
        <div className={`fx-impact i-${e.el} ${e.crit ? 'crit' : ''}`} style={style}>
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
    case 'spell':
      return (
        <div className={`fx-spell sp-${e.kind}`} style={{ ...style, '--from': `${(e.from ?? e.x) - e.x}cqw` }}>
          {Array.from({ length: SPELL_PARTS[e.kind] || 1 }, (_, i) => (
            <i key={i} style={{ '--i': i }} />
          ))}
        </div>
      );
    default:
      return <div className={`fx fx2-${e.type}`} style={style} />;
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

function AffinityPips({ u }) {
  const entries = Object.entries(u.affinity || {}).filter(([el]) => ELEMENTS[el]);
  const weak = entries.filter(([, m]) => m > 1).slice(0, 2);
  const resist = entries.filter(([, m]) => m < 1).slice(0, 2);
  if (!weak.length && !resist.length) return null;
  return (
    <div className="aff-pips">
      {weak.map(([el]) => (
        <span key={el} className="aff weak" style={{ '--c': ELEMENTS[el].color }} title={`Weak to ${ELEMENTS[el].name}`}>
          ▲{ELEMENTS[el].py}
        </span>
      ))}
      {resist.map(([el]) => (
        <span key={el} className="aff resist" style={{ '--c': ELEMENTS[el].color }} title={`Resists ${ELEMENTS[el].name}`}>
          ▼{ELEMENTS[el].py}
        </span>
      ))}
    </div>
  );
}
