import { useEffect, useRef, useState } from 'react';
import { useStore, update, exportSave, importSave, resetSave } from '../store/store.js';
import { mandarinVoices, onVoicesChanged, speak, audioStatus, speechRecognitionSupported, ttsSupported } from '../audio/speech.js';
import HeroPicker from '../components/HeroPicker.jsx';
import { TopBar, Button } from '../components/ui.jsx';
import { AudioStatusBanner } from '../components/AudioButtons.jsx';
import Icon from '../assets/icons/Icons.jsx';
import { syncMusic } from '../audio/music.js';
import { play } from '../audio/sfx.js';

const set = (k, v) => update((s) => (s.settings[k] = v));

function Toggle({ label, desc, value, onChange }) {
  return (
    <label className="setting toggle">
      <span>
        <b>{label}</b>
        {desc && <small>{desc}</small>}
      </span>
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}

function Slider({ label, value, onChange, min = 0, max = 1, step = 0.05, format = (v) => `${Math.round(v * 100)}%` }) {
  return (
    <label className="setting slider">
      <span>
        <b>{label}</b>
        <small>{format(value)}</small>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Choice({ label, value, options, onChange }) {
  return (
    <div className="setting choice">
      <b>{label}</b>
      <div className="filter-row">
        {options.map(([v, l]) => (
          <button key={v} type="button" className={`chip ${value === v ? 'on' : ''}`} onClick={() => onChange(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Settings({ go }) {
  const s = useStore();
  const st = s.settings;
  const [voices, setVoices] = useState(mandarinVoices());
  const [msg, setMsg] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef();
  useEffect(() => onVoicesChanged(() => setVoices(mandarinVoices())), []);
  useEffect(() => {
    syncMusic();
  }, [st.music, st.musicVol, st.muted]);

  return (
    <div className="screen settings">
      <TopBar title="Settings" onBack={() => go('home')} />

      <section className="card">
        <h3 className="sum-sub">Learning</h3>
        <Toggle label="Hide Hanzi" desc="Show only pinyin and English. Characters are never required." value={st.hideHanzi} onChange={(v) => set('hideHanzi', v)} />
        <Toggle
          label="Auto-continue"
          desc="After a correct answer, move to the next card automatically instead of waiting for Continue."
          value={st.autoContinue}
          onChange={(v) => set('autoContinue', v)}
        />
        <Choice label="Daily XP goal" value={st.dailyGoal} options={[[50, 'Chill 50'], [100, 'Steady 100'], [150, 'Keen 150'], [250, 'Intense 250']]} onChange={(v) => set('dailyGoal', v)} />
        <Choice label="New words per day" value={st.newPerDay} options={[[5, '5'], [10, '10'], [15, '15'], [25, '25'], [40, '40']]} onChange={(v) => set('newPerDay', v)} />
        <Toggle
          label="Soundless Mode"
          desc="Play everything without audio: listening exercises are swapped for text and picture ones, never counted as missed. Great for public transport."
          value={st.soundless}
          onChange={(v) => set('soundless', v)}
        />
        <Toggle
          label="Relaxed casting"
          desc="Slows combat to 40% while a spell puzzle is open. Normal play never pauses or slows."
          value={st.relaxedCasting}
          onChange={(v) => set('relaxedCasting', v)}
        />
        <Toggle
          label="Speaking practice"
          desc={speechRecognitionSupported() ? 'Adds “say it” cards. Uses your browser’s speech recognition; tones can’t be judged reliably.' : 'Adds “say it” cards with self-grading (no speech recognition in this browser).'}
          value={st.speaking}
          onChange={(v) => set('speaking', v)}
        />
      </section>

      <section className="card">
        <h3 className="sum-sub">Mandarin audio</h3>
        <AudioStatusBanner />
        {ttsSupported && (
          <label className="setting select">
            <b>Voice</b>
            <select value={st.voiceURI || ''} onChange={(e) => set('voiceURI', e.target.value || null)}>
              <option value="">Automatic (best zh-CN)</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </label>
        )}
        <Slider label="Speech speed" value={st.rate} min={0.5} max={1.2} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => set('rate', v)} />
        <Slider label="Speech volume" value={st.speechVol} onChange={(v) => set('speechVol', v)} />
        <Toggle label="Autoplay audio" desc="Play pronunciation automatically on new and listening cards." value={st.autoplay} onChange={(v) => set('autoplay', v)} />
        <Button variant="secondary" onClick={() => speak('你好，我们一起学习中文吧！')}>
          <Icon name="speaker" size={18} /> Test voice
        </Button>
        <p className="small muted">Status: {audioStatus()}. English is never read aloud.</p>
      </section>

      <section className="card">
        <h3 className="sum-sub">Sound &amp; motion</h3>
        <Toggle label="Mute everything" value={st.muted} onChange={(v) => set('muted', v)} />
        <Slider label="Sound effects" value={st.sfxVol} onChange={(v) => set('sfxVol', v)} />
        <Toggle label="Background music" desc="Gentle procedural music; quiets itself while Mandarin is spoken." value={st.music} onChange={(v) => set('music', v)} />
        <Slider label="Music volume" value={st.musicVol} onChange={(v) => set('musicVol', v)} />
        <Toggle label="Reduced motion" desc="Calmer animations and no screen shake." value={st.reducedMotion} onChange={(v) => set('reducedMotion', v)} />
        <Button variant="ghost" onClick={() => play('levelUp')}>
          Test sound
        </Button>
      </section>

      <section className="card">
        <h3 className="sum-sub">Heroes</h3>
        <HeroPicker compact />
      </section>

      <section className="card">
        <h3 className="sum-sub">Your data</h3>
        <p className="small muted">Progress is saved on this device automatically. Export a backup to move it to another browser or phone.</p>
        <div className="btn-row">
          <Button variant="secondary" onClick={exportSave}>
            <Icon name="download" size={18} /> Export JSON
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current.click()}>
            <Icon name="upload" size={18} /> Import JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files[0];
              if (!f) return;
              const err = importSave(await f.text());
              setMsg(err || 'Save imported!');
              e.target.value = '';
            }}
          />
        </div>
        {msg && <p className="small">{msg}</p>}
        {!confirmReset ? (
          <button type="button" className="link-btn danger" onClick={() => setConfirmReset(true)}>
            Reset all progress…
          </button>
        ) : (
          <div className="confirm-row">
            <span>Erase everything on this device?</span>
            <Button
              variant="danger"
              onClick={() => {
                resetSave();
                setConfirmReset(false);
                setMsg('Progress reset.');
              }}
            >
              Erase
            </Button>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
          </div>
        )}
      </section>

      <section className="card about">
        <h3 className="sum-sub">About</h3>
        <p className="small muted">
          Vocabulary: HSK 1–3 words ordered by corpus frequency, from the open-source{' '}
          <a href="https://github.com/drkameleon/complete-hsk-vocabulary" target="_blank" rel="noreferrer">
            complete-hsk-vocabulary
          </a>{' '}
          dataset (MIT, meanings from CC-CEDICT). Example sentences are written for this app. Keyboard: 1–4 answer, Space continue/reveal, R replay,
          S slow.
        </p>
        <p className="small muted">Version: {__BUILD_TIME__}</p>
      </section>
    </div>
  );
}
