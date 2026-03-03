import React from 'react';

import logo from '../assets/ArchangelSoft.png';

export default function SplashScreen() {
  return (
    <div className="splashScreen" aria-label="Splash screen">
      <img className="splashLogo" src={logo} alt="ArchangelSoft" />
    </div>
  );
}
