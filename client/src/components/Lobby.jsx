import React, { useState } from 'react';
import { AvatarImg, AVATARS } from './avatars.jsx';

// Componente para criação/entrada de partida
export default function Lobby({ user, onLogout, onJoin, onReplay }) {
  const [gameId, setGameId] = useState('');
  const [aiCount, setAiCount] = useState(0);

  // O layout do tabuleiro suporta o humano + até 3 IAs (4 jogadores no total)
  const MAX_AI = 3;

  const handleSubmit = (e) => {
    e.preventDefault();
    // Se o usuário não forneceu um ID de partida, gera um ID aleatório (6 caracteres)
    const id = gameId.trim() || Math.random().toString(36).substring(2, 8).toUpperCase();
    const safeAiCount = Math.max(0, Math.min(MAX_AI, aiCount));
    onJoin(id, safeAiCount);
  };
  return (
    <div className="lobby">
      <div className="lobbyTop">
        <h1>Sequência</h1>
        <button className="btnLink" type="button" onClick={onLogout}>Sair</button>
      </div>

      <div className="lobbyUser">
        <div className="lobbyAvatar">
          <AvatarImg avatarKey={user?.avatar || 'mage'} alt={AVATARS[user?.avatar || 'mage']?.label || 'Avatar'} />
        </div>
        <div>
          <div className="lobbyUserName">{user?.name}</div>
          <div className="lobbyUserEmail">{user?.email}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div>
          <label>
            ID da partida:
            <input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value.toUpperCase())}
              placeholder="(vazio para criar nova)"
            />
          </label>
        </div>
        <div>
          <label>
            Número de adversários controlados pela IA:
            <select
              value={aiCount}
              onChange={(e) => setAiCount(parseInt(e.target.value, 10))}
            >
              <option value={0}>0</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </label>
        </div>
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}