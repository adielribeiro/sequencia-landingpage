import React, { useState, useEffect } from 'react';
import { socket } from './services/socket.js';
import Lobby from './components/Lobby.jsx';
import Replay from './components/Replay.jsx';
import GameBoard from './components/GameBoard.jsx';
import Auth from './components/Auth.jsx';
import SplashScreen from './components/SplashScreen.jsx';

// Socket centralizado (URL via env: VITE_SERVER_URL/VITE_SOCKET_URL)

export default function App() {
  // Splash de entrada (4s)
  const [showSplash, setShowSplash] = useState(true);
  const [playerId, setPlayerId] = useState(null);
  const [myName, setMyName] = useState('');
  const [myAvatar, setMyAvatar] = useState('mage');
  const [user, setUser] = useState(null); // { name, email, avatar }
  const [gameId, setGameId] = useState('');
  const [state, setState] = useState(null);
  const [events, setEvents] = useState([]);
  const [aiCount, setAiCount] = useState(0);

  // humano + até 3 IAs
  const MAX_AI = 3;
  const [mode, setMode] = useState('lobby'); // lobby | play | replay

  // restaura a sessão (se existir)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sequencia_current_user');
      if (!raw) return;
      const u = JSON.parse(raw);
      if (u?.email && u?.name) {
        setUser(u);
        setMyName(u.name);
        setMyAvatar(u.avatar || 'mage');
      }
    } catch {
      // ignore
    }
  }, []);

  // Splash: mostra só ao abrir o app
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // receber actualizações do servidor
    socket.on('update', ({ state: newState, events: newEvents }) => {
      setState(newState);
      if (newEvents) {
        setEvents(newEvents);
      }
    });
    socket.on('errorMessage', (data) => {
      alert(data.error);
    });
    return () => {
      socket.off('update');
      socket.off('errorMessage');
    };
  }, []);

  // Função para juntar‑se a uma partida
  const handleJoin = (joinGameId, aiCountSelected = 0) => {
    const name = (user?.name || myName || '').trim();
    if (!name) {
      alert('Faça login antes de entrar na partida.');
      return;
    }
    socket.emit('joinGame', { gameId: joinGameId, name }, (response) => {
      if (response.error) {
        alert(response.error);
      } else {
        setPlayerId(response.playerId);
        setMyName(name);
        setGameId(joinGameId);
        setState(response.state);
        // armazenar número de bots desejado pelo host (limitado ao layout)
        const safeAiCount = Math.max(0, Math.min(MAX_AI, aiCountSelected));
        setAiCount(safeAiCount);
        setMode('play');
      }
    });
  };

  const handleAuth = (u) => {
    setUser(u);
    setMyName(u.name);
    setMyAvatar(u.avatar || 'mage');
    try {
      localStorage.setItem('sequencia_current_user', JSON.stringify(u));
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('sequencia_current_user');
    } catch {
      // ignore
    }
    setUser(null);
    setPlayerId(null);
    setGameId('');
    setState(null);
    setEvents([]);
    setMode('lobby');
  };
  // Iniciar a partida
  const handleStart = () => {
    const safeAiCount = Math.max(0, Math.min(MAX_AI, aiCount));
    socket.emit('startGame', { gameId, aiCount: safeAiCount }, (result) => {
      if (result?.error) alert(result.error);
    });
  };
  // Jogar uma carta
  const handlePlay = (cardId, targetId = null) => {
    socket.emit('playCard', { gameId, playerId, cardId, targetPlayerId: targetId }, (result) => {
      if (result.error) {
        alert(result.error);
      }
    });
  };
  // Comprar cartas
  const handleRollDice = () => {
    if (!socket || !state) return;
    socket.emit('rollDice', { gameId: state.id, playerId }, (res) => {
      if (res?.error) alert(res.error);
    });
  };


  const handleDraw = (count) => {
    socket.emit('draw', { gameId, playerId, count }, (result) => {
      if (result.error) {
        alert(result.error);
      }
    });
  };

  // Resetar partida (recomeçar com mesmos jogadores)
  const handleReset = () => {
    if (!gameId) return;
    socket.emit('resetGame', { gameId });
  };

  // 🎬 ENGINE PRO+: limpar mesa após animação do cliente
  const handleClearTable = () => {
    if (!gameId) return;
    socket.emit('clearTable', { gameId });
  };

  // Sair para o menu (lobby)
  const handleExit = () => {
    const gid = gameId || state?.id;

    // avisa o servidor para remover o jogador da partida sem derrubar o socket
    if (gid) {
      socket.emit('leaveGame', { gameId: gid }, () => {
        // noop
      });
    }

    // limpar estado local e voltar ao lobby
    setPlayerId(null);
    setGameId('');
    setState(null);
    setEvents([]);
    setMode('lobby');
  };


  // Render da tela atual dentro de um "shell" com o background do coliseu
  let content = null;


  if (mode === 'replay') {
    content = <Replay onExit={() => setMode('lobby')} />;
  } else if (!user) {
    content = <Auth onAuth={handleAuth} />;
  } else if (!playerId) {
    content = <Lobby user={user} onLogout={handleLogout} onJoin={handleJoin} onReplay={() => setMode('replay')} />;
  } else {
    content = (
      <GameBoard
        state={state}
        playerId={playerId}
        myName={myName}
        myAvatar={myAvatar}
        onStart={handleStart}
        onPlay={handlePlay}
        onDraw={handleDraw}
        onRollDice={handleRollDice}
        onReset={handleReset}
        onExit={handleExit}
        events={events}
        onClearTable={handleClearTable}
      />
    );
  }

  return (
    <div className="gameRoot">
      <div className="appContainer">
        {content}
      </div>
      {showSplash && <SplashScreen />}
    </div>
  );
}
