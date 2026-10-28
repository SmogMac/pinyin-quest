// Spaced repetition: an SM-2 style scheduler with Anki-like learning steps.
//
// Every word keeps one card per skill so that recognising a word does not count as being
// able to hear it or produce it:
//   rec  – recognition (pinyin -> meaning: flashcards, multiple choice)
//   lis  – listening   (audio  -> meaning)
//   rev  – recall      (meaning -> pinyin)
//   spk  – speaking    (meaning -> say it)            optional
//
// Grades: 1 Again, 2 Hard, 3 Good, 4 Easy.
//   new/learning cards step through LEARN_STEPS, then graduate to day intervals.
//   review cards: interval *= ease (Good), *= ease*1.3 (Easy), *= 1.2 (Hard);
//   Again => lapse: ease -0.2, interval halved, back to relearning steps.
// Reviewing a card early (before it is due) with a pass grade does not grow the interval,
// so drilling the same word repeatedly cannot inflate mastery.

export const SKILLS = ['rec', 'lis', 'rev', 'spk'];
export const SKILL_NAMES = { rec: 'Recognition', lis: 'Listening', rev: 'Recall', spk: 'Speaking' };

const MIN = 60_000;
export const DAY = 86_400_000;
const LEARN_STEPS = [1 * MIN, 10 * MIN];
const RELEARN_STEPS = [5 * MIN];
const MIN_EASE = 1.3;
const MAX_IVL = 365;

export function newCard() {
  return { state: 'new', step: 0, ease: 2.5, ivl: 0, due: 0, reps: 0, lapses: 0, ok: 0, bad: 0, last: 0 };
}

const fuzz = (ivl) => (ivl < 3 ? ivl : ivl * (0.95 + Math.random() * 0.1));

export function review(card, grade, now = Date.now()) {
  const c = { ...(card || newCard()) };
  const early = c.state === 'review' && c.due > now;
  c.reps += 1;
  c.last = now;
  if (grade >= 2) c.ok += 1;
  else c.bad += 1;

  if (c.state === 'review') {
    if (grade === 1) {
      c.lapses += 1;
      c.ease = Math.max(MIN_EASE, c.ease - 0.2);
      c.ivl = Math.max(1, c.ivl * 0.5);
      c.state = 'relearn';
      c.step = 0;
      c.due = now + RELEARN_STEPS[0];
      return c;
    }
    if (early) return c; // practice outside the schedule: keep the interval as is
    if (grade === 2) {
      c.ease = Math.max(MIN_EASE, c.ease - 0.15);
      c.ivl = Math.max(c.ivl + 1, c.ivl * 1.2);
    } else if (grade === 3) {
      c.ivl = Math.max(c.ivl + 1, c.ivl * c.ease);
    } else {
      c.ease += 0.15;
      c.ivl = Math.max(c.ivl + 2, c.ivl * c.ease * 1.3);
    }
    c.ivl = Math.min(MAX_IVL, fuzz(c.ivl));
    c.due = now + c.ivl * DAY;
    return c;
  }

  // new / learning / relearn
  const steps = c.state === 'relearn' ? RELEARN_STEPS : LEARN_STEPS;
  if (c.state === 'new') c.state = 'learning';
  if (grade === 1) {
    c.step = 0;
    c.due = now + steps[0];
  } else if (grade === 2) {
    c.due = now + steps[Math.min(c.step, steps.length - 1)] * 1.5;
  } else if (grade === 4 || c.step + 1 >= steps.length) {
    const relearning = c.state === 'relearn';
    c.state = 'review';
    c.step = 0;
    c.ivl = relearning ? Math.max(1, c.ivl) : grade === 4 ? 4 : 1;
    c.due = now + c.ivl * DAY;
  } else {
    c.step += 1;
    c.due = now + steps[c.step];
  }
  return c;
}

/** Rough preview of the next interval, for the flashcard grade buttons. */
export function previewInterval(card, grade) {
  const now = Date.now();
  const next = review(card, grade, now);
  return formatInterval(Math.max(0, next.due - now));
}

export function formatInterval(ms) {
  if (ms < 60 * MIN) return `${Math.max(1, Math.round(ms / MIN))}m`;
  if (ms < DAY) return `${Math.round(ms / (60 * MIN))}h`;
  const d = ms / DAY;
  if (d < 30) return `${Math.round(d)}d`;
  if (d < 365) return `${Math.round(d / 30)}mo`;
  return `${(d / 365).toFixed(1)}y`;
}

export const MASTERY = [
  { name: 'New', color: '#9aa3b5' },
  { name: 'Learning', color: '#ffb84d' },
  { name: 'Familiar', color: '#6fd1ff' },
  { name: 'Strong', color: '#7be38a' },
  { name: 'Mastered', color: '#d38bff' },
];

/** Mastery is driven by review intervals, which only grow through spaced successful recall. */
export function masteryOf(record) {
  if (!record) return 0;
  const s = record.skills || {};
  const rec = s.rec;
  if (!rec || rec.state === 'new') return 0;
  const recIvl = rec.state === 'review' ? rec.ivl : 0;
  const other = Math.max(...['lis', 'rev', 'spk'].map((k) => (s[k]?.state === 'review' ? s[k].ivl : 0)));
  if (recIvl >= 21 && other >= 10) return 4;
  if (recIvl >= 7 && other >= 3) return 3;
  if (recIvl >= 2) return 2;
  return 1;
}

export function isDue(card, now = Date.now()) {
  return card && card.state !== 'new' && card.due <= now;
}
