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

const CAT_ROYAL_EMOJIS: Record<string, string> = {
  J: '😸',
  Q: '😻',
  K: '😼',
  A: '😽',
};

export const Card2D: React.FC<Card2DProps> = ({ card, isFaceDown = false, className = '', isPeekable = false }) => {
  if (isFaceDown || !card) {
    return (
      <div
        className={`w-20 h-28 sm:w-24 sm:h-36 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 p-1.5 shadow-xl border-2 border-white/80 flex items-center justify-center transition-transform hover:-translate-y-2 select-none ${className}`}
      >
        <div className="w-full h-full rounded-xl border-2 border-pink-200/50 flex flex-col items-center justify-center bg-pink-600/30">
          <span className="text-3xl filter drop-shadow">🐾</span>
          <span className="text-[10px] font-bold text-pink-100 tracking-wider mt-1">CAT POKER</span>
        </div>
      </div>
    );
  }

  const color = getSuitColor(card.suit);
  const symbol = getSuitSymbol(card.suit);
  const rank = getRankDisplay(card.rank);
  const catEmoji = CAT_ROYAL_EMOJIS[card.rank];

  return (
    <div
      className={`w-20 h-28 sm:w-24 sm:h-36 rounded-2xl bg-white p-2 shadow-2xl border-2 border-pink-100 flex flex-col justify-between transition-all duration-300 select-none group ${
        isPeekable ? 'hover:-translate-y-4 hover:shadow-[0_20px_25px_-5px_rgba(244,114,182,0.4)] cursor-pointer' : ''
      } ${className}`}
    >
      {/* Top Left Rank */}
      <div className="flex flex-col items-start leading-none" style={{ color }}>
        <span className="text-lg sm:text-xl font-black">{rank}</span>
        <span className="text-sm sm:text-base">{symbol}</span>
      </div>

      {/* Center Art */}
      <div className="flex flex-col items-center justify-center my-auto">
        {catEmoji ? (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center shadow-inner">
            <span className="text-2xl sm:text-3xl">{catEmoji}</span>
          </div>
        ) : (
          <span className="text-3xl sm:text-4xl filter drop-shadow-sm" style={{ color }}>
            {symbol}
          </span>
        )}
      </div>

      {/* Bottom Right Rank (Upright and clean) */}
      <div className="flex flex-col items-end leading-none" style={{ color }}>
        <span className="text-sm sm:text-base">{symbol}</span>
        <span className="text-lg sm:text-xl font-black">{rank}</span>
      </div>
    </div>
  );
};
