import { useEffect, useState } from 'react';
import Icon from '../assets/icons/Icons.jsx';
import { MASTERY } from '../learn/srs.js';
import { play } from '../audio/sfx.js';
import { useStore } from '../store/store.js';
import { speak } from '../audio/speech.js';

export function Button({ children, variant = 'primary', className = '', onClick, sound = true, ...rest }) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} ${className}`}
      onClick={(e) => {
        if (sound) play('click');
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function TopBar({ title, onBack, right }) {
  return (
    <header className="topbar">
      {onBack ? (
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Back">
          <Icon name="back" />
        </button>
      ) : (
        <span className="icon-btn-spacer" />
      )}
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-right">{right || <span className="icon-btn-spacer" />}</div>
    </header>
  );
}

export function Bar({ value, color = 'var(--gold)', className = '', label }) {
  return (
    <div className={`bar ${className}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}>
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 7, color = 'var(--gold)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.15)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, value))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

export function MasteryPips({ level, showLabel = false }) {
  return (
    <span className="pips" title={MASTERY[level].name} aria-label={`Mastery: ${MASTERY[level].name}`}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className="pip" style={{ background: i <= level ? MASTERY[level].color : undefined }} />
      ))}
      {showLabel && <span className="pip-label" style={{ color: MASTERY[level].color }}>{MASTERY[level].name}</span>}
    </span>
  );
}

export function Pinyin({ text, className = '' }) {
  return (
    <span className={`pinyin ${className}`} lang="zh-Latn-pinyin">
      {text}
    </span>
  );
}

export function Hanzi({ text, className = '', force = false }) {
  const s = useStore();
  if (s.settings.hideHanzi && !force) return null;
  return (
    <span className={`hanzi ${className}`} lang="zh-CN">
      {text}
    </span>
  );
}

export function Modal({ onClose, children, title, className = '' }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="modal-title">{title}</h2>}
        {children}
        {onClose && (
          <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Counts up from 0 to value for a satisfying reveal. */
export function CountUp({ value, duration = 900 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      setN(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{n}</>;
}

export function Confetti({ count = 26 }) {
  const s = useStore();
  if (s.settings.reducedMotion) return null;
  const colors = ['#ffd84a', '#ff7eb6', '#6fd1ff', '#7be38a', '#d38bff', '#ff9a5a'];
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 7) * 0.08}s`,
            animationDuration: `${1.4 + (i % 5) * 0.2}s`,
            transform: `rotate(${i * 47}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Game names shown for passive learning: pinyin first, then Hanzi and English.
 * `def` is any object with { py, zh, name|en }. `speakable` adds tap-to-hear.
 */
export function CnName({ def, className = '', showEn = true, speakable = false }) {
  if (!def) return null;
  const en = def.en || def.name;
  const body = (
    <>
      <span className="cn-py">{def.py}</span>
      <Hanzi text={def.zh} className="cn-zh" />
      {showEn && en && <span className="cn-en">{en}</span>}
    </>
  );
  if (!speakable) return <span className={`cn-name ${className}`}>{body}</span>;
  return (
    <button
      type="button"
      className={`cn-name speakable ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        speak(def.zh);
      }}
      aria-label={`${def.py}, ${en}. Tap to hear`}
    >
      {body}
      <Icon name="speaker" size={14} className="cn-speak" />
    </button>
  );
}
