import { useEffect, useMemo, useState } from 'react';
import { useStore, update, getState } from '../store/store.js';
import { levelInfo, addXp } from '../store/progress.js';
import { pickAdventureTasks } from '../learn/adventurePicker.js';
import {
  newRun, chooseNode, startQuiz, answerQuiz, nextQuizTask, finishQuiz, pickUpgrade, skipPick, resolveBattle,
  continueAfterReward, openTreasure, restHeal, heroFor, scoreOf, NODE_INFO,
} from '../game/run.js';
import { simulateBattle } from '../game/combat.js';
import { RUN } from '../game/data/balance.js';
import { UPGRADES, SYNERGIES } from '../game/data/upgrades.js';
import { ENEMIES } from '../game/data/enemies.js';
import { ELEMENTS, BLESSINGS } from '../game/data/elements.js';
import { NODE_ICONS } from '../assets/manifest.js';
import { checkAchievements, selectedHero, heroPalette } from '../game/achievements.js';
import { heroDef } from '../game/data/heroes.js';
import HeroPicker from '../components/HeroPicker.jsx';
import { speak } from '../audio/speech.js';
import { getWord } from '../learn/vocab.js';
import StudyCard from '../components/StudyCard.jsx';
import BattleView from '../components/BattleView.jsx';
import Sprite, { AbilityIcon } from '../components/Sprite.jsx';
import { TopBar, Bar, Button, Modal, Confetti, Pinyin, CnName } from '../components/ui.jsx';
import Icon from '../assets/icons/Icons.jsx';
import { play } from '../audio/sfx.js';
import { LevelUpOverlay } from './Learn.jsx';
import { stopSpeech } from '../audio/speech.js';

const mutate = (fn) => update((s) => s.adventure.current && fn(s.adventure.current, s));

export default function Adventure({ go }) {
  const s = useStore();
  const run = s.adventure.current;
  const accountLevel = levelInfo(s.profile.xp).level;
  const [levelUp, setLevelUp] = useState(null);
  const [showBuild, setShowBuild] = useState(false);
  const [synergyPopup, setSynergyPopup] = useState(null);

  useEffect(() => () => stopSpeech(), []);

  // Questions depend on the learner's save, so they are generated here (also on resume).
  useEffect(() => {
    if (run?.phase === 'prequiz') {
      const type = run.node.type;
      const n = RUN.questions[type] || 3;
      const tasks = pickAdventureTasks(getState(), n, { listeningFocus: type === 'lesson' });
      mutate((r) => r.phase === 'prequiz' && startQuiz(r, type, tasks));
    }
  }, [run?.phase, run?.node?.type]);

  if (!run) return <AdventureStart go={go} accountLevel={accountLevel} />;

  const maxHp = heroFor(run, accountLevel).maxHp;
  const inBattle = run.phase === 'battle';
  return (
    <div className={`screen adventure phase-${run.phase}`}>
      <TopBar
        title={run.phase === 'victory' || run.phase === 'defeat' ? 'Adventure' : `Floor ${Math.min(run.floor, RUN.floors)} / ${RUN.floors}`}
        onBack={() => go('home')}
        right={
          <button type="button" className="icon-btn" onClick={() => setShowBuild(true)} aria-label="View build">
            <Icon name="shirt" />
          </button>
        }
      />
      {!inBattle && run.phase !== 'victory' && run.phase !== 'defeat' && (
        <RunHud run={run} maxHp={maxHp} onBuild={() => setShowBuild(true)} />
      )}

      {run.phase === 'map' && (
        <MapView
          run={run}
          onChoose={(i) => {
            play('pick');
            mutate((r) => r.phase === 'map' && chooseNode(r, i));
          }}
        />
      )}
      {run.phase === 'quiz' && <QuizView run={run} accountLevel={accountLevel} onLevelUp={setLevelUp} />}
      {run.phase === 'pick' && <PickView run={run} accountLevel={accountLevel} onSynergy={setSynergyPopup} />}
      {run.phase === 'battle' && <BattlePhase run={run} accountLevel={accountLevel} onLevelUp={setLevelUp} />}
      {run.phase === 'reward' && <RewardView run={run} accountLevel={accountLevel} maxHp={maxHp} />}
      {run.phase === 'rest' && <RestView run={run} accountLevel={accountLevel} maxHp={maxHp} />}
      {run.phase === 'treasure' && <TreasureView accountLevel={accountLevel} />}
      {(run.phase === 'victory' || run.phase === 'defeat') && <EndView run={run} go={go} onLevelUp={setLevelUp} />}
      {run.phase === 'prequiz' && <div className="card center">Preparing questions…</div>}

      {showBuild && <BuildModal run={run} accountLevel={accountLevel} onClose={() => setShowBuild(false)} onAbandon={() => {
        update((st) => {
          st.adventure.runs += 1;
          st.adventure.current = null;
        });
        setShowBuild(false);
      }} />}
      {synergyPopup && (
        <Modal onClose={() => setSynergyPopup(null)} title="Synergy unlocked!" className="synergy-modal">
          <Confetti />
          {synergyPopup.map((id) => (
            <div key={id} className="synergy-row">
              <AbilityIcon id={id} element={UPGRADES[SYNERGIES[id].requires[0]].element} size={56} />
              <div>
                <CnName def={SYNERGIES[id]} speakable />
                <p>{SYNERGIES[id].desc}</p>
                <small className="muted">{SYNERGIES[id].requires.map((r) => UPGRADES[r].py).join(' + ')}</small>
              </div>
            </div>
          ))}
          <Button className="wide" onClick={() => setSynergyPopup(null)}>
            Awesome!
          </Button>
        </Modal>
      )}
      {levelUp && <LevelUpOverlay level={levelUp} onClose={() => setLevelUp(null)} />}
    </div>
  );
}

function AdventureStart({ go, accountLevel }) {
  const s = useStore();
  const a = s.adventure;
  const heroId = selectedHero(s);
  const start = () => {
    play('levelUp');
    update((st) => {
      st.adventure.current = newRun({ accountLevel, heroId });
    });
  };
  return (
    <div className="screen adventure-start">
      <TopBar title="Adventure" onBack={() => go('home')} />
      <div className="adv-intro card">
        <div className="adv-intro-art">
          <Sprite id={heroDef(heroId).sprite} scale={0.8} palette={heroPalette(s)} />
          <span className="vs">VS</span>
          <Sprite id="wyrm" scale={0.5} />
        </div>
        <h2>
          Mò lóng <span className="muted small">(墨龙, the Ink Dragon)</span> is erasing words!
        </h2>
        <p className="muted">
          Climb 10 floors. Before each fight, answer Mandarin questions. Each correct answer grants a <b>spark</b> and a blessing that matches the word’s
          meaning. Answer 水 (shuǐ, water) to earn shields; 火 (huǒ, fire) to set foes ablaze. Every {RUN.sparksPerUpgrade} sparks lets you draft an upgrade.
          Mistakes empower the enemy a little, but they never end your run.
        </p>
        <h3 className="sum-sub">Choose your hero</h3>
        <HeroPicker />
        <Button className="wide big" onClick={start}>
          <Icon name="swords" size={22} /> Begin as {heroDef(heroId).py}
        </Button>
      </div>
      <div className="stat-grid">
        <div className="sum-tile">
          <b>{a.runs}</b>
          <span>runs</span>
        </div>
        <div className="sum-tile">
          <b>{a.wins}</b>
          <span>victories</span>
        </div>
        <div className="sum-tile">
          <b>{a.bestFloor}</b>
          <span>best floor</span>
        </div>
        <div className="sum-tile">
          <b>{a.bestScore}</b>
          <span>best score</span>
        </div>
      </div>
      <p className="muted small center">Account level {accountLevel} gives +{Math.min(30, (accountLevel - 1) * 2)} max HP. Higher levels unlock new upgrades.</p>
    </div>
  );
}

function RunHud({ run, maxHp, onBuild }) {
  return (
    <div className="run-hud">
      <div className="run-hp">
        <Icon name="heart" size={18} />
        <Bar value={run.hp / maxHp} color="var(--green)" label="Hero health" />
        <span className="hp-num">
          {run.hp}/{maxHp}
        </span>
      </div>
      <div className="run-sparks" title={`${RUN.sparksPerUpgrade} sparks = 1 upgrade`}>
        <Icon name="sparkle" size={18} />
        <b>{run.sparks}</b>
        <small>/{RUN.sparksPerUpgrade}</small>
      </div>
      <button type="button" className="run-upgrades" onClick={onBuild} aria-label="View upgrades">
        {run.upgrades.slice(0, 6).map((u) => (
          <AbilityIcon key={u.id} id={u.id} element={UPGRADES[u.id].element} size={28} level={u.level} />
        ))}
        {run.upgrades.length === 0 && <span className="muted small">No upgrades yet</span>}
        {run.upgrades.length > 6 && <span className="more">+{run.upgrades.length - 6}</span>}
      </button>
    </div>
  );
}

function MapView({ run, onChoose }) {
  const options = run.map[run.floor - 1] || [];
  return (
    <div className="map-view">
      <h2 className="section-title">Choose your path</h2>
      <div className="node-choices">
        {options.map((t, i) => (
          <button key={i} type="button" className={`node-card node-${t}`} onClick={() => onChoose(i)}>
            <span className="node-icon">
              <Icon name={NODE_ICONS[t]} size={34} />
            </span>
            <CnName def={NODE_INFO[t]} />
            <small>{NODE_INFO[t].desc}</small>
          </button>
        ))}
      </div>
      <div className="map-path" aria-label="Upcoming floors">
        {run.map.map((opts, f) => (
          <div key={f} className={`path-floor ${f + 1 === run.floor ? 'current' : f + 1 < run.floor ? 'past' : ''}`}>
            <span className="path-num">{f + 1}</span>
            <div className="path-nodes">
              {opts.map((t, i) => (
                <span key={i} className={`path-node node-${t}`} title={`${NODE_INFO[t].py} · ${NODE_INFO[t].name}`}>
                  <Icon name={NODE_ICONS[t]} size={14} />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuizView({ run, onLevelUp }) {
  const q = run.quiz;
  const task = q.tasks[q.i];
  const [flash, setFlash] = useState(null);
  const answered = q.results.length;
  const total = q.tasks.filter((t) => t.kind === 'quiz').length;
  const kind = q.kind;
  const enemyPreview = kind === 'boss' ? 'wyrm' : null;

  const onComplete = (res) => {
    if (res.levelUp) onLevelUp(res.levelUp);
    const finishOrNext = (r) => {
      nextQuizTask(r);
      if (r.quiz.i >= r.quiz.tasks.length) finishQuiz(r, levelInfo(getState().profile.xp).level);
    };
    if (res.intro) return mutate((r) => r.quiz && finishOrNext(r));
    const w = getWord(res.wordId);
    const element = w.element || null;
    let healed = 0;
    if (res.correct) play('xp');
    mutate((r) => {
      if (!r.quiz) return;
      healed = answerQuiz(r, { wordId: res.wordId, element, correct: res.correct }, levelInfo(getState().profile.xp).level).healed;
      finishOrNext(r);
    });
    setFlash(res.correct ? { element, word: w, healed } : { wrong: true });
    setTimeout(() => setFlash(null), 1600);
  };

  if (!task) return null;
  const title = { battle: 'Prepare for battle', elite: 'Elite ahead!', boss: 'Mò lóng stirs…', lesson: 'lǎo shī: teacher’s challenge', rest: 'gōu huǒ: campfire meditation' }[kind];
  return (
    <div className="quiz-view">
      <div className="quiz-head">
        <div>
          <b>{title}</b>
          <small className="muted">
            Question {Math.min(answered + 1, total)} of {total}
            {kind === 'lesson' ? ' · listening focus' : ''}
          </small>
        </div>
        {enemyPreview && <Sprite id={enemyPreview} scale={0.22} />}
        <div className="quiz-dots">
          {q.results.map((r, i) => (
            <span key={i} className={`qdot ${r.correct ? 'ok' : 'bad'}`} style={r.correct && r.element ? { background: ELEMENTS[r.element].color } : undefined} />
          ))}
          {Array.from({ length: Math.max(0, total - answered) }, (_, i) => (
            <span key={`p${i}`} className="qdot" />
          ))}
        </div>
      </div>
      <StudyCard key={`${q.i}-${task.id}`} task={task} onComplete={onComplete} showElement />
      {flash && (
        <div className={`spark-flash ${flash.wrong ? 'bad' : ''}`} style={flash.element ? { '--el': ELEMENTS[flash.element].color } : undefined}>
          {flash.wrong ? (
            kind === 'lesson' || kind === 'rest' ? (
              'Keep going!'
            ) : (
              `Foes +${Math.round(RUN.wrongAnswerEnemyBuff * 100)}% attack`
            )
          ) : (
            <>
              <Icon name="sparkle" size={18} /> +1 spark
              {kind !== 'lesson' && kind !== 'rest' && (
                <span>
                  {' '}
                  · {flash.element ? `${ELEMENTS[flash.element].py} ${ELEMENTS[flash.element].zh}` : 'Courage'}: {BLESSINGS[flash.element || 'none'].text}
                </span>
              )}
              {flash.healed > 0 && <span> · kāi xīn +{flash.healed} HP</span>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PickView({ run, accountLevel, onSynergy }) {
  const [chosen, setChosen] = useState(null);
  const pick = (c) => {
    if (chosen) return;
    setChosen(c.id);
    play('reveal');
    speak(UPGRADES[c.id].zh);
    setTimeout(() => {
      let fresh = [];
      update((s) => {
        const r = s.adventure.current;
        if (!r || r.phase !== 'pick' || !r.choices?.some((x) => x.id === c.id)) return;
        fresh = pickUpgrade(r, c.id, accountLevel);
        for (const id of fresh) s.adventure.synergies[id] = (s.adventure.synergies[id] || 0) + 1;
      });
      if (fresh.length) {
        play('levelUp');
        onSynergy(fresh);
        checkAchievements();
      }
      setChosen(null);
    }, 450);
  };
  return (
    <div className="pick-view">
      <div className="ribbon">{run.choicesFree ? 'Treasure!' : 'Select upgrade'}</div>
      <div className="pick-cards">
        {run.choices.map((c) => {
          const u = UPGRADES[c.id];
          const el = ELEMENTS[u.element];
          const w = c.inspiredBy && getWord(c.inspiredBy);
          return (
            <button
              key={c.id}
              type="button"
              className={`upgrade-card rarity-${u.rarity} ${chosen === c.id ? 'chosen' : chosen ? 'faded' : ''}`}
              style={{ '--el': el.color, '--el-glow': el.glow }}
              onClick={() => pick(c)}
            >
              <CnName def={u} className="uc-name" />
              <AbilityIcon id={c.id} element={u.element} size={64} />
              <span className="uc-level">{c.level === 1 ? 'NEW' : `Lv ${c.level - 1} → ${c.level}`}</span>
              <span className="uc-desc">{u.desc(c.level)}</span>
              <span className="uc-tags">
                <span className="element-tag" style={{ '--el': el.color }}>
                  {el.py} {el.zh}
                </span>
                <span className={`rarity-tag ${u.rarity}`}>{u.rarity}</span>
              </span>
              {w && (
                <span className="uc-inspired">
                  Inspired by <Pinyin text={w.pinyin} /> <em>({w.gloss})</em>
                </span>
              )}
              {c.synergy && <span className="uc-combo">COMBO → {SYNERGIES[c.synergy].py} ({SYNERGIES[c.synergy].name})</span>}
            </button>
          );
        })}
      </div>
      <button type="button" className="link-btn" onClick={() => mutate((r) => r.phase === 'pick' && skipPick(r))}>
        Skip
      </button>
    </div>
  );
}

function BattlePhase({ run, accountLevel, onLevelUp }) {
  const b = run.battle;
  const sim = useMemo(() => {
    const hero = heroFor(run, accountLevel, b.blessings);
    return simulateBattle({ hero, heroHp: run.hp, enemies: b.enemies, floor: run.floor, seed: b.seed, empower: b.empower });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.seed]);
  const onDone = (result) => {
    const won = result.result === 'win';
    update((s) => {
      s.adventure.kills += result.kills;
      if (won && b.type === 'boss') s.adventure.bosses += 1;
      if (s.adventure.current?.phase !== 'battle') return;
      resolveBattle(s.adventure.current, result);
    });
    if (won) {
      const xp = b.type === 'boss' ? 100 : 5 + run.floor * 2 + (b.type === 'elite' ? 10 : 0);
      const r = addXp(xp);
      update((s) => s.adventure.current && (s.adventure.current.stats.xp += xp));
      if (r.levelUp) onLevelUp(r.levelUp);
    }
    checkAchievements();
  };
  return <BattleView sim={sim} floor={run.floor} upgrades={run.upgrades} blessings={b.blessings} empower={b.empower} onDone={onDone} />;
}

function RewardView({ run, accountLevel, maxHp }) {
  const heal = Math.round(maxHp * RUN.victoryHealPct);
  return (
    <div className="reward-view card pop-in">
      <Icon name="star" size={46} className="gold" />
      <h2>{run.reward.type === 'elite' ? 'Elite defeated!' : 'Victory!'}</h2>
      <p>
        {run.reward.kills} foe{run.reward.kills === 1 ? '' : 's'} defeated in {Math.round(run.reward.duration)}s.
      </p>
      <p className="muted">You catch your breath: +{heal} HP.</p>
      {run.bonusPick && <p className="gold">The elite dropped a treasure chest!</p>}
      <Button className="wide" onClick={() => mutate((r) => r.phase === 'reward' && continueAfterReward(r, accountLevel))}>
        {run.bonusPick ? 'Open treasure' : 'Onward'}
      </Button>
    </div>
  );
}

function RestView({ run, accountLevel, maxHp }) {
  const heal = Math.min(maxHp - run.hp, Math.round(maxHp * RUN.restHealPct));
  return (
    <div className="rest-view">
      <div className="campfire-art" aria-hidden="true">
        <Icon name="campfire" size={80} />
      </div>
      <h2 className="section-title">A quiet campfire</h2>
      <div className="node-choices">
        <button type="button" className="node-card node-rest" onClick={() => mutate((r) => r.phase === 'rest' && restHeal(r, accountLevel))}>
          <span className="node-icon">
            <Icon name="heart" size={30} />
          </span>
          <b>Rest</b>
          <small>Heal {heal} HP</small>
        </button>
        <button
          type="button"
          className="node-card node-lesson"
          onClick={() => {
            const tasks = pickAdventureTasks(getState(), RUN.questions.rest);
            mutate((r) => r.phase === 'rest' && startQuiz(r, 'rest', tasks));
          }}
        >
          <span className="node-icon">
            <Icon name="book" size={30} />
          </span>
          <b>Meditate</b>
          <small>Review {RUN.questions.rest} words for sparks</small>
        </button>
      </div>
    </div>
  );
}

function TreasureView({ accountLevel }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="treasure-view">
      <button
        type="button"
        className={`chest ${open ? 'open' : ''}`}
        onClick={() => {
          if (open) return;
          setOpen(true);
          play('reveal');
          setTimeout(() => mutate((r) => r.phase === 'treasure' && openTreasure(r, accountLevel)), 700);
        }}
        aria-label="Open treasure chest"
      >
        <Icon name="chest" size={110} />
        <span>{open ? '✨' : 'Tap to open'}</span>
      </button>
    </div>
  );
}

function EndView({ run, go, onLevelUp }) {
  const won = run.phase === 'victory';
  const score = scoreOf(run);
  const [closed, setClosed] = useState(false);
  const finish = (dest) => {
    if (closed) return;
    setClosed(true);
    const bonus = won ? 50 : Math.max(0, (run.floor - 1) * 3);
    const r = bonus ? addXp(bonus) : {};
    if (r.levelUp) onLevelUp(r.levelUp);
    update((s) => {
      const a = s.adventure;
      a.runs += 1;
      if (won) a.wins += 1;
      a.bestFloor = Math.max(a.bestFloor, won ? RUN.floors : run.floor);
      a.bestScore = Math.max(a.bestScore, score);
      a.current = null;
    });
    checkAchievements();
    if (dest) go(dest);
  };
  return (
    <div className={`end-view ${won ? 'won' : 'lost'}`}>
      {won && <Confetti count={40} />}
      <div className="card pop-in">
        <h1>{won ? 'Mò lóng is defeated!' : `${heroDef(run.heroId).py} needs rest…`}</h1>
        <p className="muted">{won ? 'The lost words are restored. 了不起！ (liǎobuqǐ, amazing!)' : `You reached floor ${run.floor}. Every word you practised still counts.`}</p>
        <div className="stat-grid">
          <div className="sum-tile">
            <b>{score}</b>
            <span>score</span>
          </div>
          <div className="sum-tile">
            <b>{run.stats.correct}</b>
            <span>correct</span>
          </div>
          <div className="sum-tile">
            <b>{run.stats.kills}</b>
            <span>foes</span>
          </div>
          <div className="sum-tile">
            <b>{run.stats.words.length}</b>
            <span>words</span>
          </div>
        </div>
        <div className="end-build">
          {run.upgrades.map((u) => (
            <AbilityIcon key={u.id} id={u.id} element={UPGRADES[u.id].element} size={36} level={u.level} />
          ))}
        </div>
        <div className="summary-actions">
          <Button
            className="wide"
            onClick={() => {
              finish(null);
            }}
          >
            New run
          </Button>
          <Button className="wide" variant="secondary" onClick={() => finish('learn')}>
            Review these words
          </Button>
          <Button className="wide" variant="ghost" onClick={() => finish('home')}>
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}

function BuildModal({ run, accountLevel, onClose, onAbandon }) {
  const hero = heroFor(run, accountLevel);
  const def = heroDef(run.heroId);
  const [confirm, setConfirm] = useState(false);
  const pct = (n) => `${Math.round(n * 100)}%`;
  return (
    <Modal onClose={onClose} title={`${def.py} · ${def.title}`}>
      <div className="build-row">
        <Sprite id={def.sprite} scale={0.45} palette={heroPalette()} />
        <div>
          <CnName def={def.passive} speakable />
          <p className="small">{def.passive.desc}</p>
        </div>
      </div>
      <div className="build-stats">
        <span>HP {run.hp}/{hero.maxHp}</span>
        <span>ATK {Math.round(hero.atk)}</span>
        <span>DEF {hero.def}</span>
        <span>SPD {hero.aspd.toFixed(2)}/s</span>
        <span>CRIT {pct(hero.crit)}</span>
        {hero.dodge > 0 && <span>DODGE {pct(hero.dodge)}</span>}
        {hero.dr > 0 && <span>DR {pct(hero.dr)}</span>}
        {hero.lifesteal > 0 && <span>LIFESTEAL {pct(hero.lifesteal)}</span>}
      </div>
      {run.upgrades.length === 0 && <p className="muted">No upgrades yet. Answer questions to earn sparks!</p>}
      <div className="build-list">
        {run.upgrades.map((u) => (
          <div key={u.id} className="build-row">
            <AbilityIcon id={u.id} element={UPGRADES[u.id].element} size={40} level={u.level} />
            <div>
              <CnName def={UPGRADES[u.id]} speakable />
              <p className="small">{UPGRADES[u.id].desc(u.level)}</p>
            </div>
          </div>
        ))}
      </div>
      {hero.synergies.length > 0 && (
        <>
          <h3 className="sum-sub">Synergies</h3>
          {hero.synergies.map((id) => (
            <div key={id} className="build-row">
              <AbilityIcon id={id} element={UPGRADES[SYNERGIES[id].requires[0]].element} size={40} />
              <div>
                <CnName def={SYNERGIES[id]} speakable />
                <p className="small">{SYNERGIES[id].desc}</p>
              </div>
            </div>
          ))}
        </>
      )}
      <details className="synergy-hints">
        <summary>All synergies</summary>
        {Object.entries(SYNERGIES).map(([id, sy]) => (
          <p key={id} className="small">
            <b>{sy.py}</b> ({sy.name}): {sy.requires.map((r) => UPGRADES[r].py).join(' + ')}. {sy.desc}
          </p>
        ))}
      </details>
      <details className="synergy-hints">
        <summary>Bestiary</summary>
        {Object.values(ENEMIES).map((e) => (
          <div key={e.name} className="bestiary-row small">
            <CnName def={e} speakable /> <span>{e.blurb}</span>
          </div>
        ))}
      </details>
      {!confirm ? (
        <button type="button" className="link-btn danger" onClick={() => setConfirm(true)}>
          Abandon run
        </button>
      ) : (
        <div className="confirm-row">
          <span>Abandon this run?</span>
          <Button variant="danger" onClick={onAbandon}>
            Abandon
          </Button>
          <Button variant="ghost" onClick={() => setConfirm(false)}>
            Keep playing
          </Button>
        </div>
      )}
    </Modal>
  );
}
