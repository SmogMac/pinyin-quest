import { useStore, update } from '../store/store.js';
import { levelInfo, todayXp, dueCount, masteryCounts } from '../store/progress.js';
import { SESSION_PRESETS } from '../learn/session.js';
import { selectedHero, heroPalette } from '../game/achievements.js';
import { heroDef } from '../game/data/heroes.js';
import { Bar, Ring } from '../components/ui.jsx';
import Sprite from '../components/Sprite.jsx';
import Icon from '../assets/icons/Icons.jsx';
import { BgSky, BgFar, BgMid, BgGround } from '../assets/backgrounds/Backgrounds.jsx';
import { AudioStatusBanner } from '../components/AudioButtons.jsx';
import { play } from '../audio/sfx.js';

export default function Home({ go }) {
  const s = useStore();
  const lv = levelInfo(s.profile.xp);
  const today = todayXp(s);
  const goal = s.settings.dailyGoal;
  const due = dueCount(s);
  const counts = masteryCounts(s);
  const learned = Object.keys(s.words).length;
  const run = s.adventure.current;
  const isNew = learned === 0;

  return (
    <div className="screen home">
      <div className="home-top">
        <div className="level-badge" aria-label={`Level ${lv.level}`}>
          <span className="lv-label">LV</span>
          <span className="lv-num">{lv.level}</span>
        </div>
        <div className="home-xp">
          <div className="home-xp-row">
            <span className="app-name">Pinyin Quest</span>
            <span className="muted small">
              {lv.into}/{lv.need} XP
            </span>
          </div>
          <Bar value={lv.pct} label="Level progress" />
        </div>
        <div className="streak" title="Daily streak">
          <Icon name="flame" size={22} />
          <b>{s.profile.streak}</b>
        </div>
      </div>

      <div className="home-hero-stage">
        <div className="bg-stack mini">
          <div className="bg-layer">
            <BgSky theme="forest" />
          </div>
          <div className="bg-layer far">
            <BgFar theme="forest" />
          </div>
          <div className="bg-layer mid">
            <BgMid theme="forest" />
          </div>
          <div className="bg-layer ground">
            <BgGround theme="forest" />
          </div>
        </div>
        <div className="home-hero">
          <Sprite id={heroDef(selectedHero(s)).sprite} state="idle" scale={0.85} palette={heroPalette(s)} />
        </div>
        <div className="home-daily">
          <Ring value={today / goal} size={70} color={today >= goal ? 'var(--green)' : 'var(--gold)'}>
            <b>{Math.min(999, today)}</b>
            <small>/{goal}</small>
          </Ring>
          <span className="small">{today >= goal ? 'Goal met!' : 'Daily XP'}</span>
        </div>
      </div>

      <AudioStatusBanner />

      <div className="big-actions">
        <button
          type="button"
          className="big-action learn"
          onClick={() => {
            play('pick');
            go('learn', { minutes: s.settings.sessionMinutes });
          }}
        >
          <span className="ba-icon">
            <Icon name="cards" size={40} />
          </span>
          <span className="ba-text">
            <b>QUICK LEARN</b>
            <small>
              {isNew
                ? 'Start with the most common words'
                : due
                  ? `${due} word${due === 1 ? '' : 's'} due for review`
                  : 'Learn new words & practice'}
            </small>
          </span>
          <span className="ba-go">
            <Icon name="play" size={22} />
          </span>
        </button>
        <div className="session-chips" role="radiogroup" aria-label="Session length">
          {SESSION_PRESETS.map((p) => (
            <button
              key={p.minutes}
              type="button"
              role="radio"
              aria-checked={s.settings.sessionMinutes === p.minutes}
              className={`chip ${s.settings.sessionMinutes === p.minutes ? 'on' : ''}`}
              onClick={() => update((st) => (st.settings.sessionMinutes = p.minutes))}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="big-action adventure"
          onClick={() => {
            play('pick');
            go('adventure');
          }}
        >
          <span className="ba-icon">
            <Icon name="swords" size={40} />
          </span>
          <span className="ba-text">
            <b>{run ? 'CONTINUE ADVENTURE' : 'ADVENTURE'}</b>
            <small>{run ? `Floor ${run.floor} · ${run.upgrades.length} upgrades` : 'Answer words, power up, battle!'}</small>
          </span>
          <span className="ba-go">
            <Icon name="play" size={22} />
          </span>
        </button>
      </div>

      <div className="home-stats">
        <div className="stat-pill">
          <b>{learned}</b>
          <span>words met</span>
        </div>
        <div className="stat-pill">
          <b>{counts[3] + counts[4]}</b>
          <span>strong+</span>
        </div>
        <div className="stat-pill">
          <b>{counts[4]}</b>
          <span>mastered</span>
        </div>
      </div>

      <nav className="home-nav">
        <button type="button" onClick={() => go('collection')}>
          <Icon name="book" size={24} />
          <span>Words</span>
        </button>
        <button type="button" onClick={() => go('progress')}>
          <Icon name="chart" size={24} />
          <span>Progress</span>
        </button>
        <button type="button" onClick={() => go('settings')}>
          <Icon name="gear" size={24} />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
}
