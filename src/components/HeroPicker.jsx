import { useStore, update } from '../store/store.js';
import { HEROES } from '../game/data/heroes.js';
import { heroUnlocked, selectedHero } from '../game/achievements.js';
import { speak } from '../audio/speech.js';
import { play } from '../audio/sfx.js';
import Sprite from './Sprite.jsx';
import { CnName } from './ui.jsx';
import Icon from '../assets/icons/Icons.jsx';

/** Grid of hero cards; selecting one sets the hero for the next run. */
export default function HeroPicker({ compact = false }) {
  const s = useStore();
  const current = selectedHero(s);
  return (
    <div className={`hero-picker ${compact ? 'compact' : ''}`}>
      {Object.entries(HEROES).map(([id, h]) => {
        const ok = heroUnlocked(id, s);
        const on = id === current;
        return (
          <button
            key={id}
            type="button"
            className={`hero-card ${on ? 'on' : ''} ${ok ? '' : 'locked'}`}
            disabled={!ok}
            aria-pressed={on}
            onClick={() => {
              play('pick');
              speak(h.zh);
              update((x) => (x.cosmetics.hero = id));
            }}
          >
            <div className="hero-card-art">
              <Sprite id={h.sprite} scale={compact ? 0.55 : 0.7} state={on ? 'idle' : 'still'} />
              {!ok && <Icon name="lock" size={22} className="hero-lock" />}
            </div>
            <div className="hero-card-text">
              <CnName def={h} className="hero-name" />
              <small className="hero-title">{h.title}</small>
              {ok ? (
                <div className="hero-passive">
                  <b>
                    <Icon name="sparkle" size={12} /> {h.passive.py} <span className="muted">· {h.passive.en}</span>
                  </b>
                  {!compact && <span>{h.passive.desc}</span>}
                </div>
              ) : (
                <div className="hero-passive">
                  <b>Locked</b>
                  <span>{h.unlock.text}</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
