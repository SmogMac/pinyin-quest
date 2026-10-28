// Default hero: a chibi ember apprentice. Faces right. viewBox 120x150, feet at y≈142.
// `palette` comes from ROBES in src/game/achievements.js (cosmetics).
import { useId } from 'react';

export default function Hero({ palette }) {
  const p = palette;
  const uid = `hero${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 120 150" className="sprite-svg" aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}-orb`}>
          <stop offset="0" stopColor="#fffbe0" />
          <stop offset=".45" stopColor="#ffc95a" />
          <stop offset="1" stopColor="#ff6a3d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-robe`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.robe} />
          <stop offset="1" stopColor={p.dark} />
        </linearGradient>
        <linearGradient id={`${uid}-hat`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.hat} />
          <stop offset="1" stopColor={p.dark} />
        </linearGradient>
      </defs>
      <ellipse cx="58" cy="143" rx="30" ry="5" fill="#000" opacity=".18" />

      <g className="hero-staff">
        <path d="M95 141 L101 60" stroke="#5e3420" strokeWidth="5.5" strokeLinecap="round" />
        <path d="M101 60 Q92 54 95 44 Q100 50 101 54 Q103 48 109 46 Q110 56 101 60Z" fill="#7d4a2c" />
        <circle className="hero-orb-glow" cx="101" cy="44" r="13" fill={`url(#${uid}-orb)`} />
        <circle cx="101" cy="44" r="5" fill="#fff4b8" />
      </g>

      <ellipse cx="47" cy="139" rx="8.5" ry="5" fill={p.dark} />
      <ellipse cx="69" cy="139" rx="8.5" ry="5" fill={p.dark} />

      <path d="M40 86 Q58 80 76 86 L91 135 Q58 145 25 135 Z" fill={`url(#${uid}-robe)`} />
      <path d="M25 135 Q58 145 91 135 L89 128 Q58 138 27 128 Z" fill={p.trim} />
      <path d="M58 90 L58 139" stroke={p.trim} strokeWidth="2.5" opacity=".9" />
      <path d="M46 112 l4 -5 l4 5 l-4 5z M64 122 l4 -5 l4 5 l-4 5z M36 124 l3 -4 l3 4 l-3 4z" fill={p.trim} opacity=".9" />
      <rect x="42" y="96" width="32" height="5" rx="2.5" fill={p.dark} />
      <rect x="54.5" y="94.5" width="8" height="8" rx="2" fill={p.trim} stroke={p.dark} strokeWidth="1.2" />
      <path d="M35 87 Q58 101 81 87 L85 95 Q58 110 31 95Z" fill={p.hat} />

      <path d="M42 93 Q32 103 30 113" stroke={p.robe} strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M26 108 Q30 118 36 114" stroke={p.trim} strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="30" cy="116" r="4.6" fill="#ffe4cf" />
      <g className="hero-arm">
        <path d="M74 93 Q88 97 96 103" stroke={p.robe} strokeWidth="10" strokeLinecap="round" fill="none" />
        <circle cx="97" cy="102" r="5" fill="#ffe4cf" />
      </g>

      <g className="hero-head">
        <path d="M31 58 Q27 82 40 88 L42 66Z M85 58 Q89 82 76 88 L74 66Z" fill={`url(#${uid}-hat)`} />
        <circle cx="58" cy="63" r="25" fill="#ffe4cf" />
        <path d="M33 62 Q35 41 58 39 Q81 41 83 62 Q76 52 68 56 Q62 47 54 55 Q45 49 33 62Z" fill="#e8613c" />
        <path d="M33 60 Q30 74 36 82 Q38 72 41 64Z M83 60 Q86 74 80 82 Q78 72 75 64Z" fill="#e8613c" />
        <g className="hero-eyes">
          <ellipse cx="49" cy="67" rx="4.4" ry="5.8" fill="#3b2230" />
          <ellipse cx="67" cy="67" rx="4.4" ry="5.8" fill="#3b2230" />
          <ellipse cx="49" cy="69.5" rx="3" ry="2.6" fill="#f0a030" />
          <ellipse cx="67" cy="69.5" rx="3" ry="2.6" fill="#f0a030" />
          <circle cx="50.6" cy="64.6" r="1.8" fill="#fff" />
          <circle cx="68.6" cy="64.6" r="1.8" fill="#fff" />
        </g>
        <ellipse cx="42" cy="75" rx="4" ry="2.2" fill="#ff8f8f" opacity=".55" />
        <ellipse cx="74" cy="75" rx="4" ry="2.2" fill="#ff8f8f" opacity=".55" />
        <path className="hero-mouth" d="M55 76 Q58.5 79.5 62 76" stroke="#7a3340" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </g>

      <g className="hero-hat">
        <path d="M24 60 Q58 30 94 57 Q90 46 82 39 Q58 25 34 39 Q27 47 24 60Z" fill={`url(#${uid}-hat)`} />
        <path d="M35 42 Q47 12 68 5 Q86 -1 98 11 Q86 9 80 17 Q75 29 83 42 Q60 31 35 42Z" fill={`url(#${uid}-hat)`} />
        <path d="M98 11 Q105 18 99 24 Q95 21 97 17" fill={p.hat} />
        <path d="M36 43 Q60 32 82 43 L83 48 Q60 38 36 48Z" fill={p.trim} />
        <path d="M60 18 Q66 26 60 32 Q54 26 60 18Z" fill={p.trim} opacity=".95" />
      </g>
    </svg>
  );
}
