import React, { useMemo, useEffect, useRef, useState } from 'react';
import Card from './Card.jsx';
import "./gameboard.css";
import { AvatarImg } from './avatars.jsx';

// back card (costas)
const BACK_SRC = '/cartas/back_card.jpg';

function BackCard({ className = '' }) {
  return (
    <div className={`card-component ${className}`.trim()}>
      <img src={BACK_SRC} alt="Carta virada" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  );
}

function OpponentHand({ count = 0, vertical = false }) {
  // mostra só a "beirada" das cartas (efeito de mão)
  const cards = Array.from({ length: Math.min(count, 10) }, (_, i) => i);
  return (
    <div className={vertical ? 'oppHand oppHandVertical' : 'oppHand'}>
      {cards.map((i) => (
        <div
          key={i}
          className="oppCardWrap"
          // Overlap responsivo controlado via CSS vars (evita números fixos)
          style={vertical ? { marginTop: i === 0 ? 0 : 'var(--oppOverlapV)' } : { marginLeft: i === 0 ? 0 : 'var(--oppOverlapH)' }}
        >
          <BackCard />
        </div>
      ))}
      {count > 10 ? <div className="oppMore">+{count - 10}</div> : null}
    </div>
  );
}

function PlayedSlot({ card }) {
  return (
    <div className="playedSlot">
      {card ? (
        <div className="playedSlotCard">
          <Card card={card} />
        </div>
      ) : (
        <div className="playedSlotPlaceholder" />
      )}
    </div>
  );
}

export default function GameBoard({
  state,
  playerId,
  myName,
  myAvatar = 'mage',
  onStart,
  onPlay,
  onDraw,
  onRollDice,
  onReset,
  onExit,
    onClearTable,
  replayMode = false
}) {
  const players = state?.players ?? [];

  // Mesa central: sempre em 4 colunas (independente do nº de jogadores)
  const cardsPerRow = 4;
  const me = players.find((p) => p.id === playerId);

  const opponents = useMemo(() => players.filter((p) => p.id !== playerId), [players, playerId]);

  // 🧭 Distribuição de assentos em sequência "horária" (como você pediu):
  // IA 1 -> esquerda, IA 2 -> topo, e segue a sequência.
  // A regra é aplicada independentemente do número de jogadores.
  const seats = useMemo(() => {
    const seat = { left: null, top: [], right: null };

    const aiNum = (name = '') => {
      const m = String(name).match(/\bIA\s*(\d+)\b/i);
      return m ? Number(m[1]) : null;
    };

    // Ordena oponentes priorizando IA 1, IA 2, IA 3...
    // (humanos ficam depois, mantendo a ordem original)
    const sorted = [...opponents]
      .map((p, idx) => ({ p, idx, n: aiNum(p.name) }))
      .sort((a, b) => {
        const aIsAI = a.n !== null;
        const bIsAI = b.n !== null;
        if (aIsAI && bIsAI) return a.n - b.n;
        if (aIsAI && !bIsAI) return -1;
        if (!aIsAI && bIsAI) return 1;
        return a.idx - b.idx;
      })
      .map(x => x.p);

    // Sequência de posições (começando pela esquerda)
    // 1 oponente: topo
    // 2: esquerda, topo
    // 3: esquerda, topo, direita
    // 4+: esquerda, topo, direita, topo-esq
    if (sorted.length === 1) {
      seat.top = [sorted[0]];
      return seat;
    }

    if (sorted.length >= 1) seat.left = sorted[0];
    if (sorted.length >= 2) seat.top = [sorted[1]]; // topo-centro primeiro
    if (sorted.length >= 3) seat.right = sorted[2];
    if (sorted.length >= 4) seat.top = [sorted[1], sorted[3]]; // topo-centro + topo-esq

    return seat;
  }, [opponents]);

  const myTurn = !!me?.isCurrent;

  // Mapa "1 carta por jogador" na rodada atual (útil para renderizar na frente do assento de quem jogou)
  const playedByPlayer = useMemo(() => {
    const m = new Map();
    (state?.table ?? []).forEach((c) => {
      if (c?.playerId) m.set(c.playerId, c);
    });
    return m;
  }, [state?.table]);

  const trapPending = state?.trapPending;
  const lastTrapRoll = state?.lastTrapRoll;

  const diceChars = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  const rollerPlayer = trapPending ? players.find(p => p.id === trapPending.rollerId) : null;
  const trapperPlayer = trapPending ? players.find(p => p.id === trapPending.trapperId) : null;
  const iAmRoller = !!trapPending && trapPending.status === 'awaitingRoll' && (
    trapPending.rollerId === playerId ||
    (!!myName && trapPending.rollerName === myName)
  );

  const [diceRolling, setDiceRolling] = useState(false);
  const [diceFace, setDiceFace] = useState(1);
  const [diceResult, setDiceResult] = useState(null);
  const [trapMessage, setTrapMessage] = useState('');
  const [showDiceOverlay, setShowDiceOverlay] = useState(false);
  const hideDiceTimerRef = useRef(null);
  const lastTrapTsRef = useRef(null);

  const avatarFor = useMemo(() => {
    const aiNum = (name = '') => {
      const m = String(name).match(/\bIA\s*(\d+)\b/i);
      return m ? Number(m[1]) : null;
    };
    return (p) => {
      if (!p) return null;
      if (p.id === playerId) return myAvatar;
      if (p.isAI) {
        const n = aiNum(p.name);
        if (n === 1) return 'mage';
        if (n === 2) return 'archer';
        if (n === 3) return 'barbarian';
        if (n === 4) return 'warrior';
        return 'warrior';
      }
      return null;
    };
  }, [playerId, myAvatar]);

  // Mostra o overlay quando há armadilha pendente e mantém o resultado por um tempo
  useEffect(() => {
    if (trapPending && trapPending.status === 'awaitingRoll') {
      setShowDiceOverlay(true);
      setTrapMessage(`${trapperPlayer?.name ?? 'Alguém'} jogou ARMADILHA! ${rollerPlayer?.name ?? 'Jogador'} deve rolar o dado.`);
      return;
    }

    if (lastTrapRoll?.timestamp && lastTrapRoll.timestamp !== lastTrapTsRef.current) {
      lastTrapTsRef.current = lastTrapRoll.timestamp;
      setShowDiceOverlay(true);
      setDiceRolling(false);
      setDiceResult(lastTrapRoll.roll);
      setDiceFace(lastTrapRoll.roll);

      // Após resolver a armadilha, trapPending pode vir null no state.
      // Então usamos os ids salvos em lastTrapRoll para montar a mensagem.
      const roller = players.find(p => p.id === lastTrapRoll.rollerId);
      const trapper = players.find(p => p.id === lastTrapRoll.trapperId);
      const drawPlayer = players.find(p => p.id === lastTrapRoll.drawPlayerId);

      const msg = (lastTrapRoll.roll % 2 === 1)
        ? `${roller?.name ?? 'O jogador'} tirou ${lastTrapRoll.roll}. ${drawPlayer?.name ?? 'Ele/ela'} deve pescar 3 cartas.`
        : `${roller?.name ?? 'O jogador'} tirou ${lastTrapRoll.roll}. ${trapper?.name ?? 'Quem jogou a armadilha'} deve pescar 2 cartas.`;
      setTrapMessage(msg);

      if (hideDiceTimerRef.current) clearTimeout(hideDiceTimerRef.current);
      hideDiceTimerRef.current = setTimeout(() => setShowDiceOverlay(false), 2500);
    }
  }, [trapPending, lastTrapRoll?.timestamp]);

  const handleRollDiceClick = () => {
    if (replayMode) return;
    if (!iAmRoller) return;
    setDiceResult(null);
    setDiceRolling(true);
    setTrapMessage('Rolando o dado...');
    onRollDice?.();
  };

  // animação simples do dado enquanto "rolando"
  useEffect(() => {
    if (!diceRolling) return;
    const t = setInterval(() => {
      setDiceFace((prev) => ((prev % 6) + 1));
    }, 90);
    return () => clearInterval(t);
  }, [diceRolling]);


  // 🪽 animação carta voando (sem alterar lógica)
  const prevStateRef = useRef(null);
  const [flyingCard, setFlyingCard] = useState(null);

// 🎬 Cinematic Mode — fila visual de jogadas
const [cinematicQueue, setCinematicQueue] = useState([]);
const cinematicLock = useRef(false);


  // ⏱️ Controle visual de troca de turno
  const [showTurnPopup, setShowTurnPopup] = useState(false);
const [tableClearAnim, setTableClearAnim] = useState(false);
  const prevPendingClearRef = useRef(false);

  
// Dispara quando a rodada termina (pendingTableClear = true),
// mas se existir ARMADILHA aguardando rolagem, segura a limpeza da mesa.
useEffect(() => {
  const pending = !!state?.pendingTableClear;
  const trapAwaiting = state?.trapPending?.status === 'awaitingRoll';
  const wasPending = !!prevPendingClearRef.current;

  let t0;
  let t1;
  let t2;

  // se a rodada não está pendente, reseta
  if (!pending) {
    prevPendingClearRef.current = false;
    return;
  }

  // rodada pendente, mas armadilha aguardando: não limpa ainda
  if (trapAwaiting) {
    return;
  }

  // agenda apenas uma vez por rodada
  if (pending && !wasPending) {
    prevPendingClearRef.current = true;
    setShowTurnPopup(true);

    t0 = setTimeout(() => {
      setShowTurnPopup(false);
      setTableClearAnim(true);

      // avisa servidor para limpar mesa e liberar a próxima rodada
      t1 = setTimeout(() => {
        onClearTable?.();
      }, 600);

      t2 = setTimeout(() => setTableClearAnim(false), 600);
    }, 2000);

    return () => {
      if (t0) clearTimeout(t0);
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }

  prevPendingClearRef.current = pending;
}, [state?.pendingTableClear, state?.trapPending?.status, onClearTable]);



  useEffect(() => {
    if (!prevStateRef.current || !state) {
      prevStateRef.current = state;
      return;
    }

    const prevMe = prevStateRef.current.players?.find(p => p.id === playerId);
    const currMe = state.players?.find(p => p.id === playerId);

    if (prevMe && currMe && prevMe.hand?.length > currMe.hand?.length) {
      const removed = prevMe.hand.find(
        c => !currMe.hand.some(cc => cc.id === c.id)
      );

      if (removed) {
        setFlyingCard(removed);

// adiciona na fila cinematográfica
setCinematicQueue(prev => [...prev, removed]);

        setTimeout(()=> setFlyingCard(null), 350);
      }
    }

    prevStateRef.current = state;
  }, [state]);

  // 🎬 Processador visual das jogadas (delay humano)
  useEffect(() => {
    if (cinematicLock.current) return;
    if (!cinematicQueue.length) return;

    cinematicLock.current = true;

    const timer = setTimeout(() => {
      setCinematicQueue(prev => prev.slice(1));
      cinematicLock.current = false;
    }, 420); // delay estilo Hearthstone

    return () => clearTimeout(timer);
  }, [cinematicQueue]);



  useEffect(() => {
    // vencedor agora é mostrado via overlay com botão de reinício (sem alert)
    if (!state?.winnerId) return;
  }, [state?.winnerId]);

  const myHand = me?.hand ?? [];

  const canPlayCard = (card) => {
    if (replayMode) return false;
    if (!myTurn) return false;

    // durante o "fim de rodada" (mesa congelada por 2s), bloqueia ações
    if (state?.pendingTableClear) return false;

    // se eu sou o jogador que precisa rolar o dado da armadilha, não posso jogar ainda
    if (trapPending && trapPending.status === 'awaitingRoll' && iAmRoller) return false;

    // Deixa o servidor ser a fonte da verdade das regras.
    // (Evita o front bloquear cartas validas por engano.)
    return true;
  };

  const getTrapTargetId = () => {
    // para armadilha, precisa de um alvo: escolhe um oponente (primeiro disponível)
    const opp = opponents?.[0];
    return opp?.id ?? null;
  };

  const handlePlay = (card) => {
    if (!canPlayCard(card)) return;
    if (card?.type === 'armadilha') {
      const targetId = getTrapTargetId();
      onPlay?.(card.id, targetId);
      return;
    }
    onPlay?.(card.id, null);
  };

  return (
    <div className="gameScreen gameBoardRoot">

      {/* 🎲 Armadilha: overlay de dado */}
      {showDiceOverlay ? (
        <div className="diceOverlay">
          <div className="diceModal">
            <div className="diceTitle">Armadilha!</div>

            <div className="diceFace" aria-label="Dado">
              {diceChars[diceFace] ?? diceFace}
            </div>

            {trapMessage ? <div className="diceMsg">{trapMessage}</div> : null}

            {trapPending && trapPending.status === 'awaitingRoll' ? (
              iAmRoller && !diceRolling ? (
                <button className="btn btn-primary w-100" onClick={handleRollDiceClick}>
                  Rolar dado (1–6)
                </button>
              ) : (
                <div className="text-muted small mt-2">
                  Aguardando {rollerPlayer?.name ?? 'jogador'}...
                </div>
              )
            ) : null}

            {diceRolling ? <div className="text-muted small mt-2">Rolando…</div> : null}
          </div>
        </div>
      ) : null}


      <div className="gameShell">
        <div className="gameHeader d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h2 className="m-0">Partida {state?.roomId ?? ''}</h2>
            <div className="text-muted small">
              Rodada: <b>{state?.roundCount ?? 1}</b> • Vez: <b>{players.find(p => p.isCurrent)?.name ?? '-'}</b>
            </div>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-primary btn-sm" onClick={() => onDraw?.(1)}>Comprar 1 carta</button>
            <button className="btn btn-outline-warning btn-sm" onClick={onReset}>Resetar</button>
            <button className="btn btn-outline-secondary btn-sm" onClick={onExit}>Voltar ao menu</button>
            {!state?.started ? (
              <button className="btn btn-success btn-sm" onClick={() => onStart?.()}>Iniciar</button>
            ) : null}
          </div>
        </div>

        <div className="gameStage">
        <div className="tableWrapper">
          {/* esquerda */}
          {seats.left ? (
            <div className="seat seatLeft">
              <div className={`seatHeader ${seats.left?.isCurrent ? 'starterHighlight' : ''}`}>
                {avatarFor(seats.left) ? <span className="seatAvatar"><AvatarImg avatarKey={avatarFor(seats.left)} size={28} alt="avatar" /></span> : null}
                {seats.left.name || 'Jogador'} {seats.left.isAI ? '(IA)' : ''}
              </div>
              <div className="seatSub">{(seats.left.hand?.length ?? 0)} cartas</div>
              <OpponentHand count={seats.left.hand?.length ?? 0} vertical />
            </div>
          ) : null}

          {/* direita */}
          {seats.right ? (
            <div className="seat seatRight">
              <div className={`seatHeader ${seats.right?.isCurrent ? 'starterHighlight' : ''}`}>
                {avatarFor(seats.right) ? <span className="seatAvatar"><AvatarImg avatarKey={avatarFor(seats.right)} size={28} alt="avatar" /></span> : null}
                {seats.right.name || 'Jogador'} {seats.right.isAI ? '(IA)' : ''}
              </div>
              <div className="seatSub">{(seats.right.hand?.length ?? 0)} cartas</div>
              <OpponentHand count={seats.right.hand?.length ?? 0} vertical />
            </div>
          ) : null}

          {/* topo */}
          <div className="seat seatTop">
            {seats.top.map((p, idx) => (
              <div key={p.id} className={`seatTopBlock ${idx === 0 ? 'meio' : 'lateral'}`}>
                <div className={`seatHeader ${p?.isCurrent ? 'starterHighlight' : ''}`}>
                  {avatarFor(p) ? <span className="seatAvatar"><AvatarImg avatarKey={avatarFor(p)} size={28} alt="avatar" /></span> : null}
                  {p.name || 'Jogador'} {p.isAI ? '(IA)' : ''}
                </div>
                <div className="seatSub">{(p.hand?.length ?? 0)} cartas</div>
                <OpponentHand count={p.hand?.length ?? 0} />
              </div>
            ))}
          </div>

          {/* Slots das cartas jogadas (posicionados no tabuleiro, não dentro dos painéis) */}
          <div className="boardSlots" aria-hidden="true">
            {seats.left ? (
              <div className="slot slot--ai1">
                <div className="slot__box">
                  <PlayedSlot card={playedByPlayer.get(seats.left.id)} />
                </div>
              </div>
            ) : null}

            {seats.top?.[0] ? (
              <div className="slot slot--ai2">
                <div className="slot__box">
                  <PlayedSlot card={playedByPlayer.get(seats.top[0].id)} />
                </div>
              </div>
            ) : null}

            {seats.right ? (
              <div className="slot slot--ai3">
                <div className="slot__box">
                  <PlayedSlot card={playedByPlayer.get(seats.right.id)} />
                </div>
              </div>
            ) : null}

            {/* humano */}
            <div className="slot slot--human">
              <div className="slot__box">
                <PlayedSlot card={playedByPlayer.get(playerId)} />
              </div>
            </div>
          </div>

          {/* mesa (centro) */}
          <div className="centerArea">
            {/* Removemos o "card"/DIV da mesa para não esconder as cartas das IAs.
                Mantemos apenas o MONTE centralizado (como no seu mockup). */}
            <div className={`centerDeck ${tableClearAnim ? "tableClear" : ""}`} aria-label="Monte">
              <div className="deckSpot">
                <BackCard />
              </div>
              {/* Info do monte ao lado (como no mockup) */}
              <div className="deckInfo" aria-hidden="true">
                <div className="deckCount">{state?.remainingDeck ?? 0} no monte</div>
              </div>
            </div>
          </div>

        </div>
        </div>

      
      
        <div className="playerHandBar">
          {/* sua mão */}
          <div className="myHandArea">
            <div className="handHeader">
              <div className="handHeaderLeft">
                <span className="seatAvatar"><AvatarImg avatarKey={myAvatar} size={30} alt="avatar" /></span>
                <span className="handTitleText">Sua mão</span>
              </div>

              <div className="handHeaderCenter">
                <div className="handStatusGroup">
                  <div className="small objectiveLabel">Objetivo: zerar a mão</div>
                  {myTurn
                    ? <span className="badge bg-success turnBadge" aria-label="Status do turno: sua vez">sua vez</span>
                    : <span className="badge bg-secondary turnBadge" aria-label="Status do turno: aguarde">aguarde</span>
                  }
                </div>
              </div>

              {/* Mantido por compatibilidade visual; status agora fica ao lado do objetivo */}
              <div className="handHeaderRight" aria-hidden="true" />
            </div>
            <div className="handRow mt-2">
              {/*
                Centraliza a mão quando cabe na tela, mas mantém scroll horizontal quando não couber.
                O truque é ter um container interno com width: max-content e margin auto.
              */}
              <div className="handRowInner">
                {myHand.map((card, i) => {
                  const playable = canPlayCard(card);
                  return (
                    <div
                      key={card.id || i}
                      className={`handCardWrap ${playable ? 'handPlayable' : 'handBlocked'}`}
                      onClick={() => playable && handlePlay(card)}
                      title={playable ? 'Jogar' : 'Não pode jogar agora'}
                    >
                      <div className="handCardInner">
                        <Card card={card} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      {flyingCard && (
        <div className="flyingCard">
          <Card card={flyingCard} />
        </div>
      )}

      
      {showTurnPopup && (
        <div className="turnPopup">
          🔄 Fim do turno
        </div>
      )}

      {state?.winnerId && (
        <div className="winnerOverlay">
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
            🏆 {players.find(p=>p.id===state.winnerId)?.name} venceu!
          </div>

          <div className="d-flex gap-2 justify-content-center flex-wrap">
            <button className="btn btn-light" onClick={onReset}>Reiniciar partida</button>
            <button className="btn btn-outline-light" onClick={onExit}>Voltar ao menu</button>
          </div>
        </div>
      )}

</div>
    </div>
  );
}