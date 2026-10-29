// The hero's signature puzzle sheet. Combat keeps running behind it; there is no timer.
// Each hero always gets the same kind of minigame (see learn/signaturePuzzles.js):
//   choice (fruit, numbers, body parts, tones) · multi (Huojin's phrases) · blank (Ruizhe's negation)
// The parent calls onDone(success, choice) after the feedback, or onCancel() if the player backs out
// (the move stays ready).
import { memo, useEffect, useRef, useState } from 'react';
import Bi from './Bi.jsx';
import SigIcon from './SigIcon.jsx';
import { useStore, update } from '../store/store.js';
import { recordAnswer, addXp, introduceWord } from '../store/progress.js';
import { gradeFor, xpFor } from '../learn/grading.js';
import { getWord } from '../learn/vocab.js';
import { checkSigAnswer, TEMPLATES, TONE_SHAPES } from '../learn/signaturePuzzles.js';
import { ELEMENTS } from '../game/data/elements.js';
import { speak } from '../audio/speech.js';
import { play } from '../audio/sfx.js';
import Icon from '../assets/icons/Icons.jsx';

/**
 * Practice history. Every word the puzzle showed is tracked under gameWords; a word that is also in
 * the vocabulary list goes through spaced repetition, but only the first time it's answered in a
 * battle, so repeating a tiny pool mid-fight can't farm mastery or XP.
 */
function recordSig(puzzle, ok, ms, practiced, picked) {
  const targetZh = puzzle.kind === 'multi' ? puzzle.options.find((o) => o.id === puzzle.target)?.zh : puzzle.words[0];
  update((s) => {
    for (const zh of puzzle.words) {
      const g = (s.gameWords[zh] ||= { seen: 0, ok: 0, bad: 0 });
      g.seen += 1;
      if (puzzle.teach && !ok) continue;
      // for "pick every encouraging phrase", each phrase is judged on its own
      let right = ok;
      if (puzzle.kind === 'multi') {
        const o = puzzle.options.find((x) => x.zh === zh);
        right = o ? o.positive === picked.includes(o.id) : ok;
      }
      if (right) g.ok += 1;
      else g.bad += 1;
    }
  });
  if (!targetZh || practiced.has(targetZh) || !getWord(targetZh)) return;
  practiced.add(targetZh);
  if (puzzle.teach) {
    introduceWord(targetZh);
    return;
  }
  recordAnswer(targetZh, 'mc', gradeFor(ok, ms));
  const xp = xpFor('mc', ok, ms);
  if (xp) addXp(xp);
}

export default memo(SignaturePuzzle);

function SignaturePuzzle({ puzzle, sig, practiced, onDone, onCancel }) {
  const s = useStore();
  const el = ELEMENTS[sig.element] || ELEMENTS.physical;
  const [result, setResult] = useState(null); // null | { ok }
  const t0 = useRef(performance.now());
  const doneRef = useRef(false);
  const answered = useRef(false);

  const submit = (answer) => {
    if (answered.current) return;
    answered.current = true;
    const ok = checkSigAnswer(puzzle, answer);
    recordSig(puzzle, ok, performance.now() - t0.current, practiced, Array.isArray(answer) ? answer : [answer]);
    play(ok ? 'correct' : 'wrong');
    setResult({ ok, answer });
    setTimeout(
      () => {
        if (doneRef.current) return;
        doneRef.current = true;
        onDone(ok, puzzle.choice ?? null);
      },
      ok ? 650 : 1900,
    );
  };

  const Body = BODIES[puzzle.kind];
  return (
    <div
      className={`cast-sheet sig-sheet tpl-${puzzle.template} ${result ? (result.ok ? 'is-ok' : 'is-bad') : ''}`}
      style={{ '--el': el.color, '--el-glow': el.glow }}
      role="dialog"
      aria-label={sig.en}
    >
      <div className="cast-head">
        <span className="cast-spell">
          <SigIcon id={puzzle.sigId} size={26} />
          {sig.en}
        </span>
        <span className="cast-type">{TEMPLATES[puzzle.template].name}</span>
        {!result && (
          <button type="button" className="icon-btn cast-cancel" onClick={onCancel} aria-label="Cancel (the move stays ready)">
            <Icon name="x" size={18} />
          </button>
        )}
      </div>
      {puzzle.teach && !result && (
        <div className="sig-teach" role="note">
          <b>
            <Bi py="xīn cí" en="New word" inline />
          </b>{' '}
          {puzzle.kind === 'multi' ? 'Phrases you haven’t met yet show their meaning.' : 'Here’s the answer: tap it to learn it.'}
        </div>
      )}
      <Body puzzle={puzzle} submit={submit} result={result} soundless={s.settings.soundless} hideHanzi={s.settings.hideHanzi} />
      {result && (
        <div className={`cast-result ${result.ok ? 'ok' : 'bad'}`} role="status">
          <b>{result.ok ? <><Icon name="sparkle" size={18} /> <Bi k="success" inline /></> : <Bi k="fizzle" inline />}</b>
          <span>{puzzle.reveal}</span>
          {puzzle.why && <small className="sig-why">{puzzle.why}</small>}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------- prompts
/** A simple body with one part lit (for parts with no clear emoji, like the head or belly). */
function BodyFigure({ part }) {
  const on = (p) => (p === part ? 'var(--el, #ff7a3d)' : '#e9e2f5');
  return (
    <svg className="sig-figure" viewBox="0 0 60 90" aria-hidden="true">
      <circle cx="30" cy="16" r="11" fill={on('head')} stroke="#2b1d4e" strokeWidth="2.5" />
      <rect x="18" y="29" width="24" height="30" rx="9" fill={on('belly')} stroke="#2b1d4e" strokeWidth="2.5" />
      <path d="M18 34 8 50M42 34l10 16M24 58l-3 26M36 58l3 26" stroke="#2b1d4e" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function ToneContour({ tone }) {
  const sh = TONE_SHAPES[tone];
  if (!sh) return null;
  return (
    <span className="tone-clue" aria-label={`Tone ${tone}: ${sh.name}`}>
      <svg viewBox="0 0 40 38" aria-hidden="true">
        <path d="M2 4h36M2 34h36" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <path d={sh.path} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <small>
        tone {tone} · {sh.name}
      </small>
    </span>
  );
}

function Prompt({ puzzle, soundless, result, hideHanzi }) {
  const p = puzzle.prompt;
  const [hint, setHint] = useState(false);
  useEffect(() => {
    if (puzzle.template === 'tone' && !soundless) speak(p.zh);
  }, [puzzle.template, p.zh, soundless]);
  if (puzzle.template === 'tone') {
    const showClue = soundless || hint || puzzle.teach || result;
    return (
      <div className="cast-prompt">
        <p className="cast-en">“{p.en}”</p>
        {!soundless && (
          <div className="cast-audio">
            <button type="button" className="audio-btn" onClick={() => speak(p.zh)} aria-label="Play the word again">
              <Icon name="speaker" size={26} />
            </button>
            <button type="button" className="audio-btn slow" onClick={() => speak(p.zh, { slow: true })} aria-label="Play slowly">
              <Icon name="turtle" size={20} />
            </button>
            {!showClue && (
              <button type="button" className="chip small" onClick={() => setHint(true)}>
                <Icon name="eye" size={13} /> hint
              </button>
            )}
          </div>
        )}
        {showClue && <ToneContour tone={p.tone} />}
        <p className="cast-sub">{p.q}</p>
      </div>
    );
  }
  return (
    <div className="cast-prompt">
      {p.emoji && <span className="sig-emoji">{p.emoji}</span>}
      {p.figure && <BodyFigure part={p.figure} />}
      {p.big && <span className="sig-number">{p.big}</span>}
      {p.before !== undefined && <p className="cast-en">“{p.en}”</p>}
      {p.before !== undefined && !hideHanzi && result && <small className="muted">{p.zh}</small>}
      <p className="cast-sub">{p.q}</p>
    </div>
  );
}

// ------------------------------------------------------------------------------- bodies
function ChoiceBody({ puzzle, submit, result, soundless, hideHanzi }) {
  const [picked, setPicked] = useState(null);
  const locked = Boolean(result);
  const numbers = puzzle.template === 'number';
  return (
    <div className="cast-body">
      <Prompt puzzle={puzzle} soundless={soundless} result={result} hideHanzi={hideHanzi} />
      <div className={`cast-options pinyin-opts ${numbers ? 'sig-numbers' : ''}`}>
        {puzzle.options.map((o) => {
          const correct = o.id === puzzle.answer;
          const teachOff = puzzle.teach && !correct && !locked;
          return (
            <button
              key={o.id}
              type="button"
              disabled={locked || teachOff}
              className={`cast-opt ${picked === o.id ? (correct ? 'right' : 'wrong') : locked && correct ? 'right' : ''} ${puzzle.teach && correct && !locked ? 'teach-glow' : ''}`}
              onClick={() => {
                setPicked(o.id);
                submit(o.id);
              }}
            >
              <span className="opt-py">{o.py}</span>
              {/* meanings show once answered (and while teaching), never as a giveaway */}
              {(locked || (puzzle.teach && correct)) && o.en && !numbers && <small className="opt-en">{o.en}</small>}
              {locked && !hideHanzi && o.zh && <small className="opt-zh">{o.zh}</small>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MultiBody({ puzzle, submit, result, hideHanzi }) {
  const [sel, setSel] = useState([]);
  const locked = Boolean(result);
  const toggle = (id) => {
    if (locked) return;
    play('pick');
    setSel((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  };
  return (
    <div className="cast-body">
      <Prompt puzzle={puzzle} result={result} hideHanzi={hideHanzi} />
      <div className="sig-multi">
        {puzzle.options.map((o) => {
          const on = sel.includes(o.id);
          const state = locked ? (o.positive ? 'right' : on ? 'wrong' : 'neutral') : on ? 'on' : '';
          return (
            <button key={o.id} type="button" className={`sig-chip ${state}`} aria-pressed={on} disabled={locked} onClick={() => toggle(o.id)}>
              <span className="opt-py">{o.py}</span>
              {(locked || o.fresh) && <small className="opt-en">{o.en}</small>}
              {locked && !hideHanzi && <small className="opt-zh">{o.zh}</small>}
              {locked && <i className="chip-mark">{o.positive ? '✓' : on ? '✗' : ''}</i>}
            </button>
          );
        })}
      </div>
      {!locked && (
        <button type="button" className="btn btn-primary wide" disabled={!sel.length} onClick={() => submit(sel)}>
          <Bi py="hǎo le!" en="Submit" inline />
        </button>
      )}
    </div>
  );
}

/** Drag a negation into the blank, or tap it. */
function BlankBody({ puzzle, submit, result, hideHanzi }) {
  const [filled, setFilled] = useState(null);
  const [drag, setDrag] = useState(null); // { id, x, y }
  const slotRef = useRef(null);
  const locked = Boolean(result);
  const p = puzzle.prompt;
  const place = (id) => {
    if (locked || filled) return;
    play('pick');
    setFilled(id);
    setTimeout(() => submit(id), 280);
  };
  const overSlot = (x, y) => {
    const r = slotRef.current?.getBoundingClientRect();
    return r && x >= r.left - 24 && x <= r.right + 24 && y >= r.top - 24 && y <= r.bottom + 24;
  };
  return (
    <div className="cast-body">
      <Prompt puzzle={puzzle} result={result} hideHanzi={hideHanzi} />
      <p className="sig-sentence">
        <span>{p.before}</span>
        <span ref={slotRef} className={`sig-blank ${filled ? 'filled' : ''} ${drag && overSlot(drag.x, drag.y) ? 'hover' : ''} ${locked ? (result.ok ? 'right' : 'wrong') : ''}`}>
          {filled || '＿＿'}
        </span>
        <span>{p.after}</span>
      </p>
      {puzzle.teach && !locked && <p className="sig-why center">{puzzle.why}</p>}
      <div className="sig-tiles">
        {puzzle.options.map((o) => {
          const correct = o.id === puzzle.answer;
          return (
            <button
              key={o.id}
              type="button"
              className={`sig-tile ${filled === o.id ? 'used' : ''} ${puzzle.teach && correct && !locked ? 'teach-glow' : ''}`}
              disabled={locked || Boolean(filled) || (puzzle.teach && !correct)}
              style={drag?.id === o.id ? { transform: `translate(${drag.dx}px, ${drag.dy}px)`, zIndex: 3 } : undefined}
              onPointerDown={(e) => {
                if (locked || filled) return;
                e.currentTarget.setPointerCapture?.(e.pointerId);
                setDrag({ id: o.id, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, dx: 0, dy: 0, moved: false });
              }}
              onPointerMove={(e) => {
                if (drag?.id !== o.id) return;
                const dx = e.clientX - drag.sx;
                const dy = e.clientY - drag.sy;
                setDrag({ ...drag, x: e.clientX, y: e.clientY, dx, dy, moved: drag.moved || Math.hypot(dx, dy) > 8 });
              }}
              onPointerUp={(e) => {
                if (drag?.id !== o.id) return;
                const d = drag;
                setDrag(null);
                // a tap fills the blank; a drag fills it only when dropped on it
                if (!d.moved || overSlot(e.clientX, e.clientY)) place(o.id);
              }}
              onPointerCancel={() => setDrag(null)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && place(o.id)}
            >
              {o.py}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const BODIES = { choice: ChoiceBody, multi: MultiBody, blank: BlankBody };
