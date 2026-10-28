// Decides what to study next: due reviews first (lapsed words first of all), new words
// introduced gradually with a teaching card, and extra practice when nothing is due.
import { VOCAB, getWord } from './vocab.js';
import { isDue, SKILLS } from './srs.js';
import { newWordsToday } from '../store/progress.js';

const RETRY_GAP = 3; // a missed word returns after this many other cards
const NEW_FOLLOWUP_GAP = 2;

export const SESSION_PRESETS = [
  { minutes: 2, label: '2 min', maxNew: 3 },
  { minutes: 5, label: '5 min', maxNew: 5 },
  { minutes: 10, label: '10 min', maxNew: 8 },
  { minutes: 0, label: 'Endless', maxNew: 30 },
];

export function createSession(minutes, save) {
  const preset = SESSION_PRESETS.find((p) => p.minutes === minutes) || SESSION_PRESETS[1];
  return {
    minutes: preset.minutes,
    limitMs: preset.minutes * 60_000,
    startedAt: Date.now(),
    maxNew: preset.maxNew,
    newCount: 0,
    count: 0,
    scheduled: [], // {at, task}
    used: new Map(), // id -> times shown this session
    recent: [],
    stats: { reviewed: 0, newLearned: 0, correct: 0, wrong: 0, xp: 0, improved: [], words: new Set() },
    allowSpeaking: Boolean(save.settings.speaking),
  };
}

export function skillUnlocked(record, skill, allowSpeaking) {
  if (skill === 'rec') return true;
  const rec = record?.skills?.rec;
  if (!rec || rec.ok < 1) return false;
  if (skill === 'spk') return allowSpeaking && (record.skills.rev?.ok || 0) >= 1;
  return true;
}

const SKILL_MODE = { lis: 'listen', rev: 'reverse', spk: 'speak' };
export function modeForSkill(skill, rng = Math.random) {
  if (skill === 'rec') return rng() < 0.35 ? 'flash' : 'mc';
  return SKILL_MODE[skill];
}

/** Most urgent skill for a word: earliest-due unlocked skill, introducing unlocked new skills too. */
export function pickSkill(record, now, allowSpeaking, { dueOnly = false } = {}) {
  let best = null;
  let bestDue = Infinity;
  for (const k of SKILLS) {
    if (!skillUnlocked(record, k, allowSpeaking)) continue;
    const c = record.skills[k];
    const due = !c || c.state === 'new' ? now + 1 : c.due; // fresh skills: right after anything due
    if (dueOnly && !(c && isDue(c, now)) && !(!c && record.skills.rec?.state === 'review')) continue;
    if (due < bestDue) {
      bestDue = due;
      best = k;
    }
  }
  return best;
}

/** Words with something due, most urgent first; recently missed words go to the front. */
export function dueWords(save, now = Date.now(), allowSpeaking = false) {
  const list = [];
  for (const [id, r] of Object.entries(save.words)) {
    const skill = pickSkill(r, now, allowSpeaking, { dueOnly: true });
    if (!skill) continue;
    const c = r.skills[skill];
    const lapsed = r.hist.length && r.hist[r.hist.length - 1] === 0;
    list.push({ id, skill, score: (lapsed ? -1e12 : 0) + (c ? c.due : now) });
  }
  return list.sort((a, b) => a.score - b.score);
}

// Grammar words are very frequent but abstract; hold them back until the learner has a
// small concrete vocabulary to hang them on.
const ABSTRACT_POS = new Set(['particle', 'measure word', 'conjunction', 'preposition', 'other']);
const BEGINNER_THRESHOLD = 20;

export function nextNewWord(save, exclude = new Set()) {
  const beginner = Object.keys(save.words).length < BEGINNER_THRESHOLD;
  for (const w of VOCAB) {
    if (save.words[w.id] || exclude.has(w.id)) continue;
    if (beginner && ABSTRACT_POS.has(w.pos)) continue;
    return w;
  }
  for (const w of VOCAB) if (!save.words[w.id] && !exclude.has(w.id)) return w;
  return null;
}

function canIntroduce(session, save) {
  return session.newCount < session.maxNew && newWordsToday(save) < save.settings.newPerDay;
}

export function nextTask(session, save, rng = Math.random) {
  const now = Date.now();
  // 1. scheduled follow-ups (retries, new-word checks)
  const idx = session.scheduled.findIndex((s) => s.at <= session.count);
  if (idx >= 0) return session.scheduled.splice(idx, 1)[0].task;

  const recent = new Set(session.recent.slice(-4));
  const pending = new Set(session.scheduled.map((s) => s.task.id));
  const avoid = (id) => recent.has(id) || pending.has(id);

  // 2. due reviews, interleaving a new word every 4th card
  const due = dueWords(save, now, session.allowSpeaking).filter((d) => !avoid(d.id));
  const wantNew = canIntroduce(session, save) && (due.length === 0 || session.count % 4 === 3);
  if (wantNew) {
    const w = nextNewWord(save, pending);
    if (w) return { id: w.id, kind: 'intro', mode: 'intro' };
  }
  if (due.length) {
    const d = due[0];
    return { id: d.id, kind: 'quiz', mode: modeForSkill(d.skill, rng) };
  }

  // 3. extra practice: weakest / least recently reviewed learned words
  const learned = Object.entries(save.words)
    .filter(([id]) => !avoid(id))
    .map(([id, r]) => ({ id, r, score: (r.skills.rec?.ivl || 0) * 2 + (now - (r.skills.rec?.last || 0)) / -86_400_000 + rng() }))
    .sort((a, b) => a.score - b.score);
  if (learned.length) {
    const { id, r } = learned[0];
    const skill = pickSkill(r, now, session.allowSpeaking) || 'rec';
    return { id, kind: 'quiz', mode: modeForSkill(skill, rng) };
  }
  // 4. brand new learner past their daily cap: still teach something
  const w = nextNewWord(save, pending);
  return w ? { id: w.id, kind: 'intro', mode: 'intro' } : null;
}

/** Call after each card. correct: boolean|null (null for intro cards). */
export function afterTask(session, task, correct, save) {
  session.count += 1;
  session.recent.push(task.id);
  session.used.set(task.id, (session.used.get(task.id) || 0) + 1);
  if (task.kind === 'intro') {
    session.newCount += 1;
    session.stats.newLearned += 1;
    session.scheduled.push({ at: session.count + NEW_FOLLOWUP_GAP, task: { id: task.id, kind: 'quiz', mode: 'mc', followup: 1 } });
    return;
  }
  if (correct === false) {
    session.scheduled.push({ at: session.count + RETRY_GAP, task: { id: task.id, kind: 'quiz', mode: task.mode === 'flash' ? 'mc' : task.mode, retry: true } });
  } else if (task.followup === 1) {
    // second check on a brand new word, this time by ear
    const mode = save.settings.autoplay !== false ? 'listen' : 'reverse';
    session.scheduled.push({ at: session.count + 3, task: { id: task.id, kind: 'quiz', mode, followup: 2 } });
  }
}

export function sessionTimeUp(session) {
  return session.limitMs > 0 && Date.now() - session.startedAt >= session.limitMs;
}

export function sessionProgress(session) {
  if (!session.limitMs) return null;
  return Math.min(1, (Date.now() - session.startedAt) / session.limitMs);
}

export { getWord };
