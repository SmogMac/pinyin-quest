// FX Studio: the game's effect, projectile and animation editor. Dev only: open
// http://localhost:5173/editor.html while `npm run dev` runs (or `npm run studio`).
import React from 'react';
import { createRoot } from 'react-dom/client';
import FxStudio from './FxStudio.jsx';
import '../styles/app.css';
import '../styles/adventure.css';
import '../styles/battle-fx.css';
import '../styles/signature.css';
import './studio.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FxStudio />
  </React.StrictMode>,
);
