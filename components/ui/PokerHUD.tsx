'use client';

import React, { useState, useEffect } from 'react';
import { RoomState, PlayerActionType } from '@/lib/types';
import { Card2D } from './Card2D';
import { evaluatePlayerHand } from '@/lib/poker-eval';
import { Copy, Volume2, Users, Send, Check, MessageSquare, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PokerHUDProps {
  room: RoomState;
  mySeatIndex: number;
  myPlayerId: string;
  timer: number;
  chatMessages: { sender: string; message: string; timestamp: number }[];
  onAction: (type: PlayerActionType, amount?: number) => void;
  onStartGame: () => void;
  onStopGame?: () => void;
  onShowCards?: (cardIndices: number[]) => void;
  onLeaveRoom: () => void;
  onSendChat: (message: string) => void;
}

export const PokerHUD: React.FC<PokerHUDProps> = ({
  room,
  mySeatIndex,
  myPlayerId,
  timer,
  chatMessages,
  onAction,
  onStartGame,
  onStopGame,
  onShowCards,
  onLeaveRoom,
  onSendChat,
}) => {
  const [copied, setCopied] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState<number>(room.bigBlindAmount * 2);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const myPlayer = mySeatIndex !== -1 ? room.players[mySeatIndex] : null;
  const isMyTurn = room.activeTurnIndex === mySeatIndex && myPlayer && !myPlayer.hasFolded;
  const activePlayer = room.activeTurnIndex !== -1 ? room.players[room.activeTurnIndex] : null;

  // Real-time evaluation of player's hand rank (e.g. Pair of Kings, Flush)
  const currentHandName = React.useMemo(() => {
    if (!myPlayer || !myPlayer.cards || myPlayer.cards.length < 2) return '';
    return evaluatePlayerHand(myPlayer.cards, room.communityCards || []);
  }, [myPlayer?.cards, room.communityCards]);

  // Sound / Confetti on winner
  useEffect(() => {
    if (room.winners && room.winners.length > 0) {
      const isWinner = room.winners.some((w) => w.playerId === myPlayerId);
      if (isWinner) {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f472b6', '#38bdf8', '#fbbf24', '#4ade80'],
        });
      }
    }
  }, [room.winners, myPlayerId]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onSendChat(chatInput);
      setChatInput('');
    }
  };

  const currentCallAmount = myPlayer ? Math.max(0, room.currentBet - myPlayer.currentBet) : 0;
  const canCheck = currentCallAmount === 0;
  const minRaise = Math.max(room.currentBet + room.minRaise, room.bigBlindAmount * 2);
  const maxRaise = myPlayer ? myPlayer.chips + myPlayer.currentBet : 0;

  // Auto-clamp raiseAmount
  useEffect(() => {
    if (raiseAmount < minRaise) setRaiseAmount(minRaise);
    if (raiseAmount > maxRaise && maxRaise > 0) setRaiseAmount(maxRaise);
  }, [minRaise, maxRaise, raiseAmount]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none font-sans z-10">
      {/* ================= TOP BAR ================= */}
      <div className="flex flex-wrap items-center justify-between gap-2 pointer-events-auto w-full">
        {/* Room Code Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-white/90 backdrop-blur-md px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl shadow-lg border border-pink-200">
          <span className="text-base sm:text-xl">🐱</span>
          <div>
            <div className="text-[9px] uppercase tracking-wider font-extrabold text-pink-500">Room</div>
            <div className="text-xs sm:text-base font-black text-slate-800 tracking-wider flex items-center gap-1">
              <span>{room.roomCode}</span>
              <button
                onClick={copyRoomCode}
                className="p-0.5 sm:p-1 hover:bg-pink-100 rounded-lg text-pink-600 transition-colors"
                title="Copy code"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Center Game Stage, Pot Banner & Active Player Countdown */}
        <div className="flex flex-col items-center gap-1 order-last sm:order-none w-full sm:w-auto mt-1 sm:mt-0">
          <div className="bg-gradient-to-r from-pink-500 to-rose-400 text-white font-black px-4 sm:px-6 py-1 sm:py-1.5 rounded-full shadow-lg border-2 border-white flex items-center gap-2 text-xs sm:text-sm">
            <span className="text-[10px] sm:text-xs uppercase tracking-widest">{room.stage}</span>
            <span className="text-pink-200">|</span>
            <span>POT: 🪙 {room.pot}</span>
          </div>

          {/* Turn Indicator for everyone */}
          {room.stage !== 'idle' && activePlayer && (
            <div className={`px-3 py-0.5 sm:px-4 sm:py-1 rounded-full text-[10px] sm:text-xs font-black shadow-md border flex items-center gap-1.5 transition-all ${
              isMyTurn
                ? 'bg-rose-500 text-white border-white animate-pulse'
                : 'bg-white/95 text-slate-700 border-pink-200'
            }`}>
              <Clock size={12} className={isMyTurn ? 'animate-spin' : 'text-pink-500'} />
              <span>
                {isMyTurn ? 'Your Turn!' : `${activePlayer.name}'s Turn`} ({timer}s)
              </span>
            </div>
          )}
        </div>

        {/* Action Controls & Top Menu (Always accessible on Mobile) */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto sm:ml-0">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="bg-white/90 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl shadow-md border border-pink-200 hover:bg-pink-50 text-slate-700 transition"
            title="Hand History"
          >
            📜
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className="relative bg-white/90 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl shadow-md border border-pink-200 hover:bg-pink-50 text-slate-700 transition"
            title="Chat"
          >
            <MessageSquare size={16} />
          </button>
          {room.hostPlayerId === myPlayerId && room.stage !== 'idle' && onStopGame && (
            <button
              onClick={onStopGame}
              className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-black px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-2xl text-[11px] sm:text-xs transition border border-amber-300 flex items-center gap-1 shadow-sm active:scale-95"
              title="Stop Game (Host)"
            >
              <span>🛑</span>
              <span className="hidden sm:inline">Stop</span>
            </button>
          )}
          {/* Leave Button - High contrast, clearly visible on all mobile screens */}
          <button
            onClick={onLeaveRoom}
            className="bg-rose-500 hover:bg-rose-600 text-white font-black px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl text-xs transition shadow-md active:scale-95 border border-rose-400"
          >
            Leave 🚪
          </button>
        </div>
      </div>

      {/* ================= HAND HISTORY MODAL ================= */}
      {showHistory && (
        <div className="pointer-events-auto absolute top-20 right-5 w-80 max-h-96 bg-white/95 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-pink-200 flex flex-col z-20">
          <div className="font-black text-sm text-pink-600 mb-2 flex items-center justify-between">
            <span>🐾 Hand History</span>
            <button onClick={() => setShowHistory(false)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="overflow-y-auto space-y-1.5 text-xs text-slate-700 flex-1 pr-1 font-medium">
            {room.handHistory.map((h, i) => (
              <div key={i} className="py-1 border-b border-pink-50 last:border-none">
                {h}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= CHAT WINDOW ================= */}
      {showChat && (
        <div className="pointer-events-auto absolute top-20 right-5 w-80 h-96 bg-white/95 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-pink-200 flex flex-col z-20">
          <div className="font-black text-sm text-pink-600 mb-2 flex items-center justify-between">
            <span>💬 Table Chat</span>
            <button onClick={() => setShowChat(false)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="overflow-y-auto space-y-2 text-xs flex-1 pr-1 mb-2">
            {chatMessages.length === 0 ? (
              <div className="text-slate-400 italic text-center mt-10">No messages yet. Say meow!</div>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className="bg-pink-50/70 p-2 rounded-xl">
                  <span className="font-bold text-pink-700">{msg.sender}: </span>
                  <span className="text-slate-800">{msg.message}</span>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type meow..."
              className="flex-1 bg-slate-100 border border-pink-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <button
              type="submit"
              className="bg-pink-500 hover:bg-pink-600 text-white p-2 rounded-xl text-xs transition"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* ================= SHOWDOWN WINNER NOTIFICATION ================= */}
      {room.winners && room.winners.length > 0 && (
        <div className="self-center pointer-events-auto bg-white/95 backdrop-blur-lg border-4 border-yellow-300 rounded-3xl p-6 shadow-2xl text-center animate-bounce z-30 max-w-md">
          <div className="text-4xl mb-1">🎉 🐱 🏆</div>
          <div className="text-lg font-black text-pink-600">
            {room.winners.map((w) => w.playerName).join(' & ')} Wins!
          </div>
          <div className="text-2xl font-black text-amber-500 my-1">
            +🪙 {room.winners[0]?.amount} chips
          </div>
          <div className="text-sm font-semibold text-slate-700 bg-amber-50 py-1 px-3 rounded-full inline-block mb-3">
            {room.winners[0]?.handName}
          </div>

          {/* Show Winner's Hand Cards Clearly to Everyone */}
          {room.winners[0]?.winningCards && room.winners[0].winningCards.length === 2 && (
            <div className="flex items-center justify-center gap-2 mt-1">
              <Card2D card={room.winners[0].winningCards[0]} isPeekable={false} className="!w-16 !h-24 shadow-md" />
              <Card2D card={room.winners[0].winningCards[1]} isPeekable={false} className="!w-16 !h-24 shadow-md" />
            </div>
          )}
        </div>
      )}

      {/* ================= WAITING / START GAME BANNER ================= */}
      {room.stage === 'idle' && (
        <div className="self-center pointer-events-auto bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border-2 border-pink-200 text-center max-w-md">
          <div className="text-3xl mb-2">🐾</div>
          <h2 className="text-xl font-black text-slate-800 mb-1">
            {room.players.filter((p) => p !== null).length < 2 ? 'Waiting for More Players' : 'Ready to Start!'}
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            {room.players.filter((p) => p !== null).length < 2
              ? `Waiting for a friend to join Room: ${room.roomCode}`
              : room.hostPlayerId === myPlayerId
                ? 'You are the Room Host. Click below to deal the cards!'
                : 'Waiting for the Room Host to start the game...'}
          </p>

          {room.hostPlayerId === myPlayerId ? (
            <button
              disabled={room.players.filter((p) => p !== null).length < 2}
              onClick={onStartGame}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-black py-3 rounded-2xl shadow-lg shadow-pink-300/50 transition transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              Start Dealing Now! 🎴
            </button>
          ) : (
            <div className="bg-pink-50 text-pink-700 text-xs font-bold py-2.5 px-4 rounded-xl border border-pink-200">
              Host will start the game soon ⏳
            </div>
          )}
        </div>
      )}

      {/* ================= BOTTOM BAR: RESPONSIVE FOR MOBILE / IPAD / DESKTOP ================= */}
      <div className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-3 pointer-events-auto mt-auto w-full max-w-7xl mx-auto">
        {/* Left Side: Player Profile, Balance & 5 Community Cards */}
        <div className="flex flex-row lg:flex-col items-center lg:items-start justify-between w-full lg:w-auto gap-2">
          {/* Player Profile & Balance */}
          {myPlayer && (
            <div className="bg-white/90 backdrop-blur-md px-3 py-2 sm:p-3 rounded-2xl shadow-xl border border-pink-200 flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-pink-400 to-rose-300 flex items-center justify-center text-lg sm:text-xl shadow-md">
                🐱
              </div>
              <div>
                <div className="font-black text-slate-800 text-[11px] sm:text-xs flex items-center gap-1">
                  <span className="truncate max-w-[90px] sm:max-w-[130px]">{myPlayer.name}</span>
                  <span className="text-[9px] bg-pink-100 text-pink-600 px-1 sm:px-1.5 py-0.5 rounded-full font-bold">
                    #{myPlayer.seatIndex + 1}
                  </span>
                </div>
                <div className="text-amber-500 font-extrabold text-xs sm:text-sm flex items-center gap-1">
                  <span>🪙 {myPlayer.chips}</span>
                </div>
              </div>
            </div>
          )}

          {/* 5 Community Cards Displayed on Left Side */}
          {room.communityCards && room.communityCards.length > 0 && (
            <div className="bg-white/90 backdrop-blur-md px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-2xl shadow-xl border border-pink-200 flex flex-col gap-1 animate-fadeIn">
              <span className="text-[9px] sm:text-[10px] font-black text-pink-500 uppercase tracking-wider flex items-center gap-1">
                <span>🎴 Community</span>
              </span>
              <div className="flex items-center gap-1 sm:gap-1.5">
                {room.communityCards.map((c, i) => (
                  <div key={i} className="transform transition hover:-translate-y-1">
                    <Card2D card={c} isPeekable={false} className="!w-9 !h-14 sm:!w-12 sm:!h-18 lg:!w-14 lg:!h-20" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center: Player's Hole Cards & Real-Time Best Hand Ranking */}
        {myPlayer && myPlayer.cards && myPlayer.cards.length > 0 && !myPlayer.hasFolded && (
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 my-1 lg:my-0">
            {/* Real-Time Hand Name Badge (e.g. 1 Pair, Three of a Kind, Flush) */}
            {currentHandName && (
              <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-[10px] sm:text-xs px-3 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg border-2 border-white flex items-center gap-1.5 animate-bounce">
                <span>✨</span>
                <span>{currentHandName}</span>
                <span>🐾</span>
              </div>
            )}

            {/* 2 Hole Cards */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative group">
                <Card2D card={myPlayer.cards[0]} isPeekable className="!w-16 !h-24 sm:!w-22 sm:!h-32" />
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-pink-600 bg-white/80 px-1 rounded-full opacity-0 group-hover:opacity-100 transition">Card 1</span>
              </div>
              <div className="relative group">
                <Card2D card={myPlayer.cards[1]} isPeekable className="!w-16 !h-24 sm:!w-22 sm:!h-32" />
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-pink-600 bg-white/80 px-1 rounded-full opacity-0 group-hover:opacity-100 transition">Card 2</span>
              </div>
            </div>

            {/* Voluntary Show Cards Buttons - ONLY shown when winning by fold (end of hand) */}
            {onShowCards && room.winners && room.winners.some((w) => w.playerId === myPlayerId) && (
              <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border-2 border-pink-300 text-[11px] font-black animate-pulse">
                <span className="text-pink-600 mr-0.5">Show bluff:</span>
                <button
                  onClick={() => onShowCards([0])}
                  className="px-2.5 py-1 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-xl transition shadow-sm"
                >
                  Card 1
                </button>
                <button
                  onClick={() => onShowCards([1])}
                  className="px-2.5 py-1 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-xl transition shadow-sm"
                >
                  Card 2
                </button>
                <button
                  onClick={() => onShowCards([0, 1])}
                  className="px-2.5 py-1 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white rounded-xl transition shadow-sm"
                >
                  Both 🎴
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action Controls & Turn Countdown */}
        {myPlayer && (
          <div className="bg-white/95 backdrop-blur-md p-2.5 sm:p-4 rounded-3xl shadow-2xl border-2 border-pink-200 flex flex-col gap-2 sm:gap-3 w-full sm:w-auto sm:min-w-[320px] max-w-sm">
            {/* Turn Timer progress */}
            {isMyTurn && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-pink-600 animate-pulse flex items-center gap-1">
                  🐾 YOUR TURN!
                </span>
                <div className="flex items-center gap-1.5 font-black text-xs text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                  <span>⏱️</span>
                  <span>{timer}s</span>
                </div>
              </div>
            )}

            {/* Raise Slider & Presets */}
            {isMyTurn && myPlayer.chips > currentCallAmount && (
              <div className="flex flex-col gap-1.5 bg-pink-50/60 p-2 sm:p-2.5 rounded-2xl">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Raise: 🪙 {raiseAmount}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setRaiseAmount(Math.min(maxRaise, room.currentBet * 2 || room.bigBlindAmount * 2))}
                      className="px-1.5 py-0.5 bg-white border border-pink-200 rounded text-[10px] font-black hover:bg-pink-100"
                    >
                      2x
                    </button>
                    <button
                      onClick={() => setRaiseAmount(Math.min(maxRaise, room.currentBet * 3 || room.bigBlindAmount * 3))}
                      className="px-1.5 py-0.5 bg-white border border-pink-200 rounded text-[10px] font-black hover:bg-pink-100"
                    >
                      3x
                    </button>
                    <button
                      onClick={() => setRaiseAmount(maxRaise)}
                      className="px-1.5 py-0.5 bg-rose-500 text-white rounded text-[10px] font-black hover:bg-rose-600"
                    >
                      ALL-IN
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={minRaise}
                  max={maxRaise}
                  step={room.bigBlindAmount}
                  value={raiseAmount}
                  onChange={(e) => setRaiseAmount(Number(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {/* Fold */}
              <button
                disabled={!isMyTurn}
                onClick={() => onAction('fold')}
                className={`py-2 sm:py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition ${
                  isMyTurn
                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 active:scale-95 shadow-md'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                Fold
              </button>

              {/* Check or Call */}
              {canCheck ? (
                <button
                  disabled={!isMyTurn}
                  onClick={() => onAction('check')}
                  className={`py-2 sm:py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition ${
                    isMyTurn
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95 shadow-lg shadow-emerald-200'
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  Check
                </button>
              ) : (
                <button
                  disabled={!isMyTurn}
                  onClick={() => onAction('call')}
                  className={`py-2 sm:py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition ${
                    isMyTurn
                      ? 'bg-blue-500 hover:bg-blue-600 text-white active:scale-95 shadow-lg shadow-blue-200'
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  Call ({currentCallAmount})
                </button>
              )}

              {/* Raise */}
              <button
                disabled={!isMyTurn || myPlayer.chips <= currentCallAmount}
                onClick={() => onAction('raise', raiseAmount)}
                className={`py-2 sm:py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition ${
                  isMyTurn && myPlayer.chips > currentCallAmount
                    ? 'bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white active:scale-95 shadow-lg shadow-pink-200'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                Raise
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
