import { OL, Part, ell } from '../enemies/ink.jsx';

// Fox spirit companion (Fox Spirit upgrade). Faces right. viewBox 80x70.
export default function Companion() {
  return (
    <svg viewBox="0 0 80 70" className="sprite-svg" aria-hidden="true">
      <Part id="cp-tail" d="M24 44Q3 41 5 21Q14 31 22 29Q10 19 18 6Q23 25 33 33Z" fill="#ffb347" shade="#d8782a" off={[2, -2]} sw={2.6}>
        <path d="M14 22Q9 14 18 6Q19 17 23 24Z" fill="#fff1c7" />
      </Part>
      <Part id="cp-fl" d={ell(34, 58, 4.5, 3.4)} fill="#e67e22" shade="#b05a14" off={[1, -1]} sw={2.2} />
      <Part id="cp-fr" d={ell(48, 58, 4.5, 3.4)} fill="#e67e22" shade="#b05a14" off={[1, -1]} sw={2.2} />
      <Part id="cp-body" d={ell(40, 46, 16, 12)} fill="#ff9a3c" shade="#d06a1a" off={[3, -3]} sw={2.6}>
        <ellipse cx="45" cy="50" rx="8" ry="6" fill="#fff1dc" />
      </Part>
      <Part id="cp-earl" d="M44 25L46 9L54 21Z" fill="#ff9a3c" shade="#d06a1a" off={[1, -1]} sw={2.4}>
        <path d="M46.5 21L47 13.5L51.5 20Z" fill="#ffd9b0" />
      </Part>
      <Part id="cp-earr" d="M57 21L64 8L66 24Z" fill="#ff9a3c" shade="#d06a1a" off={[1, -1]} sw={2.4}>
        <path d="M59 20L63 12.5L63.5 22Z" fill="#ffd9b0" />
      </Part>
      <Part id="cp-head" d={ell(54, 32, 13, 12.5)} fill="#ff9a3c" shade="#d06a1a" off={[3, -3]} sw={2.6}>
        <path d="M54 38Q64 39 69 33Q63 29 56 32Z" fill="#fff1dc" />
      </Part>
      <circle cx="68.5" cy="33" r="2" fill={OL} />
      <g className="enemy-eyes">
        {[53, 61].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="30.5" rx="2.3" ry="3.1" fill={OL} />
            <circle cx={x + 0.7} cy="29.4" r="1" fill="#fff" />
          </g>
        ))}
      </g>
      <ellipse cx="50" cy="36" rx="2.4" ry="1.3" fill="#ff9aae" />
    </svg>
  );
}
