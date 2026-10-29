// Compact spellcasting puzzle sheet. Combat keeps running behind it. No timer.
// The parent calls onDone(success) after the feedback, or onCancel() if the player backs out.
import { memo, useEffect, useRef, useState } from 'react';
import Bi from './Bi.jsx';
import { useStore, update } from '../store/store.js';
import { recordAnswer, addXp } from '../store/progress.js';
import { gradeFor, xpFor } from '../learn/grading.js';
import { PUZZLE_TYPES } from '../learn/puzzles.js';
import { matchesShape } from '../learn/shapes.js';
import { SPELLS } from '../game/data/spells.js';
import { ELEMENTS } from '../game/data/elements.js';
import { PICTURE_IMAGES } from '../assets/manifest.js';
import { speak } from '../audio/speech.js';
import { play } from '../audio/sfx.js';
import { Pinyin, Hanzi } from './ui.jsx';
import Icon from '../assets/icons/Icons.jsx';

/** Records the answer: vocabulary words go through spaced repetition; game words are tracked separately. */
function recordPuzzle(puzzle, correct, ms) {
  const src = puzzle.source;
  if (src?.kind === 'vocab') {
    const mode = PUZZLE_TYPES[puzzle.type].mode || 'mc';
    recordAnswer(src.id, mode, gradeFor(correct, ms));
    const xp = xpFor(mode, correct, ms);
    if (xp) addXp(xp);
  } else if (src?.kind === 'game') {
    update((s) => {
      const g = (s.gameWords[src.id] ||= { seen: 0, ok: 0, bad: 0 });
      g.seen += 1;
      if (correct) g.ok += 1;
      else g.bad += 1;
    });
  }
}

// Memoised: the battle stage re-renders every frame; the sheet only changes with its puzzle.
export default memo(CastPuzzle);

function CastPuzzle({ puzzle, onDone, onCancel, onSoundlessSwap }) {
  const s = useStore();
  const spell = SPELLS[puzzle.spellId];
  const el = ELEMENTS[spell.element];
  const [result, setResult] = useState(null); // null | {ok, answer}
  const t0 = useRef(performance.now());
  const doneRef = useRef(false);
  const answeredRef = useRef(false);

  // Soundless Mode toggled mid-puzzle: replace an audio puzzle without counting it as a failure.
  useEffect(() => {
    if (s.settings.soundless && PUZZLE_TYPES[puzzle.type].audio && !result) onSoundlessSwap?.();
  }, [s.settings.soundless, puzzle.type, result, onSoundlessSwap]);

  const answer = (ok, correctText) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    const ms = performance.now() - t0.current;
    recordPuzzle(puzzle, ok, ms);
    play(ok ? 'correct' : 'wrong');
    setResult({ ok, answer: correctText });
    setTimeout(
      () => {
        if (doneRef.current) return;
        doneRef.current = true;
        onDone(ok);
      },
      ok ? 650 : 1700,
    );
  };

  const Body = BODIES[puzzle.type];
  return (
    <div className={`cast-sheet ${result ? (result.ok ? 'is-ok' : 'is-bad') : ''}`} style={{ '--el': el.color, '--el-glow': el.glow }} role="dialog" aria-label={`Cast ${spell.en}`}>
      <div className="cast-head">
        <span className="cast-spell">
          <span className="cast-dot" />
          {/* the header shows the English name: the pinyin name may be the answer */}
          {spell.en}
        </span>
        <span className="cast-type">{PUZZLE_TYPES[puzzle.type].name}</span>
        {!result && (
          <button type="button" className="icon-btn cast-cancel" onClick={onCancel} aria-label="Cancel casting (spell stays ready)">
            <Icon name="x" size={18} />
          </button>
        )}
      </div>
      <Body puzzle={puzzle} answer={answer} locked={Boolean(result)} />
      {result && (
        <div className={`cast-result ${result.ok ? 'ok' : 'bad'}`} role="status">
          {result.ok ? (
            <b>
              <Icon name="sparkle" size={18} /> <Bi k="success" inline />
            </b>
          ) : (
            <>
              <b>
                <Bi k="fizzle" inline />
              </b>
              <span>{result.answer}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------- bodies
function ChoiceBody({ puzzle, answer, locked }) {
  const q = puzzle.q;
  const [picked, setPicked] = useState(null);
  const listen = puzzle.type === 'listen';
  useEffect(() => {
    if (listen) speak(q.word.hanzi);
  }, [listen, q.word.hanzi]);
  const correct = q.options.find((o) => o.correct);
  return (
    <div className="cast-body">
      <div className="cast-prompt">
        {puzzle.type === 'meaning' && (
          <>
            <Pinyin text={q.word.pinyin} className="pinyin-lg" />
            <Hanzi text={q.word.hanzi} className="hanzi-sm" />
          </>
        )}
        {puzzle.type === 'recall' && <p className="cast-en">{q.word.gloss}</p>}
        {listen && (
          <div className="cast-audio">
            <button type="button" className="audio-btn" onClick={() => speak(q.word.hanzi)} aria-label="Replay">
              <Icon name="speaker" size={26} />
            </button>
            <button type="button" className="audio-btn slow" onClick={() => speak(q.word.hanzi, { slow: true })} aria-label="Replay slowly">
              <Icon name="turtle" size={20} />
            </button>
          </div>
        )}
      </div>
      <div className={`cast-options ${puzzle.type === 'recall' ? 'pinyin-opts' : ''}`}>
        {q.options.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={locked}
            className={`cast-opt ${picked === o.id ? (o.correct ? 'right' : 'wrong') : locked && o.correct ? 'right' : ''}`}
            onClick={() => {
              setPicked(o.id);
              answer(o.correct, `${q.word.pinyin} = ${q.word.gloss}`);
            }}
          >
            {puzzle.type === 'recall' ? <Pinyin text={o.label} /> : o.label}
          </button>
        ))}
      </div>
      {locked && puzzle.type === 'listen' && <p className="cast-reveal">{correct && `${q.word.pinyin} · ${q.word.gloss}`}</p>}
    </div>
  );
}

function PictureBody({ puzzle, answer, locked }) {
  const [picked, setPicked] = useState(null);
  const w = puzzle.word;
  return (
    <div className="cast-body">
      <div className="cast-prompt">
        <Pinyin text={w.pinyin} className="pinyin-lg" />
        <Hanzi text={w.hanzi} className="hanzi-sm" />
      </div>
      <div className="cast-pictures">
        {puzzle.options.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={locked}
            className={`cast-pic ${picked === o.id ? (o.correct ? 'right' : 'wrong') : locked && o.correct ? 'right' : ''}`}
            onClick={() => {
              setPicked(o.id);
              answer(o.correct, `${w.pinyin} = ${w.gloss} ${puzzle.options.find((x) => x.correct).pic}`);
            }}
            aria-label={`Picture option`}
          >
            {PICTURE_IMAGES[o.id] ? <img src={`${import.meta.env.BASE_URL}${PICTURE_IMAGES[o.id]}`} alt="" /> : <span className="pic-emoji">{o.pic}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToneBody({ puzzle, answer, locked }) {
  const w = puzzle.word;
  const [picked, setPicked] = useState(null);
  useEffect(() => {
    speak(w.hanzi);
  }, [w.hanzi]);
  return (
    <div className="cast-body">
      <div className="cast-prompt">
        <div className="cast-audio">
          <button type="button" className="audio-btn" onClick={() => speak(w.hanzi)} aria-label="Replay">
            <Icon name="speaker" size={26} />
          </button>
          <button type="button" className="audio-btn slow" onClick={() => speak(w.hanzi, { slow: true })} aria-label="Replay slowly">
            <Icon name="turtle" size={20} />
          </button>
        </div>
        <p className="cast-sub">“{w.gloss}”: which tones do you hear?</p>
      </div>
      <div className="cast-options pinyin-opts">
        {puzzle.options.map((o) => (
          <button
            key={o.text}
            type="button"
            disabled={locked}
            className={`cast-opt ${picked === o.text ? (o.correct ? 'right' : 'wrong') : locked && o.correct ? 'right' : ''}`}
            onClick={() => {
              setPicked(o.text);
              answer(o.correct, w.pinyin);
            }}
          >
            <Pinyin text={o.text} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Tap syllables in order, or drag across them; lines connect the chosen syllables. */
function SyllableBody({ puzzle, answer, locked }) {
  const [chosen, setChosenState] = useState([]); // option indices
  const chosenRef = useRef([]);
  const setChosen = (v) => {
    chosenRef.current = typeof v === 'function' ? v(chosenRef.current) : v;
    setChosenState(chosenRef.current);
  };
  const wrapRef = useRef(null);
  const dragging = useRef(false);
  const chipRefs = useRef({});
  const [, force] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => force((n) => n + 1), 50); // measure chip positions for the lines
    return () => clearTimeout(t);
  }, []);
  const add = (i) => {
    const c = chosenRef.current;
    if (locked || c.includes(i) || c.length >= puzzle.target.length) return;
    const next = [...c, i];
    setChosen(next);
    play('pick');
    if (next.length === puzzle.target.length) {
      const words = next.map((k) => puzzle.options.find((o) => o.i === k).text);
      const ok = words.join(' ') === puzzle.target.join(' ');
      setTimeout(() => answer(ok, `${puzzle.target.join(' ')} = ${puzzle.prompt.en}`), 120);
    }
  };
  const centers = () => {
    const box = wrapRef.current?.getBoundingClientRect();
    return chosen.map((i) => {
      const r = chipRefs.current[i]?.getBoundingClientRect();
      return r && box ? { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 } : null;
    });
  };
  const pts = centers().filter(Boolean);
  return (
    <div className="cast-body">
      <div className="cast-prompt">
        <p className="cast-en">{puzzle.prompt.en}</p>
        <p className="cast-sub">{puzzle.prompt.sub}</p>
        <div className="syl-slots">
          {puzzle.target.map((_, k) => {
            const opt = chosen[k] !== undefined ? puzzle.options.find((o) => o.i === chosen[k]) : null;
            return (
              <span key={k} className={`syl-slot ${opt ? 'filled' : ''}`}>
                {opt ? opt.text : '·'}
              </span>
            );
          })}
          {chosen.length > 0 && !locked && (
            <button type="button" className="syl-undo" onClick={() => setChosen((c) => c.slice(0, -1))} aria-label="Undo last syllable">
              <Icon name="back" size={16} />
            </button>
          )}
        </div>
      </div>
      <div
        className="syl-wheel"
        ref={wrapRef}
        onPointerDown={(e) => {
          const chip = e.target.closest('[data-syl]');
          if (!chip) return;
          dragging.current = true;
          add(Number(chip.dataset.syl));
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-syl]');
          if (el) add(Number(el.dataset.syl));
        }}
        onPointerUp={() => (dragging.current = false)}
        onPointerLeave={() => (dragging.current = false)}
      >
        <svg className="syl-lines" aria-hidden="true">
          {pts.slice(1).map((p, k) => (
            <line key={k} x1={pts[k].x} y1={pts[k].y} x2={p.x} y2={p.y} />
          ))}
        </svg>
        {puzzle.options.map((o) => (
          <button
            key={o.i}
            type="button"
            data-syl={o.i}
            ref={(el) => (chipRefs.current[o.i] = el)}
            className={`syl-chip ${chosen.includes(o.i) ? 'on' : ''}`}
            disabled={locked}
            onClick={(e) => e.detail === 0 && add(o.i)} // keyboard activation
          >
            {o.text}
          </button>
        ))}
      </div>
    </div>
  );
}

function ShapeBody({ puzzle, answer, locked }) {
  const canvasRef = useRef(null);
  const pts = useRef([]);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const sh = puzzle.shape;

  const ctx = () => canvasRef.current.getContext('2d');
  useEffect(() => {
    const c = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const g = ctx();
    g.scale(ratio, ratio);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = 6;
    g.strokeStyle = '#2b1d4e';
  }, []);
  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const clear = () => {
    const c = canvasRef.current;
    ctx().clearRect(0, 0, c.width, c.height);
    pts.current = [];
    setHasInk(false);
  };
  const check = () => {
    const { match } = matchesShape(pts.current, sh.shape);
    answer(match, `${sh.py} = ${sh.en}`);
  };
  return (
    <div className="cast-body">
      <div className="cast-prompt">
        <Pinyin text={sh.py} className="pinyin-lg" />
        <Hanzi text={sh.zh} className="hanzi-sm" />
        <p className="cast-sub">{puzzle.showHint ? `Draw a ${sh.en}` : 'Draw this shape'}</p>
      </div>
      <canvas
        ref={canvasRef}
        className="shape-canvas"
        onPointerDown={(e) => {
          if (locked) return;
          drawing.current = true;
          try {
            e.currentTarget.setPointerCapture?.(e.pointerId);
          } catch {
            /* not all pointers can be captured */
          }
          const p = pos(e);
          pts.current.push(p);
          ctx().beginPath();
          ctx().moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const p = pos(e);
          pts.current.push(p);
          ctx().lineTo(p.x, p.y);
          ctx().stroke();
          if (!hasInk && pts.current.length > 6) setHasInk(true);
        }}
        onPointerUp={() => (drawing.current = false)}
        aria-label={`Drawing area: draw a ${puzzle.showHint ? sh.en : 'shape'}`}
      />
      {!locked && (
        <div className="shape-actions">
          <button type="button" className="btn btn-ghost" onClick={clear} disabled={!hasInk}>
            Clear
          </button>
          <button type="button" className="btn btn-primary" onClick={check} disabled={!hasInk}>
            Cast
          </button>
        </div>
      )}
    </div>
  );
}

function PhraseBody({ puzzle, answer, locked }) {
  const [built, setBuilt] = useState([]); // token option indices
  const toks = puzzle.tokens;
  const add = (i) => {
    if (locked || built.includes(i)) return;
    const next = [...built, i];
    setBuilt(next);
    play('pick');
    if (next.length === toks.length) {
      const words = next.map((k) => toks.find((t) => t.i === k).text);
      answer(words.join(' ') === puzzle.answer.join(' '), puzzle.example.py);
    }
  };
  return (
    <div className="cast-body">
      <div className="cast-prompt">
        <p className="cast-en">“{puzzle.example.en}”</p>
        <div className="phrase-built">
          {built.length ? (
            built.map((k, n) => (
              <button key={k} type="button" className="phrase-tok on" disabled={locked} onClick={() => setBuilt((b) => b.slice(0, n))}>
                {toks.find((t) => t.i === k).text}
              </button>
            ))
          ) : (
            <span className="cast-sub">Tap the words in order</span>
          )}
        </div>
      </div>
      <div className="phrase-pool">
        {toks.map((t) => (
          <button key={t.i} type="button" className={`phrase-tok ${built.includes(t.i) ? 'used' : ''}`} disabled={locked || built.includes(t.i)} onClick={() => add(t.i)}>
            {t.text}
          </button>
        ))}
      </div>
    </div>
  );
}

const BODIES = {
  meaning: ChoiceBody,
  recall: ChoiceBody,
  listen: ChoiceBody,
  picture: PictureBody,
  tone: ToneBody,
  syllables: SyllableBody,
  shape: ShapeBody,
  phrase: PhraseBody,
};
