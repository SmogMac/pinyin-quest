import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.jsx';
import './styles/app.css';
import './styles/adventure.css';
import './styles/battle-fx.css';
import './styles/signature.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
