// One study interaction (teaching card, flashcard, multiple choice, listening, recall, speaking).
// Records the answer in the SRS, awards XP, then calls onComplete(result).
import { useEffect, useMemo, useRef, useState } from 'react';
import { getWord } from '../learn/vocab.js';
import { makeQuestion } from '../learn/questions.js';
import { previewInterval, newCard, MASTERY } from '../learn/srs.js';
import { recordAnswer, introduceWord, addXp } from '../store/progress.js';
import { gradeFor, xpFor, xpForFlash, XP } from '../learn/grading.js';
import { useStore, getState } from '../store/store.js';
import { speak, speechRecognitionSupported, listenMandarin, isAudioUnlocked } from '../audio/speech.js';
import { play } from '../audio/sfx.js';
import { AudioButtons } from './AudioButtons.jsx';
import { Pinyin, Hanzi, Button } from './ui.jsx';
import Icon from '../assets/icons/Icons.jsx';
import { ELEMENTS } from '../game/data/elements.js';

const MODE_LABEL = {
  intro: 'New word',
  flash: 'Flashcard',
  mc: 'What does it mean?',
  listen: 'Listen',
  reverse: 'Say it in Mandarin',
  speak: 'Speak',
};

export default function StudyCard({ task, repeat = 0, onComplete, showElement = false }) {
  const word = getWord(task.id);
  return (
    <div className="study-card-wrap" key={`${task.id}-${task.mode}`}>
      {task.mode === 'intro' && <IntroCard word={word} onComplete={onComplete} showElement={showElement} />}
      {task.mode === 'flash' && <FlashCard word={word} repeat={repeat} onComplete={onComplete} />}
      {(task.mode === 'mc' || task.mode === 'listen' || task.mode === 'reverse') && (
        <ChoiceCard word={word} mode={task.mode} repeat={repeat} onComplete={onComplete} showElement={showElement} />
      )}
      {task.mode === 'speak' && <SpeakCard word={word} repeat={repeat} onComplete={onComplete} />}
    </div>
  );
}

function ModeTag({ mode, extra }) {
  return (
    <div className={`mode-tag mode-${mode}`}>
      {MODE_LABEL[mode]}
      {extra}
    </div>
  );
}

function ElementTag({ word }) {
  if (!word.element) return null;
  const el = ELEMENTS[word.element];
  return (
    <span className="element-tag" style={{ '--el': el.color }} title={el.name}>
      {el.py} {el.zh}
    </span>
  );
}

function WordDetails({ word, showPinyin = true }) {
  return (
    <div className="word-details">
      {showPinyin && (
        <div className="wd-head">
          <Pinyin text={word.pinyin} className="pinyin-md" />
          <Hanzi text={word.hanzi} className="hanzi-sm" />
        </div>
      )}
      <p className="wd-meaning">{word.meanings.slice(0, 3).join(' · ')}</p>
      {word.example && (
        <div className="example">
          <div className="example-py">
            {word.example.py}
            <button type="button" className="mini-audio" onClick={() => speak(word.example.zh)} aria-label="Play example sentence">
              <Icon name="speaker" size={16} />
            </button>
          </div>
          <Hanzi text={word.example.zh} className="example-hz" />
          <div className="example-en">{word.example.en}</div>
        </div>
      )}
    </div>
  );
}

function useKeys(handler, deps) {
  useEffect(() => {
    const k = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      handler(e);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function IntroCard({ word, onComplete, showElement }) {
  const s = useStore();
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    introduceWord(word.id);
    const r = addXp(XP.intro);
    onComplete({ correct: null, intro: true, xp: XP.intro, levelUp: r.levelUp, wordId: word.id });
  };
  useKeys((e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      finish();
    }
    if (e.key === 'r') speak(word.hanzi);
    if (e.key === 's') speak(word.hanzi, { slow: true });
  }, [word.id]);
  return (
    <div className="card intro-card pop-in">
      <ModeTag mode="intro" extra={showElement && <ElementTag word={word} />} />
      <div className="card-main">
        <Pinyin text={word.pinyin} className="pinyin-xl" />
        <Hanzi text={word.hanzi} className="hanzi-md" />
        <AudioButtons text={word.hanzi} big autoplay={s.settings.autoplay && isAudioUnlocked()} />
        <p className="gloss-lg">{word.gloss}</p>
      </div>
      <WordDetails word={word} showPinyin={false} />
      <Button className="wide" onClick={finish}>
        Got it <kbd>Space</kbd>
      </Button>
    </div>
  );
}

function FlashCard({ word, repeat, onComplete }) {
  const [flipped, setFlipped] = useState(false);
  const done = useRef(false);
  const card = getState().words[word.id]?.skills?.rec || newCard();
  const grade = (g) => {
    if (done.current) return;
    done.current = true;
    const res = recordAnswer(word.id, 'flash', g);
    const xp = xpForFlash(g, repeat);
    const r = xp ? addXp(xp) : {};
    play(g >= 2 ? 'correct' : 'wrong');
    onComplete({ correct: g >= 2, grade: g, xp, levelUp: r.levelUp, wordId: word.id, ...res });
  };
  useKeys((e) => {
    if (!flipped && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      play('flip');
      setFlipped(true);
    } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) grade(Number(e.key));
    if (e.key === 'r') speak(word.hanzi);
    if (e.key === 's') speak(word.hanzi, { slow: true });
  }, [flipped, word.id]);
  return (
    <div className={`card flash-card ${flipped ? 'flipped' : ''}`}>
      <ModeTag mode="flash" />
      <div
        className="card-main tap-zone"
        role="button"
        tabIndex={0}
        aria-label={flipped ? 'Card revealed' : 'Tap to reveal meaning'}
        onClick={() => {
          if (!flipped) {
            play('flip');
            setFlipped(true);
          }
        }}
      >
        <Pinyin text={word.pinyin} className="pinyin-xl" />
        <Hanzi text={word.hanzi} className="hanzi-md" />
        <div onClick={(e) => e.stopPropagation()}>
          <AudioButtons text={word.hanzi} big />
        </div>
        {!flipped && <p className="hint">Recall the meaning, then tap to reveal</p>}
        {flipped && <p className="gloss-lg reveal-in">{word.gloss}</p>}
      </div>
      {flipped && (
        <>
          <WordDetails word={word} showPinyin={false} />
          <div className="grade-row">
            {[
              [1, 'Again', 'again'],
              [2, 'Hard', 'hard'],
              [3, 'Good', 'good'],
              [4, 'Easy', 'easy'],
            ].map(([g, label, cls]) => (
              <button key={g} type="button" className={`grade-btn ${cls}`} onClick={() => grade(g)}>
                <span>{label}</span>
                <small>{previewInterval(card, g)}</small>
              </button>
            ))}
          </div>
        </>
      )}
      {!flipped && (
        <Button
          className="wide"
          variant="secondary"
          onClick={() => {
            play('flip');
            setFlipped(true);
          }}
        >
          Reveal <kbd>Space</kbd>
        </Button>
      )}
    </div>
  );
}

function ChoiceCard({ word, mode, repeat, onComplete, showElement }) {
  const s = useStore();
  const q = useMemo(() => makeQuestion(word.id, mode, getState()), [word.id, mode]);
  const [picked, setPicked] = useState(null);
  const [listened, setListened] = useState(false);
  const t0 = useRef(performance.now());
  const result = useRef(null);
  const autoTimer = useRef(null);
  const canAutoplay = mode === 'listen' && s.settings.autoplay && isAudioUnlocked();

  useEffect(() => () => clearTimeout(autoTimer.current), []);
  useEffect(() => {
    if (mode === 'listen' && canAutoplay) setListened(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completed = useRef(false);
  const finish = () => {
    clearTimeout(autoTimer.current);
    if (!result.current || completed.current) return;
    completed.current = true;
    onComplete(result.current);
  };

  const choose = (opt) => {
    if (result.current) return;
    const ms = performance.now() - t0.current;
    setPicked(opt.id);
    const correct = opt.correct;
    const res = recordAnswer(word.id, mode, gradeFor(correct, ms));
    const xp = xpFor(mode, correct, ms, repeat);
    const r = xp ? addXp(xp) : {};
    play(correct ? 'correct' : 'wrong');
    speak(word.hanzi);
    result.current = { correct, xp, levelUp: r.levelUp, wordId: word.id, ms, ...res };
    if (correct) autoTimer.current = setTimeout(finish, mode === 'listen' ? 1700 : 1300);
  };

  useKeys((e) => {
    if (!picked && ['1', '2', '3', '4'].includes(e.key)) {
      const o = q.options[Number(e.key) - 1];
      if (o && (mode !== 'listen' || listened)) choose(o);
    } else if (picked && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      finish();
    }
    if (e.key === 'r') {
      setListened(true);
      speak(word.hanzi);
    }
    if (e.key === 's') {
      setListened(true);
      speak(word.hanzi, { slow: true });
    }
  }, [picked, listened, word.id]);

  const revealed = Boolean(picked);
  const correct = revealed && q.options.find((o) => o.id === picked)?.correct;

  return (
    <div className={`card choice-card mode-${mode} ${revealed ? (correct ? 'is-correct' : 'is-wrong') : ''}`}>
      <ModeTag mode={mode} extra={showElement && <ElementTag word={word} />} />
      <div className="card-main">
        {mode === 'mc' && (
          <>
            <Pinyin text={word.pinyin} className="pinyin-xl" />
            <Hanzi text={word.hanzi} className="hanzi-md" />
            <AudioButtons text={word.hanzi} />
          </>
        )}
        {mode === 'listen' && (
          <>
            {!listened ? (
              <button type="button" className="listen-start" onClick={() => setListened(true) || speak(word.hanzi)}>
                <Icon name="speaker" size={44} />
                <span>Tap to listen</span>
              </button>
            ) : (
              <AudioButtons text={word.hanzi} big autoplay={canAutoplay} />
            )}
            {revealed ? (
              <div className="reveal-in">
                <Pinyin text={word.pinyin} className="pinyin-lg" />
                <Hanzi text={word.hanzi} className="hanzi-sm" />
              </div>
            ) : (
              <p className="hint">What do you hear?</p>
            )}
          </>
        )}
        {mode === 'reverse' && (
          <>
            <p className="prompt-en">{word.gloss}</p>
            <p className="hint">Which is the Mandarin word?</p>
          </>
        )}
      </div>
      <div className={`options ${mode === 'reverse' ? 'options-pinyin' : ''}`}>
        {q.options.map((o, i) => {
          const state = !revealed ? '' : o.correct ? 'right' : o.id === picked ? 'wrong' : 'dim';
          return (
            <button
              key={o.id}
              type="button"
              className={`option ${state}`}
              disabled={revealed || (mode === 'listen' && !listened)}
              onClick={() => choose(o)}
            >
              <kbd>{i + 1}</kbd>
              <span className="option-label">{mode === 'reverse' ? <Pinyin text={o.label} /> : o.label}</span>
              {mode === 'reverse' && revealed && <Hanzi text={o.sub} className="hanzi-xs" />}
              {revealed && o.correct && <Icon name="check" size={20} className="opt-icon" />}
              {state === 'wrong' && <Icon name="x" size={20} className="opt-icon" />}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div className={`feedback ${correct ? 'good' : 'bad'} slide-up`}>
          <div className="feedback-head">
            {correct ? (
              <strong>Correct! {result.current?.xp ? <span className="xp-pop">+{result.current.xp} XP</span> : null}</strong>
            ) : (
              <strong>Not quite. This word will come back soon.</strong>
            )}
            {result.current && result.current.masteryAfter > result.current.masteryBefore && (
              <span className="mastery-up" style={{ color: MASTERY[result.current.masteryAfter].color }}>
                ▲ {MASTERY[result.current.masteryAfter].name}
              </span>
            )}
          </div>
          {!correct && <WordDetails word={word} />}
          {correct && mode !== 'mc' && <p className="wd-meaning small">{word.pinyin} = {word.gloss}</p>}
          <Button className="wide" variant={correct ? 'primary' : 'secondary'} onClick={finish}>
            Continue <kbd>Space</kbd>
          </Button>
        </div>
      )}
    </div>
  );
}

function SpeakCard({ word, repeat, onComplete }) {
  const [phase, setPhase] = useState('ask'); // ask | listening | heard | revealed
  const [heard, setHeard] = useState(null);
  const [match, setMatch] = useState(false);
  const [err, setErr] = useState(null);
  const done = useRef(false);
  const t0 = useRef(performance.now());
  const srOk = speechRecognitionSupported();

  const tryMic = async () => {
    setPhase('listening');
    setErr(null);
    const r = await listenMandarin();
    if (!r.ok) {
      setErr(r.reason);
      setPhase('revealed');
      speak(word.hanzi);
      return;
    }
    const hit = r.transcripts.some((t) => t.replace(/[\s，。！？,.!?]/g, '').includes(word.hanzi));
    setHeard(r.transcripts[0]);
    setMatch(hit);
    setPhase('revealed');
    speak(word.hanzi);
  };
  const grade = (ok) => {
    if (done.current) return;
    done.current = true;
    const ms = performance.now() - t0.current;
    const res = recordAnswer(word.id, 'speak', ok ? 3 : 1);
    const xp = xpFor('speak', ok, ms, repeat);
    const r = xp ? addXp(xp) : {};
    play(ok ? 'correct' : 'wrong');
    onComplete({ correct: ok, xp, levelUp: r.levelUp, wordId: word.id, ...res });
  };
  useKeys((e) => {
    if (phase === 'ask' && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      setPhase('revealed');
      speak(word.hanzi);
    } else if (phase === 'revealed' && (e.key === '1' || e.key === '2')) grade(e.key === '2');
  }, [phase]);
  return (
    <div className="card speak-card">
      <ModeTag mode="speak" />
      <div className="card-main">
        <p className="prompt-en">{word.gloss}</p>
        <p className="hint">Say it out loud in Mandarin.</p>
        {phase === 'ask' && (
          <div className="speak-actions">
            {srOk && (
              <button type="button" className="mic-btn" onClick={tryMic} aria-label="Speak into microphone">
                <Icon name="mic" size={36} />
              </button>
            )}
            <Button variant="secondary" onClick={() => setPhase('revealed') || speak(word.hanzi)}>
              I said it, show answer <kbd>Space</kbd>
            </Button>
          </div>
        )}
        {phase === 'listening' && <p className="listening-pulse">Listening…</p>}
        {phase === 'revealed' && (
          <div className="reveal-in">
            <Pinyin text={word.pinyin} className="pinyin-xl" />
            <Hanzi text={word.hanzi} className="hanzi-md" />
            <AudioButtons text={word.hanzi} />
            {heard !== null && (
              <p className={`heard ${match ? 'good' : ''}`}>
                Heard: “{heard}” {match ? '— sounds right!' : '— not a clear match.'}
              </p>
            )}
            {err && <p className="audio-msg">{err}</p>}
            <p className="fine-print">Speech recognition can’t reliably judge tones. Trust your own ear and compare with the audio.</p>
          </div>
        )}
      </div>
      {phase === 'revealed' && (
        <div className="grade-row two">
          <button type="button" className="grade-btn again" onClick={() => grade(false)}>
            <span>Missed it</span>
            <small>1</small>
          </button>
          <button type="button" className="grade-btn good" onClick={() => grade(true)}>
            <span>I said it right</span>
            <small>2</small>
          </button>
        </div>
      )}
    </div>
  );
}
