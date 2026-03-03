/*
 * Implementação da lógica principal do jogo Sequência.
 * Esta classe mantém o estado de uma partida, os jogadores, as mãos,
 * o baralho e as jogadas. Não depende de WebSockets; o servidor
 * Express/Socket.IO irá instanciar esta classe e invocar seus métodos.
 */

import { v4 as uuidv4 } from 'uuid';

// Tipos de cartas e quantidade de exemplares
export const CARD_TYPES = {
  MACHADO: 'machado',
  ESPADA: 'espada',
  ESCUDO: 'escudo',
  ARCO: 'arco',
  POCAO: 'poção',
  ARMADILHA: 'armadilha'
};

const COMMON_CARDS = [CARD_TYPES.MACHADO, CARD_TYPES.ESPADA, CARD_TYPES.ESCUDO, CARD_TYPES.ARCO];
const SPECIAL_CARDS = [CARD_TYPES.POCAO, CARD_TYPES.ARMADILHA];

// Classe que representa um baralho de cartas Sequência
class Deck {
  constructor() {
    this.cards = [];
    this.reset();
  }

  reset() {
    this.cards = [];
    // adicionar 10 de cada carta comum
    for (const type of COMMON_CARDS) {
      for (let i = 0; i < 10; i++) {
        this.cards.push({ id: uuidv4(), type });
      }
    }
    // adicionar 5 de cada carta especial
    for (const type of SPECIAL_CARDS) {
      for (let i = 0; i < 5; i++) {
        this.cards.push({ id: uuidv4(), type });
      }
    }
    this.shuffle();
  }

  shuffle() {
    // Algoritmo de Fisher–Yates
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw(n = 1) {
    return this.cards.splice(0, n);
  }

  remaining() {
    return this.cards.length;
  }
}

// Classe do jogo
export default class Game {
  constructor(id) {
    this.id = id;
    this.players = [];
    this.deck = new Deck();
    this.table = []; // cartas jogadas na sequência atual
    this.pendingTableClear = false;
    this.trapPending = null; // { trapperId, rollerId, status: 'awaitingRoll' }
    this.lastTrapRoll = null; // { roll, trapperId, rollerId, drawPlayerId, timestamp }

    // Quando uma rodada termina, a próxima começa SÓ depois da limpeza sincronizada.
    // Guardamos aqui o próximo turno/iniciador enquanto a mesa ainda está visível.
    this._pendingTurnIndex = null;
    this._pendingRoundStarter = null;
    this._pendingRoundInc = false;
    this.logs = []; // 📝 log simples de eventos
    this.turnIndex = 0; // índice do jogador cujo turno atual
    this.roundStarter = 0; // índice do jogador que iniciou a sequência atual
    this.started = false;
    this.finished = false;
    // contador de rodadas para exibir no cliente
    this.roundCount = 1;
    this.winnerId = null;
  }

  // Adiciona um jogador antes de a partida começar
  /**
   * Adiciona um jogador à partida. Pode ser um jogador humano (com socketId
   * definido) ou um bot/IA (socketId = null). Para bots, defina `isAI` como
   * true. Não permite exceder o limite de quatro jogadores no total.
   * @param {string} name Nome do jogador a ser exibido.
   * @param {string|null} socketId Identificador do socket do jogador humano ou null para IA.
   * @param {boolean} [isAI=false] Indica se o jogador é controlado pelo computador.
   * @returns {object|null} Objeto do jogador adicionado ou null se não foi possível.
   */
  addPlayer(name, socketId, isAI = false) {
    // layout do tabuleiro: humano + até 3 IAs
    if (this.started || this.players.length >= 4) {
      return null;
    }
    const player = {
      id: uuidv4(),
      name,
      socketId,
      hand: [],
      isReady: false,
      isAI
    };
    this.players.push(player);
    return player;
  }

  // Remove jogador (em caso de desconexão)
  removePlayerBySocket(socketId) {
    const index = this.players.findIndex(p => p.socketId === socketId);
    if (index !== -1) {
      this.players.splice(index, 1);
      // ajustar turnos caso necessário
      if (this.turnIndex >= this.players.length) {
        this.turnIndex = 0;
      }
      if (this.roundStarter >= this.players.length) {
        this.roundStarter = 0;
      }
    }
  }

  // Sinaliza que um jogador está pronto para começar
  setPlayerReady(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.isReady = true;
    }
  }

  // Inicia a partida: embaralha, distribui cartas e define turno inicial
  startGame() {
    if (this.started || this.players.length < 2) {
      return false;
    }
    this.started = true;
    this.deck.reset();
    // distribuir 8 cartas para cada jogador
    for (const player of this.players) {
      player.hand = this.deck.draw(8);
    }
    this.turnIndex = 0;
    this.roundStarter = 0;
    this.table = [];
    this.pendingTableClear = false;
    this.trapPending = null; // { trapperId, rollerId, status: 'awaitingRoll' }
    this.lastTrapRoll = null; // { roll, trapperId, rollerId, drawPlayerId, timestamp }
    this._pendingTurnIndex = null;
    this._pendingRoundStarter = null;
    this._pendingRoundInc = false;
    return true;
  }

  currentPlayer() {
    return this.players[this.turnIndex];
  }

  // Verifica se um tipo de carta já foi jogado nesta sequência
  typeAlreadyOnTable(cardType) {
    return this.table.some(c => c.type === cardType);
  }


  // Verifica se um jogador tem alguma carta jogável nesta sequência.
  // Regra: cartas comuns e armadilha NÃO podem repetir tipo na mesa; poção pode.
  hasPlayableCard(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;
    for (const c of player.hand) {
      // proteção caso venha algum valor inválido
      if (!c || !c.type) continue;
      if ((COMMON_CARDS.includes(c.type) || c.type === CARD_TYPES.ARMADILHA) && this.typeAlreadyOnTable(c.type)) {
        continue;
      }
      return true;
    }
    return false;
  }

  // Jogar carta: recebe jogador e id da carta.
  // (O parâmetro targetPlayerId pode existir no client por legado, mas a regra
  //  atual da ARMADILHA usa sempre o próximo jogador na ordem.)
  playCard(playerId, cardId, targetPlayerId) {

    // Bloqueia qualquer ação enquanto a armadilha não for resolvida.
    // Isso evita "atropelo" de turno (principalmente com IAs) durante o evento.
    if (this.trapPending && this.trapPending.status === 'awaitingRoll') {
      return { error: 'Aguarde: a ARMADILHA ainda não foi resolvida.' };
    }
    if (!this.started || this.finished) {
      return { error: 'Jogo ainda não começou ou já acabou.' };
    }

    // Se a rodada terminou e estamos aguardando limpar a mesa, ninguém joga.
    if (this.pendingTableClear) {
      return { error: 'Aguarde: fim da rodada.' };
    }
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      return { error: 'Jogador não encontrado.' };
    }
    // verificar se é turno desse jogador
    if (playerId !== this.currentPlayer().id) {
      return { error: 'Não é a sua vez.' };
    }
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return { error: 'Carta não está na mão.' };
    }
    const card = player.hand[cardIndex];
    // Verificar regra de repetição de naipe para cartas comuns e armadilha.
    // Apenas poção pode se repetir numa sequência; se o tipo da carta já estiver na mesa
    // e for comum ou armadilha, a jogada é inválida.
    if ((COMMON_CARDS.includes(card.type) || card.type === CARD_TYPES.ARMADILHA) &&
        this.typeAlreadyOnTable(card.type)) {
      return { error: `O tipo ${card.type} já foi jogado nesta sequência.` };
    }
    // Remover carta da mão do jogador e adicioná‑la à mesa
    player.hand.splice(cardIndex, 1);
    this.table.push({ ...card, playerId });


    // 🎲 ARMADILHA: o PRÓXIMO jogador na ordem (sequência sentido horário)
    // deve rolar um dado 1–6 antes de poder agir.
    // Importante: o alvo é determinado pela sequência, não por escolha.
    if (card.type === CARD_TYPES.ARMADILHA) {
      const roller = this.players[(this.turnIndex + 1) % this.players.length];
      this.trapPending = { trapperId: player.id, rollerId: roller.id, status: 'awaitingRoll' };
    }

    let events = [];
    // 🏆 Verificar vitória (mão zerou)
    if (player.hand.length === 0) {
      this.finished = true;
      this.winnerId = player.id;
      events.push({ type: 'gameOver', winner: player });
    }

    // Avançar turno
    this.advanceTurn();
    return { success: true, events };
  }

  // 🎲 Rola o dado da armadilha (6 lados).
  // Regras:
  // - 1,3,5 => quem rolou compra 3
  // - 2,4,6 => quem jogou a armadilha compra 2
  rollTrapDice(playerId) {
    if (!this.trapPending || this.trapPending.status !== 'awaitingRoll') {
      return { error: 'Não há armadilha pendente.' };
    }
    if (playerId !== this.trapPending.rollerId) {
      return { error: 'Não é você que deve rolar o dado.' };
    }

    const roll = Math.floor(Math.random() * 6) + 1;

    const trapper = this.players.find(p => p.id === this.trapPending.trapperId);
    const roller = this.players.find(p => p.id === this.trapPending.rollerId);

    if (!trapper || !roller) {
      this.trapPending = null;
      return { error: 'Jogadores inválidos para armadilha.' };
    }

    const drawPlayer = (roll % 2 === 1) ? roller : trapper;    const countToDraw = (roll % 2 === 1) ? 3 : 2;

    // Compra cartas direto do deck (não usa drawForPlayer pra não conflitar com o estado da armadilha)
    const drawn = [];
    for (let i = 0; i < countToDraw; i++) {
      const arr = this.deck.draw(1);
      if (!arr || arr.length === 0) break;
      const c = arr[0];
      drawPlayer.hand.push(c);
      drawn.push(c);
    }

    this.lastTrapRoll = {
      roll,
      trapperId: trapper.id,
      rollerId: roller.id,
      drawPlayerId: drawPlayer.id,
      timestamp: Date.now()
    };

    const events = [{
      type: 'trapRoll',
      roll,
      trapperId: trapper.id,
      rollerId: roller.id,
      drawPlayerId: drawPlayer.id,
      count: drawn.length
    }];

    // encerra armadilha
    this.trapPending = null;

    return { success: true, events };
  }

  /**
   * Variante segura para o servidor: usa o socketId do solicitante para
   * identificar quem está rolando. Isso evita travamentos quando o client
   * fica com playerId desatualizado, mas o socket atual é o correto.
   */
  rollTrapDiceBySocket(socketId) {
    const player = this.players.find(p => p.socketId === socketId);
    if (!player) {
      return { error: 'Jogador não encontrado para este socket.' };
    }
    return this.rollTrapDice(player.id);
  }


  advanceTurn() {
    this._advanceTurnRaw();
    this._autoDrawAndPassIfStuck();
  }

  // Avança o turno sem disparar a lógica de auto-compra/passar (evita recursão).
  _advanceTurnRaw() {
    const next = (this.turnIndex + 1) % this.players.length;

    // Se o próximo seria o iniciador da rodada atual, então FECHOU a rodada.
    if (next === this.roundStarter) {
      this.pendingTableClear = true;
      this._pendingRoundInc = true;
      this._pendingRoundStarter = (this.roundStarter + 1) % this.players.length;
      this._pendingTurnIndex = this._pendingRoundStarter;
      return;
    }

    // Caso normal: só passa a vez.
    this.turnIndex = next;
  }

  // Se o jogador atual não tiver jogada possível, compra 1 carta e passa a vez.
  // Repete para o próximo, se necessário (com loop guard).
  _autoDrawAndPassIfStuck(loopGuard = 0) {
    if (!this.started || this.finished) return;
    if (this.pendingTableClear) return;
    if (this.trapPending && this.trapPending.status === 'awaitingRoll') return;
    if (loopGuard > this.players.length) return;

    // Nesta base o helper se chama currentPlayer().
    const current = this.currentPlayer();
    if (!current) return;

    if (this.hasPlayableCard(current.id)) return;

    // Compra 1 carta se houver monte
    if (this.deck.remaining() > 0) {
      this.drawForPlayer(current.id, 1);
    }

    const prevTurn = this.turnIndex;
    this._advanceTurnRaw();
    if (this.turnIndex === prevTurn) return;

    this._autoDrawAndPassIfStuck(loopGuard + 1);
  }

  // Jogador compra cartas voluntariamente (se o monte ainda tiver)
  drawForPlayer(playerId, count = 1) {
    // Durante armadilha, ninguém compra/joga até resolver.
    if (this.trapPending && this.trapPending.status === 'awaitingRoll') {
      return { error: 'Aguarde: a ARMADILHA ainda não foi resolvida.' };
    }
    if (this.pendingTableClear) {
      return { error: 'Aguarde: fim da rodada.' };
    }
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      return { error: 'Jogador não encontrado.' };
    }

    // Comprar carta conta como ação do turno: só o jogador atual pode.
    if (this.started && !this.finished && playerId !== this.currentPlayer()?.id) {
      return { error: 'Não é a sua vez.' };
    }
    const drawn = this.deck.draw(count);
    if (drawn.length === 0) {
      return { error: 'Não há mais cartas no monte.' };
    }
    player.hand.push(...drawn);
    return { success: true, drawn };
  }

  // Estado simples para enviar ao cliente
  
  getLogs() {
    return this.logs;
  }

  getState() {
    return {
      id: this.id,
      started: this.started,
      finished: this.finished,
      winnerId: this.winnerId,
      players: this.players.map((p, idx) => ({
        id: p.id,
        name: p.name,
        handCount: p.hand.length,
        hand: p.hand, // enviar mão completa para simplicidade; em produção ocultar cartas de outros jogadores
        isCurrent: idx === this.turnIndex,
        isRoundStarter: idx === this.roundStarter
        ,
        isAI: !!p.isAI
      })),
      table: this.table,
      remainingDeck: this.deck.remaining()
      ,
      roundCount: this.roundCount,
      pendingTableClear: this.pendingTableClear,
      trapPending: this.trapPending,
      lastTrapRoll: this.lastTrapRoll
    };
  }

  /**
   * Reinicia a partida mantendo os mesmos jogadores.
   * Reseta baralho, mãos e contadores, mas não distribui cartas automaticamente.
   * Deve ser seguido de startGame() pelo front quando quiser recomeçar.
   */
  
  // 🎬 ENGINE PRO+: limpeza sincronizada da mesa
  clearTable() {
    this.table = [];

    // Ao limpar a mesa, iniciamos oficialmente a próxima rodada.
    if (this._pendingRoundInc) {
      this.roundCount += 1;
    }
    if (typeof this._pendingRoundStarter === 'number') {
      this.roundStarter = this._pendingRoundStarter;
    }
    if (typeof this._pendingTurnIndex === 'number') {
      this.turnIndex = this._pendingTurnIndex;
    }

    this._pendingTurnIndex = null;
    this._pendingRoundStarter = null;
    this._pendingRoundInc = false;
    this.pendingTableClear = false;
    // IMPORTANTE:
    // A carta ARMADILHA pode gerar um efeito pendente (trapPending) que será resolvido
    // no início do turno do jogador alvo (com rolagem de dado). A limpeza da mesa acontece
    // no fim da rodada (após todos jogarem) e NÃO pode apagar esse efeito, senão o cliente
    // fica travado aguardando uma rolagem que o servidor "esqueceu".
    // Portanto, NÃO resetamos trapPending/lastTrapRoll aqui.

    // Se o novo jogador da vez começar travado, auto-compra/passa.
    this._autoDrawAndPassIfStuck();
  }

  

  // 📝 LOG SIMPLES
  pushLog(type, playerId=null, extra={}) {
    const snapshot = this.getState();
    this.logs.push({
      ts: Date.now(),
      gameId: this.id,
      type,
      playerId,
      ...extra,
      state: snapshot
    });
  }

  resetGame() {
    this.started = false;
    this.finished = false;
    this.roundCount = 1;
    this.winnerId = null;
    this.turnIndex = 0;
    this.roundStarter = 0;
    this.table = [];
    this.pendingTableClear = false;
    this.trapPending = null; // { trapperId, rollerId, status: 'awaitingRoll' }
    this.lastTrapRoll = null; // { roll, trapperId, rollerId, drawPlayerId, timestamp }
    this._pendingTurnIndex = null;
    this._pendingRoundStarter = null;
    this._pendingRoundInc = false;
    this.deck.reset();
    for (const player of this.players) {
      player.hand = [];
      player.isReady = false;
    }
  }
}