import { useEffect, useState } from 'react';
import Icon from '../assets/icons/Icons.jsx';
import { speak, audioStatus, onVoicesChanged } from '../audio/speech.js';
import { useStore } from '../store/store.js';

/** Big "play" + "slow" pair. Shows a visible message when audio cannot play. */
export function AudioButtons({ text, big = false, autoplay = false, onPlayed }) {
  const soundless = useStore().settings.soundless;
  const [playing, setPlaying] = useState(null);
  const [msg, setMsg] = useState(null);

  const run = async (slow) => {
    setPlaying(slow ? 'slow' : 'normal');
    const res = await speak(text, { slow });
    setPlaying(null);
    if (!res.ok && res.reason) setMsg(res.reason);
    else if (res.ok) setMsg(null);
    onPlayed?.();
  };

  useEffect(() => {
    if (!autoplay) return;
    const t = setTimeout(() => run(false), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoplay]);

  if (soundless) return null;
  return (
    <div className={`audio-buttons ${big ? 'big' : ''}`}>
      <button type="button" className={`audio-btn ${playing === 'normal' ? 'playing' : ''}`} onClick={() => run(false)} aria-label="Play Mandarin pronunciation (R)">
        <Icon name="speaker" size={big ? 34 : 24} />
      </button>
      <button type="button" className={`audio-btn slow ${playing === 'slow' ? 'playing' : ''}`} onClick={() => run(true)} aria-label="Play slowly (S)">
        <Icon name="turtle" size={big ? 26 : 20} />
      </button>
      {msg && <p className="audio-msg">{msg}</p>}
    </div>
  );
}

/** Inline banner explaining audio problems (no Mandarin voice, unsupported browser). */
export function AudioStatusBanner() {
  const soundless = useStore().settings.soundless;
  const [status, setStatus] = useState(audioStatus());
  useEffect(() => onVoicesChanged(() => setStatus(audioStatus())), []);
  useEffect(() => {
    const t = setTimeout(() => setStatus(audioStatus()), 2500);
    return () => clearTimeout(t);
  }, []);
  if (soundless || status === 'ok' || status === 'loading') return null;
  return (
    <div className="banner warn" role="status">
      <Icon name="speaker" size={18} />
      {status === 'no-voice' ? (
        <details>
          <summary>No Mandarin voice installed, so audio may not play. How to fix</summary>
          On Android: Settings → Text-to-speech → Google → install <b>Chinese (Mandarin)</b>. On Windows: Settings → Time &amp; language → Speech → add
          Chinese (Simplified). On iPhone/Mac: Settings → Accessibility → Spoken Content → Voices → Chinese. Then reload this app.
        </details>
      ) : (
        <span>This browser can’t synthesize speech. Try Chrome or Edge for Mandarin audio.</span>
      )}
    </div>
  );
}
