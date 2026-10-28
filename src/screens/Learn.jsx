import { useEffect, useRef, useState } from 'react';
import { useStore, getState, update } from '../store/store.js';
import { createSession, nextTask, afterTask, sessionTimeUp, sessionProgress } from '../learn/session.js';
import { levelInfo, todayXp } from '../store/progress.js';
import { checkAchievements } from '../game/achievements.js';
import StudyCard from '../components/StudyCard.jsx';
import { Bar, Button, CountUp, Confetti, Ring } from '../components/ui.jsx';
import Icon from '../assets/icons/Icons.jsx';
import { MASTERY } from '../learn/srs.js';
import { getWord } from '../learn/vocab.js';
import { play } from '../audio/sfx.js';
import { stopSpeech } from '../audio/speech.js';

export default function Learn({ go, params }) {
  const s = useStore();
  const sessionRef = useRef(null);
  if (!sessionRef.current) sessionRef.current = createSession(params.minutes ?? s.settings.sessionMinutes, getState());
  const session = sessionRef.current;
  const [task, setTask] = useState(() => nextTask(session, getState()));
  const [done, setDone] = useState(false);
  const [levelUp, setLevelUp] = useState(null);
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => {
      clearInterval(t);
      stopSpeech();
    };
  }, []);

  const finishSession = () => {
    const st = session.stats;
    update((x) => {
      x.stats.sessions += 1;
      x.stats.studyMs += Date.now() - session.startedAt;
      if (st.correct >= 10 && st.wrong === 0) x.stats.perfectSessions += 1;
    });
    checkAchievements();
    if (st.correct + st.wrong + st.newLearned > 0) play('victory');
    setDone(true);
  };

  const onComplete = (res) => {
    const st = session.stats;
    if (!res.intro) {
      st.reviewed += 1;
      if (res.correct) st.correct += 1;
      else st.wrong += 1;
      if (res.masteryAfter > res.masteryBefore && !st.improved.includes(res.wordId)) st.improved.push(res.wordId);
    }
    st.words.add(res.wordId);
    st.xp += res.xp || 0;
    if (res.levelUp) {
      setLevelUp(res.levelUp);
      play('levelUp');
    }
    afterTask(session, task, res.intro ? null : res.correct, getState());
    if (sessionTimeUp(session)) return finishSession();
    const next = nextTask(session, getState());
    if (!next) return finishSession();
    setTask(next);
  };

  if (done) return <Summary session={session} go={go} levelUp={levelUp} />;

  const prog = sessionProgress(session);
  const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
  return (
    <div className="screen learn">
      <div className="learn-top">
        <button type="button" className="icon-btn" onClick={finishSession} aria-label="End session">
          <Icon name="x" />
        </button>
        <div className="learn-progress">
          {prog !== null ? (
            <Bar value={prog} color="linear-gradient(90deg,var(--gold),var(--pink))" label="Session time" />
          ) : (
            <div className="endless-label">
              Endless · {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
            </div>
          )}
        </div>
        <div className="xp-counter">
          <Icon name="star" size={16} /> {session.stats.xp}
        </div>
      </div>
      {task ? (
        <StudyCard key={`${session.count}-${task.id}-${task.mode}`} task={task} repeat={session.used.get(task.id) || 0} onComplete={onComplete} />
      ) : (
        <div className="card">Nothing to study right now.</div>
      )}
      {levelUp && <LevelUpOverlay level={levelUp} onClose={() => setLevelUp(null)} />}
    </div>
  );
}

export function LevelUpOverlay({ level, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="levelup" onClick={onClose} role="status">
      <Confetti />
      <div className="levelup-card pop-in">
        <Icon name="star" size={46} />
        <b>LEVEL UP!</b>
        <span>You reached level {level}</span>
      </div>
    </div>
  );
}

function Summary({ session, go, levelUp }) {
  const s = useStore();
  const st = session.stats;
  const answered = st.correct + st.wrong;
  const acc = answered ? Math.round((st.correct / answered) * 100) : 0;
  const lv = levelInfo(s.profile.xp);
  const today = todayXp(s);
  const goal = s.settings.dailyGoal;
  return (
    <div className="screen summary">
      {(levelUp || (answered >= 5 && acc >= 90)) && <Confetti />}
      <div className="summary-head pop-in">
        <Icon name="star" size={42} />
        <h1>Session complete!</h1>
        {levelUp && <p className="levelup-note">Level up! You’re now level {levelUp}.</p>}
      </div>
      <div className="summary-grid">
        <div className="sum-tile">
          <b>
            <CountUp value={st.xp} />
          </b>
          <span>XP earned</span>
        </div>
        <div className="sum-tile">
          <b>{st.reviewed}</b>
          <span>reviews</span>
        </div>
        <div className="sum-tile">
          <b>{st.newLearned}</b>
          <span>new words</span>
        </div>
        <div className="sum-tile">
          <b>{answered ? `${acc}%` : '—'}</b>
          <span>accuracy</span>
        </div>
      </div>
      <div className="card summary-card">
        <div className="sum-row">
          <Ring value={today / goal} size={60} color={today >= goal ? 'var(--green)' : 'var(--gold)'}>
            <Icon name="flame" size={22} />
          </Ring>
          <div>
            <b>
              {s.profile.streak}-day streak {s.profile.shields ? `· ${s.profile.shields} shield${s.profile.shields > 1 ? 's' : ''}` : ''}
            </b>
            <p className="muted small">
              {today >= goal ? 'Daily goal complete. Great work!' : `${goal - today} XP to today’s goal.`} Level {lv.level}: {lv.into}/{lv.need} XP
            </p>
          </div>
        </div>
        {st.improved.length > 0 && (
          <>
            <h3 className="sum-sub">Words that levelled up</h3>
            <div className="improved-list">
              {st.improved.slice(0, 12).map((id) => {
                const w = getWord(id);
                return (
                  <span key={id} className="improved-chip">
                    {w.pinyin} <small>{w.gloss}</small>
                  </span>
                );
              })}
            </div>
          </>
        )}
        {st.improved.length === 0 && st.reviewed > 0 && (
          <p className="muted small">Mastery grows when you recall words across several days, so come back tomorrow to level them up.</p>
        )}
      </div>
      <div className="summary-actions">
        <Button className="wide" onClick={() => go('learn', { minutes: session.minutes, again: Date.now() })}>
          Keep learning
        </Button>
        <Button className="wide" variant="secondary" onClick={() => go('adventure')}>
          <Icon name="swords" size={18} /> Adventure
        </Button>
        <Button className="wide" variant="ghost" onClick={() => go('home')}>
          Home
        </Button>
      </div>
      <p className="legend muted small">
        {MASTERY.map((m) => (
          <span key={m.name} style={{ color: m.color }}>
            ● {m.name}{' '}
          </span>
        ))}
      </p>
    </div>
  );
}
