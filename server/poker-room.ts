import { RoomState, Player, Card, PlayerActionType, WinnerResult } from '../lib/types';
import { createDeck, evaluateHands } from '../lib/poker-eval';
import { Server as SocketIOServer } from 'socket.io';

const TURN_TIME_LIMIT = 30; // 30s countdown per turn
const STARTING_CHIPS = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;

export class PokerRoom {
  public state: RoomState;
  private deck: Card[] = [];
  private io: SocketIOServer;
  private turnTimer: NodeJS.Timeout | null = null;
  private nextHandTimeout: NodeJS.Timeout | null = null;
  // Maps socket.id to seatIndex or playerId
  public socketToPlayerMap: Map<string, string> = new Map(); // socketId -> playerId

  constructor(roomCode: string, io: SocketIOServer) {
    this.io = io;
    this.state = {
      roomCode,
      stage: 'idle',
      players: [null, null, null, null, null, null],
      communityCards: [],
      pot: 0,
      sidePots: [],
      currentBet: 0,
      minRaise: BIG_BLIND,
      dealerIndex: 0,
      smallBlindIndex: 1,
      bigBlindIndex: 2,
      activeTurnIndex: -1,
      turnTimeRemaining: TURN_TIME_LIMIT,
      smallBlindAmount: SMALL_BLIND,
      bigBlindAmount: BIG_BLIND,
      winners: null,
      handHistory: [`Room ${roomCode} created. Welcome to Cat Poker 3D! 🐾`],
      gameStarted: false,
      hostPlayerId: '',
    };
  }

  public getPlayerBySeat(seat: number): Player | null {
    return this.state.players[seat] || null;
  }

  public getPlayerById(playerId: string): Player | null {
    return this.state.players.find((p) => p?.id === playerId) || null;
  }

  public addPlayer(
    socketId: string,
    playerId: string,
    name: string,
    seatIndex: number
  ): { success: boolean; message?: string } {
    if (seatIndex < 0 || seatIndex >= 6) {
      return { success: false, message: 'Invalid seat index (0-5)' };
    }

    // If there is already 1 player in the room, prefer seating directly opposite (seat + 3 % 6)
    const currentSeated = this.state.players.filter((p) => p !== null);
    let targetSeat = seatIndex;
    if (currentSeated.length === 1 && (this.state.players[seatIndex] !== null || seatIndex === 0)) {
      const firstPlayerSeat = this.state.players.findIndex((p) => p !== null);
      const oppositeSeat = (firstPlayerSeat + 3) % 6;
      if (this.state.players[oppositeSeat] === null) {
        targetSeat = oppositeSeat;
      }
    }

    if (this.state.players[targetSeat] !== null) {
      // Find any first available seat
      const freeSeat = this.state.players.findIndex((p) => p === null);
      if (freeSeat === -1) {
        return { success: false, message: 'Room is full!' };
      }
      targetSeat = freeSeat;
    }
    seatIndex = targetSeat;

    // Check if player is already seated in another seat
    const existingIndex = this.state.players.findIndex((p) => p?.id === playerId);
    if (existingIndex !== -1) {
      // Re-associating with new seat or same
      this.state.players[existingIndex] = null;
    }

    const newPlayer: Player = {
      id: playerId,
      name: name.trim().slice(0, 16) || `Kitty #${seatIndex + 1}`,
      avatarSeed: Math.floor(Math.random() * 6),
      seatIndex,
      chips: STARTING_CHIPS,
      currentBet: 0,
      totalRoundBet: 0,
      cards: [],
      hasFolded: false,
      isAllIn: false,
      status: 'waiting',
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      disconnected: false,
    };

    this.state.players[seatIndex] = newPlayer;
    this.socketToPlayerMap.set(socketId, playerId);

    // If no host assigned, this player becomes the room host
    if (!this.state.hostPlayerId) {
      this.state.hostPlayerId = playerId;
    }

    this.logHistory(`🐱 ${newPlayer.name} joined Seat ${seatIndex + 1}`);

    this.broadcastState();

    return { success: true };
  }

  public reconnectPlayer(socketId: string, playerId: string): boolean {
    const player = this.getPlayerById(playerId);
    if (player) {
      player.disconnected = false;
      this.socketToPlayerMap.set(socketId, playerId);
      this.logHistory(`🐾 ${player.name} reconnected`);
      this.broadcastState();
      return true;
    }
    return false;
  }

  public handleDisconnect(socketId: string) {
    const playerId = this.socketToPlayerMap.get(socketId);
    if (!playerId) return;

    this.socketToPlayerMap.delete(socketId);
    const player = this.getPlayerById(playerId);
    if (!player) return;

    player.disconnected = true;
    this.logHistory(`😿 ${player.name} disconnected`);

    // If it's this player's turn, auto-fold or check
    if (this.state.activeTurnIndex === player.seatIndex && this.state.stage !== 'idle') {
      this.autoAction(player);
    } else {
      this.broadcastState();
    }

    // If all players are disconnected or 0 active players, clean up
    const activePlayers = this.state.players.filter((p) => p !== null && !p.disconnected);
    if (activePlayers.length === 0) {
      this.clearTurnTimer();
    }
  }

  public removePlayer(playerId: string) {
    const seatIndex = this.state.players.findIndex((p) => p?.id === playerId);
    if (seatIndex !== -1) {
      const p = this.state.players[seatIndex];
      this.state.players[seatIndex] = null;

      // Remove from socket map
      for (const [sId, pId] of this.socketToPlayerMap.entries()) {
        if (pId === playerId) {
          this.socketToPlayerMap.delete(sId);
        }
      }

      this.logHistory(`👋 ${p?.name || 'Player'} left the table.`);

      // If host left, assign host to first remaining player
      if (this.state.hostPlayerId === playerId) {
        const nextHost = this.state.players.find((player) => player !== null && !player.disconnected);
        this.state.hostPlayerId = nextHost ? nextHost.id : '';
      }

      const remainingPlayers = this.state.players.filter((player) => player !== null && !player.disconnected);

      if (remainingPlayers.length < 2 && this.state.stage !== 'idle') {
        // Not enough players to continue, award pot to remaining or reset
        this.clearTurnTimer();
        if (remainingPlayers.length === 1) {
          this.handleSingleWinner(remainingPlayers[0]!);
        } else {
          this.state.stage = 'idle';
          this.state.gameStarted = false;
          this.state.activeTurnIndex = -1;
        }
      } else if (this.state.activeTurnIndex === seatIndex && this.state.stage !== 'idle') {
        this.nextTurn();
      }

      this.broadcastState();
    }
  }

  public startNewHand() {
    this.clearTurnTimer();
    if (this.nextHandTimeout) clearTimeout(this.nextHandTimeout);

    const eligiblePlayers = this.state.players.filter(
      (p): p is Player => p !== null && p.chips > 0 && !p.disconnected
    );

    if (eligiblePlayers.length < 2) {
      this.state.stage = 'idle';
      this.state.activeTurnIndex = -1;
      this.state.gameStarted = false;
      this.logHistory('⏳ Waiting for at least 2 players with chips to deal cards...');
      this.broadcastState();
      return;
    }

    this.state.gameStarted = true;
    this.state.winners = null;
    this.state.communityCards = [];
    this.state.pot = 0;
    this.state.sidePots = [];
    this.state.currentBet = 0;
    this.state.minRaise = this.state.bigBlindAmount;

    // Reset player states for the new hand
    for (const p of this.state.players) {
      if (p) {
        p.currentBet = 0;
        p.totalRoundBet = 0;
        p.cards = [];
        p.hasFolded = p.chips <= 0 || p.disconnected;
        p.isAllIn = false;
        p.status = p.chips <= 0 ? 'out' : p.disconnected ? 'waiting' : 'active';
        p.lastAction = undefined;
        p.isDealer = false;
        p.isSmallBlind = false;
        p.isBigBlind = false;
      }
    }

    // Advance Dealer button
    this.state.dealerIndex = this.getNextActiveSeat(this.state.dealerIndex);
    const dealer = this.state.players[this.state.dealerIndex];
    if (dealer) dealer.isDealer = true;

    // Small blind and Big blind
    let sbIndex: number;
    let bbIndex: number;

    if (eligiblePlayers.length === 2) {
      // Heads-up: Dealer is Small Blind, other player is Big Blind
      sbIndex = this.state.dealerIndex;
      bbIndex = this.getNextActiveSeat(sbIndex);
    } else {
      sbIndex = this.getNextActiveSeat(this.state.dealerIndex);
      bbIndex = this.getNextActiveSeat(sbIndex);
    }

    this.state.smallBlindIndex = sbIndex;
    this.state.bigBlindIndex = bbIndex;

    const sbPlayer = this.state.players[sbIndex];
    const bbPlayer = this.state.players[bbIndex];

    if (sbPlayer) {
      sbPlayer.isSmallBlind = true;
      const sbAmount = Math.min(sbPlayer.chips, this.state.smallBlindAmount);
      sbPlayer.chips -= sbAmount;
      sbPlayer.currentBet = sbAmount;
      sbPlayer.totalRoundBet = sbAmount;
      this.state.pot += sbAmount;
      if (sbPlayer.chips === 0) sbPlayer.isAllIn = true;
      this.logHistory(`🪙 ${sbPlayer.name} posts Small Blind (${sbAmount})`);
    }

    if (bbPlayer) {
      bbPlayer.isBigBlind = true;
      const bbAmount = Math.min(bbPlayer.chips, this.state.bigBlindAmount);
      bbPlayer.chips -= bbAmount;
      bbPlayer.currentBet = bbAmount;
      bbPlayer.totalRoundBet = bbAmount;
      this.state.pot += bbAmount;
      if (bbPlayer.chips === 0) bbPlayer.isAllIn = true;
      this.logHistory(`🪙 ${bbPlayer.name} posts Big Blind (${bbAmount})`);
    }

    this.state.currentBet = Math.max(sbPlayer?.currentBet || 0, bbPlayer?.currentBet || 0);

    // Deal 2 hole cards to each active player
    this.deck = createDeck();
    for (const p of this.state.players) {
      if (p && !p.hasFolded) {
        p.cards = [this.deck.pop()!, this.deck.pop()!];
      }
    }

    this.state.stage = 'preflop';

    // First to act preflop: Under The Gun (next after BB)
    this.state.activeTurnIndex = this.getNextActiveSeat(bbIndex);

    this.logHistory(`🎴 New hand dealt! Stage: Pre-flop.`);
    this.startTurnCountdown();
    this.broadcastState();
  }

  private getNextActiveSeat(fromSeat: number): number {
    for (let i = 1; i <= 6; i++) {
      const idx = (fromSeat + i) % 6;
      const p = this.state.players[idx];
      if (p && !p.hasFolded && p.chips > 0 && !p.disconnected) {
        return idx;
      }
    }
    // Fallback to any seated player
    for (let i = 1; i <= 6; i++) {
      const idx = (fromSeat + i) % 6;
      if (this.state.players[idx]) return idx;
    }
    return 0;
  }

  public handlePlayerAction(playerId: string, actionType: PlayerActionType, amount?: number) {
    const activePlayer = this.state.players[this.state.activeTurnIndex];
    if (!activePlayer || activePlayer.id !== playerId) {
      return; // Not this player's turn
    }

    const currentCallAmount = this.state.currentBet - activePlayer.currentBet;

    switch (actionType) {
      case 'fold': {
        activePlayer.hasFolded = true;
        activePlayer.status = 'folded';
        activePlayer.lastAction = 'Folded 🐾';
        this.logHistory(`🐱 ${activePlayer.name} folded.`);
        break;
      }

      case 'check': {
        if (currentCallAmount > 0) {
          // Cannot check when facing a bet, auto convert to fold or call
          return;
        }
        activePlayer.lastAction = 'Check 🐾';
        this.logHistory(`🐱 ${activePlayer.name} checks.`);
        break;
      }

      case 'call': {
        const callAmount = Math.min(activePlayer.chips, currentCallAmount);
        activePlayer.chips -= callAmount;
        activePlayer.currentBet += callAmount;
        activePlayer.totalRoundBet += callAmount;
        this.state.pot += callAmount;
        if (activePlayer.chips === 0) {
          activePlayer.isAllIn = true;
          activePlayer.status = 'all-in';
          activePlayer.lastAction = `Call & All-in! (${callAmount})`;
        } else {
          activePlayer.lastAction = `Call (${callAmount})`;
        }
        this.logHistory(`🪙 ${activePlayer.name} calls ${callAmount}.`);
        break;
      }

      case 'raise': {
        const raiseTo = amount || this.state.currentBet + this.state.minRaise;
        const additionalChips = raiseTo - activePlayer.currentBet;

        if (additionalChips <= 0) return;

        const actualChips = Math.min(activePlayer.chips, additionalChips);
        const actualRaiseTo = activePlayer.currentBet + actualChips;

        activePlayer.chips -= actualChips;
        activePlayer.currentBet = actualRaiseTo;
        activePlayer.totalRoundBet += actualChips;
        this.state.pot += actualChips;

        const raiseDiff = actualRaiseTo - this.state.currentBet;
        if (raiseDiff > this.state.minRaise) {
          this.state.minRaise = raiseDiff;
        }
        this.state.currentBet = actualRaiseTo;

        if (activePlayer.chips === 0) {
          activePlayer.isAllIn = true;
          activePlayer.status = 'all-in';
          activePlayer.lastAction = `All-in! (${actualRaiseTo})`;
        } else {
          activePlayer.lastAction = `Raise to ${actualRaiseTo}`;
        }
        this.logHistory(`🚀 ${activePlayer.name} raises to ${actualRaiseTo}!`);
        break;
      }
    }

    this.clearTurnTimer();
    this.checkRoundCompletion();
  }

  private autoAction(player: Player) {
    const toCall = this.state.currentBet - player.currentBet;
    if (toCall <= 0) {
      this.handlePlayerAction(player.id, 'check');
    } else {
      this.handlePlayerAction(player.id, 'fold');
    }
  }

  private startTurnCountdown() {
    this.clearTurnTimer();
    this.state.turnTimeRemaining = TURN_TIME_LIMIT;

    this.turnTimer = setInterval(() => {
      this.state.turnTimeRemaining -= 1;
      this.io.to(this.state.roomCode).emit('timer-tick', this.state.turnTimeRemaining);

      if (this.state.turnTimeRemaining <= 0) {
        this.clearTurnTimer();
        const activePlayer = this.state.players[this.state.activeTurnIndex];
        if (activePlayer) {
          this.autoAction(activePlayer);
        }
      }
    }, 1000);
  }

  private clearTurnTimer() {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
  }

  private checkRoundCompletion() {
    // 1. Check if only one player hasn't folded
    const nonFolded = this.state.players.filter((p): p is Player => p !== null && !p.hasFolded);

    if (nonFolded.length <= 1) {
      this.handleSingleWinner(nonFolded[0]);
      return;
    }

    // 2. Check if all active (non-folded, non-all-in) players have matched currentBet
    const activeBettors = nonFolded.filter((p) => !p.isAllIn);

    if (activeBettors.length === 0) {
      // Everyone left is all-in, fast-forward remaining community cards to showdown
      this.fastForwardToShowdown();
      return;
    }

    // Check if every active bettor has acted and matched current bet
    const allMatched = activeBettors.every(
      (p) => p.currentBet === this.state.currentBet && p.lastAction !== undefined
    );

    if (allMatched) {
      this.advanceStage();
    } else {
      this.nextTurn();
    }
  }

  private nextTurn() {
    let nextSeat = (this.state.activeTurnIndex + 1) % 6;
    let found = false;

    for (let i = 0; i < 6; i++) {
      const idx = (nextSeat + i) % 6;
      const p = this.state.players[idx];
      if (p && !p.hasFolded && !p.isAllIn && !p.disconnected) {
        this.state.activeTurnIndex = idx;
        found = true;
        break;
      }
    }

    if (!found) {
      this.advanceStage();
    } else {
      this.startTurnCountdown();
      this.broadcastState();
    }
  }

  private advanceStage() {
    this.clearTurnTimer();

    // Reset round bets
    for (const p of this.state.players) {
      if (p) {
        p.currentBet = 0;
        p.lastAction = undefined;
      }
    }
    this.state.currentBet = 0;
    this.state.minRaise = this.state.bigBlindAmount;

    switch (this.state.stage) {
      case 'preflop':
        this.state.stage = 'flop';
        this.deck.pop(); // Burn card
        this.state.communityCards.push(this.deck.pop()!, this.deck.pop()!, this.deck.pop()!);
        this.logHistory('🐱 The Flop is dealt!');
        break;

      case 'flop':
        this.state.stage = 'turn';
        this.deck.pop(); // Burn card
        this.state.communityCards.push(this.deck.pop()!);
        this.logHistory('🐾 The Turn is dealt!');
        break;

      case 'turn':
        this.state.stage = 'river';
        this.deck.pop(); // Burn card
        this.state.communityCards.push(this.deck.pop()!);
        this.logHistory('🐾 The River is dealt!');
        break;

      case 'river':
        this.state.stage = 'showdown';
        this.handleShowdown();
        return;
    }

    // Next turn begins from small blind or first active seat left of dealer
    let firstToAct = (this.state.dealerIndex + 1) % 6;
    let found = false;
    for (let i = 0; i < 6; i++) {
      const idx = (firstToAct + i) % 6;
      const p = this.state.players[idx];
      if (p && !p.hasFolded && !p.isAllIn && !p.disconnected) {
        this.state.activeTurnIndex = idx;
        found = true;
        break;
      }
    }

    if (!found) {
      // Check if multiple all-in players are waiting
      const remaining = this.state.players.filter((p) => p && !p.hasFolded);
      if (remaining.length > 1) {
        this.advanceStage();
      } else {
        this.handleShowdown();
      }
      return;
    }

    this.startTurnCountdown();
    this.broadcastState();
  }

  private fastForwardToShowdown() {
    this.clearTurnTimer();
    // Deal remaining community cards up to 5
    while (this.state.communityCards.length < 5) {
      this.deck.pop(); // burn
      this.state.communityCards.push(this.deck.pop()!);
    }
    this.state.stage = 'showdown';
    this.handleShowdown();
  }

  private handleSingleWinner(winner?: Player) {
    this.clearTurnTimer();
    if (!winner) {
      this.startNewHand();
      return;
    }

    const wonAmount = this.state.pot;
    winner.chips += wonAmount;

    this.state.winners = [
      {
        playerId: winner.id,
        playerName: winner.name,
        amount: wonAmount,
        handName: 'Everyone else folded',
      },
    ];

    this.logHistory(`🏆 ${winner.name} wins ${wonAmount} chips! (All others folded)`);
    this.broadcastState(true);

    this.nextHandTimeout = setTimeout(() => {
      this.startNewHand();
    }, 4500);
  }

  private handleShowdown() {
    this.clearTurnTimer();
    const contenders = this.state.players.filter(
      (p): p is Player => p !== null && !p.hasFolded && p.cards !== undefined && p.cards.length === 2
    );

    if (contenders.length === 0) {
      this.startNewHand();
      return;
    }

    if (contenders.length === 1) {
      this.handleSingleWinner(contenders[0]);
      return;
    }

    const result = evaluateHands(
      contenders.map((c) => ({ playerId: c.id, cards: c.cards! })),
      this.state.communityCards
    );

    const winningPlayers = contenders.filter((c) => result.winners.includes(c.id));
    const splitAmount = Math.floor(this.state.pot / winningPlayers.length);

    this.state.winners = winningPlayers.map((w) => {
      w.chips += splitAmount;
      return {
        playerId: w.id,
        playerName: w.name,
        amount: splitAmount,
        handName: result.handName,
        winningCards: w.cards,
      };
    });

    const winnerNames = winningPlayers.map((w) => w.name).join(' & ');
    this.logHistory(`🎉 ${winnerNames} wins ${splitAmount} chips with ${result.handName}!`);

    this.broadcastState(true);

    this.nextHandTimeout = setTimeout(() => {
      this.startNewHand();
    }, 6000);
  }

  private logHistory(msg: string) {
    this.state.handHistory.unshift(msg);
    if (this.state.handHistory.length > 30) {
      this.state.handHistory.pop();
    }
  }

  /**
   * Broadcast state. In poker, clients must NOT see opponents' hole cards unless it's showdown.
   */
  public broadcastState(revealCards: boolean = false) {
    // For each socket, customize the view
    for (const [socketId, playerId] of this.socketToPlayerMap.entries()) {
      const sanitized = this.getSanitizedState(playerId, revealCards || this.state.stage === 'showdown');
      this.io.to(socketId).emit('room-updated', sanitized);
    }
  }

  public getSanitizedState(forPlayerId: string, revealAll: boolean): RoomState {
    return {
      ...this.state,
      players: this.state.players.map((p) => {
        if (!p) return null;
        if (revealAll || p.id === forPlayerId) {
          return { ...p };
        }
        // Mask other players' cards
        return {
          ...p,
          cards: p.cards && p.cards.length > 0 ? [ { rank: 'A', suit: 's' } as Card, { rank: 'A', suit: 's' } as Card ] : [], // Card back representation
        };
      }),
    };
  }
}
