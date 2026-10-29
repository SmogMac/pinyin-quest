// Shrine blessings: rare, always positive, last for the rest of the run. Every blessing is built on
// systems all heroes share (health, speed, Momentum, crits, signature success, shields…), so none is
// ever useless. Blessings work like passive items: `stats` are added when the hero is built and
// `hooks` run in battle (they are never silenced). `run` effects apply once when granted.

export const BLESSINGS = {
  speed: {
    py: 'jí xíng', zh: '疾行', en: 'Blessing of Speed', icon: 'wind', element: 'wind',
    desc: '+25% movement speed and +10% attack speed.',
    stats: { speedPct: 0.25, aspdPct: 0.1 },
  },
  vitality: {
    py: 'shēng jī', zh: '生机', en: 'Blessing of Vitality', icon: 'heart', element: 'light',
    desc: '+40 max health, and you are healed to full.',
    run: { maxHp: 40, healFull: true },
  },
  momentum: {
    py: 'shì tóu', zh: '势头', en: 'Blessing of Momentum', icon: 'fist', element: 'fire',
    desc: 'Momentum gives +20% more attack speed, and you deal +10% damage while you have it.',
    stats: { momentumAspd: 0.2 },
    hooks: { modDamage: (b, c) => b.hasMomentum() && (c.mult *= 1.1) },
  },
  fortune: {
    py: 'fú qì', zh: '福气', en: 'Blessing of Fortune', icon: 'coin', element: 'light',
    desc: 'Rare and epic items turn up far more often, and you crit 5% more.',
    stats: { crit: 0.05 },
    run: { fortune: true },
  },
  echoes: {
    py: 'huí xiǎng', zh: '回响', en: 'Blessing of Echoes', icon: 'echo', element: 'light',
    desc: 'Every successful signature move also heals 6% and grants a 12 shield.',
    hooks: {
      onSignature(b, c) {
        if (c.echo) return;
        b.heal(b.hero, b.hero.maxHp * 0.06);
        b.addShield(b.hero, 12);
      },
    },
  },
  resilience: {
    py: 'jiān rèn', zh: '坚韧', en: 'Blessing of Resilience', icon: 'shield', element: 'earth',
    desc: 'Every 8 seconds in battle, gain a 14 shield.',
    hooks: {
      onTick(b, p, s) {
        s.t = (s.t || 0) + 1;
        if (s.t < 8) return;
        s.t = 0;
        b.addShield(b.hero, 14);
      },
    },
  },
  phoenix: {
    py: 'fèng huáng', zh: '凤凰', en: 'Blessing of the Phoenix', icon: 'flame', element: 'fire',
    desc: 'Once this run, a fatal blow leaves you standing with 35% health.',
    hooks: {
      onFatal(b, p) {
        if (p.prevented || b.runState.blessPhoenixUsed) return;
        b.runState.blessPhoenixUsed = true;
        p.prevented = true;
        b.hero.hp = Math.round(b.hero.maxHp * 0.35);
        b.label(b.hero, 'fèng huáng!', 'good');
      },
    },
  },
  abundance: {
    py: 'fēng shèng', zh: '丰盛', en: 'Blessing of Abundance', icon: 'chest', element: 'earth',
    desc: '+40% ink from every source.',
    run: { inkMult: 0.4 },
  },
  clarity: {
    py: 'qīng míng', zh: '清明', en: 'Blessing of Clarity', icon: 'hourglass', element: 'water',
    desc: 'Your signature move recharges 18% faster and is 10% stronger.',
    stats: { cdr: 0.18, spellPower: 0.1 },
  },
  ferocity: {
    py: 'yǒng měng', zh: '勇猛', en: 'Blessing of Ferocity', icon: 'swords', element: 'fire',
    desc: '+15% attack and +8% critical chance.',
    stats: { atkPct: 0.15, crit: 0.08 },
  },
  guardian: {
    py: 'shǒu hù', zh: '守护', en: 'Blessing of the Guardian', icon: 'shield', element: 'earth',
    desc: '+4 defence and you take 8% less damage.',
    stats: { def: 4, dr: 0.08 },
  },
  renewal: {
    py: 'xīn shēng', zh: '新生', en: 'Blessing of Renewal', icon: 'sparkle', element: 'water',
    desc: 'Regenerate 1.2% max health per second in battle, and heal 10% after every victory.',
    hooks: { onTick: (b) => b.heal(b.hero, b.hero.maxHp * 0.012, { silent: true }) },
    run: { victoryHeal: 0.1 },
  },
};

export const BLESSING_IDS = Object.keys(BLESSINGS);
