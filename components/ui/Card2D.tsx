'use client';

import React from 'react';
import { Card as CardType } from '@/lib/types';
import { getSuitColor, getSuitSymbol, getRankDisplay } from '@/lib/canvas-textures';

interface Card2DProps {
  card?: CardType;
  isFaceDown?: boolean;
  className?: string;
  isPeekable?: boolean;
}

export const SuitIcon: React.FC<{ suit: CardType['suit']; className?: string }> = ({ suit, className = 'w-4 h-4' }) => {
  if (suit === 'h') {
    // Red curved bold cartoon heart
    return (
      <svg viewBox="0 0 32 32" className={className} fill="#e11d48">
        <path d="M16 28 C16 20 2 13 2 6 C2 -1 10 -2 16 5 C22 -2 30 -1 30 6 C30 13 16 20 16 28 Z" />
      </svg>
    );
  }
  if (suit === 'd') {
    // Sharp red diamond
    return (
      <svg viewBox="0 0 32 32" className={className} fill="#e11d48">
        <polygon points="16,2 30,16 16,30 2,16" />
      </svg>
    );
  }
  if (suit === 's') {
    // Navy slate spade with stem
    return (
      <svg viewBox="0 0 32 32" className={className} fill="#1e3a47">
        <path d="M16 2 C11 11 2 15 2 22 C2 27 7 28 13 25 L12 30 L20 30 L19 25 C25 28 30 27 30 22 C30 15 21 11 16 2 Z" />
      </svg>
    );
  }
  // Club with 3 lobes and stem
  return (
    <svg viewBox="0 0 32 32" className={className} fill="#1e3a47">
      <circle cx="16" cy="9" r="6.5" />
      <circle cx="9.5" cy="18" r="6.5" />
      <circle cx="22.5" cy="18" r="6.5" />
      <polygon points="16,16 13,30 19,30" />
    </svg>
  );
};

export const Card2D: React.FC<Card2DProps> = ({ card, isFaceDown = false, className = '', isPeekable = false }) => {
  if (isFaceDown || !card) {
    return (
      <div
        className={`w-20 h-28 sm:w-24 sm:h-36 rounded-2xl bg-linear-to-tr from-pink-500 to-rose-400 p-1.5 shadow-xl border-2 border-white/80 flex items-center justify-center transition-transform hover:-translate-y-2 select-none ${className}`}
      >
        <div className="w-full h-full rounded-xl border-2 border-pink-200/50 flex flex-col items-center justify-center bg-pink-600/30">
          <span className="text-3xl filter drop-shadow">🐾</span>
          <span className="text-[10px] font-bold text-pink-100 tracking-wider mt-1">CAT POKER</span>
        </div>
      </div>
    );
  }

  const color = getSuitColor(card.suit);
  const rank = getRankDisplay(card.rank);
  const isRoyal = ['J', 'Q', 'K'].includes(card.rank);
  const royalEmojis: Record<string, string> = { J: '😸', Q: '😻', K: '😼' };

  return (
    <div
      className={`w-20 h-28 sm:w-24 sm:h-36 rounded-2xl bg-white p-2 shadow-xl border-2 border-slate-200 flex flex-col justify-between transition-all duration-300 select-none group relative overflow-hidden ${
        isPeekable ? 'hover:-translate-y-4 hover:shadow-[0_20px_25px_-5px_rgba(244,114,182,0.4)] cursor-pointer' : ''
      } ${className}`}
    >
      {/* Top Left Rank & Vector Suit */}
      <div className="flex flex-col items-center leading-none w-6" style={{ color }}>
        <span className="text-xl sm:text-2xl font-black font-sans tracking-tight">{rank}</span>
        <SuitIcon suit={card.suit} className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5" />
      </div>

      {/* Center Large Vector Art (Identical to reference image) */}
      <div className="flex flex-col items-center justify-center my-auto">
        {isRoyal ? (
          <div className="flex flex-col items-center">
            <SuitIcon suit={card.suit} className="w-5 h-5 sm:w-6 sm:h-6 -mb-1" />
            <span className="text-2xl sm:text-3xl">{royalEmojis[card.rank]}</span>
          </div>
        ) : (
          <SuitIcon
            suit={card.suit}
            className={card.rank === 'A' ? 'w-11 h-11 sm:w-14 sm:h-14 drop-shadow-sm' : 'w-9 h-9 sm:w-11 sm:h-11'}
          />
        )}
      </div>

      {/* Bottom Right Rank & Vector Suit (Inverted) */}
      <div className="flex flex-col items-center leading-none w-6 self-end rotate-180" style={{ color }}>
        <span className="text-xl sm:text-2xl font-black font-sans tracking-tight">{rank}</span>
        <SuitIcon suit={card.suit} className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5" />
      </div>
    </div>
  );
};
