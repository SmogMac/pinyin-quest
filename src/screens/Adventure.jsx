import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, update, getState, flush } from '../store/store.js';
import { levelInfo, addXp } from '../store/progress.js';
import { pickAdventureTasks } from '../learn/adventurePicker.js';
import {
  enterArea, arrive, finishEncounter, nextEncounter, nextArea, takeItem, takeBlessing, resolveBattle, afterReward, enterBeyond,
  heroFor, healRun, gainInk, buy, finishSpring, scoreOf, RUN_VERSION, runSignatures, runSynergies,
} from '../game/run.js';
import { RUN } from '../game/data/balance.js';
import { ITEMS } from '../game/data/items.js';
import { SIGNATURES } from '../game/data/signatures.js';
import { BLESSINGS } from '../game/data/blessings.js';
import { STRANGERS, STRANGER_CONSOLATION, MERCHANT } from '../game/data/encounters.js';
import { TEMPLATES, generateSigPuzzle } from '../learn/signaturePuzzles.js';
import { SYNERGIES, synergiesCompletedBy, synergiesWith } from '../game/data/synergies.js';
import { BIOMES } from '../game/data/biomes.js';
import { ELEMENTS } from '../game/data/elements.js';
import { heroDef } from '../game/data/heroes.js';
import { STORY } from '../game/data/story.js';
import { unlockedItems, actBiomeOptions, codexSummary, requirementHint, learnedWords } from '../game/unlocks.js';
import { checkAchievements, selectedHero, heroUnlocked } from '../game/achievements.js';
import StudyCard from '../components/StudyCard.jsx';
import BattleScreen from '../components/BattleScreen.jsx';
import SignaturePuzzle from '../components/SignaturePuzzle.jsx';
import { ExploreScene, ItemReveal, ShrineReveal, SpringScene, JourneyHud, npcFor } from '../components/Journey.jsx';
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
/** Display name of a synergy requirement (a passive item). */
const reqDef = (id) => ITEMS[id] || SIGNATURES[id] || { py: id, en: id };
const STORY_FOR_ACT = { 1: 'intro', 2: 'act2', 3: 'lair', 4: 'beyond' };
const ENCOUNTER_PHASES = ['merchant', 'chest', 'stranger', 'spring', 'shrine', 'reward'];

/** Biomes the player can be sent to for an act (random among unlocked; act 1 if none unlock yet). */
function unlockedBiomes(act, save) {
  const open = actBiomeOptions(act, save).filter((o) => o.unlocked).map((o) => o.id);
  return open.length ? open : actBiomeOptions(1, save).map((o) => o.id);
}
/** Hidden extras revealed by vocabulary and progress. */
function secretsFor(save) {
  const learned = learnedWords(save);
  return { merchant: learned.has('钱'), jadeRabbit: learned.has('月亮') && (save.adventure.dragonWins || 0) >= 1 };
}

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
  const [fading, setFading] = useState(null); // 'out' | 'in' | null
  const [toast, setToast] = useState(null);
  // A finished battle stays on screen (Victory/Defeat overlay) until Continue, while the saved
  // run has already moved on, so a reload never replays a completed fight. Set through a ref
  // first: saving re-renders synchronously, and the battle must not unmount in between.
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

  // Runs from much older versions can't continue (route-map runs are converted when loading).
  const outdated = run && run.v !== RUN_VERSION;

  // A new area begins: its story beat (once), then the biome is rolled and its hidden encounter
  // sequence generated, exactly once (enterArea only acts in the areaIntro phase).
  useEffect(() => {
    if (!run || outdated || !entered) return;
    const seen = s.adventure.storySeen;
    let id = null;
    if (run.phase === 'areaIntro') id = STORY_FOR_ACT[run.act];
    else if (run.phase === 'victory') id = s.adventure.dragonWins >= 3 ? 'dragon3' : s.adventure.dragonWins === 2 ? 'dragon2' : 'dragon1';
    else if (run.phase === 'complete') id = 'wordeater';
    if (id && !seen[id]) setStory(id);
    else if (run.phase === 'areaIntro') beginArea();
  }, [run?.phase, run?.act, outdated, entered]); // eslint-disable-line react-hooks/exhaustive-deps

  function beginArea() {
    update((x) => {
      const r = x.adventure.current;
      if (r?.phase === 'areaIntro') enterArea(r, { unlocked: unlockedBiomes(r.act, x), secrets: secretsFor(x) });
    });
    flush();
    setFading('in');
    setTimeout(() => setFading(null), 700);
  }
  const closeStory = () => {
    update((x) => (x.adventure.storySeen[story] = Date.now()));
    setStory(null);
    if (getState().adventure.current?.phase === 'areaIntro') beginArea();
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
  /** Ends the current encounter and walks on; shows how much ink was gained on the way. */
  const walkOn = (ink = 0) => {
    mutate((r) => finishEncounter(r));
    flush();
    if (ink) setToast({ text: `+${ink} 墨`, key: Date.now() });
  };

  if (outdated) return <OutdatedRun go={go} />;
  if (!run || !entered)
    return (
      <AdventureMenu go={go} accountLevel={accountLevel} onEnter={() => setEntered(true)} onCodex={() => setCodex(true)} codex={codex} closeCodex={() => setCodex(false)} />
    );

  const maxHp = heroFor(run, accountLevel).maxHp;
  const inBattle = (run.phase === 'battle' && Boolean(run.battle)) || Boolean(held);
  const battleKey = held?.key ?? run.battle?.seed;
  const itemPool = () => unlockedItems(getState());
  const speed = s.settings.exploreSpeed === 2 ? 2 : 1;
  const enc = nextEncounter(run);
  const onRoad = !inBattle && ['explore', ...ENCOUNTER_PHASES, 'areaClear'].includes(run.phase) && run.area;
  const areaName = run.biome ? `${BIOMES[run.biome].py} · ${BIOMES[run.biome].en}` : '';

  return (
    <div className={`screen adventure journey-screen phase-${run.phase}`}>
      {!inBattle && (
        <TopBar
          title={run.biome ? BIOMES[run.biome].py : <Bi k="adventure" inline />}
          onBack={() => setEntered(false)}
          right={
            <button type="button" className="icon-btn" onClick={() => setInventory(true)} aria-label="Signature move, items, blessings and synergies">
              <Icon name="chest" />
            </button>
          }
        />
      )}
      {!inBattle && run.notice?.kind && <NoticeCard run={run} />}

      {onRoad && (
        <>
          <JourneyHud run={run} maxHp={maxHp} speed={speed} areaName={areaName} onSpeed={(x) => update((st) => (st.settings.exploreSpeed = x))} onInventory={() => setInventory(true)} />
          <ExploreScene
            run={run}
            encounter={run.phase === 'areaClear' || run.phase === 'reward' ? null : enc /* beaten foes leave the road */}
            walking={run.phase === 'explore' && !story && !inventory}
            speed={speed}
            toast={toast}
            fading={fading}
            propState={run.phase === 'chest' || (run.phase === 'reward' && run.offer?.source === 'chest') ? 'open' : run.phase === 'spring' ? 'soak' : null}
            heroState={run.phase === 'spring' ? 'soak' : null}
            onArrive={() => {
              let t = null;
              update((x) => {
                const r = x.adventure.current;
                if (r) t = arrive(r, { itemPool: unlockedItems(x), accountLevel: accountLevelOf(x) });
              });
              flush();
              if (t) play(t === 'battle' || t === 'elite' || t === 'guardian' || t === 'boss' ? 'crit' : 'reveal');
            }}
          />
        </>
      )}

      {!inBattle && run.phase === 'areaIntro' && <div className="journey-black" aria-hidden="true" />}
      {/* the encounter panels sit under the road, so the world stays visible */}
      {!inBattle && run.phase === 'chest' && run.offer && (
        <ItemReveal
          run={run}
          id={run.offer.id}
          title={<Bi py="bǎo xiāng" en="A treasure chest!" />}
          onTake={() => {
            grantItem(run.offer.id);
            walkOn();
          }}
          onLeave={() => walkOn()}
        />
      )}
      {!held && run.phase === 'reward' && run.offer && (
        <ItemReveal
          run={run}
          id={run.offer.id}
          title={<Bi py="zhàn lì pǐn" en={`Spoils of battle${run.offer.ink ? ` · +${run.offer.ink} 墨` : ''}`} />}
          onTake={() => {
            grantItem(run.offer.id);
            mutate((r) => afterReward(r));
          }}
          onLeave={() => mutate((r) => afterReward(r))}
        />
      )}
      {!inBattle && run.phase === 'merchant' && run.shop && <MerchantView run={run} grantItem={grantItem} accountLevel={accountLevel} onLeave={() => walkOn()} />}
      {!inBattle && run.phase === 'stranger' && run.stranger && <StrangerView run={run} grantItem={grantItem} onLevelUp={setLevelUp} onDone={walkOn} />}
      {!inBattle && run.phase === 'spring' && (
        <SpringScene
          spring={run.spring}
          onDone={() => {
            mutate((r) => finishSpring(r, accountLevelOf(getState())));
            flush();
            play('levelUp');
          }}
        />
      )}
      {!inBattle && run.phase === 'shrine' && run.offer && (
        <ShrineReveal
          id={run.offer.id}
          onAccept={() => {
            mutate((r) => {
              if (r.offer?.id) takeBlessing(r, r.offer.id, accountLevelOf(getState()));
            });
            play('levelUp');
            walkOn();
          }}
        />
      )}
      {!inBattle && run.phase === 'areaClear' && (
        <AreaClear
          run={run}
          onNext={() => {
            setFading('out');
            setTimeout(() => {
              mutate((r) => nextArea(r));
              flush();
            }, 650);
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
            // nothing to choose after an ordinary fight: walk straight on
            const r = getState().adventure.current;
            if (r?.phase === 'reward' && !r.offer?.id) walkOn(r.offer?.ink);
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
              r.stats.casts += res.casts;
              r.stats.fizzles += res.fizzles;
              gainInk(r, res.casts * RUN.inkPerCast);
              x.adventure.kills += res.kills;
              resolveBattle(r, res, accountLevelOf(x), { itemPool: unlockedItems(x) });
              if (won && type === 'boss') {
                if (r.biome === 'beyond') x.adventure.wordEaterWins += 1;
                else {
                  x.adventure.dragonWins += 1;
                  x.adventure.bosses += 1;
                }
              }
              if (won && type === 'secretboss') x.adventure.secretBosses += 1;
            });
            flush();
            let lv = null;
            if (xp) lv = addXp(xp).levelUp || null;
            setHeld({ key: battleKey, levelUp: lv });
            checkAchievements();
          }}
        />
      )}
      {!held && run.phase === 'victory' && <VictoryView run={run} go={go} onLevelUp={setLevelUp} />}
      {!held && (run.phase === 'defeat' || run.phase === 'complete') && <EndView run={run} go={go} onLevelUp={setLevelUp} />}

      {inventory && <InventoryModal run={run} accountLevel={accountLevel} onClose={() => setInventory(false)} />}
      {synergyPopup && <SynergyPopup ids={synergyPopup} onClose={() => setSynergyPopup(null)} />}
      {story && <StoryModal id={story} onClose={closeStory} />}
      {levelUp && <LevelUpOverlay level={levelUp} onClose={() => setLevelUp(null)} />}
    </div>
  );
}

/** One-time notices about changes to a run that was saved by an older version. */
function NoticeCard({ run }) {
  const n = run.notice;
  const text =
    n.kind === 'journey'
      ? `Adventures are now a continuous journey: no more route maps. Your run carries on from the start of this act with everything you own.${n.refund ? ` Items that only worked for one hero were traded for ${n.refund} 墨 ink.` : ''}`
      : `Spells are gone: ${heroDef(run.heroId).py} now has a single signature move with its own Mandarin minigame.${n.refund ? ` The spells you had found were traded for ${n.refund} 墨 ink.` : ''}`;
  return (
    <div className="card notice-card">
      <b>
        <Bi py="xīn de lǚ chéng" en="Something changed" inline />
      </b>
      <p className="small">{text}</p>
      <Button variant="secondary" onClick={() => mutate((r) => delete r.notice)}>
        <Bi k="continue" />
      </Button>
    </div>
  );
}

/** Guardian beaten: the road leads on to the next area. */
function AreaClear({ run, onNext }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="journey-panel card center">
      <b>
        <Bi py="qián jìn" en="The path opens" />
      </b>
      <p className="small">The {BIOMES[run.biome]?.en || 'land'} is behind you. The road leads on…</p>
      <Button
        className="wide"
        disabled={busy}
        onClick={() => {
          if (busy) return;
          setBusy(true);
          onNext();
        }}
      >
        <Bi k="continue" />
      </Button>
    </div>
  );
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
          transform how they fight. Your hero walks on through random lands, meeting battles, merchants, treasure, strangers who need a word, hot springs and rare shrines, until each land's guardian. Learning more words unlocks new items and lands.
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
        <p className="muted">Adventure Mode was rebuilt, and this unfinished run was too old to carry over, so it was retired. Your words, levels and heroes are all kept.</p>
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

// ------------------------------------------------------------------------------ encounters
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

/**
 * A stranger who needs help with a word. Help → one Mandarin puzzle (a minigame or a vocabulary
 * question; all work without sound). Right → their reward (ink, or one item to take or leave).
 * Wrong → friendly feedback with the answer and a little ink. The result is saved the moment it is
 * known, so a reload can't replay the question or pay twice.
 */
function StrangerView({ run, grantItem, onLevelUp, onDone }) {
  const st = STRANGERS.find((x) => x.id === run.stranger.id) || STRANGERS[0];
  const result = run.stranger.result; // null | 'ok' | 'fail'
  const [step, setStep] = useState(result ? 'result' : 'talk'); // talk | puzzle | result
  const practiced = useRef(new Set());
  const puzzle = useMemo(
    () => (st.template === 'vocab' ? null : { ...generateSigPuzzle(st.template, { save: getState(), soundless: getState().settings.soundless }), sigId: null }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const settle = (ok) => {
    let ink = 0;
    update((x) => {
      const r = x.adventure.current;
      if (!r?.stranger || r.stranger.result) return;
      r.stranger.result = ok ? 'ok' : 'fail';
      if (ok) r.stats.correct += 1;
      else r.stats.wrong += 1;
      if (ok && st.reward.kind === 'ink') ink = gainInk(r, st.reward.amount);
      if (!ok) ink = gainInk(r, STRANGER_CONSOLATION.amount);
    });
    flush();
    play(ok ? 'correct' : 'wrong');
    setStep('result');
    return ink;
  };
  const npc = npcFor(run, run.area.idx);
  const head = (
    <div className="stranger-head">
      <span className="stranger-face">
        <Sprite id={heroDef(npc).sprite} scale={0.3} flip />
      </span>
      <div>
        <b>
          {st.py} <Hanzi text={st.zh} className="hanzi-sm" />
        </b>
        <small className="muted"> · {st.en}</small>
      </div>
    </div>
  );
  if (step === 'talk') {
    return (
      <div className="journey-panel card stranger-panel">
        {head}
        <p>{st.text}</p>
        <Button className="wide" onClick={() => setStep('puzzle')}>
          <Bi py="bāng máng" en="Help them" />
        </Button>
        <button type="button" className="link-btn" onClick={() => onDone()}>
          <Bi py="jì xù zǒu" en="Walk on" inline />
        </button>
      </div>
    );
  }
  if (step === 'puzzle') {
    if (st.template === 'vocab') {
      return (
        <div className="journey-panel stranger-quiz">
          <QuizRunner title={`${st.py} · ${st.en}`} count={1} run={run} onLevelUp={onLevelUp} onDone={(score) => settle(score.ok > 0 && score.bad === 0)} />
        </div>
      );
    }
    return (
      <SignaturePuzzle
        puzzle={puzzle}
        sig={{ en: st.en, element: 'light' }}
        practiced={practiced.current}
        onDone={(ok) => settle(ok)}
        onCancel={() => setStep('talk')}
      />
    );
  }
  // result
  const ok = (run.stranger.result || result) === 'ok';
  const itemReward = ok && st.reward.kind === 'item' && run.stranger.item;
  if (itemReward) {
    return (
      <ItemReveal
        run={run}
        id={run.stranger.item}
        title={<span>{st.thanks}</span>}
        onTake={() => {
          grantItem(run.stranger.item);
          onDone();
        }}
        onLeave={() => onDone()}
      />
    );
  }
  return (
    <div className="journey-panel card stranger-panel">
      {head}
      <p className={ok ? 'good-text' : ''}>{ok ? st.thanks : STRANGER_CONSOLATION.text}</p>
      {ok && st.reward.kind === 'ink' && <p className="center gold-text">+ink 墨</p>}
      <Button className="wide" onClick={() => onDone()}>
        <Bi k="continue" />
      </Button>
    </div>
  );
}

/** The fox merchant: buy as many items as you can afford; bought items leave the stall. */
function MerchantView({ run, grantItem, accountLevel, onLeave }) {
  const shop = run.shop;
  const hello = useMemo(() => MERCHANT.hello[Math.floor(Math.random() * MERCHANT.hello.length)], []);
  const purchase = (i) => {
    let got = null;
    update((x) => {
      const r = x.adventure.current;
      if (r) got = buy(r, i, accountLevel);
    });
    if (!got) return;
    if (got !== 'heal') grantItem(got);
    else play('levelUp');
    play('pick');
  };
  const forSale = shop.stock.map((st, i) => ({ ...st, i })).filter((st) => !st.sold);
  return (
    <div className="journey-panel merchant-view">
      <div className="merchant-head card">
        <span className="merchant-fox">
          <Sprite id="companion" scale={0.8} />
        </span>
        <div>
          <b>
            {shop.secret ? 'mì mì ' : ''}
            {MERCHANT.py} <Hanzi text={MERCHANT.zh} className="hanzi-sm" />
          </b>
          <small className="muted"> · {shop.secret ? 'Secret ' : ''}{MERCHANT.en}</small>
          <p className="small">{hello}</p>
        </div>
        <span className="merchant-ink gold-text">{run.ink} 墨</span>
      </div>
      <div className="pick-cards">
        {forSale.map((st) =>
          st.kind === 'item' ? (
            <div key={st.i} className="shop-slot">
              <ItemCard id={st.id} run={run} price={st.price} disabled={run.ink < st.price} onClick={() => purchase(st.i)} />
            </div>
          ) : (
            <button key={st.i} type="button" className="shop-line" disabled={run.ink < st.price} onClick={() => purchase(st.i)}>
              <span className="node-icon node-rest">
                <Icon name="heart" size={22} />
              </span>
              <span>
                <b>Tea and rest</b>
                <small>Heal 30% HP</small>
              </span>
              <span className="price-tag">{st.price} 墨</span>
            </button>
          ),
        )}
        {!forSale.length && <p className="muted center">“Sold out! You have excellent taste.”</p>}
      </div>
      <Button className="wide" variant="secondary" onClick={onLeave}>
        <Bi k="leave" en="Leave the stall" />
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
  const owned = run.items;
  const possible = Object.entries(SYNERGIES).filter(([id, sy]) => !syn.includes(id) && sy.requires.some((r) => owned.includes(r)));
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
      {(run.blessings || []).length > 0 && (
        <>
          <h3 className="sum-sub">
            <Bi py="zhù fú" en="Shrine blessings" inline />
          </h3>
          {run.blessings.map((id) => (
            <div key={id} className="build-row">
              <span className="blessing-orb small">
                <Icon name={BLESSINGS[id].icon} size={20} />
              </span>
              <div>
                <CnName def={{ ...BLESSINGS[id], name: BLESSINGS[id].en }} speakable />
                <p className="small">{BLESSINGS[id].desc}</p>
              </div>
            </div>
          ))}
        </>
      )}
      <h3 className="sum-sub">Passive items ({run.items.length})</h3>
      {run.items.length === 0 && <p className="muted small">Find items in chests, win them in battle, or buy them from merchants.</p>}
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

