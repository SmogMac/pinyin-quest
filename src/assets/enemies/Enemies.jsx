// Enemy sprites. All face left (toward the hero). Feet/base at the bottom of the viewBox.
// Each is self-contained so it can be swapped for a PNG/WebP/sprite sheet via the manifest.

const Eyes = ({ x1, x2, y, r = 4.5, color = '#2a1a2e', angry = false }) => (
  <g className="enemy-eyes">
    <ellipse cx={x1} cy={y} rx={r} ry={r * 1.25} fill={color} />
    <ellipse cx={x2} cy={y} rx={r} ry={r * 1.25} fill={color} />
    <circle cx={x1 - r * 0.35} cy={y - r * 0.45} r={r * 0.4} fill="#fff" />
    <circle cx={x2 - r * 0.35} cy={y - r * 0.45} r={r * 0.4} fill="#fff" />
    {angry && <path d={`M${x1 - r * 1.4} ${y - r * 2} L${x1 + r} ${y - r * 1.2} M${x2 + r * 1.4} ${y - r * 2} L${x2 - r} ${y - r * 1.2}`} stroke={color} strokeWidth="2.4" strokeLinecap="round" />}
  </g>
);
const Shadow = ({ cx, cy, rx }) => <ellipse cx={cx} cy={cy} rx={rx} ry={rx * 0.16} fill="#000" opacity=".18" />;

export function Slime() {
  return (
    <svg viewBox="0 0 100 90" className="sprite-svg" aria-hidden="true">
      <defs>
        <radialGradient id="slimeG" cx=".4" cy=".35" r=".8">
          <stop offset="0" stopColor="#b6f58a" />
          <stop offset=".6" stopColor="#5fcf5a" />
          <stop offset="1" stopColor="#2f9a46" />
        </radialGradient>
      </defs>
      <Shadow cx={50} cy={85} rx={36} />
      <path d="M12 82 Q8 56 28 40 Q40 18 54 22 Q60 10 64 22 Q86 30 90 58 Q92 76 86 82 Z" fill="url(#slimeG)" />
      <path d="M26 46 Q32 34 42 32" stroke="#e8ffd6" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".8" />
      <circle cx="24" cy="56" r="2.5" fill="#e8ffd6" opacity=".8" />
      <Eyes x1={38} x2={58} y={56} r={5} color="#1f3b24" />
      <path d="M42 68 Q48 73 54 68" stroke="#1f3b24" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <ellipse cx="32" cy="66" rx="4" ry="2" fill="#ff9aa8" opacity=".5" />
      <ellipse cx="64" cy="66" rx="4" ry="2" fill="#ff9aa8" opacity=".5" />
    </svg>
  );
}

export function Sporecap() {
  return (
    <svg viewBox="0 0 100 110" className="sprite-svg" aria-hidden="true">
      <Shadow cx={50} cy={105} rx={28} />
      <ellipse cx="38" cy="102" rx="9" ry="5" fill="#9b6a4a" />
      <ellipse cx="62" cy="102" rx="9" ry="5" fill="#9b6a4a" />
      <path d="M30 56 Q28 98 50 100 Q72 98 70 56Z" fill="#fbe8cf" />
      <path d="M32 80 Q50 86 68 80" stroke="#e8cfae" strokeWidth="3" fill="none" />
      <path d="M6 58 Q8 18 50 12 Q92 18 94 58 Q80 64 50 62 Q20 64 6 58Z" fill="#e5484d" />
      <path d="M6 58 Q20 64 50 62 Q80 64 94 58 Q92 66 50 68 Q8 66 6 58Z" fill="#b8323a" />
      <circle cx="30" cy="34" r="7" fill="#fff4e6" />
      <circle cx="56" cy="24" r="5" fill="#fff4e6" />
      <circle cx="74" cy="40" r="6" fill="#fff4e6" />
      <circle cx="46" cy="46" r="3.5" fill="#fff4e6" />
      <Eyes x1={42} x2={58} y={78} r={3.8} />
      <path d="M45 88 Q50 85 55 88" stroke="#2a1a2e" strokeWidth="2" fill="none" strokeLinecap="round" />
      <g className="spores" fill="#d6f07a" opacity=".8">
        <circle cx="16" cy="70" r="2" />
        <circle cx="86" cy="72" r="1.6" />
        <circle cx="10" cy="48" r="1.4" />
      </g>
    </svg>
  );
}

export function Bat() {
  return (
    <svg viewBox="0 0 110 90" className="sprite-svg" aria-hidden="true">
      <Shadow cx={55} cy={86} rx={20} />
      <g className="bat-body">
        <path className="wing-l" d="M38 40 Q18 18 2 30 Q10 34 8 42 Q16 38 18 48 Q26 42 34 52Z" fill="#5b3f8f" />
        <path className="wing-r" d="M72 40 Q92 18 108 30 Q100 34 102 42 Q94 38 92 48 Q84 42 76 52Z" fill="#5b3f8f" />
        <ellipse cx="55" cy="46" rx="22" ry="20" fill="#7a58b8" />
        <path d="M38 32 L36 14 L48 28Z M72 32 L74 14 L62 28Z" fill="#7a58b8" />
        <path d="M40 29 L39 19 L46 27Z M70 29 L71 19 L64 27Z" fill="#f29cc8" />
        <ellipse cx="55" cy="54" rx="12" ry="9" fill="#a88ad9" />
        <Eyes x1={47} x2={62} y={42} r={4.4} color="#ffd84a" />
        <path d="M49 54 L51 59 L53 54 M57 54 L59 59 L61 54" fill="#fff" stroke="#fff" strokeWidth="1" />
      </g>
    </svg>
  );
}

export function Goblin() {
  return (
    <svg viewBox="0 0 110 120" className="sprite-svg" aria-hidden="true">
      <Shadow cx={55} cy={116} rx={30} />
      <path d="M14 112 L22 30" stroke="#6b4a2b" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M22 30 Q16 18 22 8 Q28 18 22 30Z" fill="#26243b" />
      <ellipse cx="46" cy="112" rx="9" ry="5" fill="#4a3424" />
      <ellipse cx="66" cy="112" rx="9" ry="5" fill="#4a3424" />
      <path d="M36 72 Q56 64 76 72 L82 110 Q56 116 30 110Z" fill="#8a6a3e" />
      <path d="M30 110 Q56 116 82 110 L80 104 Q56 110 32 104Z" fill="#5f4628" />
      <rect x="36" y="86" width="40" height="5" rx="2" fill="#4a3424" />
      <circle cx="22" cy="84" r="5.5" fill="#8fd16a" />
      <path d="M38 78 Q26 80 22 84" stroke="#8a6a3e" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M12 46 Q2 38 4 30 Q16 36 28 44Z M100 46 Q110 38 108 30 Q96 36 84 44Z" fill="#8fd16a" />
      <circle cx="56" cy="50" r="26" fill="#8fd16a" />
      <path d="M30 46 Q32 22 56 20 Q80 22 82 46 Q70 32 56 34 Q42 32 30 46Z" fill="#5f4628" />
      <Eyes x1={46} x2={64} y={52} r={5} color="#2a1a2e" angry />
      <path d="M46 66 Q56 62 66 66" stroke="#2a1a2e" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M50 64 L52 69 L54 64.5" fill="#fff" />
      <ellipse cx="54" cy="58" rx="3" ry="2" fill="#6bb24a" />
    </svg>
  );
}

export function Golem() {
  return (
    <svg viewBox="0 0 120 120" className="sprite-svg" aria-hidden="true">
      <defs>
        <linearGradient id="rockG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9b3c8" />
          <stop offset="1" stopColor="#7b7491" />
        </linearGradient>
      </defs>
      <Shadow cx={60} cy={116} rx={40} />
      <path d="M30 116 Q24 100 34 96 Q44 94 46 116Z M74 116 Q72 96 84 96 Q96 100 90 116Z" fill="#7b7491" />
      <path d="M26 98 Q18 60 40 50 Q60 42 82 50 Q102 60 96 98 Q60 108 26 98Z" fill="url(#rockG)" />
      <path d="M14 92 Q6 72 18 62 Q28 66 26 90Z M106 92 Q114 72 102 62 Q92 66 94 90Z" fill="#8f88a6" />
      <path d="M38 34 Q36 14 60 12 Q84 14 82 34 Q84 52 60 54 Q36 52 38 34Z" fill="url(#rockG)" />
      <path d="M40 22 Q50 10 66 13 Q58 18 54 24 Q46 20 40 22Z M70 16 Q80 18 82 28 Q76 24 70 16Z" fill="#7cc46a" />
      <circle cx="45" cy="18" r="3" fill="#ffd1e0" />
      <g className="enemy-eyes">
        <ellipse cx="50" cy="34" rx="5" ry="4" fill="#5af0ff" />
        <ellipse cx="68" cy="34" rx="5" ry="4" fill="#5af0ff" />
        <ellipse cx="50" cy="34" rx="9" ry="7" fill="#5af0ff" opacity=".2" />
        <ellipse cx="68" cy="34" rx="9" ry="7" fill="#5af0ff" opacity=".2" />
      </g>
      <path d="M50 44 L70 44" stroke="#5b5470" strokeWidth="3" strokeLinecap="round" />
      <path d="M44 70 L54 78 L48 88 M78 66 L70 76" stroke="#6a6382" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M58 64 l5 7 l-5 7 l-5 -7z" fill="#5af0ff" opacity=".85" />
    </svg>
  );
}

export function Wisp() {
  return (
    <svg viewBox="0 0 110 120" className="sprite-svg" aria-hidden="true">
      <defs>
        <radialGradient id="wispG" cx=".45" cy=".4" r=".7">
          <stop offset="0" stopColor="#e9dcff" />
          <stop offset=".5" stopColor="#9f7bff" />
          <stop offset="1" stopColor="#5b3fc4" />
        </radialGradient>
      </defs>
      <Shadow cx={55} cy={116} rx={22} />
      <ellipse cx="55" cy="60" rx="46" ry="46" fill="#9f7bff" opacity=".14" />
      <path className="wisp-body" d="M20 64 Q16 24 50 10 Q44 26 58 22 Q66 6 76 16 Q96 32 90 64 Q88 86 74 96 Q72 108 62 104 Q56 114 48 104 Q36 110 36 96 Q20 86 20 64Z" fill="url(#wispG)" />
      <ellipse cx="44" cy="58" rx="7" ry="9" fill="#1d1238" />
      <ellipse cx="66" cy="58" rx="7" ry="9" fill="#1d1238" />
      <circle cx="44" cy="60" r="2.4" fill="#7dfcff" />
      <circle cx="66" cy="60" r="2.4" fill="#7dfcff" />
      <path d="M48 78 Q55 74 62 78 Q55 84 48 78Z" fill="#1d1238" />
      <g fill="#c7b2ff">
        <circle cx="14" cy="40" r="3" />
        <circle cx="96" cy="88" r="2.4" />
        <circle cx="98" cy="30" r="2" />
      </g>
    </svg>
  );
}

export function Knight() {
  return (
    <svg viewBox="0 0 120 130" className="sprite-svg" aria-hidden="true">
      <defs>
        <linearGradient id="shellG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3fb7a2" />
          <stop offset="1" stopColor="#1f5f63" />
        </linearGradient>
      </defs>
      <Shadow cx={60} cy={126} rx={38} />
      <ellipse cx="46" cy="122" rx="10" ry="5" fill="#173a40" />
      <ellipse cx="74" cy="122" rx="10" ry="5" fill="#173a40" />
      <path d="M34 72 Q60 62 86 72 L90 118 Q60 126 30 118Z" fill="#2d7f7a" />
      <path d="M60 30 Q100 34 104 80 Q104 110 88 118 Q92 80 60 60Z" fill="url(#shellG)" />
      <path d="M78 40 l6 -10 l2 12z M94 56 l10 -6 l-4 12z M100 80 l10 0 l-8 8z M98 102 l8 6 l-10 2z" fill="#a6f0d9" />
      <circle cx="56" cy="50" r="24" fill="#c9d6e0" />
      <path d="M32 50 Q34 24 56 24 Q78 24 80 50Z" fill="#8fa3b5" />
      <path d="M56 18 Q60 8 70 10 Q64 14 62 24Z" fill="#e5484d" />
      <rect x="36" y="46" width="40" height="12" rx="5" fill="#1f2a3a" />
      <ellipse cx="47" cy="52" rx="4" ry="3" fill="#ff6a5a" />
      <ellipse cx="65" cy="52" rx="4" ry="3" fill="#ff6a5a" />
      <path d="M8 76 Q10 64 26 62 Q40 64 40 78 Q40 100 24 108 Q8 100 8 76Z" fill="#8fa3b5" stroke="#5c6f82" strokeWidth="3" />
      <path d="M24 70 L24 100 M14 82 L34 82" stroke="#e5484d" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

