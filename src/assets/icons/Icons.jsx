// Small UI / ability glyphs on a 24x24 grid. Use <Icon name="flame" />.
const P = {
  flame: <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z" />,
  drop: <path d="M12 2c3 5 7 9 7 13a7 7 0 0 1-14 0c0-4 4-8 7-13z" />,
  wind: <path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8a2.5 2.5 0 1 1-2.5 2.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />,
  mountain: <path d="M2 20 9 7l3 5 3-3 7 11z" />,
  sun: (
    <g>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v4M12 19v4M1 12h4M19 12h4M4 4l3 3M17 17l3 3M4 20l3-3M17 7l3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  moon: <path d="M15 3a9 9 0 1 0 6 13A8 8 0 0 1 15 3z" />,
  heart: <path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c0 6-8 11-8 11z" />,
  sword: <path d="M20 2l2 2-11 11 2 2-2 2-2-2-3 3-2-2 3-3-2-2 2-2 2 2z" />,
  rune: <path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z" />,
  eye: (
    <g>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3.5" fill="#fff" />
    </g>
  ),
  paw: (
    <g>
      <ellipse cx="12" cy="16" rx="5" ry="4" />
      <circle cx="6" cy="10" r="2.2" />
      <circle cx="10" cy="6" r="2.2" />
      <circle cx="14" cy="6" r="2.2" />
      <circle cx="18" cy="10" r="2.2" />
    </g>
  ),
  shield: <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" />,
  sparkle: <path d="M12 1l2.5 8.5L23 12l-8.5 2.5L12 23l-2.5-8.5L1 12l8.5-2.5z" />,
  skull: (
    <g>
      <path d="M12 2a8 8 0 0 0-8 8c0 3 1.5 5 3 6v4h10v-4c1.5-1 3-3 3-6a8 8 0 0 0-8-8z" />
      <circle cx="9" cy="11" r="2" fill="#fff" />
      <circle cx="15" cy="11" r="2" fill="#fff" />
    </g>
  ),
  campfire: (
    <g>
      <path d="M12 3c1 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 1 1 2 2 2 0-2-1-4 1-7z" />
      <path d="M3 20l18-3M3 17l18 3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  ),
  chest: (
    <g>
      <path d="M3 10a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v1H3z" />
      <rect x="3" y="12" width="18" height="9" rx="1.5" />
      <rect x="10.5" y="10" width="3" height="5" rx="1" fill="#fff" />
    </g>
  ),
  book: <path d="M3 4h7a3 3 0 0 1 2 1 3 3 0 0 1 2-1h7v15h-7a2 2 0 0 0-2 1 2 2 0 0 0-2-1H3z" />,
  crown: <path d="M2 7l5 4 5-7 5 7 5-4-2 12H4z" />,
  speaker: (
    <g>
      <path d="M3 9h4l5-4v14l-5-4H3z" />
      <path d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  turtle: (
    <g>
      <ellipse cx="11" cy="13" rx="7" ry="5" />
      <circle cx="20" cy="12" r="2.5" />
      <path d="M6 18l-1 3M16 18l1 3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  ),
  mic: (
    <g>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  check: <path d="M4 12l5 5L20 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />,
  x: <path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />,
  star: <path d="M12 2l3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1z" />,
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  home: <path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z" />,
  chart: <path d="M3 21V3h2v16h16v2zM7 17v-6h3v6zm5 0V7h3v10zm5 0v-8h3v8z" />,
  gear: (
    <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 5.5v-3l-2.4-.6-.7-1.6 1.3-2.1-2.1-2.1-2.1 1.3-1.6-.7L13 2h-3l-.6 2.4-1.6.7-2.1-1.3-2.1 2.1 1.3 2.1-.7 1.6L2 10.5v3l2.4.6.7 1.6-1.3 2.1 2.1 2.1 2.1-1.3 1.6.7.4 2.7h3l.6-2.4 1.6-.7 2.1 1.3 2.1-2.1-1.3-2.1.7-1.6z" />
  ),
  cards: (
    <g>
      <rect x="7" y="3" width="13" height="17" rx="2.5" />
      <rect x="3" y="6" width="12" height="16" rx="2.5" opacity=".55" />
    </g>
  ),
  lock: (
    <g>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.4" />
    </g>
  ),
  play: <path d="M7 4l13 8-13 8z" />,
  pause: <path d="M6 4h4v16H6zM14 4h4v16h-4z" />,
  ff: <path d="M3 5l9 7-9 7zm9 0l9 7-9 7z" />,
  skip: <path d="M4 5l9 7-9 7zM15 5h4v14h-4z" />,
  swords: <path d="M3 3l7 7-2 2 2 2 2-2 2 2-2 2 2 2 2-2 3 3 2-2-3-3 2-2-2-2-2 2-2-2 2-2-7-7H3zM21 3l-6 6 2 2 6-6V3z" />,
  back: <path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />,
  search: (
    <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <circle cx="10" cy="10" r="6.5" />
      <path d="M15 15l6 6" />
    </g>
  ),
  shirt: <path d="M8 3l4 2 4-2 5 4-3 4-2-1v11H8V10l-2 1-3-4z" />,
  hourglass: <path d="M6 2h12v2c0 4-4 6-4 8s4 4 4 8v2H6v-2c0-4 4-6 4-8S6 8 6 4z" />,
  download: <path d="M12 3v12m-5-5l5 5 5-5M4 20h16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
  upload: <path d="M12 16V4m-5 5l5-5 5 5M4 20h16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
  slash: <path d="M4 20C8 10 14 6 21 3c-3 6-8 12-17 17z" />,
  doubleSlash: <path d="M2 18C6 10 10 6 16 3c-2 5-6 10-14 15zm6 3C12 13 16 9 22 6c-2 5-6 10-14 15z" />,
  vortex: <path d="M12 3a9 9 0 1 1-9 9c0-3 2-5 5-5s5 2 5 5-2 3-3 3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />,
  echo: (
    <g fill="none" stroke="currentColor" strokeWidth="2.4">
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <circle cx="12" cy="12" r="7" opacity=".7" />
      <circle cx="12" cy="12" r="10.5" opacity=".4" />
    </g>
  ),
  fist: <path d="M6 8a2 2 0 0 1 4 0V6a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v1a2 2 0 0 1 3 2v4a7 7 0 0 1-7 7h-2a6 6 0 0 1-6-6z" />,
};

export default function Icon({ name, size = 22, className = '', title }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`icon ${className}`} fill="currentColor" aria-hidden={title ? undefined : 'true'} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      {P[name] || P.sparkle}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(P);
