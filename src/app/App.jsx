import { useEffect, useState, Component } from 'react';
import { useStore, isStorageOk } from '../store/store.js';
import { unlockAudio } from '../audio/speech.js';
import { audioCtx } from '../audio/sfx.js';
import { syncMusic } from '../audio/music.js';
import { onAchievement, checkAchievements } from '../game/achievements.js';
import { play } from '../audio/sfx.js';
import Home from '../screens/Home.jsx';
import Learn from '../screens/Learn.jsx';
import Adventure from '../screens/Adventure.jsx';
import Collection from '../screens/Collection.jsx';
import Progress from '../screens/Progress.jsx';
import Settings from '../screens/Settings.jsx';
import Icon from '../assets/icons/Icons.jsx';
import { SpriteFilters } from '../components/Sprite.jsx';

const SCREENS = { home: Home, learn: Learn, adventure: Adventure, collection: Collection, progress: Progress, settings: Settings };

export default function App() {
  const s = useStore();
  const [route, setRoute] = useState({ name: 'home', params: {} });
  const [toasts, setToasts] = useState([]);

  const go = (name, params = {}) => {
    setRoute({ name, params });
    window.scrollTo(0, 0);
  };

  // Browsers only allow audio after a user gesture: unlock both TTS and Web Audio on first tap.
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      audioCtx();
      syncMusic();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    syncMusic();
  }, [s.settings.music, s.settings.musicVol, s.settings.muted]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', !!s.settings.reducedMotion);
  }, [s.settings.reducedMotion]);

  useEffect(() => {
    checkAchievements();
    return onAchievement((a) => {
      play('reveal');
      const id = Math.random();
      setToasts((t) => [...t, { id, a }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
    });
  }, []);

  // Browser back button returns home instead of leaving the app
  useEffect(() => {
    if (route.name !== 'home') history.pushState({ r: route.name }, '');
    const pop = () => setRoute({ name: 'home', params: {} });
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, [route.name]);

  const Screen = SCREENS[route.name] || Home;
  return (
    <div className="app">
      <SpriteFilters />
      <ErrorBoundary onReset={() => go('home')}>
        <Screen go={go} params={route.params} key={route.name + JSON.stringify(route.params)} />
      </ErrorBoundary>
      {!isStorageOk() && <div className="banner warn floating">Progress can’t be saved (storage is full or blocked). Export a backup in Settings.</div>}
      <div className="toasts" aria-live="polite">
        {toasts.map(({ id, a }) => (
          <div key={id} className="toast">
            <Icon name="star" size={22} />
            <div>
              <b>Achievement unlocked</b>
              <span>{a.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error(error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="screen center-screen">
          <div className="card">
            <h2>Something went wrong</h2>
            <p className="muted">Your progress is saved. You can go back home and continue.</p>
            <pre className="error-text">{String(this.state.error?.message || this.state.error)}</pre>
            <button
              type="button"
              className="btn btn-primary wide"
              onClick={() => {
                this.setState({ error: null });
                this.props.onReset();
              }}
            >
              Back to home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
