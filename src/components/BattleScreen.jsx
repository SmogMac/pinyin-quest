// Real-time battle: steps the combat engine every frame and renders units, projectiles, statuses,
// reactions and terrain. The player casts up to three spells by solving Mandarin puzzles while the
// fight continues (optionally slowed in Relaxed Casting mode).
import { useEffect, useRef, useState } from 'react';
import { Battle } from '../game/combat.js';
import { COMBAT } from '../game/data/balance.js';
import { ELEMENTS, STATUSES, TERRAIN } from '../game/data/elements.js';
import { BIOMES } from '../game/data/biomes.js';
import { ENEMIES } from '../game/data/enemies.js';
import { heroFor } from '../game/run.js';
import { wraithWords } from '../game/unlocks.js';
import { generatePuzzle } from '../learn/puzzles.js';
import { useStore, update, getState } from '../store/store.js';
import { play } from '../audio/sfx.js';
import Sprite, { ItemIcon } from './Sprite.jsx';
import CastPuzzle from './CastPuzzle.jsx';
import { Bar } from './ui.jsx';
import Icon from '../assets/icons/Icons.jsx';
import { BgSky, BgFar, BgMid, BgNear, BgGround, BgDecor } from '../assets/backgrounds/Backgrounds.jsx';

const STATUS_GLYPH = { burn: 'flame', chill: 'snow', frozen: 'snow', wet: 'drop', shock: 'bolt', curse: 'skull', stun: 'star', dazzle: 'sun' };
let fxSeq = 0;
let puzzleSeq = 0;

export default function BattleScreen({ run, accountLevel, worldColor = 1, onEnd, onInventory }) {
  const s = useStore();
  const speed = s.settings.battleSpeed === 2 ? 2 : 1;
  const reduced = s.settings.reducedMotion;
  const biome = BIOMES[run.battle.biome];
  const theme = biome.theme;

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

  const [, setFrame] = useState(0);
  const [puzzle, setPuzzle] = useState(null); // { slot, puzzle }
  const puzzleRef = useRef(null);
  puzzleRef.current = puzzle;
  const lastType = useRef(null);
  const stats = useRef({ casts: 0, fizzles: 0 });
  const vis = useRef({ floats: [], effects: [], unitFx: {}, dead: {}, banner: null, flash: null });
  const [ended, setEnded] = useState(null);

  // ---------------------------------------------------------------- event -> visuals
  const xOf = (id) => {
    if (id === 'hero') return b.hero.x;
    const u = b.units.find((x) => x.id === id);
    return u ? u.x : 60;
  };
  const now = () => performance.now();
  function float(x, text, kind, color) {
    const v = vis.current;
    v.floats.push({ id: ++fxSeq, x: x + (Math.random() * 4 - 2), text, kind, color, until: now() + 950 });
    if (v.floats.length > 24) v.floats.shift();
  }
  function unitState(id, state, ms) {
    vis.current.unitFx[id] = { state, until: now() + ms };
  }
  function handle(events) {
    const v = vis.current;
    for (const e of events) {
      switch (e.type) {
        case 'shot':
          v.effects.push({ id: ++fxSeq, type: 'projectile', x: xOf(e.src), to: xOf(e.tgt), color: ELEMENTS[e.element]?.color, glow: ELEMENTS[e.element]?.glow, big: e.big || e.spell, bolt: e.bolt, small: e.small, until: now() + 260 });
          break;
        case 'attack':
          unitState(e.src, 'attack', 260);
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
          if (e.kind !== 'dot') unitState(e.tgt, 'hurt', 200);
          if (e.kind === 'attack' || e.kind === 'spell') play(e.crit ? 'crit' : 'hit');
          break;
        }
        case 'reaction':
          float(xOf(e.tgt), `${e.text}!`, 'reaction');
          v.effects.push({ id: ++fxSeq, type: 'burst', x: xOf(e.tgt), color: '#fff', until: now() + 450 });
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
          play('dodge');
          break;
        case 'miss':
          float(xOf(e.tgt), 'Miss', 'dodge');
          break;
        case 'block':
          float(xOf('hero'), 'Block', 'dodge');
          break;
        case 'cast':
          if (e.enemy) v.effects.push({ id: ++fxSeq, type: 'burst', x: xOf('hero'), color: ELEMENTS[e.element]?.color || '#7a4dff', until: now() + 550 });
          else {
            unitState('hero', 'cast', 380);
            v.effects.push({ id: ++fxSeq, type: 'ring', x: xOf('hero'), color: ELEMENTS[e.element]?.color, until: now() + 600 });
            play('spell');
          }
          break;
        case 'telegraph':
          float(xOf(e.src), e.text, e.friendly ? 'good' : 'warn');
          break;
        case 'phase':
          v.banner = { text: e.text, until: now() + 2200 };
          play('levelUp');
          break;
        case 'biome':
          v.flash = { kind: e.kind, until: now() + 650 };
          if (e.text) v.banner = { text: e.text, until: now() + 1200, small: true };
          if (e.kind === 'lightning' && e.tgt) v.effects.push({ id: ++fxSeq, type: 'strike', x: xOf(e.tgt), until: now() + 400 });
          break;
        case 'fizzle':
          float(xOf('hero'), 'Fizzle…', 'enemy');
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
          v.banner = { text: 'zhǐ fèng · Reborn!', until: now() + 1800 };
          break;
        case 'end':
          setEnded(e.result);
          if (puzzleRef.current) setPuzzle(null);
          play(e.result === 'win' ? 'victory' : 'defeat');
          break;
        default:
      }
    }
  }

  // ---------------------------------------------------------------- main loop (combat never pauses)
  useEffect(() => {
    let raf;
    let last = performance.now();
    let acc = 0;
    const dt = COMBAT.dt;
    const loop = (t) => {
      const real = Math.min(0.1, (t - last) / 1000);
      last = t;
      const st = getState().settings;
      let sp = st.battleSpeed === 2 ? 2 : 1;
      if (puzzleRef.current && st.relaxedCasting) sp *= 0.4;
      acc += real * sp;
      let steps = 0;
      while (acc >= dt && !b.result && steps < 10) {
        handle(b.step(dt));
        acc -= dt;
        steps++;
      }
      const v = vis.current;
      const n = now();
      v.floats = v.floats.filter((f) => f.until > n);
      v.effects = v.effects.filter((f) => f.until > n);
      setFrame((x) => x + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------- spellcasting
  const openCast = (slot) => {
    if (ended || puzzle || !b.beginCast(slot)) return;
    play('click');
    const pz = generatePuzzle({ spellId: b.spells[slot].id, save: getState(), soundless: getState().settings.soundless, last: lastType.current });
    lastType.current = pz.type;
    setPuzzle({ slot, puzzle: pz, id: ++puzzleSeq });
  };
  const onPuzzleDone = (ok) => {
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
  };
  const onPuzzleCancel = () => {
    const p = puzzleRef.current;
    if (p) b.cancelCast(p.slot);
    setPuzzle(null);
  };
  const swapForSoundless = () => {
    const p = puzzleRef.current;
    if (!p) return;
    const pz = generatePuzzle({ spellId: b.spells[p.slot].id, save: getState(), soundless: true, last: p.puzzle.type });
    setPuzzle({ slot: p.slot, puzzle: pz, id: ++puzzleSeq });
  };

  // keyboard: 1/2/3 cast (when no puzzle open)
  useEffect(() => {
    const k = (e) => {
      if (puzzleRef.current || e.target.tagName === 'INPUT') return;
      if (['1', '2', '3'].includes(e.key)) openCast(Number(e.key) - 1);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const skip = () => {
    if (ended) return;
    if (puzzleRef.current) onPuzzleCancel();
    let guard = 0;
    while (!b.result && guard++ < 6000) handle(b.step(COMBAT.dt));
    if (!b.result) b.finish('lose');
  };

  const finish = () =>
    onEnd({ result: b.result, heroHp: b.hero.hp, kills: b.kills, casts: stats.current.casts, fizzles: stats.current.fizzles, runState: { phoenixUsed: !!b.runState.phoenixUsed } });

  // ---------------------------------------------------------------- render
  const H = b.hero;
  const v = vis.current;
  const n = now();
  const terrain = Object.keys(b.terrain).filter((k) => b.terrain[k] > 0);
  const boss = b.units.find((u) => u.side === 1 && (u.boss || u.edef?.guardian) && u.alive);
  const visibleUnits = b.units.filter((u) => u.alive || n - (v.dead[u.id] || 0) < 700);

  return (
    <div className={`battle2 ${reduced ? 'calm' : ''}`}>
      <div className={`stage stage2 theme-${theme} ${v.flash && v.flash.until > n ? `flash-${v.flash.kind}` : ''}`}>
        <div className="bg-stack" style={{ filter: `saturate(${0.35 + 0.65 * worldColor})` }}>
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
        {boss && (
          <div className="boss-bar">
            <span className="boss-name">
              {ENEMIES[boss.enemyId].py} <small>{ENEMIES[boss.enemyId].name}</small>
            </span>
            <Bar value={boss.hp / boss.maxHp} color="var(--red)" />
          </div>
        )}

        {visibleUnits.map((u) => {
          const isHero = u === H;
          const fx = v.unitFx[u.id];
          let state = !u.alive ? 'dead' : fx && fx.until > n ? fx.state : isHero ? 'idle' : u.charging ? 'cast' : 'idle';
          if (u.alive && (u.statuses.frozen || u.statuses.stun)) state = 'still';
          const sprite = isHero ? H.sprite : u.sprite === 'shade' ? H.sprite : u.sprite;
          const scale = isHero ? 0.62 : u.side === 0 ? 0.5 : (u.edef?.scale || 1) * (u.boss ? 0.62 : 0.56);
          const stList = Object.keys(u.statuses);
          return (
            <div
              key={u.id}
              className={`unit2 ${u.side === 0 ? 'side-hero' : 'side-enemy'} ${u.sprite === 'shade' ? 'is-shade' : ''} ${u.statuses.frozen ? 'is-frozen' : ''} ${u.charging ? 'is-charging' : ''}`}
              style={{ left: `${u.x}%`, bottom: u.flying ? '30%' : '13%' }}
            >
              {u.side === 1 && u.alive && (
                <div className="unit-head">
                  <span className="unit-name">{u.label || u.py}</span>
                  <Bar value={u.hp / u.maxHp} color="var(--red)" className="hp-mini" />
                  {u.shield > 0 && <Bar value={Math.min(1, u.shield / u.maxHp)} color="var(--blue)" className="shield-mini" />}
                  <AffinityPips u={u} />
                </div>
              )}
              {stList.length > 0 && u.alive && (
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
              <Sprite id={sprite} state={state} scale={scale} flip={false} />
            </div>
          );
        })}

        {v.effects.map((e) => (
          <div key={e.id} className={`fx fx2-${e.type} ${e.big ? 'big' : ''} ${e.bolt ? 'bolt' : ''} ${e.small ? 'small' : ''}`} style={{ left: `${e.x}%`, '--to': `${((e.to ?? e.x) - e.x) * 1}cqw`, '--c': e.color || '#fff', '--g': e.glow || e.color || '#fff' }} />
        ))}
        {v.floats.map((f) => (
          <div key={f.id} className={`float float-${f.kind}`} style={{ left: `${f.x}%`, color: f.color || undefined }}>
            {f.text}
          </div>
        ))}
        {v.banner && v.banner.until > n && <div className={`battle-banner ${v.banner.small ? 'small' : ''}`}>{v.banner.text}</div>}

        {ended && (
          <div className={`battle-result ${ended} pop-in`}>
            <b>{ended === 'win' ? 'VICTORY!' : 'DEFEATED'}</b>
            <button type="button" className="btn btn-primary" onClick={finish} autoFocus>
              Continue
            </button>
          </div>
        )}
      </div>

      <div className="battle-hud2">
        <div className="hud-row">
          <Icon name="heart" size={16} />
          <Bar value={H.hp / H.maxHp} color="var(--green)" className="hp-big" label="Hero health" />
          <span className="hp-num">
            {Math.max(0, Math.round(H.hp))}/{H.maxHp}
          </span>
          {H.shield > 0 && (
            <span className="hud-shield">
              <Icon name="shield" size={13} /> {Math.round(H.shield)}
            </span>
          )}
        </div>
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
              <Icon name="skip" size={12} /> Skip
            </button>
          )}
        </div>
        <div className="spell-bar">
          {b.spells.map((sp) => {
            const ready = sp.state === 'ready';
            const casting = sp.state === 'casting';
            const frac = sp.state === 'cooldown' ? 1 - sp.cdLeft / (sp.def.cd * (1 - (H.cdr || 0)) * (sp.corrupted ? 1.5 : 1)) : 1;
            const el = ELEMENTS[sp.def.element];
            return (
              <button
                key={sp.slot}
                type="button"
                className={`spell-btn ${ready ? 'ready' : ''} ${casting ? 'casting' : ''} ${sp.corrupted ? 'corrupted' : ''}`}
                style={{ '--el': el.color, '--cd': `${Math.max(0, Math.min(1, frac)) * 360}deg` }}
                disabled={!ready || Boolean(puzzle) || Boolean(ended)}
                onClick={() => openCast(sp.slot)}
                aria-label={`Cast ${sp.def.en}${ready ? '' : ' (recharging)'}`}
              >
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
          {Array.from({ length: Math.max(0, 3 - b.spells.length) }, (_, i) => (
            <div key={`e${i}`} className="spell-btn empty" aria-hidden="true">
              <span className="spell-name">empty</span>
            </div>
          ))}
        </div>
      </div>

      {puzzle && !ended && (
        <CastPuzzle key={puzzle.id} puzzle={puzzle.puzzle} onDone={onPuzzleDone} onCancel={onPuzzleCancel} onSoundlessSwap={swapForSoundless} />
      )}
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
