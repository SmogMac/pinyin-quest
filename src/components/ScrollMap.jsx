// Route map drawn like an unrolled landscape scroll: parchment, ink-brush paths between nodes,
// red seal stamps on visited places and ink mist over the rows you can't see yet.
import { useEffect, useRef } from 'react';
import { NODE_INFO, reachableNodes } from '../game/run.js';
import { NODE_ICONS } from '../assets/manifest.js';
import { BIOMES } from '../game/data/biomes.js';
import Icon from '../assets/icons/Icons.jsx';
import { Hanzi } from './ui.jsx';

const ROW_H = 92;
const VIEW_W = 340;
const colX = (col) => 50 + col * ((VIEW_W - 100) / 3);

export default function ScrollMap({ run, onChoose }) {
  const wrapRef = useRef(null);
  // bring the places you can travel to into view (the scroll unrolls bottom-up)
  useEffect(() => {
    const el = wrapRef.current?.querySelector('.map-node.can');
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [run.pos]);
  const map = run.map;
  const nodes = Object.values(map.nodes);
  const rows = Math.max(...nodes.map((n) => n.row)) + 1;
  const H = rows * ROW_H + 40;
  const y = (row) => H - 40 - row * ROW_H;
  const reach = new Set(reachableNodes(run).map((n) => n.id));
  const current = run.pos ? map.nodes[run.pos] : null;
  const visibleRow = (current ? current.row : -1) + 2; // ink mist beyond this
  const biome = BIOMES[map.biome];

  return (
    <div className="scroll-wrap" ref={wrapRef}>
      <div className="scroll-rod top" />
      <div className="scroll-paper">
        <div className="scroll-title">
          <span className="scroll-act">Act {map.act}</span>
          <b>{biome.py}</b> <Hanzi text={biome.zh} className="hanzi-sm" />
          <small>{biome.en}</small>
        </div>
        <p className="scroll-desc">{biome.desc}</p>
        <svg viewBox={`0 0 ${VIEW_W} ${H}`} className="scroll-svg" role="group" aria-label="Route map">
          <defs>
            <filter id="brush">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
            </filter>
          </defs>
          {/* ink mountains in the margins */}
          <path d={`M0 ${H} L0 ${H * 0.55} Q30 ${H * 0.45} 52 ${H * 0.6} L70 ${H}Z`} fill="#c9bfa6" opacity=".45" />
          <path d={`M${VIEW_W} ${H} L${VIEW_W} ${H * 0.3} Q${VIEW_W - 30} ${H * 0.22} ${VIEW_W - 50} ${H * 0.36} L${VIEW_W - 70} ${H}Z`} fill="#c9bfa6" opacity=".4" />
          {/* paths */}
          {nodes.flatMap((n) =>
            n.next.map((id) => {
              const m = map.nodes[id];
              const travelled = n.visited && m.visited;
              const open = run.pos === n.id && reach.has(id);
              const x1 = colX(n.col);
              const x2 = colX(m.col);
              const y1 = y(n.row);
              const y2 = y(m.row);
              return (
                <path
                  key={`${n.id}>${id}`}
                  d={`M${x1} ${y1} C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}`}
                  className={`brush-path ${travelled ? 'travelled' : ''} ${open ? 'open' : ''}`}
                  filter="url(#brush)"
                />
              );
            }),
          )}
          {/* nodes */}
          {nodes.map((n) => {
            const cx = colX(n.col);
            const cy = y(n.row);
            const can = reach.has(n.id);
            const misty = n.row > visibleRow && !n.visited;
            const info = NODE_INFO[n.type];
            const big = n.type === 'guardian' || n.type === 'boss';
            const r = big ? 26 : 19;
            return (
              <g
                key={n.id}
                className={`map-node node-${n.type} ${can ? 'can' : ''} ${n.visited ? 'visited' : ''} ${misty ? 'misty' : ''} ${run.pos === n.id ? 'here' : ''}`}
                transform={`translate(${cx} ${cy})`}
                onClick={() => can && onChoose(n.id)}
                role={can ? 'button' : undefined}
                tabIndex={can ? 0 : undefined}
                aria-label={can ? `${info.py}, ${info.name}` : undefined}
                onKeyDown={(e) => can && (e.key === 'Enter' || e.key === ' ') && onChoose(n.id)}
              >
                {can && <circle r={r + 7} className="node-halo" />}
                <circle r={r} className="node-disc" />
                <foreignObject x={-r * 0.6} y={-r * 0.6} width={r * 1.2} height={r * 1.2}>
                  <div className="node-glyph">
                    <Icon name={misty ? 'cloud' : NODE_ICONS[n.type] || 'sparkle'} size={r * 1.1} />
                  </div>
                </foreignObject>
                {n.visited && (
                  <g className="seal" transform={`translate(${r * 0.7} ${-r * 0.7})`}>
                    <rect x="-8" y="-8" width="16" height="16" rx="2" />
                    <text y="4.5" textAnchor="middle">
                      过
                    </text>
                  </g>
                )}
                {!misty && (can || big) && (
                  <text y={r + 15} textAnchor="middle" className="node-label">
                    {info.py}
                  </text>
                )}
              </g>
            );
          })}
          {/* mist */}
          <rect x="0" y="0" width={VIEW_W} height={Math.max(0, y(visibleRow) - 30)} className="ink-mist" />
        </svg>
      </div>
      <div className="scroll-rod bottom" />
    </div>
  );
}
