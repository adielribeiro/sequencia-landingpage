import React, { useEffect, useMemo, useState } from 'react';
import { SERVER_URL } from '../services/runtimeConfig.js';
import GameBoard from './GameBoard.jsx';

export default function Replay({ onExit }) {
  const [gameId, setGameId] = useState('');
  const [log, setLog] = useState([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(900);

  const currentState = useMemo(() => {
    return log[idx]?.state ?? null;
  }, [log, idx]);

  const loadLog = async () => {
    if (!gameId) return alert('Informe o gameId');
    const res = await fetch(`${SERVER_URL}/log/${gameId}`);
    if (!res.ok) return alert('Não consegui baixar o log. Verifique o gameId e se o server está rodando.');
    const data = await res.json();
    setLog(Array.isArray(data) ? data : []);
    setIdx(0);
    setPlaying(false);
  };

  useEffect(() => {
    if (!playing) return;
    if (!log.length) return;

    const t = setInterval(() => {
      setIdx((v) => {
        const next = v + 1;
        if (next >= log.length) {
          setPlaying(false);
          return v;
        }
        return next;
      });
    }, speed);

    return () => clearInterval(t);
  }, [playing, log, speed]);

  const stepBack = () => setIdx((v) => Math.max(0, v - 1));
  const stepFwd = () => setIdx((v) => Math.min((log.length || 1) - 1, v + 1));

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', marginBottom: 12 }}>
        <button onClick={onExit}>Voltar</button>

        <input
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          placeholder="gameId (ex: ABC123)"
          style={{ padding: 8, minWidth: 240 }}
        />
        <button onClick={loadLog}>Carregar log</button>

        <button onClick={() => setPlaying(p => !p)} disabled={!log.length}>
          {playing ? 'Pausar' : 'Play'}
        </button>
        <button onClick={stepBack} disabled={!log.length}>◀</button>
        <button onClick={stepFwd} disabled={!log.length}>▶</button>

        <label style={{ display:'flex', gap:6, alignItems:'center' }}>
          Velocidade (ms):
          <input
            type="number"
            min="150"
            step="50"
            value={speed}
            onChange={(e)=>setSpeed(Number(e.target.value)||900)}
            style={{ width: 90, padding: 6 }}
          />
        </label>

        <div style={{ opacity: .8 }}>
          Evento: {log[idx]?.type ?? '-'} | ator: {log[idx]?.playerId ?? '-'} | {log[idx]?.beforeCurrent ?? '-'} → {log[idx]?.afterCurrent ?? '-'} ({idx+1}/{log.length || 0})
        </div>
      </div>

      {!currentState ? (
        <div style={{ opacity: .8 }}>Carregue um log para iniciar o replay.</div>
      ) : (
        <GameBoard
          state={currentState}
          playerId={currentState.players?.[0]?.id} 
          onStart={() => {}}
          onPlay={() => {}}
          onDraw={() => {}}
          onReset={() => {}}
          onExit={onExit}
          events={[]}
          onClearTable={() => {}}
          replayMode={true}
        />
      )}
    </div>
  );
}