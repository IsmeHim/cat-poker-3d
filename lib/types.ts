export type Suit = 'h' | 'd' | 'c' | 's'; // hearts, diamonds, clubs, spades
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type PlayerActionType = 'fold' | 'check' | 'call' | 'raise';

export type GameStage = 'idle' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export type PlayerStatus = 'waiting' | 'active' | 'folded' | 'all-in' | 'out';

export interface Player {
  id: string; // socket.id or player persistent id
  name: string;
  avatarSeed: number; // For cat avatar customization
  seatIndex: number; // 0 to 5 (Seats 1-6)
  chips: number;
  currentBet: number;
  totalRoundBet: number;
  cards?: Card[]; // Hidden from other players unless showdown
  hasFolded: boolean;
  isAllIn: boolean;
  status: PlayerStatus;
  lastAction?: string;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  disconnected: boolean;
}

export interface Pot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface WinnerResult {
  playerId: string;
  playerName: string;
  amount: number;
  handName: string;
  winningCards?: Card[];
}

export interface RoomState {
  roomCode: string;
  stage: GameStage;
  players: (Player | null)[]; // exactly 6 seats
  communityCards: Card[];
  pot: number;
  sidePots: Pot[];
  currentBet: number; // highest bet in current betting round
  minRaise: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  activeTurnIndex: number; // which seat index is currently acting
  turnTimeRemaining: number;
  smallBlindAmount: number;
  bigBlindAmount: number;
  winners: WinnerResult[] | null;
  handHistory: string[];
  gameStarted: boolean;
  hostPlayerId: string;
}

// Client-to-Server Events
export interface ClientToServerEvents {
  'join-room': (
    data: { roomCode: string; playerName: string; seatIndex: number; playerId?: string },
    callback: (response: { success: boolean; message?: string; room?: RoomState; seatIndex?: number; playerId?: string }) => void
  ) => void;
  'leave-room': () => void;
  'start-game': () => void;
  'player-action': (action: { type: PlayerActionType; amount?: number }) => void;
  'reconnect-player': (
    data: { roomCode: string; playerId: string },
    callback: (response: { success: boolean; message?: string; room?: RoomState; seatIndex?: number }) => void
  ) => void;
  'send-chat': (data: { message: string }) => void;
}

// Server-to-Client Events
export interface ServerToClientEvents {
  'room-updated': (room: RoomState) => void;
  'timer-tick': (remaining: number) => void;
  'action-log': (message: string) => void;
  'chat-message': (data: { sender: string; message: string; timestamp: number }) => void;
  'showdown-result': (winners: WinnerResult[]) => void;
}
