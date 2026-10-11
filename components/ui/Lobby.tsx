'use client';

import React, { useState } from 'react';
import { Users, Sparkles, Play } from 'lucide-react';

interface LobbyProps {
  onJoin: (roomCode: string, playerName: string, seatIndex: number) => Promise<boolean>;
  connected: boolean;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoin, connected }) => {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cat_poker_player_name') || 'Fluffy Cat';
    }
    return 'Fluffy Cat';
  });
  const [selectedSeat, setSelectedSeat] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const handleCreateOrJoin = async (isNew: boolean) => {
    if (!playerName.trim()) {
      alert('Please enter a cute cat nickname!');
      return;
    }
    setLoading(true);
    const code = isNew ? '' : roomCode.trim().toUpperCase();
    await onJoin(code, playerName.trim(), selectedSeat);
    setLoading(false);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border-4 border-pink-200 p-6 sm:p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-pink-400 to-rose-300 shadow-lg shadow-pink-200 mb-3 text-4xl">
            🐾
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center justify-center gap-2">
            <span>Cat Poker 3D</span>
            <Sparkles className="text-pink-400" size={24} />
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Cozy 1st-person 3D Texas Hold&apos;em with cute cartoon kitties!
          </p>
        </div>

        {/* Player Nickname */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black uppercase tracking-wider text-pink-600">
            Your Cat Nickname
          </label>
          <input
            type="text"
            maxLength={16}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g., Captain Whiskers"
            className="w-full bg-pink-50/60 border-2 border-pink-200 focus:border-pink-400 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none transition shadow-inner"
          />
        </div>

        {/* Seat Picker (1 to 6) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-black uppercase tracking-wider text-pink-600 flex items-center gap-1.5">
            <Users size={14} />
            <span>Select Preferred Chair (1 - 6)</span>
          </label>
          <div className="grid grid-cols-6 gap-2">
            {[0, 1, 2, 3, 4, 5].map((seat) => (
              <button
                key={seat}
                type="button"
                onClick={() => setSelectedSeat(seat)}
                className={`py-2.5 rounded-2xl font-black text-xs transition border-2 ${
                  selectedSeat === seat
                    ? 'bg-pink-500 border-pink-600 text-white shadow-lg shadow-pink-200 scale-105'
                    : 'bg-white border-pink-100 text-slate-600 hover:bg-pink-50'
                }`}
              >
                #{seat + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Create / Join Buttons */}
        <div className="flex flex-col gap-3 pt-2">
          {/* Quick Create Room */}
          <button
            disabled={loading || !connected}
            onClick={() => handleCreateOrJoin(true)}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-black py-3.5 rounded-2xl shadow-xl shadow-pink-300/50 transition transform active:scale-95 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <Play size={18} fill="currentColor" />
            <span>Create New Room</span>
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-pink-200" />
            <span className="text-[11px] font-black uppercase text-pink-400">OR JOIN WITH CODE</span>
            <div className="flex-1 h-px bg-pink-200" />
          </div>

          {/* Join with Code */}
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={6}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="6-LETTER CODE"
              className="flex-1 bg-pink-50/60 border-2 border-pink-200 focus:border-pink-400 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 tracking-widest text-center uppercase focus:outline-none transition shadow-inner"
            />
            <button
              disabled={loading || !connected || !roomCode.trim()}
              onClick={() => handleCreateOrJoin(false)}
              className="bg-slate-800 hover:bg-slate-900 text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-wider transition active:scale-95 disabled:opacity-50"
            >
              Join
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] font-semibold text-slate-400">
          {connected ? (
            <span className="text-emerald-500 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Connected to Cat Poker Server
            </span>
          ) : (
            <span className="text-amber-500 flex items-center justify-center gap-1">
              Connecting to game server...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
