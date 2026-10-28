import { useStore } from '../store/store.js';
import { levelInfo, dueCount, masteryCounts, dayKey } from '../store/progress.js';
import { MASTERY, DAY, SKILLS } from '../learn/srs.js';
import { ACHIEVEMENTS } from '../game/achievements.js';
import { SYNERGIES } from '../game/data/upgrades.js';
import { TopBar, Bar } from '../components/ui.jsx';
import Icon from '../assets/icons/Icons.jsx';
import { VOCAB } from '../learn/vocab.js';

const pct = ([ok, bad]) => (ok + bad ? `${Math.round((ok / (ok + bad)) * 100)}%` : '—');

export default function Progress({ go }) {
  const s = useStore();
  const lv = levelInfo(s.profile.xp);
  const counts = masteryCounts(s);
  const met = Object.keys(s.words).length;
  const m = s.stats.modes;
  const all = Object.values(m).reduce(([a, b], [c, d]) => [a + c, b + d], [0, 0]);
  const now = Date.now();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  let dueToday = 0;
  for (const r of Object.values(s.words)) if (SKILLS.some((k) => r.skills[k] && r.skills[k].state !== 'new' && r.skills[k].due <= endOfDay.getTime())) dueToday++;

  const days = Array.from({ length: 14 }, (_, i) => {
    const k = dayKey(now - (13 - i) * DAY);
    return { k, xp: s.profile.daily[k] || 0, label: new Date(now - (13 - i) * DAY).toLocaleDateString(undefined, { weekday: 'narrow' }) };
  });
  const maxXp = Math.max(s.settings.dailyGoal, ...days.map((d) => d.xp));
  const a = s.adventure;

  return (
    <div className="screen progress">
      <TopBar title="Progress" onBack={() => go('home')} />
      <div className="card">
        <div className="prog-level">
          <div className="level-badge">
            <span className="lv-label">LV</span>
            <span className="lv-num">{lv.level}</span>
          </div>
          <div style={{ flex: 1 }}>
            <b>{s.profile.xp} XP total</b>
            <Bar value={lv.pct} />
            <small className="muted">
              {lv.need - lv.into} XP to level {lv.level + 1}
            </small>
          </div>
          <div className="streak big">
            <Icon name="flame" size={26} />
            <b>{s.profile.streak}</b>
            <small>best {s.profile.bestStreak}</small>
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="sum-tile">
          <b>{met}</b>
          <span>words met</span>
        </div>
        <div className="sum-tile">
          <b>{counts[4]}</b>
          <span>mastered</span>
        </div>
        <div className="sum-tile">
          <b>{dueCount(s)}</b>
          <span>due now</span>
        </div>
        <div className="sum-tile">
          <b>{dueToday}</b>
          <span>due today</span>
        </div>
      </div>

      <div className="card">
        <h3 className="sum-sub">Mastery</h3>
        <div className="mastery-stack" aria-label="Words by mastery">
          {counts.slice(1).map((c, i) => (
            <div key={i} style={{ flex: c || 0.0001, background: MASTERY[i + 1].color }} title={`${MASTERY[i + 1].name}: ${c}`} />
          ))}
        </div>
        <div className="mastery-legend">
          {MASTERY.slice(1).map((x, i) => (
            <span key={x.name}>
              <i style={{ background: x.color }} /> {x.name} <b>{counts[i + 1]}</b>
            </span>
          ))}
        </div>
        <p className="small muted">
          {met} of {VOCAB.length} HSK 1–3 words encountered.
        </p>
      </div>

      <div className="card">
        <h3 className="sum-sub">Accuracy</h3>
        <div className="acc-grid">
          <span>Overall</span>
          <b>{pct(all)}</b>
          <span>Recognition</span>
          <b>{pct([m.mc[0] + m.flash[0], m.mc[1] + m.flash[1]])}</b>
          <span>Listening</span>
          <b>{pct(m.listen)}</b>
          <span>Recall (English → pinyin)</span>
          <b>{pct(m.reverse)}</b>
          <span>Speaking</span>
          <b>{pct(m.speak)}</b>
        </div>
      </div>

      <div className="card">
        <h3 className="sum-sub">Last 14 days</h3>
        <div className="activity">
          {days.map((d) => (
            <div key={d.k} className="act-col" title={`${d.k}: ${d.xp} XP`}>
              <div className="act-bar-wrap">
                <div className={`act-bar ${d.xp >= s.settings.dailyGoal ? 'goal' : ''}`} style={{ height: `${(d.xp / maxXp) * 100}%` }} />
              </div>
              <small>{d.label}</small>
            </div>
          ))}
        </div>
        <p className="small muted">
          {s.stats.sessions} sessions · {Math.round(s.stats.studyMs / 60000)} minutes studied
        </p>
      </div>

      <div className="card">
        <h3 className="sum-sub">Adventure</h3>
        <div className="acc-grid">
          <span>Runs / victories</span>
          <b>
            {a.runs} / {a.wins}
          </b>
          <span>Best floor</span>
          <b>{a.bestFloor}</b>
          <span>Best score</span>
          <b>{a.bestScore}</b>
          <span>Bosses defeated</span>
          <b>{a.bosses}</b>
          <span>Foes defeated</span>
          <b>{a.kills}</b>
          <span>Synergies discovered</span>
          <b>
            {Object.keys(a.synergies).length} / {Object.keys(SYNERGIES).length}
          </b>
        </div>
      </div>

      <div className="card">
        <h3 className="sum-sub">
          Achievements {Object.keys(s.achievements).length}/{ACHIEVEMENTS.length}
        </h3>
        <div className="ach-grid">
          {ACHIEVEMENTS.map((x) => {
            const got = s.achievements[x.id];
            return (
              <div key={x.id} className={`ach ${got ? 'got' : ''}`}>
                <Icon name={got ? 'star' : 'lock'} size={20} />
                <div>
                  <b>{x.name}</b>
                  <small>{x.desc}</small>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
