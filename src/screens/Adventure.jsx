import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, update, getState, flush } from '../store/store.js';
import { levelInfo, addXp } from '../store/progress.js';
import { pickAdventureTasks } from '../learn/adventurePicker.js';
import {
  chooseBiome, chooseNode, leaveNode, battleReward, takeItem, resolveBattle, afterReward,
  enterLair, enterBeyond, openShop, shrineOptions, draftItems, heroFor, healRun, scoreOf, RUN_VERSION, runSignatures, runSynergies,
} from '../game/run.js';
import { RUN } from '../game/data/balance.js';
import { ITEMS } from '../game/data/items.js';
import { SIGNATURES } from '../game/data/signatures.js';
import { TEMPLATES } from '../learn/signaturePuzzles.js';
import { SYNERGIES, synergiesCompletedBy, synergiesWith } from '../game/data/synergies.js';
import { ENEMIES } from '../game/data/enemies.js';
import { BIOMES } from '../game/data/biomes.js';
import { ELEMENTS } from '../game/data/elements.js';
import { heroDef } from '../game/data/heroes.js';
import { EVENTS } from '../game/data/events.js';
import { STORY } from '../game/data/story.js';
import { unlockedItems, actBiomeOptions, codexSummary, requirementHint, learnedWords } from '../game/unlocks.js';
import { checkAchievements, selectedHero, heroUnlocked } from '../game/achievements.js';
import { getWord } from '../learn/vocab.js';
import StudyCard from '../components/StudyCard.jsx';
import BattleScreen from '../components/BattleScreen.jsx';
import ScrollMap from '../components/ScrollMap.jsx';
import Sprite, { ItemIcon } from '../components/Sprite.jsx';
import { TopBar, Bar, Button, Modal, Confetti, Pinyin, Hanzi, CnName } from '../components/ui.jsx';
import SigIcon from '../components/SigIcon.jsx';
import Icon from '../assets/icons/Icons.jsx';
import { play } from '../audio/sfx.js';
import { speak, stopSpeech } from '../audio/speech.js';
import { LevelUpOverlay } from './Learn.jsx';
import Bi from '../components/Bi.jsx';
import { ConfirmNewRun, ConfirmAbandon } from '../components/ConfirmDialog.jsx';
import HeroShowcase from '../components/HeroShowcase.jsx';
import { activeRun, startRun, abandonRun, finishRun as endRunIn } from '../game/runManager.js';

const mutate = (fn) => update((s) => s.adventure.current && fn(s.adventure.current, s));
const accountLevelOf = (s) => levelInfo(s.profile.xp).level;
const worldColorOf = (s) => Math.min(1, learnedWords(s).size / 250);
/** Display name of a synergy requirement (a passive item or a signature move). */
const reqDef = (id) => ITEMS[id] || SIGNATURES[id] || { py: id, en: id };
/** Synergies this hero could ever complete (signature-specific ones need that hero). */
const possibleFor = (run, sy) => {
  const sig = runSignatures(run);
  return sy.requires.every((r) => (ITEMS[r] ? !ITEMS[r].hero || ITEMS[r].hero === run.heroId : sig.includes(r)));
};

export default function Adventure({ go, params = {} }) {
  const s = useStore();
  const run = s.adventure.current;
  // The Adventure menu (Continue / New Run / Abandon) shows until the player enters the run;
  // Home's Continue button enters it directly.
  const [entered, setEntered] = useState(Boolean(params.resume));
  const accountLevel = accountLevelOf(s);
  const [levelUp, setLevelUp] = useState(null);
  const [inventory, setInventory] = useState(false);
  const [codex, setCodex] = useState(false);
  const [synergyPopup, setSynergyPopup] = useState(null);
  const [story, setStory] = useState(null);
  // A finished battle stays on screen (Victory/Defeat overlay) until Continue, while the saved
  // run has already moved on to rewards, so a reload never replays a completed fight.
  // Set through a ref first: saving the run re-renders synchronously, and the battle must not
  // unmount (and restart as a new fight) in the render between the save and the state update.
  const heldRef = useRef(null);
  const [heldState, setHeldState] = useState(null); // { key, levelUp }
  const held = heldState || heldRef.current;
  const setHeld = (h) => {
    heldRef.current = h;
    setHeldState(h);
  };

  useEffect(() => () => stopSpeech(), []);
  // a different run (new or abandoned) never inherits the previous run's finished-battle screen
  useEffect(() => {
    setHeld(null);
    setInventory(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.seed, run?.startedAt]);

  // Runs from the previous version can't continue with the new item system.
  const outdated = run && run.v !== RUN_VERSION;

  // Story beats (each shown once)
  useEffect(() => {
    if (!run || outdated) return;
    const seen = s.adventure.storySeen;
    let id = null;
    if (run.phase === 'biome' && run.act === 1) id = 'intro';
    else if (run.phase === 'biome' && run.act === 2) id = 'act2';
    else if (run.phase === 'lairIntro') id = 'lair';
    else if (run.phase === 'map' && run.act === 4) id = 'beyond';
    else if (run.phase === 'victory') id = s.adventure.dragonWins >= 3 ? 'dragon3' : s.adventure.dragonWins === 2 ? 'dragon2' : 'dragon1';
    else if (run.phase === 'complete') id = 'wordeater';
    if (id && !seen[id]) setStory(id);
    if (run.phase === 'lairIntro' && seen.lair) mutate((r) => r.phase === 'lairIntro' && enterLair(r));
  }, [run?.phase, run?.act, outdated]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeStory = () => {
    update((x) => (x.adventure.storySeen[story] = Date.now()));
    if (story === 'lair') mutate((r) => r.phase === 'lairIntro' && enterLair(r));
    setStory(null);
  };

  const grantItem = (id) => {
    let fresh = [];
    update((x) => {
      const r = x.adventure.current;
      if (!r) return;
      fresh = takeItem(r, id, accountLevelOf(x));
      x.adventure.discovered.items[id] = (x.adventure.discovered.items[id] || 0) + 1;
      for (const sid of fresh) x.adventure.synergies[sid] = (x.adventure.synergies[sid] || 0) + 1;
    });
    play('reveal');
    if (fresh.length) {
      play('levelUp');
      setSynergyPopup(fresh);
    }
    checkAchievements();
  };
  // runs saved before the signature redesign may be waiting on a spell reward: offer items instead
  useEffect(() => {
    if (run?.reward && run.reward.kind === 'items' && !run.reward.choices) {
      mutate((r) => (r.reward.choices = draftItems(r, unlockedItems(getState()), 3)));
    }
  }, [run?.reward]); // eslint-disable-line react-hooks/exhaustive-deps

  if (outdated) return <OutdatedRun go={go} />;
  if (!run || !entered)
    return (
      <AdventureMenu go={go} accountLevel={accountLevel} onEnter={() => setEntered(true)} onCodex={() => setCodex(true)} codex={codex} closeCodex={() => setCodex(false)} />
    );

  const maxHp = heroFor(run, accountLevel).maxHp;
  const inBattle = (run.phase === 'battle' && Boolean(run.battle)) || Boolean(held);
  const battleKey = held?.key ?? run.battle?.seed;
  const pools = () => ({ itemPool: unlockedItems(getState()) });

  return (
    <div className={`screen adventure phase-${run.phase}`}>
      {!inBattle && (
        <TopBar
          title={run.biome ? BIOMES[run.biome].py : `Act ${run.act}`}
          onBack={() => setEntered(false)}
          right={
            <button type="button" className="icon-btn" onClick={() => setInventory(true)} aria-label="Signature move, items and synergies">
              <Icon name="chest" />
            </button>
          }
        />
      )}
      {!inBattle && !['victory', 'defeat', 'complete'].includes(run.phase) && <RunHud run={run} maxHp={maxHp} onInventory={() => setInventory(true)} />}
      {!inBattle && run.notice?.kind === 'signatures' && (
        <div className="card notice-card">
          <b>
            <Bi k="signature" inline /> · one move per hero
          </b>
          <p className="small">
            Spells are gone: {heroDef(run.heroId).py} now has a single signature move, {SIGNATURES[heroDef(run.heroId).signature].en}, with its own Mandarin
            minigame. Passive items do the rest.{run.notice.refund ? ` The spells you had found were traded for ${run.notice.refund} 墨 ink.` : ''}
          </p>
          <Button variant="secondary" onClick={() => mutate((r) => delete r.notice)}>
            <Bi k="continue" />
          </Button>
        </div>
      )}

      {run.phase === 'biome' && (
        <BiomeSelect
          act={run.act}
          onChoose={(id) => {
            play('pick');
            const secrets = secretNodes(getState(), id);
            mutate((r) => r.phase === 'biome' && chooseBiome(r, id, secrets));
          }}
        />
      )}
      {run.phase === 'lairIntro' && <div className="card center">The air smells of ink…</div>}
      {!held && run.phase === 'map' && run.map && (
        <ScrollMap
          run={run}
          onChoose={(id) => {
            play('pick');
            mutate((r) => {
              const t = chooseNode(r, id);
              if (t === 'merchant' || (t === 'secret' && r.node?.secret === 'merchant')) {
                const p = pools();
                openShop(r, p.itemPool, { secret: t === 'secret' });
              }
              if (t === 'treasure') r.reward = { kind: 'items', choices: draftItems(r, pools().itemPool, 2, { minRarity: 'rare' }), free: true };
              if (t === 'event') r.event = { id: EVENTS[Math.floor(Math.random() * EVENTS.length)].id };
            });
          }}
        />
      )}
      {inBattle && (
        <BattleScreen
          key={battleKey}
          run={run}
          accountLevel={accountLevel}
          worldColor={worldColorOf(s)}
          onInventory={() => setInventory(true)}
          onContinue={() => {
            if (held?.levelUp) setLevelUp(held.levelUp);
            setHeld(null);
          }}
          onResolve={(res) => {
            if (run.phase !== 'battle') return;
            heldRef.current = { key: battleKey, levelUp: null };
            const type = run.battle.type;
            const won = res.result === 'win';
            const xp = won ? { battle: 5 + run.floor * 2, elite: 15 + run.floor * 2, guardian: 50, boss: run.battle.biome === 'beyond' ? 200 : 100, secretboss: 80 }[type] || 10 : 0;
            update((x) => {
              const r = x.adventure.current;
              if (!r || r.phase !== 'battle') return;
              r.runState = { ...r.runState, ...res.runState };
              r.stats.casts += res.casts;
              r.stats.fizzles += res.fizzles;
              r.ink += res.casts * RUN.inkPerCast;
              r.stats.inkEarned += res.casts * RUN.inkPerCast;
              x.adventure.kills += res.kills;
              resolveBattle(r, res, accountLevelOf(x));
              if (won && type === 'boss') {
                if (r.biome === 'beyond') x.adventure.wordEaterWins += 1;
                else {
                  x.adventure.dragonWins += 1;
                  x.adventure.bosses += 1;
                }
              }
              if (won && type === 'secretboss') x.adventure.secretBosses += 1;
              if (r.phase === 'reward') r.reward = battleReward(r, pools()) || null;
              if (r.phase === 'reward' && !r.reward) afterReward(r);
            });
            let levelUp = null;
            if (xp) levelUp = addXp(xp).levelUp || null;
            setHeld({ key: battleKey, levelUp });
            checkAchievements();
          }}
        />
      )}
      {!held && run.phase === 'reward' && run.reward && (
        <RewardView
          run={run}
          onItem={(id) => {
            if (id) grantItem(id);
            mutate((r) => afterReward(r));
          }}
        />
      )}
      {!held && run.phase === 'treasure' && run.reward && (
        <div className="reward-wrap">
          <div className="ribbon">
            <Bi k="treasure" />
          </div>
          <ItemChoice
            run={run}
            choices={run.reward.choices}
            onPick={(id) => {
              if (id) grantItem(id);
              mutate((r) => leaveNode(r));
            }}
          />
        </div>
      )}
      {run.phase === 'rest' && <RestView run={run} accountLevel={accountLevel} maxHp={maxHp} onLevelUp={setLevelUp} />}
      {run.phase === 'lesson' && (
        <QuizRunner
          title="lǎo shī · The teacher’s questions"
          count={RUN.questions.lesson}
          run={run}
          onLevelUp={setLevelUp}
          perCorrect={(r, x) => {
            healRun(r, accountLevelOf(x), RUN.lessonHealPct);
            r.ink += RUN.inkPerAnswer;
          }}
          onDone={() => mutate((r) => leaveNode(r))}
        />
      )}
      {run.phase === 'event' && <EventView run={run} onLevelUp={setLevelUp} grantItem={grantItem} />}
      {run.phase === 'shrine' && <ShrineView run={run} grantItem={grantItem} accountLevel={accountLevel} />}
      {run.phase === 'merchant' && run.shop && <MerchantView run={run} grantItem={grantItem} accountLevel={accountLevel} />}
      {!held && run.phase === 'victory' && <VictoryView run={run} go={go} onLevelUp={setLevelUp} />}
      {!held && (run.phase === 'defeat' || run.phase === 'complete') && <EndView run={run} go={go} onLevelUp={setLevelUp} />}

      {inventory && <InventoryModal run={run} accountLevel={accountLevel} onClose={() => setInventory(false)} />}
      {synergyPopup && <SynergyPopup ids={synergyPopup} onClose={() => setSynergyPopup(null)} />}
      {story && <StoryModal id={story} onClose={closeStory} />}
      {levelUp && <LevelUpOverlay level={levelUp} onClose={() => setLevelUp(null)} />}
    </div>
  );
}

/** Hidden map nodes revealed by vocabulary and progress. */
function secretNodes(save, biome) {
  const learned = learnedWords(save);
  const out = [];
  if (learned.has('钱')) out.push({ id: 'merchant', type: 'secret' });
  if (biome === 'temple' && learned.has('月亮') && (save.adventure.dragonWins || 0) >= 1) out.push({ id: 'jade_rabbit', type: 'secretboss' });
  return out;
}

// ------------------------------------------------------------------------------ run menu & HUD
/**
 * Adventure menu: Continue Run (when one exists), New Run (always), Abandon Run (when one exists).
 * Starting over with a run in progress, or abandoning it, always asks first. Only the run itself
 * is cleared (see game/runManager.js); learning progress and permanent unlocks are untouched.
 */
function AdventureMenu({ go, accountLevel, onEnter, onCodex, codex, closeCodex }) {
  const s = useStore();
  const current = activeRun(s);
  const [view, setView] = useState('menu'); // menu | pick
  const [confirm, setConfirm] = useState(null); // 'new' | 'abandon'
  const abandon = () => {
    update((x) => abandonRun(x));
    flush(); // a refresh must never bring an abandoned run back
    setConfirm(null);
  };
  const begin = (heroId) => {
    play('levelUp');
    update((x) => startRun(x, { heroId, accountLevel }));
    flush();
    onEnter();
  };
  if (view === 'pick') return <HeroPick go={go} onBack={() => setView('menu')} onStart={begin} />;
  return (
    <>
      <AdventureStart go={go} onCodex={onCodex} codex={codex} closeCodex={closeCodex}>
        <div className="run-menu">
          {current && (
            <Button className="wide big" onClick={onEnter}>
              <Icon name="play" size={20} /> <Bi k="continueRun" />
              <small className="run-menu-sub">
                {heroDef(current.heroId).py} · {current.biome ? BIOMES[current.biome].py : `Act ${current.act}`} · floor {current.floor}
              </small>
            </Button>
          )}
          <Button className="wide big" variant={current ? 'secondary' : 'primary'} onClick={() => (current ? setConfirm('new') : setView('pick'))}>
            <Icon name="swords" size={20} /> <Bi k="newRun" />
          </Button>
          {current && (
            <button type="button" className="link-btn danger" onClick={() => setConfirm('abandon')}>
              <Bi k="abandonRun" inline />
            </button>
          )}
        </div>
      </AdventureStart>
      {confirm === 'new' && (
        <ConfirmNewRun
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            abandon();
            setView('pick');
          }}
        />
      )}
      {confirm === 'abandon' && <ConfirmAbandon onCancel={() => setConfirm(null)} onConfirm={abandon} />}
    </>
  );
}

/** Character selection for a fresh run: the hero line-up with stats, then Start. */
function HeroPick({ go, onBack, onStart }) {
  const s = useStore();
  const [shown, setShown] = useState(() => selectedHero(s));
  const h = heroDef(shown);
  const ok = heroUnlocked(shown, s);
  return (
    <div className="screen adventure-start hero-pick">
      <TopBar title={<Bi k="chooseHero" />} onBack={onBack} />
      <HeroShowcase onShow={setShown} />
      <Button className="wide big" disabled={!ok} onClick={() => ok && onStart(shown)}>
        <Icon name="swords" size={22} /> <Bi k="start" py={`kāi shǐ · ${h.py}`} en={ok ? `Begin as ${h.en}` : 'Locked'} />
      </Button>
      <button type="button" className="link-btn" onClick={() => go('home')}>
        <Bi k="home" inline />
      </button>
    </div>
  );
}

function AdventureStart({ go, onCodex, codex, closeCodex, children }) {
  const s = useStore();
  const a = s.adventure;
  // show the hero of the run in progress, otherwise the one picked on Home
  const heroId = activeRun(s)?.heroId || selectedHero(s);
  const h = heroDef(heroId);
  const sig = SIGNATURES[h.signature];
  const cx = useMemo(() => codexSummary(s), [s]);
  return (
    <div className="screen adventure-start">
      <TopBar title={<Bi k="adventure" inline />} onBack={() => go('home')} />
      <div className="card adv-intro">
        <div className="adv-intro-art">
          <Sprite id={h.sprite} scale={0.8} />
          <span className="vs">VS</span>
          <Sprite id="wyrm" scale={0.5} />
        </div>
        <h2>
          Mò lóng <span className="muted small">(墨龙, the Ink Dragon)</span> stole the world’s words.
        </h2>
        <p className="muted small">
          Your hero fights on their own. Each hero has one <b>signature move</b>, powered by their own Mandarin minigame, which you solve <b>while the battle keeps going</b>. Passive items
          transform how they fight: collect them, discover synergies, and pick your route across a scroll map. Learning more words unlocks new items and lands.
        </p>
        <div className="adv-hero-line">
          <SigIcon id={h.signature} size={44} />
          <div>
            <b>
              {h.py} · <Pinyin text={sig.py} /> ({sig.en})
            </b>
            <p className="small muted">
              {sig.desc} <span className="sig-focus">Practises: {TEMPLATES[sig.template].focus}</span>
            </p>
          </div>
        </div>
        {children}
      </div>
      <div className="card">
        <div className="progress-line">
          <span>
            mò lóng defeated <b>{a.dragonWins}</b>/{RUN.dragonWinsForBeyond}
          </span>
          <Bar value={Math.min(1, a.dragonWins / RUN.dragonWinsForBeyond)} color="var(--violet)" />
        </div>
        <p className="small muted">{a.dragonWins >= RUN.dragonWinsForBeyond ? 'The Forgotten Beyond is open: after the dragon, press on to face the Word Eater.' : 'Defeat the Ink Dragon three times to open the path beyond its lair.'}</p>
        <div className="stat-grid">
          <div className="sum-tile">
            <b>{cx.items.filter((i) => i.unlocked).length}</b>
            <span>/{cx.items.length} items</span>
          </div>
          <div className="sum-tile">
            <b>{Object.keys(a.discovered.items || {}).length}</b>
            <span>items found</span>
          </div>
          <div className="sum-tile">
            <b>{Object.keys(a.synergies).length}</b>
            <span>synergies</span>
          </div>
          <div className="sum-tile">
            <b>{a.bestScore}</b>
            <span>best score</span>
          </div>
        </div>
        <Button variant="secondary" className="wide" onClick={onCodex}>
          <Icon name="book" size={18} /> Codex: what your words unlock
        </Button>
      </div>
      {codex && <CodexModal onClose={closeCodex} />}
    </div>
  );
}

function OutdatedRun({ go }) {
  return (
    <div className="screen">
      <TopBar title="Adventure" onBack={() => go('home')} />
      <div className="card center">
        <h2>The world has changed!</h2>
        <p className="muted">Adventure Mode was rebuilt with signature moves, passive items and a new map, so your unfinished run was retired. Your words, levels and heroes are all kept.</p>
        <Button
          className="wide"
          onClick={() =>
            update((x) => {
              x.adventure.runs += 1;
              x.adventure.current = null;
            })
          }
        >
          Start fresh
        </Button>
      </div>
    </div>
  );
}

function RunHud({ run, maxHp, onInventory }) {
  return (
    <div className="run-hud">
      <div className="run-hp">
        <Icon name="heart" size={18} />
        <Bar value={run.hp / maxHp} color="var(--green)" label="Hero health" />
        <span className="hp-num">
          {run.hp}/{maxHp}
        </span>
      </div>
      <div className="run-ink" title="Ink (mò): spend at merchants">
        <span className="ink-dot">墨</span>
        <b>{run.ink}</b>
      </div>
      <button type="button" className="run-upgrades" onClick={onInventory} aria-label="View signature move and items">
        <SigIcon id={heroDef(run.heroId).signature} size={30} />
        <span className="divider" />
        {run.items.slice(-6).map((id) => (
          <ItemIcon key={id} id={id} def={ITEMS[id]} size={26} />
        ))}
        {run.items.length > 6 && <span className="more">+{run.items.length - 6}</span>}
        {run.items.length === 0 && <span className="muted small">no items yet</span>}
      </button>
    </div>
  );
}

function BiomeSelect({ act, onChoose }) {
  const s = useStore();
  const opts = actBiomeOptions(act, s);
  let options = opts;
  if (!opts.some((o) => o.unlocked)) {
    // nobody is stranded: if no act-2 land is unlocked yet, revisit act-1 lands (harder)
    options = [...opts, ...actBiomeOptions(1, s).map((o) => ({ ...o, fallback: true }))];
  }
  return (
    <div className="biome-select">
      <h2 className="section-title">
        <Bi k="route" py="xuǎn zé lù xiàn" en={`Act ${act}: choose your path`} />
      </h2>
      <div className="biome-cards">
        {options.map(({ id, unlocked, fallback }) => {
          const b = BIOMES[id];
          return (
            <button key={id} type="button" className={`biome-card theme-${b.theme} ${unlocked ? '' : 'locked'}`} disabled={!unlocked} onClick={() => onChoose(id)}>
              <span className="biome-name">
                <b>{b.py}</b> <Hanzi text={b.zh} className="hanzi-sm" />
              </span>
              <span className="biome-en">
                {b.en}
                {fallback ? ' (again, harder)' : ''}
              </span>
              <span className="biome-desc">{unlocked ? b.desc : `Locked: learn ${requirementHint(b.unlock)} to open this path.`}</span>
              {unlocked && (
                <span className="biome-foes">
                  {[...new Set(b.pools.battle.flat())].slice(0, 4).map((e) => (
                    <span key={e}>{ENEMIES[e].py}</span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------ rewards
function ItemCard({ id, run, onClick, price, disabled }) {
  const it = ITEMS[id];
  const sigs = runSignatures(run);
  const completes = synergiesCompletedBy(id, run.items, sigs);
  const partners = synergiesWith(id).filter((x) => x.other.some((o) => run.items.includes(o) || sigs.includes(o)) && !completes.includes(x.id));
  const el = ELEMENTS[it.element];
  return (
    <button type="button" className={`upgrade-card rarity-${it.rarity}`} style={{ '--el': el.color, '--el-glow': el.glow }} onClick={onClick} disabled={disabled}>
      <CnName def={it} className="uc-name" />
      <ItemIcon id={id} def={it} size={58} />
      <span className="uc-level">
        {it.hero ? `${heroDef(it.hero).py} only` : it.category} · {it.rarity}
      </span>
      <span className="uc-desc">{it.desc}</span>
      <span className="uc-tags">
        <span className="element-tag" style={{ '--el': el.color }}>
          {el.py} · {el.name}
        </span>
        {price !== undefined && <span className="price-tag">{price} 墨</span>}
      </span>
      {completes.map((sid) => (
        <span key={sid} className="uc-combo">
          COMBO → {SYNERGIES[sid].py} ({SYNERGIES[sid].en})
        </span>
      ))}
      {partners.length > 0 && <span className="uc-inspired">Works with something you own</span>}
    </button>
  );
}

function ItemChoice({ run, choices, onPick }) {
  const [chosen, setChosen] = useState(false);
  return (
    <div className="pick-view">
      <div className="pick-cards">
        {choices.map((id) => (
          <ItemCard
            key={id}
            id={id}
            run={run}
            disabled={chosen}
            onClick={() => {
              if (chosen) return;
              setChosen(true);
              speak(ITEMS[id].zh);
              onPick(id);
            }}
          />
        ))}
        {!choices.length && <p className="muted center">Nothing left to find here.</p>}
      </div>
      <button type="button" className="link-btn" onClick={() => !chosen && onPick(null)}>
        <Bi k="skip" en="Take nothing" inline />
      </button>
    </div>
  );
}

function RewardView({ run, onItem }) {
  const r = run.reward;
  return (
    <div className="reward-wrap">
      <div className="ribbon">
        <Bi k="reward" py="jiǎng lì · xuǎn zé" en="Reward: choose one" />
      </div>
      {r.ink ? <p className="center gold-text">+{r.ink} 墨 ink</p> : null}
      {r.choices && <ItemChoice run={run} choices={r.choices} onPick={onItem} />}
    </div>
  );
}

// ------------------------------------------------------------------------------ node screens
/** Runs a short series of vocabulary questions (StudyCard), with a callback per correct answer. */
function QuizRunner({ title, count, run, perCorrect, onDone, onLevelUp, listeningFocus = false }) {
  const tasks = useMemo(() => pickAdventureTasks(getState(), count, { listeningFocus }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [score, setScore] = useState({ ok: 0, bad: 0 });
  const total = tasks.filter((t) => t.kind === 'quiz').length;
  const task = tasks[i];
  useEffect(() => {
    if (!task) onDone(score);
  }, [task]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!task) return null;
  return (
    <div className="quiz-view">
      <div className="quiz-head">
        <div>
          <b>{title}</b>
          <small className="muted">
            {Math.min(score.ok + score.bad + 1, total)} of {total}
          </small>
        </div>
      </div>
      <StudyCard
        key={`${i}-${task.id}`}
        task={task}
        showElement
        onComplete={(res) => {
          if (res.levelUp) onLevelUp?.(res.levelUp);
          if (!res.intro) {
            const ok = res.correct;
            setScore((x) => ({ ok: x.ok + (ok ? 1 : 0), bad: x.bad + (ok ? 0 : 1) }));
            update((x) => {
              const r = x.adventure.current;
              if (!r) return;
              if (ok) {
                r.stats.correct += 1;
                const def = heroDef(r.heroId);
                if (def.passive.quizHealPct) healRun(r, accountLevelOf(x), def.passive.quizHealPct);
                perCorrect?.(r, x);
              } else r.stats.wrong += 1;
              if (!r.stats.words.includes(res.wordId)) r.stats.words.push(res.wordId);
            });
          }
          setI((n) => n + 1);
        }}
      />
    </div>
  );
}

function RestView({ run, accountLevel, maxHp, onLevelUp }) {
  const [study, setStudy] = useState(false);
  const heal = Math.min(maxHp - run.hp, Math.round(maxHp * RUN.restHealPct));
  if (study)
    return (
      <QuizRunner
        title="gōu huǒ · Study by the fire"
        count={RUN.questions.rest}
        run={run}
        onLevelUp={onLevelUp}
        perCorrect={(r) => {
          r.ink += RUN.inkPerAnswer + 4;
          r.stats.inkEarned += RUN.inkPerAnswer + 4;
        }}
        onDone={() => mutate((r) => leaveNode(r))}
      />
    );
  return (
    <div className="rest-view">
      <div className="campfire-art" aria-hidden="true">
        <Icon name="campfire" size={80} />
      </div>
      <h2 className="section-title">gōu huǒ · A quiet campfire</h2>
      <div className="node-choices">
        <button
          type="button"
          className="node-card node-rest"
          onClick={() =>
            mutate((r) => {
              healRun(r, accountLevel, RUN.restHealPct);
              leaveNode(r);
            })
          }
        >
          <span className="node-icon">
            <Icon name="heart" size={30} />
          </span>
          <b>Rest</b>
          <small>Heal {heal} HP</small>
        </button>
        <button type="button" className="node-card node-lesson" onClick={() => setStudy(true)}>
          <span className="node-icon">
            <Icon name="book" size={30} />
          </span>
          <b>Study</b>
          <small>
            {RUN.questions.rest} questions · {RUN.inkPerAnswer + 4} 墨 each
          </small>
        </button>
      </div>
    </div>
  );
}

function EventView({ run, onLevelUp, grantItem }) {
  const ev = EVENTS.find((e) => e.id === run.event?.id) || EVENTS[0];
  const [phase, setPhase] = useState('intro'); // intro | quiz | result
  const [outcome, setOutcome] = useState(null);
  const finish = (score) => {
    const ok = score.ok > 0 && score.bad === 0;
    const branch = ok ? ev.success : ev.failure;
    const rw = branch.reward;
    let itemId = null;
    update((x) => {
      const r = x.adventure.current;
      if (!r) return;
      const lvl = accountLevelOf(x);
      if (rw.kind === 'ink') {
        r.ink += rw.amount;
        r.stats.inkEarned += rw.amount;
      } else if (rw.kind === 'heal') healRun(r, lvl, rw.pct);
      else if (rw.kind === 'maxHp') {
        r.bonus.maxHp += rw.amount;
        r.hp += rw.amount;
      } else if (rw.kind === 'spellPower') r.bonus.spellPower += rw.amount;
      else if (rw.kind === 'item') {
        const pool = unlockedItems(x);
        const lastWord = getWord(r.stats.words[r.stats.words.length - 1] || '');
        const el = rw.ofWordElement && lastWord?.element;
        const themed = el ? pool.filter((id) => ITEMS[id].element === el && !r.items.includes(id)) : [];
        itemId = (themed.length ? themed : draftItems(r, pool, 1))[0] || null;
      }
    });
    if (itemId) grantItem(itemId);
    setOutcome({ ok, text: branch.text, itemId });
    setPhase('result');
  };
  if (phase === 'quiz') return <QuizRunner title={`${ev.py} · ${ev.title}`} count={1} run={run} onLevelUp={onLevelUp} onDone={finish} />;
  return (
    <div className="card event-card">
      <div className="event-title">
        <Icon name="sparkle" size={22} />
        <b>{ev.py}</b> <Hanzi text={ev.zh} className="hanzi-sm" /> <span className="muted">· {ev.title}</span>
      </div>
      {phase === 'intro' ? (
        <>
          <p>{ev.text}</p>
          <Button className="wide" onClick={() => setPhase('quiz')}>
            Help
          </Button>
          <button type="button" className="link-btn" onClick={() => mutate((r) => leaveNode(r))}>
            Walk on
          </button>
        </>
      ) : (
        <>
          <p className={outcome.ok ? 'good-text' : ''}>{outcome.text}</p>
          {outcome.itemId && (
            <div className="build-row">
              <ItemIcon id={outcome.itemId} def={ITEMS[outcome.itemId]} size={40} />
              <div>
                <CnName def={ITEMS[outcome.itemId]} />
                <p className="small">{ITEMS[outcome.itemId].desc}</p>
              </div>
            </div>
          )}
          <Button className="wide" onClick={() => mutate((r) => leaveNode(r))}>
            Continue
          </Button>
        </>
      )}
    </div>
  );
}

function ShrineView({ run, grantItem, accountLevel }) {
  const { element, gift } = useMemo(() => shrineOptions(run, unlockedItems(getState())), []); // eslint-disable-line react-hooks/exhaustive-deps
  const el = ELEMENTS[element];
  return (
    <div className="rest-view">
      <div className="campfire-art" style={{ color: el.color }} aria-hidden="true">
        <Icon name="sun" size={80} />
      </div>
      <h2 className="section-title">
        shén miào · Shrine of {el.py} ({el.name})
      </h2>
      <div className="node-choices">
        {gift && (
          <button
            type="button"
            className="node-card"
            onClick={() => {
              grantItem(gift);
              mutate((r) => leaveNode(r));
            }}
          >
            <ItemIcon id={gift} def={ITEMS[gift]} size={52} />
            <b>{ITEMS[gift].py}</b>
            <small>{ITEMS[gift].desc}</small>
          </button>
        )}
        <button
          type="button"
          className="node-card"
          onClick={() =>
            mutate((r) => {
              r.bonus.spellPower += 0.15;
              leaveNode(r);
            })
          }
        >
          <span className="node-icon" style={{ background: el.color }}>
            <Icon name="sparkle" size={30} />
          </span>
          <b>Blessing</b>
          <small>Your signature move +15% power for this run</small>
        </button>
        <button
          type="button"
          className="node-card"
          onClick={() =>
            mutate((r) => {
              r.bonus.maxHp += 20;
              healRun(r, accountLevel, 0.25);
              leaveNode(r);
            })
          }
        >
          <span className="node-icon node-rest">
            <Icon name="heart" size={30} />
          </span>
          <b>Vigour</b>
          <small>+20 max HP and heal 25%</small>
        </button>
      </div>
    </div>
  );
}

function MerchantView({ run, grantItem, accountLevel }) {
  const shop = run.shop;
  const buy = (i) => {
    const st = shop.stock[i];
    if (st.sold || run.ink < st.price) return;
    mutate((r) => {
      r.ink -= st.price;
      r.shop.stock[i].sold = true;
      if (st.kind === 'heal') healRun(r, accountLevel, 0.3);
    });
    if (st.kind === 'item') grantItem(st.id);
    play('pick');
  };
  return (
    <div className="merchant-view">
      <div className="ribbon">{shop.secret ? 'mì mì shāng rén · Secret merchant' : 'shāng rén · Merchant'}</div>
      <p className="center">
        You have <b className="gold-text">{run.ink} 墨</b> ink.
      </p>
      <div className="pick-cards">
        {shop.stock.map((st, i) =>
          st.kind === 'item' ? (
            <div key={i} className={`shop-slot ${st.sold ? 'sold' : ''}`}>
              <ItemCard id={st.id} run={run} price={st.price} disabled={st.sold || run.ink < st.price} onClick={() => buy(i)} />
            </div>
          ) : (
            <button key={i} type="button" className={`shop-line ${st.sold ? 'sold' : ''}`} disabled={st.sold || run.ink < st.price} onClick={() => buy(i)}>
              <span className="node-icon node-rest">
                <Icon name="heart" size={22} />
              </span>
              <span>
                <b>Tea and rest</b>
                <small>Heal 30% HP</small>
              </span>
              <span className="price-tag">{st.sold ? 'sold' : `${st.price} 墨`}</span>
            </button>
          ),
        )}
      </div>
      <Button className="wide" variant="secondary" onClick={() => mutate((r) => leaveNode(r))}>
        Leave
      </Button>
    </div>
  );
}

// ------------------------------------------------------------------------------ run end
function finishRun(run, won) {
  update((s) => endRunIn(s, won));
  flush();
  checkAchievements();
}

function VictoryView({ run, go, onLevelUp }) {
  const s = useStore();
  const canGoOn = (s.adventure.dragonWins || 0) >= RUN.dragonWinsForBeyond;
  return (
    <div className="end-view won">
      <Confetti count={40} />
      <div className="card pop-in">
        <h1>
          <Bi k="victory" py="shèng lì!" en="mò lóng is defeated!" />
        </h1>
        <p className="muted">The stolen words rain back down. 了不起！ (liǎobuqǐ, amazing!)</p>
        <RunStats run={run} />
        {canGoOn && (
          <Button
            className="wide big"
            onClick={() => {
              mutate((r) => enterBeyond(r));
            }}
          >
            Continue into yí wàng zhī dì (the Forgotten Beyond)
          </Button>
        )}
        <div className="summary-actions">
          <Button
            className="wide"
            variant={canGoOn ? 'secondary' : 'primary'}
            onClick={() => {
              const r = addXp(60);
              if (r.levelUp) onLevelUp(r.levelUp);
              finishRun(run, true);
            }}
          >
            <Bi k="victory" py="jié shù · shèng lì" en="End the run victorious" />
          </Button>
          <Button variant="ghost" className="wide" onClick={() => go('home')}>
            Home (decide later)
          </Button>
        </div>
      </div>
    </div>
  );
}

function EndView({ run, go, onLevelUp }) {
  const won = run.phase === 'complete';
  const [closed, setClosed] = useState(false);
  const done = (dest) => {
    if (closed) return;
    setClosed(true);
    const bonus = won ? 150 : Math.max(0, run.floor * 3);
    const r = bonus ? addXp(bonus) : {};
    if (r.levelUp) onLevelUp(r.levelUp);
    finishRun(run, won);
    if (dest) go(dest);
  };
  return (
    <div className={`end-view ${won ? 'won' : 'lost'}`}>
      {won && <Confetti count={50} />}
      <div className="card pop-in">
        <h1>{won ? <Bi k="victory" py="shèng lì!" en="tūn zì shòu is defeated!" /> : <Bi k="defeat" en={`${heroDef(run.heroId).py} needs rest…`} />}</h1>
        <p className="muted">{won ? 'Meaning floods back into the world.' : `You reached floor ${run.floor}. Every word you practised still counts.`}</p>
        <RunStats run={run} />
        <div className="summary-actions">
          <Button className="wide" onClick={() => done(null)}>
            <Bi k="tryAgain" en="New run" />
          </Button>
          <Button className="wide" variant="secondary" onClick={() => done('learn')}>
            Review these words
          </Button>
          <Button className="wide" variant="ghost" onClick={() => done('home')}>
            <Bi k="home" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function RunStats({ run }) {
  const syn = runSynergies(run);
  return (
    <>
      <div className="stat-grid">
        <div className="sum-tile">
          <b>{scoreOf(run)}</b>
          <span>score</span>
        </div>
        <div className="sum-tile">
          <b>{run.stats.casts}</b>
          <span>signature moves</span>
        </div>
        <div className="sum-tile">
          <b>{run.stats.kills}</b>
          <span>foes</span>
        </div>
        <div className="sum-tile">
          <b>{run.items.length}</b>
          <span>items</span>
        </div>
      </div>
      <div className="end-build">
        <SigIcon id={heroDef(run.heroId).signature} size={34} />
        {run.items.map((id) => (
          <ItemIcon key={id} id={id} def={ITEMS[id]} size={30} />
        ))}
      </div>
      {syn.length > 0 && (
        <p className="small center">
          Synergies:{' '}
          {syn.map((id) => (
            <b key={id}>{SYNERGIES[id].py} </b>
          ))}
        </p>
      )}
    </>
  );
}

// ------------------------------------------------------------------------------ modals
function SynergyPopup({ ids, onClose }) {
  return (
    <Modal onClose={onClose} title="Synergy unlocked!" className="synergy-modal">
      <Confetti />
      {ids.map((id) => (
        <div key={id} className="synergy-row">
          <ItemIcon kind="synergy" id={id} def={{ element: reqDef(SYNERGIES[id].requires[0]).element, icon: 'sparkle', rarity: 'epic' }} size={56} />
          <div>
            <CnName def={{ ...SYNERGIES[id], name: SYNERGIES[id].en }} speakable />
            <p>{SYNERGIES[id].desc}</p>
            <small className="muted">{SYNERGIES[id].requires.map((r) => reqDef(r).py).join(' + ')}</small>
          </div>
        </div>
      ))}
      <Button className="wide" onClick={onClose}>
        Awesome!
      </Button>
    </Modal>
  );
}

function InventoryModal({ run, accountLevel, onClose }) {
  const hero = heroFor(run, accountLevel);
  const def = heroDef(run.heroId);
  const sigId = def.signature;
  const sig = SIGNATURES[sigId];
  const syn = runSynergies(run);
  const owned = [...run.items, sigId];
  const possible = Object.entries(SYNERGIES).filter(([id, sy]) => !syn.includes(id) && possibleFor(run, sy) && sy.requires.some((r) => owned.includes(r)));
  const [confirm, setConfirm] = useState(false);
  const pct = (n) => `${Math.round(n * 100)}%`;
  return (
    <Modal onClose={onClose} title={`${def.py} · ${def.title}`}>
      <div className="build-stats">
        <span>HP {run.hp}/{hero.maxHp}</span>
        <span>ATK {Math.round(hero.atk)}</span>
        <span>DEF {hero.def}</span>
        <span>SPD {hero.aspd.toFixed(2)}/s</span>
        <span>CRIT {pct(hero.crit)}</span>
        {hero.dodge > 0 && <span>DODGE {pct(hero.dodge)}</span>}
        {hero.block > 0 && <span>BLOCK {pct(hero.block)}</span>}
        {hero.spellPower > 0 && <span>SIGNATURE +{pct(hero.spellPower)}</span>}
        <span>墨 {run.ink}</span>
      </div>
      <div className="build-row">
        <Sprite id={def.sprite} scale={0.4} />
        <div>
          <CnName def={def.passive} speakable />
          <p className="small">{def.passive.desc}</p>
        </div>
      </div>
      <h3 className="sum-sub">
        <Bi k="signature" en="Signature move" inline />
      </h3>
      <div className="build-row">
        <SigIcon id={sigId} size={40} />
        <div>
          <CnName def={{ ...sig, name: sig.en }} speakable />
          <p className="small">
            {sig.desc} <span className="muted">({sig.cd}s cooldown · practises {TEMPLATES[sig.template].focus.toLowerCase()})</span>
          </p>
        </div>
      </div>
      <h3 className="sum-sub">Passive items ({run.items.length})</h3>
      {run.items.length === 0 && <p className="muted small">Win battles to collect passive items.</p>}
      <div className="build-list">
        {run.items.map((id) => (
          <div key={id} className="build-row">
            <ItemIcon id={id} def={ITEMS[id]} size={36} />
            <div>
              <CnName def={{ ...ITEMS[id], name: ITEMS[id].en }} speakable />
              <p className="small">{ITEMS[id].desc}</p>
            </div>
          </div>
        ))}
      </div>
      {syn.length > 0 && (
        <>
          <h3 className="sum-sub">Active synergies</h3>
          {syn.map((id) => (
            <div key={id} className="build-row synergy-active">
              <Icon name="sparkle" size={22} />
              <div>
                <CnName def={{ ...SYNERGIES[id], name: SYNERGIES[id].en }} speakable />
                <p className="small">{SYNERGIES[id].desc}</p>
              </div>
            </div>
          ))}
        </>
      )}
      {possible.length > 0 && (
        <details className="synergy-hints">
          <summary>Possible synergies ({possible.length})</summary>
          {possible.map(([id, sy]) => (
            <p key={id} className="small">
              <b>{sy.py}</b> ({sy.en}): {sy.requires.map((r) => `${reqDef(r).py}${owned.includes(r) ? ' ✓' : ''}`).join(' + ')}
            </p>
          ))}
        </details>
      )}
      <button type="button" className="link-btn danger" onClick={() => setConfirm(true)}>
        <Bi k="abandonRun" inline />
      </button>
      {confirm && (
        <ConfirmAbandon
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            update((x) => abandonRun(x));
            flush();
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

function CodexModal({ onClose }) {
  const s = useStore();
  const cx = useMemo(() => codexSummary(s), [s]);
  const [tab, setTab] = useState('items');
  const found = s.adventure.discovered;
  const moves = Object.entries(SIGNATURES).map(([id, m]) => ({ id, ...m, unlocked: true, desc: `${heroDef(m.hero).py}: ${m.desc} Practises ${TEMPLATES[m.template].focus.toLowerCase()}.` }));
  const list = tab === 'items' ? cx.items : tab === 'moves' ? moves : cx.biomes;
  return (
    <Modal onClose={onClose} title="Codex" className="codex-modal">
      <p className="small muted">Learning words unlocks what can appear in your adventures (never guaranteed). You know {cx.learned} words.</p>
      <div className="filter-row">
        {[
          ['items', `Items ${cx.items.filter((x) => x.unlocked).length}/${cx.items.length}`],
          ['moves', `Signature moves ${moves.length}`],
          ['lands', `Lands ${cx.biomes.filter((x) => x.unlocked).length}/${cx.biomes.length}`],
        ].map(([k, l]) => (
          <button key={k} type="button" className={`chip ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      <div className="codex-list">
        {list.map((x) => (
          <div key={x.id} className={`codex-row ${x.unlocked ? '' : 'locked'}`}>
            {tab === 'lands' ? <Icon name="mountain" size={26} /> : tab === 'moves' ? <SigIcon id={x.id} size={32} /> : <ItemIcon id={x.id} def={x} size={32} />}
            <div>
              <b>
                {x.py} <span className="muted">· {x.en || x.name}</span>
                {found.items[x.id] && <span className="found-tag">found</span>}
              </b>
              <p className="small">{x.unlocked ? x.desc : `Learn ${requirementHint(x.requires || x.unlock) || 'more'} to unlock.`}</p>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function StoryModal({ id, onClose }) {
  const st = STORY[id];
  useEffect(() => {
    if (st?.key) speak(st.key.zh);
  }, [st]);
  if (!st) return null;
  return (
    <Modal onClose={onClose} title={st.title} className="story-modal">
      <div className="story-scroll">
        {st.key && (
          <p className="story-key">
            <Pinyin text={st.key.py} className="pinyin-md" /> <Hanzi text={st.key.zh} className="hanzi-sm" /> <span className="muted">· {st.key.en}</span>
          </p>
        )}
        {st.lines.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>
      <Button className="wide" onClick={onClose}>
        Continue
      </Button>
    </Modal>
  );
}

