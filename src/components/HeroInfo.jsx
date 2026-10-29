// Name, passive, starting stats and (if locked) unlock requirement for one hero.
import { useStore } from '../store/store.js';
import { HEROES } from '../game/data/heroes.js';
import { SIGNATURES } from '../game/data/signatures.js';
import { TEMPLATES } from '../learn/signaturePuzzles.js';
import SigIcon from './SigIcon.jsx';
import { heroUnlocked } from '../game/achievements.js';
import { buildHero } from '../game/combat.js';
import { levelInfo } from '../store/progress.js';
import { CnName } from './ui.jsx';
import Icon from '../assets/icons/Icons.jsx';

const pct = (n) => `${Math.round(n * 100)}%`;

export default function HeroInfo({ heroId }) {
  const s = useStore();
  const h = HEROES[heroId];
  if (!h) return null;
  const level = levelInfo(s.profile.xp).level;
  const locked = !heroUnlocked(heroId, s);
  const st = buildHero({ heroId, accountLevel: level }); // includes the account-level HP bonus
  const stats = [
    ['heart', 'HP', st.maxHp],
    ['sword', 'ATK', Math.round(st.atk)],
    ['shield', 'DEF', st.def],
    ['wind', 'SPD', `${st.aspd.toFixed(2)}/s`],
    ['eye', 'CRIT', pct(st.crit)],
  ];
  if (st.dodge > 0) stats.push(['moon', 'DODGE', pct(st.dodge)]);

  return (
    <div className={`hero-info card ${locked ? 'is-locked' : ''}`} aria-live="polite">
      <div className="hero-info-head">
        <CnName def={h} speakable className="hero-info-name" />
        <small className="hero-title">{h.title}</small>
      </div>
      {locked && (
        <p className="hero-info-lock">
          <Icon name="lock" size={16} /> Locked: {h.unlock.text.charAt(0).toLowerCase() + h.unlock.text.slice(1)} (you’re level {level})
        </p>
      )}
      <div className="hero-info-passive">
        <b>
          <Icon name="sparkle" size={13} /> {h.passive.py} {h.passive.zh} <span className="muted">· {h.passive.en}</span>
        </b>
        <span>{h.passive.desc}</span>
      </div>
      <div className="hero-info-sig">
        <SigIcon id={h.signature} size={34} />
        <span>
          <b>
            {SIGNATURES[h.signature].py} · {SIGNATURES[h.signature].en}
          </b>{' '}
          <span className="muted">
            signature move · puzzle: {TEMPLATES[SIGNATURES[h.signature].template].focus.toLowerCase()} · {h.attack.style}
          </span>
        </span>
      </div>
      <div className="hero-info-stats" aria-label="Starting stats">
        {stats.map(([icon, label, value]) => (
          <span key={label}>
            <Icon name={icon} size={13} />
            <small>{label}</small> <b>{value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
