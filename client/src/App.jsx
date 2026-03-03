import React from 'react';
import LandingPage from './LandingPage.jsx';
import AppGame from './AppGame.jsx';

// Landing page como padrão.
// Dica: para abrir o jogo local (este projeto), use o hash: #/game
export default function App() {
  const showGame = typeof window !== 'undefined' && window.location.hash === '#/game';
  return showGame ? <AppGame /> : <LandingPage />;
}
