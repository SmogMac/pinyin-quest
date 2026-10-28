// Replays a simulated battle (see game/combat.js) with sprites, effects and floating numbers.
// Rendering is fully separate from combat maths: the result is already decided by `sim`.
import { useEffect, useMemo, useRef, useState } from 'react';
import Sprite, { AbilityIcon } from './Sprite.jsx';
import { Bar } from './ui.jsx';
import Icon from '../assets/icons/Icons.jsx';
import { ELEMENTS } from '../game/data/elements.js';
import { BgSky, BgFar, BgMid, BgNear, BgGround, themeForFloor } from '../assets/backgrounds/Backgrounds.jsx';
import { play } from '../audio/sfx.js';
import { useStore, update } from '../store/store.js';
import { heroPalette } from '../game/achievements.js';
import { ENEMIES } from '../game/data/enemies.js';
import { UPGRADES } from '../game/data/upgrades.js';

const HERO_X = 24;
const enemyX = (i, n) => (n <= 1 ? 66 : 57 + (i * 30) / Math.max(1, n - 1));

let fxId = 0;

export default function BattleView({ sim, floor, upgrades = [], blessings = [], empower = 0, onDone }) {
  const s = useStore();
  const speed = s.settings.battleSpeed || 1;
  const reduced = s.settings.reducedMotion;
  const theme = themeForFloor(floor);

  const initialUnits = useMemo(() => {
    const u = { hero: { ...sim.initial.hero, state: 'walk', x: HERO_X } };
    if (sim.initial.ally) u.ally = { hp: 1, maxHp: 1, state: 'idle', x: HERO_X - 14, ally: true };
    sim.initial.enemies.forEach((e, i) => {
      u[e.id] = { ...e, shield: 0, state: 'walk', x: enemyX(i, sim.initial.enemies.length) };
    });
    return u;
  }, [sim]);

  const [units, setUnits] = useState(initialUnits);
  const [floats, setFloats] = useState([]);
  const [effects, setEffects] = useState([]);
  const [result, setResult] = useState(null);
  const [scroll, setScroll] = useState(true);
  const clock = useRef(-0.9); // negative: walk-in time before combat starts
  const idx = useRef(0);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const lastSfx = useRef(0);
  const timers = useRef([]);
  const doneRef = useRef(false);

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms / Math.max(1, speedRef.current * 0.7)));

  const pos = (id, all) => all[id]?.x ?? 70;

  function addFloat(id, text, kind, all) {
    const f = { id: ++fxId, x: pos(id, all) + (Math.random() * 6 - 3), text, kind };
    setFloats((fl) => [...fl.slice(-14), f]);
    later(() => setFloats((fl) => fl.filter((x) => x.id !== f.id)), 1000);
  }
  function addEffect(e) {
    const fx = { id: ++fxId, ...e };
    setEffects((l) => [...l.slice(-10), fx]);
    later(() => setEffects((l) => l.filter((x) => x.id !== fx.id)), e.dur || 600);
  }
  function setState(id, state, ms) {
    setUnits((u) => (u[id] && u[id].state !== 'dead' ? { ...u, [id]: { ...u[id], state } } : u));
    if (ms) later(() => setUnits((u) => (u[id] && u[id].state === state ? { ...u, [id]: { ...u[id], state: 'idle' } } : u)), ms);
  }
  const sfx = (name, force) => {
    const now = performance.now();
    if (force || now - lastSfx.current > 70) {
      lastSfx.current = now;
      play(name);
    }
  };

  function apply(ev, all, quiet) {
    switch (ev.type) {
      case 'attack':
        if (!quiet) setState(ev.src, 'attack', 260);
        break;
      case 'hit': {
        all[ev.tgt] = { ...all[ev.tgt], hp: ev.hp, shield: ev.shield };
        if (quiet) break;
        setUnits((u) => ({ ...u, [ev.tgt]: { ...u[ev.tgt], hp: ev.hp, shield: ev.shield, state: u[ev.tgt].state === 'dead' ? 'dead' : 'hurt' } }));
        later(() => setUnits((u) => (u[ev.tgt]?.state === 'hurt' ? { ...u, [ev.tgt]: { ...u[ev.tgt], state: 'idle' } } : u)), 220);
        const kind = ev.kind === 'dot' ? 'dot' : ev.crit ? 'crit' : ev.tgt === 'hero' ? 'taken' : ev.element ? 'spell' : 'dmg';
        if (ev.amount > 0) addFloat(ev.tgt, ev.crit ? `${ev.amount}!` : `${ev.amount}`, kind, all);
        if (ev.absorbed > 0) addFloat(ev.tgt, `(${ev.absorbed})`, 'absorb', all);
        if (ev.kind !== 'dot') sfx(ev.crit ? 'crit' : 'hit', ev.crit);
        if (ev.kind === 'attack' && ev.src !== 'hero' && ev.tgt !== 'hero') addEffect({ type: 'slash', x: pos(ev.tgt, all), color: '#fff', dur: 300 });
        if (ev.kind === 'attack' && ev.src === 'hero') addEffect({ type: 'slash', x: pos(ev.tgt, all), color: ev.crit ? '#ffd84a' : '#fff', dur: 300 });
        break;
      }
      case 'heal':
        all[ev.tgt] = { ...all[ev.tgt], hp: ev.hp };
        if (quiet) break;
        setUnits((u) => ({ ...u, [ev.tgt]: { ...u[ev.tgt], hp: ev.hp } }));
        if (ev.amount >= 1) addFloat(ev.tgt, `+${ev.amount}`, 'heal', all);
        break;
      case 'shield':
        all[ev.tgt] = { ...all[ev.tgt], shield: ev.shield };
        if (quiet) break;
        setUnits((u) => ({ ...u, [ev.tgt]: { ...u[ev.tgt], shield: ev.shield } }));
        break;
      case 'dodge':
        if (!quiet) {
          addFloat(ev.tgt, 'Dodge!', 'dodge', all);
          sfx('dodge');
        }
        break;
      case 'cast': {
        if (quiet) break;
        const el = ELEMENTS[ev.element] || ELEMENTS.arcane;
        const fromX = pos(ev.src, all);
        setState(ev.src, 'cast', 380);
        sfx('spell');
        if (ev.ability === 'water_shield' || ev.ability === 'bulwark') addEffect({ type: 'bubble', x: fromX, color: el.color, dur: 700 });
        else if (ev.ability === 'healing_spring' || ev.ability === 'radiant_heal') {
          addEffect({ type: 'sparkles', x: fromX, color: el.color, dur: 800 });
          sfx('heal', true);
        } else if (ev.ability === 'sunburst') ev.targets.forEach((t) => addEffect({ type: 'rays', x: pos(t, all), color: el.color, dur: 650 }));
        else if (ev.src === 'hero' || ev.src === 'ally')
          ev.targets.forEach((t) => addEffect({ type: 'projectile', x: fromX, to: pos(t, all), color: el.color, glow: el.glow, dur: 420, big: ev.fx === 'firestorm' }));
        else addEffect({ type: 'burst', x: pos(ev.targets[0], all), color: '#7a4dff', dur: 600 });
        if (ev.fx === 'firestorm') addFloat('hero', 'huǒ fēng bào!', 'synergy', all);
        if (ev.ability === 'iaido') addFloat('hero', 'bá dāo!', 'synergy', all);
        if (ev.ability === 'plum_cut') addFloat('hero', 'méi huā!', 'synergy', all);
        if (ev.ability === 'kindling') addFloat('hero', 'diǎn huǒ!', 'synergy', all);
        if (ev.ability === 'inkfire') addFloat(ev.src, 'mò huǒ!', 'enrage', all);
        break;
      }
      case 'status':
        break;
      case 'death':
        all[ev.tgt] = { ...all[ev.tgt], hp: 0, state: 'dead' };
        if (quiet) break;
        setUnits((u) => ({ ...u, [ev.tgt]: { ...u[ev.tgt], hp: 0, state: 'dead' } }));
        sfx('die', true);
        break;
      case 'summon': {
        const n = Object.values(all).filter((x) => x.enemyId).length;
        const unit = { ...ev.unit, shield: 0, state: 'walk', x: Math.min(92, enemyX(n, n + 1) + 6) };
        all[ev.unit.id] = unit;
        setUnits((u) => ({ ...u, [ev.unit.id]: unit }));
        if (!quiet) {
          addFloat(ev.src, 'Summons help!', 'synergy', all);
          later(() => setState(ev.unit.id, 'idle'), 500);
        }
        break;
      }
      case 'enrage':
        if (!quiet) addFloat(ev.tgt, ev.timeout ? 'Frenzy!' : 'ENRAGED!', 'enrage', all);
        break;
      case 'end':
        setResult(ev.result);
        setUnits((u) => {
          const next = { ...u };
          if (ev.result === 'win' && next.hero) next.hero = { ...next.hero, state: 'victory' };
          if (ev.result === 'lose' && next.hero) next.hero = { ...next.hero, state: 'dead' };
          return next;
        });
        play(ev.result === 'win' ? 'victory' : 'defeat');
        break;
      default:
    }
  }

  // main replay loop
  useEffect(() => {
    let raf;
    let last = performance.now();
    const all = { ...initialUnits };
    let started = false;
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      clock.current += dt * speedRef.current;
      if (!started && clock.current >= 0) {
        started = true;
        setScroll(false);
        setUnits((u) => Object.fromEntries(Object.entries(u).map(([k, v]) => [k, { ...v, state: 'idle' }])));
      }
      const evs = sim.events;
      while (idx.current < evs.length && evs[idx.current].t <= clock.current) apply(evs[idx.current++], all, false);
      if (idx.current < evs.length) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const tm = timers.current;
    return () => {
      cancelAnimationFrame(raf);
      tm.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim]);

  const skip = () => {
    const all = {};
    for (const [k, v] of Object.entries(units)) all[k] = { ...v };
    const evs = sim.events;
    while (idx.current < evs.length) apply(evs[idx.current++], all, true);
    setFloats([]);
    setEffects([]);
    setScroll(false);
    setUnits(() => {
      const out = {};
      for (const [k, v] of Object.entries(all)) out[k] = { ...v, state: v.hp <= 0 && k !== 'ally' ? 'dead' : 'idle' };
      if (out.hero) out.hero.state = sim.result === 'win' ? 'victory' : 'dead';
      return out;
    });
  };

  const setSpeed = (v) => update((st) => (st.settings.battleSpeed = v));

  const hero = units.hero;
  const palette = heroPalette(s);
  return (
    <div className={`battle ${reduced ? 'calm' : ''}`}>
      <div className={`stage theme-${theme}`}>
        <div className={`bg-stack ${scroll && !reduced ? 'scrolling' : ''}`}>
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
          <div className="bg-layer near">
            <BgNear theme={theme} />
            <BgNear theme={theme} />
          </div>
          <div className="bg-layer ground">
            <BgGround theme={theme} />
            <BgGround theme={theme} />
          </div>
        </div>

        {Object.entries(units).map(([id, u]) => {
          const isHero = id === 'hero';
          const sprite = isHero ? sim.initial.hero.sprite || 'xinyi' : id === 'ally' ? 'companion' : u.sprite;
          const scale = isHero ? 0.8 : id === 'ally' ? 0.8 : u.boss ? 0.78 : u.elite ? 0.78 : 0.74;
          return (
            <div key={id} className={`unit ${isHero || id === 'ally' ? 'side-hero' : 'side-enemy'} ${u.state === 'dead' ? 'is-dead' : ''}`} style={{ left: `${u.x}%` }}>
              {u.enemyId && u.state !== 'dead' && <span className="unit-name">{ENEMIES[u.enemyId]?.py}</span>}
              {id !== 'ally' && u.state !== 'dead' && (
                <div className="unit-bars">
                  <Bar value={u.hp / u.maxHp} color={isHero ? 'var(--green)' : 'var(--red)'} className="hp-mini" />
                  {u.shield > 0 && <Bar value={Math.min(1, u.shield / u.maxHp)} color="var(--blue)" className="shield-mini" />}
                </div>
              )}
              {u.shield > 0 && u.state !== 'dead' && <div className="shield-bubble" />}
              <Sprite id={sprite} state={u.state} scale={scale} palette={palette} />
            </div>
          );
        })}

        {effects.map((e) => (
          <div
            key={e.id}
            className={`fx fx-${e.type} ${e.big ? 'big' : ''}`}
            style={{ left: `${e.x}%`, '--to': e.to !== undefined ? `${(e.to - e.x) * 1}cqw` : '0', '--c': e.color, '--g': e.glow || e.color }}
          />
        ))}
        {floats.map((f) => (
          <div key={f.id} className={`float float-${f.kind}`} style={{ left: `${f.x}%` }}>
            {f.text}
          </div>
        ))}

        {result && (
          <div className={`battle-result ${result} pop-in`}>
            <b>{result === 'win' ? 'VICTORY!' : 'DEFEATED'}</b>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (doneRef.current) return;
                doneRef.current = true;
                onDone(sim);
              }}
              autoFocus
            >
              Continue
            </button>
          </div>
        )}
      </div>

      <div className="battle-hud">
        <div className="hud-hero">
          <div className="hud-hp-row">
            <Icon name="heart" size={18} />
            <Bar value={hero.hp / hero.maxHp} color="var(--green)" className="hp-big" label="Hero health" />
            <span className="hp-num">
              {Math.max(0, Math.round(hero.hp))}/{hero.maxHp}
            </span>
          </div>
          {hero.shield > 0 && (
            <div className="hud-shield">
              <Icon name="shield" size={14} /> {hero.shield}
            </div>
          )}
        </div>
        <div className="hud-buffs">
          {empower > 0 && (
            <span className="buff bad" title="Enemies are stronger from wrong answers">
              Foes +{Math.round(empower * 100)}% ATK
            </span>
          )}
          {blessings.length > 0 && (
            <span className="buff good" title="Blessings from correct answers">
              {blessings.length} blessing{blessings.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="hud-build">
          {upgrades.map((u) => (
            <span key={u.id} title={`${UPGRADES[u.id]?.py} · ${UPGRADES[u.id]?.name} ${u.level}`}>
              <AbilityIcon id={u.id} element={UPGRADES[u.id]?.element} size={34} level={u.level} />
            </span>
          ))}
        </div>
        <div className="battle-controls">
          {[1, 2, 4].map((v) => (
            <button key={v} type="button" className={`chip ${speed === v ? 'on' : ''}`} onClick={() => setSpeed(v)} aria-label={`Speed ${v}x`}>
              {v}×
            </button>
          ))}
          {!result && (
            <button type="button" className="chip" onClick={skip} aria-label="Skip battle">
              <Icon name="skip" size={14} /> Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
