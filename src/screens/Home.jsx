import Bi from '../components/Bi.jsx';
import { useStore, update } from '../store/store.js';
import { levelInfo, todayXp, dueCount, masteryCounts } from '../store/progress.js';
import { SESSION_PRESETS } from '../learn/session.js';
import { useState } from 'react';
import { Bar, Ring, Modal } from '../components/ui.jsx';
import HeroShowcase from '../components/HeroShowcase.jsx';
import Icon from '../assets/icons/Icons.jsx';
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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="screen home">
      <div className="home-top">
        <div className="level-badge" aria-label={`Level ${lv.level}`}>
          <span className="lv-label">LV</span>
          <span className="lv-num">{lv.level}</span>
        </div>
        <div className="home-xp">
          <div className="home-xp-row">
            <span className="app-name">Moyu Rumble</span>
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
        <div className="home-daily" title={`Daily XP: ${today}/${goal}`}>
          <Ring value={today / goal} size={46} stroke={5} color={today >= goal ? 'var(--green)' : 'var(--gold)'}>
            <b>{Math.min(999, today)}</b>
          </Ring>
        </div>
        <button type="button" className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="Menu: stats, words, progress, settings">
          <Icon name="menu" size={22} />
        </button>
      </div>

      <div className="home-actions">
        <button
          type="button"
          className="big-action learn"
          onClick={() => {
            play('pick');
            go('learn', { minutes: s.settings.sessionMinutes });
          }}
        >
          <Icon name="cards" size={28} />
          <b>
            <Bi py="kuài sù xué xí" en="Quick Learn" />
          </b>
          <small>{isNew ? 'Start here' : due ? `${due} due` : 'New words'}</small>
        </button>
        <button
          type="button"
          className="big-action adventure"
          onClick={() => {
            play('pick');
            // the big button resumes a run straight away; the Adventure menu has New/Abandon
            go('adventure', run ? { resume: true } : {});
          }}
        >
          <Icon name="swords" size={28} />
          <b>{run ? <Bi k="continue" /> : <Bi k="adventure" />}</b>
          <small>{run ? `Floor ${run.floor}` : 'Battle!'}</small>
        </button>
      </div>
      <div className="session-chips" role="radiogroup" aria-label="Quick Learn session length">
        {SESSION_PRESETS.map((p) => (
          <button
            key={p.minutes}
            type="button"
            role="radio"
            aria-checked={s.settings.sessionMinutes === p.minutes}
            className={`chip small ${s.settings.sessionMinutes === p.minutes ? 'on' : ''}`}
            onClick={() => update((st) => (st.settings.sessionMinutes = p.minutes))}
          >
            {p.label}
          </button>
        ))}
      </div>

      <HeroShowcase />

      <AudioStatusBanner />

      {menuOpen && (
        <Modal title="Menu" onClose={() => setMenuOpen(false)} className="home-menu">
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
        </Modal>
      )}
    </div>
  );
}
