// The continuous journey: the side-scrolling road the hero walks between encounters, and the
// encounters that happen on it (chest, merchant, stranger, hot spring, shrine). The world stays on
// screen the whole time; encounter panels slide up under it. Battles use BattleScreen with the same
// biome backdrop, so a fight feels like the road was interrupted, not like a different screen.
//
// ExploreScene only renders and times the walk: it never decides what comes next. The encounter
// sequence was generated when the area began (game/run.js) and is not shown to the player; the
// scene only learns the next encounter's type in the last moment before the hero reaches it.
import { memo, useEffect, useRef, useState } from 'react';
import Sprite, { ItemIcon } from './Sprite.jsx';
import Bi from './Bi.jsx';
import { Button, CnName } from './ui.jsx';
import Icon from '../assets/icons/Icons.jsx';
import { BgSky, BgFar, BgMid, BgGround, BgDecor } from '../assets/backgrounds/Backgrounds.jsx';
import { BIOMES } from '../game/data/biomes.js';
import { ITEMS } from '../game/data/items.js';
import { ELEMENTS } from '../game/data/elements.js';
import { BLESSINGS } from '../game/data/blessings.js';
import { SYNERGIES, synergiesCompletedBy } from '../game/data/synergies.js';
import { heroDef, HEROES } from '../game/data/heroes.js';
import { runSignatures } from '../game/run.js';

const asset = (src) => `${import.meta.env.BASE_URL}${src}`;
// The ground layer is twice the stage width and slides by one stage width every GROUND_CYCLE
// seconds (at 1× walking), so the ground moves at 100 / GROUND_CYCLE % of the stage per second.
// Everything standing on the road (encounters, ground decoration) moves at exactly that speed.
const GROUND_CYCLE = 3;
const groundPct = (speed) => (100 / GROUND_CYCLE) * speed; // % of stage width per second
// where an encounter comes to rest on the road, and where it enters (just off the right edge)
const PROP_STOP = 66;
const PROP_ENTER = 112;

/** A stranger's look: another hero, so travellers are recognisable but never the one you play. */
export function npcFor(run, i) {
  const others = Object.keys(HEROES).filter((id) => id !== run.heroId);
  return others[(i * 7 + (run.seed % 13)) % others.length];
}

const Scenery = memo(function Scenery({ theme, walking, speed }) {
  return (
    // own class (not .scrolling): the generic scrolling speeds would override the ground speed
    <div className={`bg-stack journey-bg ${walking ? 'walking' : 'paused'}`} style={{ '--walk': 1 / speed, '--ground': `${GROUND_CYCLE / speed}s` }}>
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
      {/* ground-level details travel with the ground (same layer width, same speed) */}
      <div className="bg-layer decor">
        <BgDecor theme={theme} />
        <BgDecor theme={theme} />
      </div>
      <div className="bg-layer ground">
        <BgGround theme={theme} />
        <BgGround theme={theme} />
      </div>
      {/* a little life in the world: drifting leaves and a few birds */}
      <div className="journey-life" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <i key={i} className="leaf" style={{ '--i': i }} />
        ))}
        <b className="bird" />
        <b className="bird b2" />
      </div>
    </div>
  );
});

/** What stands on the road for each kind of encounter. */
function EncounterProp({ type, enemies, npc, state }) {
  switch (type) {
    case 'battle':
    case 'elite':
    case 'guardian':
    case 'boss':
    case 'secretboss':
      return (
        <div className={`prop-foes ${type}`}>
          {(enemies || []).slice(0, 3).map((id, k) => (
            <span key={k} className="prop-foe" style={{ '--k': k }}>
              <Sprite id={spriteOf(id)} state="walk" scale={type === 'boss' ? 0.55 : 0.5} />
            </span>
          ))}
        </div>
      );
    case 'merchant':
      return (
        <div className="prop-merchant">
          <img src={asset('assets/props/cart.webp')} alt="" className="prop-img cart" />
          <span className="prop-fox">
            <Sprite id="companion" scale={0.9} />
          </span>
          <img src={asset('assets/props/lantern.webp')} alt="" className="prop-img lantern-post" />
        </div>
      );
    case 'chest':
      return (
        <div className={`prop-chest ${state === 'open' ? 'open' : ''}`}>
          <img src={asset('assets/props/chest.webp')} alt="" className="prop-img chest" />
          <i className="chest-glow" />
        </div>
      );
    case 'stranger':
      return (
        <div className="prop-stranger">
          <span className="npc">
            <Sprite id={npc} state="idle" scale={0.42} flip />
          </span>
          <b className="speech">?</b>
        </div>
      );
    case 'spring':
      return (
        <div className={`prop-spring ${state === 'soak' ? 'soaking' : ''}`}>
          <i className="pool" />
          {Array.from({ length: 5 }, (_, k) => (
            <i key={k} className="steam" style={{ '--k': k }} />
          ))}
          <i className="petal p1" />
          <i className="petal p2" />
        </div>
      );
    case 'shrine':
      return (
        <div className="prop-shrine">
          <i className="rays" />
          <img src={asset('assets/props/shrine.webp')} alt="" className="prop-img shrine" />
        </div>
      );
    default:
      return null;
  }
}
const spriteOf = (enemyId) => (enemyId === 'jade_rabbit' ? 'rabbit' : enemyId === 'panda_king' ? 'panda' : enemyId === 'crab_queen' ? 'crab' : enemyId === 'stone_king' ? 'golem' : enemyId === 'frost_matriarch' ? 'snowman' : enemyId === 'thunder_qilin' ? 'thunderbird' : enemyId === 'bog_witch' ? 'shadow' : enemyId === 'lantern_king' ? 'lantern' : enemyId);

/**
 * The road. While `walking`, the world scrolls and the hero walks; after the encounter's walk time
 * (divided by `speed`) onArrive fires once. `encounter` is only revealed in the last REVEAL seconds.
 */
export function ExploreScene({ run, encounter, walking, speed = 1, onArrive, propState, heroState, toast, children, fading }) {
  const theme = BIOMES[run.biome]?.theme || 'bamboo';
  const def = heroDef(run.heroId);
  const [left, setLeft] = useState(() => (encounter ? encounter.walk / speed : 0));
  const arrived = useRef(false);
  const arriveRef = useRef(onArrive);
  arriveRef.current = onArrive;
  // restart the walk whenever a new encounter is next
  const key = `${run.area?.seed}:${encounter?.i}`;
  useEffect(() => {
    arrived.current = false;
    setLeft(encounter ? encounter.walk / speed : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!walking || !encounter) return undefined;
    let raf;
    let last = performance.now();
    const loop = (t) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      setLeft((l) => {
        const n = l - dt;
        if (n <= 0 && !arrived.current) {
          arrived.current = true;
          setTimeout(() => arriveRef.current?.(), 0);
        }
        return Math.max(0, n);
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [walking, encounter, key]);
  // the encounter stands on the road: it scrolls in with the ground (same speed), stopping in
  // front of the hero exactly when the walk ends
  const propX = PROP_STOP + (walking ? left : 0) * groundPct(speed);
  const showing = encounter && propX <= PROP_ENTER;
  const boss = encounter && (encounter.type === 'guardian' || encounter.type === 'boss');
  return (
    <div className={`journey stage stage2 theme-${theme} ${boss && showing ? 'boss-near' : ''}`}>
      <Scenery theme={theme} walking={walking} speed={speed} />
      {showing && (
        <div className="encounter-prop" style={{ left: `${propX}%` }} key={key}>
          <EncounterProp type={encounter.type} enemies={encounter.enemies} npc={npcFor(run, encounter.i)} state={propState} />
        </div>
      )}
      <div className={`journey-hero ${heroState || ''}`}>
        <Sprite id={def.sprite} state={walking ? 'walk' : heroState === 'soak' ? 'idle' : 'idle'} scale={0.62} />
      </div>
      {toast && (
        <div key={toast.key} className="journey-toast">
          {toast.text}
        </div>
      )}
      {boss && showing && <div className="boss-warning">{encounter.type === 'boss' ? <Bi k="boss" /> : <Bi py="shǒu wèi" en="Guardian" />}</div>}
      {children}
      <div className={`journey-fade ${fading || ''}`} aria-hidden="true" />
    </div>
  );
}

// ------------------------------------------------------------------------------ panels
/** One item, revealed with a flourish: Take or Leave. Nothing is equipped before Take. */
export function ItemReveal({ run, id, title, onTake, onLeave }) {
  const [busy, setBusy] = useState(false);
  const it = ITEMS[id];
  if (!it) {
    return (
      <div className="journey-panel card reveal-panel">
        <p className="center muted">The chest is empty… someone got here first.</p>
        <Button className="wide" onClick={onLeave}>
          <Bi k="continue" />
        </Button>
      </div>
    );
  }
  const el = ELEMENTS[it.element] || ELEMENTS.physical;
  const completes = synergiesCompletedBy(id, run.items, runSignatures(run));
  const once = (fn) => () => {
    if (busy) return;
    setBusy(true);
    fn();
  };
  return (
    <div className={`journey-panel card reveal-panel rarity-${it.rarity}`} style={{ '--el': el.color, '--el-glow': el.glow }}>
      {title && <div className="reveal-title">{title}</div>}
      <div className="reveal-item">
        <i className="reveal-rays" aria-hidden="true" />
        <ItemIcon id={id} def={it} size={92} />
      </div>
      <CnName def={{ ...it, name: it.en }} speakable className="reveal-name" />
      <p className="reveal-meta">
        <span className={`rarity-tag ${it.rarity}`}>{it.rarity}</span> · {it.category} ·{' '}
        <span className="element-tag" style={{ '--el': el.color }}>
          {el.py} · {el.name}
        </span>
      </p>
      <p className="reveal-desc">{it.desc}</p>
      {completes.map((sid) => (
        <p key={sid} className="uc-combo">
          COMBO → {SYNERGIES[sid].py} ({SYNERGIES[sid].en}): {SYNERGIES[sid].desc}
        </p>
      ))}
      <div className="reveal-actions">
        <Button variant="secondary" onClick={once(onLeave)} disabled={busy}>
          <Bi py="fàng xià" en="Leave it" />
        </Button>
        <Button onClick={once(onTake)} disabled={busy}>
          <Bi py="ná zǒu" en="Take it" />
        </Button>
      </div>
    </div>
  );
}

/** A rare shrine: one random blessing for the rest of the run. Always positive. */
export function ShrineReveal({ id, onAccept }) {
  const [busy, setBusy] = useState(false);
  const bl = BLESSINGS[id];
  const el = ELEMENTS[bl?.element] || ELEMENTS.light;
  return (
    <div className="journey-panel card reveal-panel shrine-panel" style={{ '--el': el.color, '--el-glow': el.glow }}>
      <div className="reveal-title">
        <Bi py="shén miào" en="A forgotten shrine" />
      </div>
      {bl ? (
        <>
          <div className="reveal-item blessing">
            <i className="reveal-rays" aria-hidden="true" />
            <span className="blessing-orb">
              <Icon name={bl.icon} size={44} />
            </span>
          </div>
          <CnName def={{ ...bl, name: bl.en }} speakable className="reveal-name" />
          <p className="reveal-desc">{bl.desc}</p>
          <p className="small muted center">Lasts for the rest of this run.</p>
        </>
      ) : (
        <p className="center">The shrine glows warmly: you already carry every blessing it knows.</p>
      )}
      <Button
        className="wide"
        disabled={busy}
        onClick={() => {
          if (busy) return;
          setBusy(true);
          onAccept();
        }}
      >
        <Bi py="jiē shòu zhù fú" en={bl ? 'Receive the blessing' : 'Continue'} />
      </Button>
    </div>
  );
}

/** The hot spring: a short soak, then the heal applies and the hero walks on. */
export function SpringScene({ spring, onDone }) {
  const done = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => {
      if (done.current) return;
      done.current = true;
      onDone();
    }, 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="journey-panel card spring-panel">
      <b>
        <Bi py="wēn quán" en="A hot spring" />
      </b>
      <p className="small">{spring?.vigour ? `Already in fine shape, the warm water invigorates you: +${spring.vigour} max health.` : `Ahh… The warm water restores ${Math.round((spring?.heal || 0) * 100)}% of your health.`}</p>
    </div>
  );
}

/** Small top bar over the road: health, ink, signature-free walking speed and the build button. */
export function JourneyHud({ run, maxHp, speed, onSpeed, onInventory, areaName }) {
  return (
    <div className="journey-hud">
      <span className="jh-area">{areaName}</span>
      <span className="jh-hp" title="Health">
        <Icon name="heart" size={14} /> {run.hp}/{maxHp}
      </span>
      <span className="jh-ink" title="Ink (mò): spend at merchants">
        墨 {run.ink}
      </span>
      <span className="spacer" />
      {[1, 2].map((x) => (
        <button key={x} type="button" className={`chip small ${speed === x ? 'on' : ''}`} onClick={() => onSpeed(x)} aria-label={`Walking speed ${x}×`}>
          {x === 1 ? <Icon name="play" size={11} /> : <Icon name="ff" size={12} />} {x}×
        </button>
      ))}
      <button type="button" className="chip small" onClick={onInventory} aria-label="Signature move, items, blessings and synergies">
        <Icon name="chest" size={14} /> {run.items.length}
      </button>
    </div>
  );
}
