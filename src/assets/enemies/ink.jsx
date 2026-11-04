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

/** One simple eye: a dark oval in the creature's eye colour with a single shine. */
function Eye({ cx, cy, r, iris }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={r * 0.78} ry={r * 1.05} fill={mixDark(iris)} />
      <circle cx={cx - r * 0.24} cy={cy - r * 0.38} r={r * 0.3} fill="#fff" />
    </g>
  );
}
/** Deepens an eye colour toward the outline ink, so eyes read as dark ovals. */
function mixDark(c) {
  const p = (i) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  const ink = [0x22, 0x18, 0x2a];
  return `#${[0, 1, 2].map((i) => Math.round(p(i) * 0.45 + ink[i] * 0.55).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * A pair of eyes (blink animation via .enemy-eyes). `angry` adds slanted brows; `glow` is kept
 * for older call sites and no longer drawn.
 */
export function Eyes({ x1, x2, y, r = 5, iris = '#3a2a5a', angry = false, brow = OL }) {
  return (
    <g className="enemy-eyes">
      <Eye cx={x1} cy={y} r={r} iris={iris} />
      <Eye cx={x2} cy={y} r={r} iris={iris} />
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
