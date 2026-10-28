import { SPRITES, ABILITY_ICONS, SPELL_ICONS } from '../assets/manifest.js';
import { ELEMENTS } from '../game/data/elements.js';
import Icon from '../assets/icons/Icons.jsx';

const asset = (src) => `${import.meta.env.BASE_URL}${src}`;

/**
 * Renders a sprite by manifest key. `state` (idle|attack|hurt|dead|victory|walk) is exposed as
 * a CSS class for procedural animation, and selects the row for sprite sheets.
 */
export default function Sprite({ id, state = 'idle', scale = 1, palette, flip = false, className = '' }) {
  const def = SPRITES[id];
  if (!def) return null;
  const w = def.w * scale;
  const h = def.h * scale;
  const style = { width: w, height: h };
  let body;
  if (def.sheet) {
    const { src, frameW, frameH, fps = 8, states } = def.sheet;
    const [row, frames] = states[state] || states.idle;
    body = (
      <div
        className="sprite-sheet"
        style={{
          width: frameW,
          height: frameH,
          backgroundImage: `url(${asset(src)})`,
          backgroundPositionY: -row * frameH,
          transform: `scale(${w / frameW})`,
          transformOrigin: 'top left',
          animation: `sprite-sheet-play ${frames / fps}s steps(${frames}) infinite`,
          '--sheet-w': `${-frames * frameW}px`,
        }}
      />
    );
  } else if (def.src) {
    body = <img src={asset(def.src)} alt="" width={w} height={h} draggable="false" />;
  } else {
    const C = def.component;
    body = <C palette={palette} />;
  }
  return (
    <div className={`sprite sprite-${id} st-${state} ${def.flying ? 'flying' : ''} ${flip ? 'flip' : ''} ${className}`} style={style}>
      {body}
    </div>
  );
}

export function AbilityIcon({ id, element, size = 44, level }) {
  const def = ABILITY_ICONS[id] || { glyph: 'sparkle' };
  const el = ELEMENTS[element] || ELEMENTS.physical;
  return (
    <div className="ability-icon" style={{ width: size, height: size, '--el': el.color, '--el-glow': el.glow }}>
      {def.src ? <img src={asset(def.src)} alt="" /> : <Icon name={def.glyph} size={size * 0.56} />}
      {level ? <span className="ability-level">{level}</span> : null}
    </div>
  );
}

/** Icon for a passive item, spell or synergy (glyph from data, coloured by element). */
export function ItemIcon({ kind = 'item', def, id, size = 40, badge }) {
  const el = ELEMENTS[def?.element] || ELEMENTS.physical;
  const override = kind === 'spell' ? SPELL_ICONS[id] : ABILITY_ICONS[id];
  const glyph = override?.glyph || def?.icon || 'sparkle';
  return (
    <div className={`ability-icon kind-${kind} rarity-${def?.rarity || 'common'}`} style={{ width: size, height: size, '--el': el.color, '--el-glow': el.glow }}>
      {override?.src ? <img src={asset(override.src)} alt="" /> : <Icon name={glyph} size={size * 0.56} />}
      {badge ? <span className="ability-level">{badge}</span> : null}
    </div>
  );
}
