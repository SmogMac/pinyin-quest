// Shared drawing kit for the vector enemies, matched to the painted heroes: thick dark outlines,
// two-tone cel shading (the shadow side is down and away from the light, upper left), glossy
// highlights and big anime eyes with two shines.

export const OL = '#22182a'; // outline ink, the same near-black as the hero line art
export const LINE = 3.4; // outline width in viewBox units (~3px on screen, like the heroes)

/** Ellipse as a path, so it can be used as a Part outline. */
export const ell = (cx, cy, rx, ry = rx) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;

/**
 * One cel-shaded shape: the shadow colour, the base colour shifted toward the light (leaving a
 * crescent of shadow on the far side), any detail clipped inside, then the outline on top.
 */
export function Part({ id, d, fill, shade, off = [-4.5, -4], sw = LINE, className, children }) {
  return (
    <g className={className}>
      <clipPath id={id}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={shade} />
      <g clipPath={`url(#${id})`}>
        <path d={d} fill={fill} transform={`translate(${off[0]} ${off[1]})`} />
        {children}
      </g>
      <path d={d} fill="none" stroke={OL} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
    </g>
  );
}

/** A stroke with an ink outline (staffs, arms, string): the outline line, then the colour line. */
export function Stick({ d, color, w = 4.5, sw = LINE }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={OL} strokeWidth={w + sw * 1.4} />
      <path d={d} stroke={color} strokeWidth={w} />
    </g>
  );
}

/** One anime eye: white, iris with a lighter lower half, pupil, lash line and two shines. */
function Eye({ cx, cy, r, iris, glow, look = -0.18, lid }) {
  const ix = cx + r * look;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 1.22} fill="#fff" stroke={OL} strokeWidth={r * 0.32} />
      <ellipse cx={ix} cy={cy + r * 0.08} rx={r * 0.74} ry={r * 0.98} fill={iris} />
      <ellipse cx={ix} cy={cy + r * 0.45} rx={r * 0.55} ry={r * 0.42} fill={glow} />
      <ellipse cx={ix} cy={cy + r * 0.02} rx={r * 0.36} ry={r * 0.5} fill={OL} />
      <circle cx={ix - r * 0.3} cy={cy - r * 0.38} r={r * 0.3} fill="#fff" />
      <circle cx={ix + r * 0.28} cy={cy + r * 0.42} r={r * 0.13} fill="#fff" />
      <path d={`M${cx - r * 1.12} ${cy - r * 0.55}Q${cx} ${cy - r * 1.62} ${cx + r * 1.12} ${cy - r * 0.55}`} stroke={OL} strokeWidth={r * 0.42} fill="none" strokeLinecap="round" />
      {lid && <path d={lid} fill={OL} />}
    </g>
  );
}

/**
 * A pair of eyes (blink animation via .enemy-eyes). `angry` adds slanted brows, `glow` is the
 * iris's light lower half.
 */
export function Eyes({ x1, x2, y, r = 5, iris = '#3a2a5a', glow = '#8f7ad8', angry = false, brow = OL }) {
  return (
    <g className="enemy-eyes">
      <Eye cx={x1} cy={y} r={r} iris={iris} glow={glow} />
      <Eye cx={x2} cy={y} r={r} iris={iris} glow={glow} />
      {angry && (
        <path
          d={`M${x1 - r * 1.3} ${y - r * 2.1}L${x1 + r * 0.9} ${y - r * 1.45}M${x2 + r * 1.3} ${y - r * 2.1}L${x2 - r * 0.9} ${y - r * 1.45}`}
          stroke={brow}
          strokeWidth={r * 0.62}
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

/** Glowing slit eyes for constructs and spirits (no whites). */
export function GlowEyes({ x1, x2, y, rx = 5, ry = 4, color, core = '#fff' }) {
  return (
    <g className="enemy-eyes">
      {[x1, x2].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={y} rx={rx * 1.7} ry={ry * 1.7} fill={color} opacity=".28" />
          <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={color} stroke={OL} strokeWidth="2" />
          <ellipse cx={x - rx * 0.25} cy={y - ry * 0.2} rx={rx * 0.45} ry={ry * 0.4} fill={core} />
        </g>
      ))}
    </g>
  );
}

/** Soft cheek blush (solid colour). */
export const Blush = ({ x, y, rx = 4.5, ry = 2.2, color = '#ff9aae' }) => <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={color} />;

/** A glossy highlight streak (curved), drawn inside a Part. */
export const Gloss = ({ d, color = '#fff', w = 4 }) => <path d={d} stroke={color} strokeWidth={w} strokeLinecap="round" fill="none" />;
