// Pinyin helpers: tone extraction / re-marking, used for the tone puzzle and syllable distractors.

const MARKS = ['̄', '́', '̌', '̀']; // tones 1-4 (macron, acute, caron, grave)
const VOWELS = 'aeiouüv';

export function splitSyllables(pinyin) {
  return pinyin
    .toLowerCase()
    .replace(/[.,!?，。！？'’]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Tone number (0 = neutral) of a single syllable. */
export function toneOf(syl) {
  const d = syl.normalize('NFD');
  for (let i = 0; i < MARKS.length; i++) if (d.includes(MARKS[i])) return i + 1;
  return 0;
}

/** Remove the tone mark but keep ü. */
export function baseOf(syl) {
  return syl
    .normalize('NFD')
    .replace(/[̄́̌̀]/g, '')
    .normalize('NFC');
}

/** Put a tone mark on a toneless syllable following the standard placement rules. */
export function withTone(base, tone) {
  if (!tone) return base;
  const s = base.normalize('NFC');
  let idx = -1;
  if (s.includes('a')) idx = s.indexOf('a');
  else if (s.includes('e')) idx = s.indexOf('e');
  else if (s.includes('ou')) idx = s.indexOf('o');
  else {
    for (let i = s.length - 1; i >= 0; i--) {
      if (VOWELS.includes(s[i])) {
        idx = i;
        break;
      }
    }
  }
  if (idx < 0) return s;
  return (s.slice(0, idx + 1).normalize('NFD') + MARKS[tone - 1]).normalize('NFC') + s.slice(idx + 1);
}

/** n distinct alternative tone patterns of a word (each differs from the original). */
export function toneVariants(pinyin, n = 3, rng = Math.random) {
  const syls = splitSyllables(pinyin);
  const original = syls.join(' ');
  const out = new Set();
  let guard = 0;
  while (out.size < n && guard++ < 60) {
    const v = syls.map((s) => s);
    const changes = syls.length > 1 && rng() < 0.4 ? 2 : 1;
    for (let c = 0; c < changes; c++) {
      const i = Math.floor(rng() * syls.length);
      const t = toneOf(syls[i]);
      let nt = 1 + Math.floor(rng() * 4);
      if (nt === t) nt = (nt % 4) + 1;
      v[i] = withTone(baseOf(syls[i]), nt);
    }
    const joined = v.join(' ');
    if (joined !== original) out.add(joined);
  }
  return [...out];
}

/** Plausible distractor syllables: same base with another tone, or syllables from other words. */
export function syllableDistractors(target, pool, n, rng = Math.random) {
  const used = new Set(target);
  const out = [];
  // tone twins are the most useful distractors (they test tones)
  for (const s of target) {
    if (out.length >= Math.ceil(n / 2)) break;
    const t = toneOf(s);
    const alt = withTone(baseOf(s), ((t || 1) % 4) + 1);
    if (!used.has(alt)) {
      used.add(alt);
      out.push(alt);
    }
  }
  const shuffled = pool.slice().sort(() => rng() - 0.5);
  for (const s of shuffled) {
    if (out.length >= n) break;
    if (!used.has(s)) {
      used.add(s);
      out.push(s);
    }
  }
  return out;
}
