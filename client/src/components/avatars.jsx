import React from 'react';

// Avatares simples em SVG (bem leves e sem dependências)
// O objetivo aqui é dar identidade visual: mago, arqueiro, bárbaro (machado), guerreiro (espada).

const svg = (body) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1b1b1f"/>
      <stop offset="1" stop-color="#0b0b0d"/>
    </linearGradient>
  </defs>
  <circle cx="64" cy="64" r="60" fill="url(#g)"/>
  <circle cx="64" cy="64" r="58" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="2"/>
  ${body}
</svg>`;

export const AVATARS = {
  mage: {
    key: 'mage',
    label: 'Mago',
    svg: svg(`
      <path d="M64 18 L92 54 L36 54 Z" fill="#5b6cff" stroke="rgba(255,255,255,.25)" stroke-width="2"/>
      <circle cx="64" cy="70" r="20" fill="#f2d3b1"/>
      <path d="M44 94 Q64 110 84 94" fill="#2f2f35"/>
      <path d="M38 54 Q64 40 90 54" fill="rgba(0,0,0,.18)"/>
      <path d="M98 88 l-8 4 3 5 -9 5 6 3 5-9 5 3 4-8z" fill="#ffd86b"/>
    `),
  },
  archer: {
    key: 'archer',
    label: 'Arqueiro',
    svg: svg(`
      <circle cx="64" cy="66" r="20" fill="#f2d3b1"/>
      <path d="M44 92 Q64 112 84 92" fill="#1f5f34"/>
      <path d="M40 50 Q64 30 88 50" fill="#1f5f34"/>
      <path d="M28 86 C46 54 46 34 28 18" fill="none" stroke="#c7b089" stroke-width="6" stroke-linecap="round"/>
      <path d="M28 18 C54 42 54 62 28 86" fill="none" stroke="#3b2b1f" stroke-width="2"/>
      <path d="M22 52 L56 52" stroke="#e5e7eb" stroke-width="3" stroke-linecap="round"/>
      <path d="M56 52 l-10 -6 0 12z" fill="#e5e7eb"/>
    `),
  },
  barbarian: {
    key: 'barbarian',
    label: 'Bárbaro',
    svg: svg(`
      <circle cx="64" cy="64" r="20" fill="#f2d3b1"/>
      <path d="M38 58 Q64 40 90 58" fill="#7a3b1c"/>
      <path d="M42 92 Q64 112 86 92" fill="#7a3b1c"/>
      <path d="M94 40 l10 10 -20 20 -10 -10z" fill="#cbd5e1"/>
      <path d="M84 50 l10 10" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>
      <path d="M74 70 l-10 10" stroke="#7c5a3a" stroke-width="6" stroke-linecap="round"/>
    `),
  },
  warrior: {
    key: 'warrior',
    label: 'Guerreiro',
    svg: svg(`
      <circle cx="64" cy="64" r="20" fill="#f2d3b1"/>
      <path d="M42 56 Q64 36 86 56" fill="#3a3f55"/>
      <path d="M42 92 Q64 112 86 92" fill="#3a3f55"/>
      <path d="M92 30 l6 6 -26 26 -6 -6z" fill="#e2e8f0"/>
      <path d="M68 58 l-8 8" stroke="#94a3b8" stroke-width="5" stroke-linecap="round"/>
      <path d="M60 66 l-4 12" stroke="#7c5a3a" stroke-width="6" stroke-linecap="round"/>
      <path d="M86 36 l6 -10 10 10 -10 6z" fill="#e2e8f0" opacity=".9"/>
    `),
  },
};

export function avatarDataUri(avatarKey = 'mage') {
  const s = AVATARS[avatarKey]?.svg || AVATARS.mage.svg;
  return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
}

export function AvatarImg({ avatarKey = 'mage', alt = 'Avatar', size = 44 }) {
  return (
    <img
      src={avatarDataUri(avatarKey)}
      alt={alt}
      width={size}
      height={size}
      style={{ display: 'block', borderRadius: '999px' }}
      draggable={false}
    />
  );
}
