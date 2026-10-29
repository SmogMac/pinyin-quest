// One icon per signature move (each hero's button looks different): the painted art from
// SIGNATURE_ICONS in the manifest, or a drawn SVG fallback.
import { memo } from 'react';
import { SIGNATURE_ICONS } from '../assets/manifest.js';
import { ELEMENTS } from '../game/data/elements.js';
import { SIGNATURES } from '../game/data/signatures.js';

const SHAPES = {
  // Fruit Salad!: an apple with a leaf and a sparkle
  fruit: (
    <>
      <path d="M24 15c-6-4-15-1-15 10 0 9 6 16 10 16 2 0 3-1 5-1s3 1 5 1c4 0 10-7 10-16 0-11-9-14-15-10z" fill="#ff5a5f" stroke="#2b1d4e" strokeWidth="2.5" />
      <path d="M24 15c0-4 1-7 4-9" fill="none" stroke="#2b1d4e" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M27 9c3-4 8-4 10-2-2 3-6 5-10 2z" fill="#5fd17a" stroke="#2b1d4e" strokeWidth="2" />
      <path d="M14 22c1-3 3-4 5-4" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
    </>
  ),
  // Patient Blade: a sword with a crescent arc
  blade: (
    <>
      <path d="M8 34C14 16 30 8 42 8 34 14 24 24 18 38z" fill="currentColor" opacity="0.35" />
      <path d="M12 38 36 12" stroke="#f4f1ff" strokeWidth="5" strokeLinecap="round" />
      <path d="M12 38 36 12" stroke="#2b1d4e" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 30l8 8" stroke="#2b1d4e" strokeWidth="4" strokeLinecap="round" />
      <path d="M8 42l5-5" stroke="#c8272d" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  // Burning Passion!: a rising flame with an inner core
  flame: (
    <>
      <path d="M24 6c2 8 12 12 12 24a12 12 0 0 1-24 0c0-6 3-9 5-12 1 4 3 5 4 5 0-6 1-11 3-17z" fill="#ff7a3d" stroke="#2b1d4e" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M24 24c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 1 2 2 2 3 2 0-2 0-5 0-7z" fill="#ffe14a" />
    </>
  ),
  // Deny Danger!: an unrolled scroll with a shield seal
  scroll: (
    <>
      <rect x="9" y="11" width="30" height="26" rx="3" fill="#f6ecd2" stroke="#2b1d4e" strokeWidth="2.5" />
      <rect x="6" y="8" width="6" height="32" rx="3" fill="#c8955a" stroke="#2b1d4e" strokeWidth="2" />
      <rect x="36" y="8" width="6" height="32" rx="3" fill="#c8955a" stroke="#2b1d4e" strokeWidth="2" />
      <path d="M24 16l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10v-5z" fill="currentColor" stroke="#2b1d4e" strokeWidth="2" />
      <path d="M20 25h8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  // Go All Out!: crossed daggers in a whirl of wind
  wind: (
    <>
      <path d="M7 18c8-6 22-6 30 0M9 30c8 6 22 6 30 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <path d="M14 36 32 12M34 36 16 12" stroke="#f4f1ff" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M14 36 32 12M34 36 16 12" stroke="#2b1d4e" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="3" fill="#ffd27a" stroke="#2b1d4e" strokeWidth="1.5" />
    </>
  ),
  // Knockback!: ball and chain with a spark
  flail: (
    <>
      <path d="M8 40c4-6 8-10 14-14" fill="none" stroke="#8a7a9c" strokeWidth="3" strokeDasharray="3 2" strokeLinecap="round" />
      <circle cx="30" cy="19" r="10" fill="#5a5470" stroke="#2b1d4e" strokeWidth="2.5" />
      <path d="M30 6v4M41 12l-3 3M43 23h-4M19 12l3 3" stroke="#2b1d4e" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M33 14l-4 6h4l-4 6" fill="none" stroke="#ffe14a" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="4" y="38" width="8" height="6" rx="2" fill="#c8955a" stroke="#2b1d4e" strokeWidth="2" />
    </>
  ),
};

function SigIcon({ id, size = 40 }) {
  const def = SIGNATURES[id];
  const art = SIGNATURE_ICONS[id];
  if (art) return <img className="sig-icon sig-art" src={`${import.meta.env.BASE_URL}${art}`} width={size} height={size} alt="" draggable="false" />;
  const el = ELEMENTS[def?.element] || ELEMENTS.physical;
  return (
    <svg className="sig-icon" width={size} height={size} viewBox="0 0 48 48" style={{ color: el.color }} aria-hidden="true">
      {SHAPES[def?.icon] || SHAPES.fruit}
    </svg>
  );
}
export default memo(SigIcon);
