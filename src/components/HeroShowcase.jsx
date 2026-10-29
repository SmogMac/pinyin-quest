// Hero line-up on its little ink-wash stage, joined to the info card below it. Used on Home and
// on the Adventure hero picker so both share one layout (the carousel is absolutely positioned
// and needs this sized stage around it).
import { useState } from 'react';
import { useStore } from '../store/store.js';
import { selectedHero } from '../game/achievements.js';
import HeroCarousel from './HeroCarousel.jsx';
import HeroInfo from './HeroInfo.jsx';
import { BgSky, BgFar, BgMid, BgGround } from '../assets/backgrounds/Backgrounds.jsx';

export default function HeroShowcase({ onShow }) {
  const s = useStore();
  const [shown, setShown] = useState(() => selectedHero(s));
  const change = (id) => {
    setShown(id);
    onShow?.(id);
  };
  return (
    <section className="hero-showcase" aria-label="Choose your hero">
      <div className="home-hero-stage">
        <div className="bg-stack mini">
          <div className="bg-layer">
            <BgSky theme="forest" />
          </div>
          <div className="bg-layer far">
            <BgFar theme="forest" />
          </div>
          <div className="bg-layer mid">
            <BgMid theme="forest" />
          </div>
          <div className="bg-layer ground">
            <BgGround theme="forest" />
          </div>
        </div>
        <HeroCarousel onCenterChange={change} />
      </div>
      <HeroInfo heroId={shown} />
    </section>
  );
}
