/*
 * Servidor HTTP/WebSocket do jogo Sequência
 * Utiliza Express para servir a rota base e Socket.IO para comunicação
 * em tempo real entre clientes. Todas as mensagens trocadas são
 * simples objetos JSON. O servidor mantém múltiplas partidas em
 * memória, identificadas por gameId, e cada partida é gerida pela
 * classe Game (ver game.js).
 */

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import Game from './game.js';

const app = express();
// Habilitar CORS para permitir chamadas do front‑end local
app.use(cors());

const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*'
  }
});

// Armazenamento em memória das partidas
const games = new Map();

// Tempo para o jogador entender o evento da armadilha (overlay do dado no client).
// Mantém o jogo legível antes das IAs continuarem jogando.
const TRAP_UI_DELAY_MS = 2600;
const AI_PRE_ROLL_DELAY_MS = 900;
// Tempo para "telegrafar" a vez da IA (piscar amarelo) antes dela agir.
const AI_TELEGRAPH_MS = 850;

// Evita agendar múltiplas ações da IA ao mesmo tempo para a mesma partida.
const aiTimers = new Map(); // gameId -> { t, playerId }

/**
 * Executa jogadas automáticas para bots enquanto for a vez deles.
 * Escolhe a primeira carta válida na mão (considerando regras de repetição de
 * naipes) e, se for uma armadilha, escolhe um alvo aleatório dentre os outros
 * jogadores. Após cada jogada, envia o estado atualizado aos clientes.
 * Usa setTimeout para introduzir um pequeno atraso entre jogadas sucessivas.
 * @param {string} gameId Identificador da partida
 */
function runAI(gameId) {
  const game = games.get(gameId);
  if (!game) return;
  if (!game.started || game.finished) return;

  // 🎲 Anti-travamento:
  // Se houver armadilha pendente e o jogador que deve rolar for IA,
  // rola o dado mesmo que estejamos esperando o clearTable do fim da rodada.
  if (game.trapPending && game.trapPending.status === 'awaitingRoll') {
    const roller = game.players?.find(p => p.id === game.trapPending.rollerId);
    if (roller && roller.isAI) {
      // Dá um tempo pro humano ver a armadilha cair antes da IA rolar.
      setTimeout(() => {
        const roll = game.rollTrapDice(roller.id);
        io.to(gameId).emit('update', { state: game.getState(), events: roll.events });

        // Depois do resultado, segura mais um pouco para leitura.
        setTimeout(() => runAI(gameId), TRAP_UI_DELAY_MS);
      }, AI_PRE_ROLL_DELAY_MS);
      return;
    }

    // Armadilha pendente com humano rolando: não roda IA.
    return;
  }


  // Se estamos no "fim da rodada" aguardando limpar a mesa,
  // não executa IA agora (a IA será reacionada após clearTable).
  if (game.pendingTableClear) return;

  const current = game.currentPlayer();
  if (!current || !current.isAI) return;

  // 🟡 Telegrafa a vez da IA antes da jogada.
  // Isso garante que o highlight (amarelo) apareça ANTES da ação.
  const scheduled = aiTimers.get(gameId);
  if (scheduled && scheduled.playerId === current.id) return;
  if (scheduled && scheduled.playerId !== current.id) {
    clearTimeout(scheduled.t);
    aiTimers.delete(gameId);
  }

  // 🎲 Se houver armadilha pendente e for a vez do bot rolar o dado, ele rola antes de qualquer ação.
  // (redundante pela guarda acima, mas deixamos por segurança)
  if (game.trapPending && game.trapPending.status === 'awaitingRoll' && game.trapPending.rollerId === current.id) {
    setTimeout(() => {
      const roll = game.rollTrapDice(current.id);
      io.to(gameId).emit('update', { state: game.getState(), events: roll.events });
      setTimeout(() => runAI(gameId), TRAP_UI_DELAY_MS);
    }, AI_PRE_ROLL_DELAY_MS);
    return;
  }


  const t = setTimeout(() => {
    aiTimers.delete(gameId);

    const g = games.get(gameId);
    if (!g || !g.started || g.finished) return;

    // Se apareceu armadilha pendente, deixa a rotina cuidar.
    if (g.trapPending && g.trapPending.status === 'awaitingRoll') {
      runAI(gameId);
      return;
    }

    if (g.pendingTableClear) return;

    const cur = g.currentPlayer();
    if (!cur || !cur.isAI) return;

    // ⏱️ Atraso dinâmico:
    // - FIM DA RODADA: pausa maior (2s)
    // - Turnos normais: pausa curtinha
    const nextDelay = () => (g.pendingTableClear ? 2000 : 400);

    // 1 ação por vez do bot: ou compra, ou joga (nunca os dois no mesmo turno)
    const playable = cur.hand.filter((card) => {
      if (card.type === 'poção') return true;
      if (card.type === 'armadilha') return !g.typeAlreadyOnTable(card.type);
      return !g.typeAlreadyOnTable(card.type);
    });

    // Se não tiver carta jogável, compra 1 e encerra a vez
    if (playable.length === 0) {
      const drawResult = g.drawForPlayer(cur.id, 1);
      if (drawResult?.success && g.started && !g.finished) {
        g.advanceTurn();
      }
      io.to(gameId).emit('update', { state: g.getState(), events: drawResult.events });
      setTimeout(() => runAI(gameId), nextDelay());
      return;
    }

    const card = playable[0];
    let targetId = null;
    if (card.type === 'armadilha') {
      const targets = g.players.filter((p) => p.id !== cur.id);
      if (targets.length > 0) {
        const rnd = Math.floor(Math.random() * targets.length);
        targetId = targets[rnd].id;
      }
    }

    const result = g.playCard(cur.id, card.id, targetId);
    io.to(gameId).emit('update', { state: g.getState(), events: result.events });
    setTimeout(() => runAI(gameId), nextDelay());
  }, AI_TELEGRAPH_MS);

  aiTimers.set(gameId, { t, playerId: current.id });
  return;
}

function getOrCreateGame(gameId) {
  if (!games.has(gameId)) {
    const game = new Game(gameId);
    games.set(gameId, game);
  }
  return games.get(gameId);
}



// 📝 Endpoint simples para baixar log
app.get('/log/:gameId', (req, res) => {
  const game = games.get(req.params.gameId);
  if (!game) return res.status(404).send('Game not found');
  res.json(game.getLogs());
});

io.on('connection', (socket) => {
  console.log('Novo cliente conectado', socket.id);
  // Entrar numa partida existente ou criar nova
  socket.on('joinGame', ({ gameId, name }, callback) => {
    const game = getOrCreateGame(gameId);
    const player = game.addPlayer(name, socket.id);
    if (!player) {
      callback({ error: 'Não foi possível entrar: partida já começou ou cheia.' });
      return;
    }
    socket.join(gameId);
    callback({ playerId: player.id, state: game.getState() });
    io.to(gameId).emit('update', { state: game.getState() });
  });

  // Sair de uma partida sem derrubar o socket (voltar ao lobby)
  socket.on('leaveGame', ({ gameId }, callback) => {
    const game = games.get(gameId);
    if (!game) {
      callback && callback({ ok: true });
      return;
    }

    const before = game.players.length;
    game.removePlayerBySocket(socket.id);
    socket.leave(gameId);

    if (before !== game.players.length) {
      io.to(gameId).emit('update', { state: game.getState() });
    }

    // Se a partida ficou vazia, limpa da memória
    if (game.players.length === 0) {
      games.delete(gameId);
    }

    callback && callback({ ok: true });
  });
  // Sinalizar pronto (opcional)
  socket.on('ready', ({ gameId, playerId }) => {
    const game = games.get(gameId);
    if (!game) return;
    game.setPlayerReady(playerId);
    io.to(gameId).emit('update', { state: game.getState() });
  });
  // Iniciar a partida
  /**
   * Inicia a partida. O host pode informar quantos bots devem participar através do
   * parâmetro `aiCount`. Bots serão adicionados antes da distribuição das cartas.
   */
  socket.on('startGame', ({ gameId, aiCount = 0 }, callback) => {
    const game = games.get(gameId);
    if (!game) {
      callback && callback({ error: 'Partida não encontrada.' });
      return;
    }

    // Se ainda não começou, podemos adicionar bots antes de iniciar
    if (!game.started) {
      // O tabuleiro suporta até 4 jogadores (humano + 3 IAs)
      aiCount = Math.max(0, Math.min(aiCount, 3));

      const availableSlots = 4 - game.players.length;
      const botsToAdd = Math.min(aiCount, availableSlots);

      for (let i = 0; i < botsToAdd; i++) {
        const botName = `IA ${i + 1}`;
        game.addPlayer(botName, null, true);
      }
    }

    const ok = game.startGame();
    if (!ok) {
      // Motivos comuns: já começou ou não tem jogadores suficientes
      const msg = game.started
        ? 'A partida já foi iniciada.'
        : 'Para iniciar é preciso pelo menos 2 jogadores. Abra outra aba ou selecione IAs no lobby.';
      callback && callback({ error: msg });
      io.to(socket.id).emit('errorMessage', { error: msg });
      return;
    }

    callback && callback({ ok: true });

    // notificar clientes e acionar IAs se for o caso
    io.to(gameId).emit('update', { state: game.getState() });
    // Pequena pausa para o jogador ver o início antes da IA agir
    setTimeout(() => runAI(gameId), 400);
  });
  // Jogar carta
socket.on('playCard', ({ gameId, playerId, cardId, targetPlayerId }, callback) => {
    const game = games.get(gameId);
    if (!game) {
      callback && callback({ error: 'Partida não encontrada.' });
      return;
    }
    const result = game.playCard(playerId, cardId, targetPlayerId);
    if (callback) callback(result);
    io.to(gameId).emit('update', { state: game.getState(), events: result.events });
    // Regra: só pausa 2s no fim da rodada. Caso contrário, uma pausa curta.
    const delay = game.pendingTableClear ? 2000 : 400;
    setTimeout(() => runAI(gameId), delay);
  });
  
  // 🎲 Rolar o dado quando existe armadilha pendente
  socket.on('rollDice', ({ gameId, playerId }, callback) => {
    const game = games.get(gameId);
    if (!game) {
      callback && callback({ error: 'Partida não encontrada.' });
      return;
    }

    try {
      // Identifica o jogador pelo socket atual para evitar travamento em caso
      // de playerId divergente no client.
      const result = game.rollTrapDiceBySocket(socket.id);
      callback && callback(result);

      if (!result?.error) {
        io.to(gameId).emit('update', { state: game.getState(), events: result.events });
        // Dá tempo do overlay do dado terminar antes de continuar o turno.
        setTimeout(() => runAI(gameId), TRAP_UI_DELAY_MS);
      }
    } catch (err) {
      callback && callback({ error: err?.message || 'Erro ao rolar o dado.' });
    }
  });

// Comprar cartas manualmente (caso desejado)
  
  // 🎬 ENGINE PRO+: limpar mesa após animação do cliente
  socket.on('clearTable', ({ gameId }) => {
    const game = games.get(gameId);
    if (!game) return;
    game.clearTable();
    game.pushLog('CLEAR_TABLE', null, { beforeCurrent: game.currentPlayer()?.id, afterCurrent: game.currentPlayer()?.id });
    io.to(gameId).emit('update', { state: game.getState() });

    // após liberar a próxima rodada, se for vez de IA, ela age
    setTimeout(() => runAI(gameId), 400);
  });

  socket.on('draw', ({ gameId, playerId, count }, callback) => {
    const game = games.get(gameId);
    if (!game) {
      callback && callback({ error: 'Partida não encontrada.' });
      return;
    }
    const result = game.drawForPlayer(playerId, count);
    // comprar carta conta como ação: encerra a vez
    if (result?.success && game.started && !game.finished) {
      game.advanceTurn();
    }
    callback && callback(result);
    io.to(gameId).emit('update', { state: game.getState() });
    // Regra: só pausa 2s no fim da rodada. Caso contrário, uma pausa curta.
    const delay = game.pendingTableClear ? 2000 : 400;
    setTimeout(() => runAI(gameId), delay);
  });

  // Resetar partida: reinicia o estado e distribui cartas novamente
  socket.on('resetGame', ({ gameId }) => {
    const game = games.get(gameId);
    if (!game) return;
    // reiniciar e iniciar imediatamente
    game.resetGame();
    // iniciar novamente, mantendo os mesmos jogadores
    game.startGame();
    io.to(gameId).emit('update', { state: game.getState() });
    // acionar IAs caso o primeiro seja IA
    setTimeout(() => runAI(gameId), 400);
  });
  // Desconexão
  socket.on('disconnect', () => {
    console.log('Cliente desconectado', socket.id);
    // Remover jogador de todas as partidas
    games.forEach((game, id) => {
      const before = game.players.length;
      game.removePlayerBySocket(socket.id);
      if (before !== game.players.length) {
        io.to(id).emit('update', { state: game.getState() });
      }
    });
  });
});

// Rota base para verificar que o servidor está funcionando
app.get('/', (req, res) => {
  res.send('Servidor Sequência em execução.');
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Servidor ouvindo na porta ${PORT}`);
});