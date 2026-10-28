// Home-screen hero line-up. The centred hero idles and is the one you play; neighbours are
// greyed out and still. Tap a hero or swipe/drag horizontally to change; the line-up loops.
// Locked heroes show as black silhouettes and can be viewed but not selected.
import { useEffect, useRef, useState } from 'react';
import { useStore, update } from '../store/store.js';
import { HEROES } from '../game/data/heroes.js';
import { heroUnlocked, selectedHero, heroPalette } from '../game/achievements.js';
import { play } from '../audio/sfx.js';
import Sprite from './Sprite.jsx';
import Icon from '../assets/icons/Icons.jsx';

const IDS = Object.keys(HEROES);
const N = IDS.length;
const SLOT = 0.3; // distance between heroes, as a fraction of the stage width
const wrap = (d) => ((((d + N / 2) % N) + N) % N) - N / 2; // into [-N/2, N/2)
const mod = (i) => ((i % N) + N) % N;

export default function HeroCarousel({ onCenterChange }) {
  const s = useStore();
  const reduced = s.settings.reducedMotion;
  const [pos, setPos] = useState(() => IDS.indexOf(selectedHero(s)));
  const posRef = useRef(pos);
  const target = useRef(pos);
  const drag = useRef(null);
  const raf = useRef(0);
  const stageRef = useRef(null);

  const setPosBoth = (p) => {
    posRef.current = p;
    setPos(p);
  };

  // Ease the line-up toward the target index
  const animate = () => {
    cancelAnimationFrame(raf.current);
    const step = () => {
      const d = target.current - posRef.current;
      if (Math.abs(d) < 0.002 || reduced) {
        setPosBoth(target.current);
        return;
      }
      setPosBoth(posRef.current + d * 0.2);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const center = mod(Math.round(target.current));
  const centerId = IDS[center];

  // Selecting: only unlocked heroes become the active hero
  useEffect(() => {
    onCenterChange?.(centerId);
    if (heroUnlocked(centerId, s) && s.cosmetics.hero !== centerId) update((x) => (x.cosmetics.hero = centerId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId]);

  const goTo = (t) => {
    if (Math.round(t) !== Math.round(target.current)) play('flip');
    target.current = Math.round(t);
    animate();
  };

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    cancelAnimationFrame(raf.current);
    drag.current = { x: e.clientX, start: posRef.current, moved: false, width: stageRef.current.offsetWidth };
    try {
      stageRef.current.setPointerCapture?.(e.pointerId);
    } catch {
      /* not all pointers can be captured */
    }
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 6) d.moved = true;
    if (d.moved) setPosBoth(d.start - dx / (d.width * SLOT));
  };
  const onPointerUp = (e) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      // a tap: if it landed on a hero, bring that hero to the centre
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-hero-offset]');
      if (el) goTo(target.current + Number(el.dataset.heroOffset));
      return;
    }
    const moved = posRef.current - d.start;
    // a short flick is enough to move one hero
    const t = Math.abs(moved) > 0.15 && Math.abs(moved) < 0.5 ? d.start + Math.sign(moved) : posRef.current;
    goTo(t);
  };

  const palette = heroPalette(s);
  return (
    <div
      className="carousel"
      ref={stageRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="listbox"
      aria-label="Choose your hero (swipe or tap)"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') goTo(target.current - 1);
        if (e.key === 'ArrowRight') goTo(target.current + 1);
      }}
    >
      {IDS.map((id, i) => {
        const d = wrap(i - pos);
        const ad = Math.abs(d);
        if (ad > 1.6) return null;
        const h = HEROES[id];
        const locked = !heroUnlocked(id, s);
        const isCenter = ad < 0.5;
        return (
          <div
            key={id}
            className={`carousel-item ${locked ? 'locked' : ''} ${isCenter ? 'centered' : ''}`}
            data-hero-offset={Math.round(wrap(i - target.current))}
            role="option"
            aria-selected={isCenter}
            aria-label={locked ? `${h.py}, locked` : h.py}
            style={{
              transform: `translateX(calc(-50% + ${d * SLOT * 100}cqw)) scale(${1 - Math.min(1, ad) * 0.28})`,
              // side heroes are greyed out (not faded); only heroes leaving the edge fade
              filter: `grayscale(${Math.min(1, ad)}) brightness(${1 - Math.min(1, ad) * 0.12})`,
              opacity: Math.max(0, 1 - Math.max(0, ad - 1) * 1.2),
              zIndex: 10 - Math.round(ad * 3),
            }}
          >
            <Sprite id={h.sprite} scale={0.85} palette={palette} state={isCenter && !locked ? 'idle' : 'still'} />
            {locked && isCenter && <Icon name="lock" size={26} className="carousel-lock" />}
          </div>
        );
      })}
      <button type="button" className="carousel-arrow left" onClick={() => goTo(target.current - 1)} aria-label="Previous hero" onPointerDown={(e) => e.stopPropagation()}>
        <Icon name="back" size={18} />
      </button>
      <button type="button" className="carousel-arrow right" onClick={() => goTo(target.current + 1)} aria-label="Next hero" onPointerDown={(e) => e.stopPropagation()}>
        <Icon name="back" size={18} />
      </button>
    </div>
  );
}
