// Mandarin pronunciation: recorded clips when available, otherwise browser TTS (zh-CN).
//
// Recorded audio: put files in public/audio/ and list them in public/audio/manifest.json as
//   { "你好": "nihao.mp3", ... }   (keys are the Hanzi, values are paths relative to public/audio/)
// The TTS engine always receives Hanzi, never romanised pinyin.
import { getState } from '../store/store.js';
import { duckMusic } from './music.js';

const listeners = new Set();
let voices = [];
let recorded = null; // manifest map once loaded
let currentAudio = null;
let unlocked = false;

export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

function refreshVoices() {
  if (!ttsSupported) return;
  voices = window.speechSynthesis.getVoices();
  listeners.forEach((l) => l());
}
if (ttsSupported) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
  // Some Android builds populate voices late without firing the event
  setTimeout(refreshVoices, 600);
  setTimeout(refreshVoices, 2000);
}

fetch(`${import.meta.env.BASE_URL}audio/manifest.json`)
  .then((r) => (r.ok ? r.json() : {}))
  .then((m) => (recorded = m && typeof m === 'object' ? m : {}))
  .catch(() => (recorded = {}));

export function onVoicesChanged(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Mandarin voices, best first. zh-HK is usually Cantonese, so it is excluded. */
export function mandarinVoices() {
  const zh = voices.filter((v) => /^(zh|cmn)/i.test(v.lang) && !/HK|yue/i.test(v.lang));
  const score = (v) => (/CN|Hans/i.test(v.lang) ? 0 : 1) + (v.localService ? 0 : 0.5) - (/natural|premium|enhanced|google/i.test(v.name) ? 0.3 : 0);
  return zh.sort((a, b) => score(a) - score(b));
}

function chosenVoice() {
  const list = mandarinVoices();
  const uri = getState().settings.voiceURI;
  return list.find((v) => v.voiceURI === uri) || list[0] || null;
}

/** 'ok' | 'no-voice' (TTS exists but no Mandarin voice reported) | 'unsupported' */
export function audioStatus() {
  if (!ttsSupported) return recorded && Object.keys(recorded).length ? 'recorded-only' : 'unsupported';
  if (!voices.length) return 'loading';
  return mandarinVoices().length ? 'ok' : 'no-voice';
}

/** Call from a user gesture once, so mobile browsers allow later programmatic playback. */
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  if (ttsSupported) {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }
}
export const isAudioUnlocked = () => unlocked;

export function stopSpeech() {
  if (ttsSupported) window.speechSynthesis.cancel();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

/**
 * Speak Chinese text. Resolves to { ok, reason } once playback ends (or fails).
 * Never throws; callers can show `reason` to the user.
 */
export function speak(text, { slow = false } = {}) {
  const st = getState().settings;
  if (st.muted) return Promise.resolve({ ok: false, reason: 'Sound is muted in Settings.' });
  stopSpeech();
  const vol = st.speechVol;
  duckMusic(true);
  const done = (res) => {
    duckMusic(false);
    return res;
  };

  const file = recorded?.[text];
  if (file) {
    return new Promise((resolve) => {
      const a = new Audio(`${import.meta.env.BASE_URL}audio/${file}`);
      currentAudio = a;
      a.volume = vol;
      a.playbackRate = slow ? 0.7 : 1;
      a.onended = () => resolve(done({ ok: true }));
      a.onerror = () => resolve(speakTts(text, slow, vol).then(done));
      a.play().catch(() => resolve(speakTts(text, slow, vol).then(done)));
    });
  }
  return speakTts(text, slow, vol).then(done);
}

function speakTts(text, slow, volume) {
  if (!ttsSupported) return Promise.resolve({ ok: false, reason: 'This browser has no speech synthesis.' });
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(text);
    const v = chosenVoice();
    if (v) u.voice = v;
    u.lang = v?.lang || 'zh-CN';
    u.rate = slow ? 0.5 : getState().settings.rate || 0.85;
    u.volume = volume;
    let settled = false;
    const finish = (res) => {
      if (!settled) {
        settled = true;
        resolve(res);
      }
    };
    u.onend = () => finish({ ok: true });
    u.onerror = (e) =>
      finish({
        ok: false,
        reason:
          e.error === 'not-allowed'
            ? 'Tap the speaker to play (your browser blocked autoplay).'
            : e.error === 'interrupted' || e.error === 'canceled'
              ? null
              : `Speech failed (${e.error || 'unknown'}).`,
      });
    synth.resume(); // Chrome sometimes leaves the queue paused
    synth.speak(u);
    // Safety net: some engines never fire onend
    setTimeout(() => finish({ ok: true }), 2500 + text.length * 600 * (slow ? 2 : 1));
  });
}

export function speechRecognitionSupported() {
  return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/** Listen for Mandarin. Resolves { ok, transcripts[] } or { ok:false, reason }. */
export function listenMandarin(timeoutMs = 7000) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return Promise.resolve({ ok: false, reason: 'Speech recognition is not available in this browser.' });
  stopSpeech();
  return new Promise((resolve) => {
    const rec = new SR();
    rec.lang = 'zh-CN';
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    let done = false;
    const finish = (r) => {
      if (done) return;
      done = true;
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
      resolve(r);
    };
    rec.onresult = (e) => {
      const alts = [];
      for (const res of e.results) for (const alt of res) alts.push(alt.transcript.trim());
      finish({ ok: true, transcripts: alts });
    };
    rec.onerror = (e) =>
      finish({
        ok: false,
        reason: e.error === 'not-allowed' ? 'Microphone permission was denied.' : e.error === 'no-speech' ? "Didn't hear anything." : `Recognition error: ${e.error}`,
      });
    rec.onend = () => finish({ ok: false, reason: "Didn't catch that." });
    setTimeout(() => finish({ ok: false, reason: 'Timed out.' }), timeoutMs);
    try {
      rec.start();
    } catch (err) {
      finish({ ok: false, reason: String(err.message || err) });
    }
  });
}
