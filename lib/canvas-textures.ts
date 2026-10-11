import { Card, Suit, Rank } from './types';

export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'h': return '♥';
    case 'd': return '♦';
    case 'c': return '♣';
    case 's': return '♠';
  }
}

export function getSuitColor(suit: Suit): string {
  // Bold vibrant red for Hearts/Diamonds, deep navy-slate for Spades/Clubs as in reference
  return suit === 'h' || suit === 'd' ? '#e11d48' : '#1e3a47';
}

export function getRankDisplay(rank: Rank): string {
  if (rank === 'T') return '10';
  return rank;
}

/**
 * Draw vector shapes for suits matching the modern flat poker card illustration
 */
export function drawSuitShape(
  ctx: CanvasRenderingContext2D,
  suit: Suit,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;

  if (suit === 'h') {
    // Curvy, bold cartoon heart
    const s = size / 32;
    ctx.beginPath();
    ctx.moveTo(0, s * 11);
    ctx.bezierCurveTo(0, s * 4, -s * 15, -s * 6, -s * 15, -s * 14);
    ctx.bezierCurveTo(-s * 15, -s * 22, -s * 6, -s * 24, 0, -s * 14);
    ctx.bezierCurveTo(s * 6, -s * 24, s * 15, -s * 22, s * 15, -s * 14);
    ctx.bezierCurveTo(s * 15, -s * 6, 0, s * 4, 0, s * 11);
    ctx.fill();
  } else if (suit === 'd') {
    // Sharp diamond
    const s = size / 32;
    ctx.beginPath();
    ctx.moveTo(0, -s * 22);
    ctx.lineTo(s * 16, 0);
    ctx.lineTo(0, s * 22);
    ctx.lineTo(-s * 16, 0);
    ctx.closePath();
    ctx.fill();
  } else if (suit === 's') {
    // Spade with stem
    const s = size / 32;
    ctx.beginPath();
    ctx.moveTo(0, -s * 20);
    ctx.bezierCurveTo(-s * 6, -s * 6, -s * 17, 0, -s * 17, s * 10);
    ctx.bezierCurveTo(-s * 17, s * 16, -s * 10, s * 18, -s * 3, s * 14);
    ctx.lineTo(-s * 4, s * 20);
    ctx.lineTo(s * 4, s * 20);
    ctx.lineTo(s * 3, s * 14);
    ctx.bezierCurveTo(s * 10, s * 18, s * 17, s * 16, s * 17, s * 10);
    ctx.bezierCurveTo(s * 17, 0, s * 6, -s * 6, 0, -s * 20);
    ctx.fill();
  } else if (suit === 'c') {
    // Club with 3 lobes and stem
    const s = size / 32;
    ctx.beginPath();
    // Top circle
    ctx.arc(0, -s * 9, s * 8, 0, Math.PI * 2);
    // Left circle
    ctx.arc(-s * 8, s * 4, s * 8, 0, Math.PI * 2);
    // Right circle
    ctx.arc(s * 8, s * 4, s * 8, 0, Math.PI * 2);
    ctx.fill();
    // Stem
    ctx.beginPath();
    ctx.moveTo(0, s * 2);
    ctx.lineTo(-s * 5, s * 20);
    ctx.lineTo(s * 5, s * 20);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Creates an HTML5 Canvas texture for a playing card.
 * Generates ultra-clean vector casino card aesthetics matching reference image.
 */
export function createCardCanvasTexture(card: Card, isBack: boolean = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1432;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Scale context to use 512x716 logical coordinates
  ctx.scale(2, 2);

  // Smooth crisp card background with round corners
  const radius = 38;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(4, 4, 504, 708, radius);
  ctx.fill();

  // Subtle clean border
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();

  if (isBack) {
    // Cozy cute paw pattern back
    ctx.fillStyle = '#f43f5e'; // vibrant rose red
    ctx.beginPath();
    ctx.roundRect(18, 18, 476, 680, 28);
    ctx.fill();

    // Inner patterned frame
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Center Big Cat Paw
    drawCatPaw(ctx, 256, 358, '#ffffff', 2.0);

    // Decorative corner paws
    drawCatPaw(ctx, 70, 70, 'rgba(255, 255, 255, 0.7)', 0.7);
    drawCatPaw(ctx, 442, 70, 'rgba(255, 255, 255, 0.7)', 0.7);
    drawCatPaw(ctx, 70, 646, 'rgba(255, 255, 255, 0.7)', 0.7);
    drawCatPaw(ctx, 442, 646, 'rgba(255, 255, 255, 0.7)', 0.7);

    return canvas;
  }

  // Front Face
  const suitColor = getSuitColor(card.suit);
  const rankDisplay = getRankDisplay(card.rank);

  // Top Left: Bold Clean Font (like reference image)
  ctx.fillStyle = suitColor;
  ctx.font = '900 68px "Arial Black", "Impact", "Montserrat", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(rankDisplay, 58, 86);
  // Top Left Suit right below rank
  drawSuitShape(ctx, card.suit, 58, 142, 42, suitColor);

  // Bottom Right: Inverted matching reference card deck standard
  ctx.save();
  ctx.translate(454, 630);
  ctx.rotate(Math.PI);
  ctx.font = '900 68px "Arial Black", "Impact", "Montserrat", sans-serif';
  ctx.fillText(rankDisplay, 0, -22);
  drawSuitShape(ctx, card.suit, 0, 36, 42, suitColor);
  ctx.restore();

  // Center Art: Giant bold suit illustration (like the large Heart in the reference card)
  const isRoyal = ['J', 'Q', 'K'].includes(card.rank);
  if (isRoyal) {
    // Royal cat face with suit accent
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(256, 358, 145, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 6;
    ctx.stroke();

    drawSuitShape(ctx, card.suit, 256, 275, 75, suitColor);

    const royalEmojis: Record<string, string> = { J: '😸', Q: '😻', K: '😼' };
    ctx.font = '110px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(royalEmojis[card.rank] || '🐱', 256, 395);
  } else {
    // For Ace and Number cards: Gorgeous giant center suit emblem (just like the big Heart in reference image)
    drawSuitShape(ctx, card.suit, 256, 358, card.rank === 'A' ? 240 : 180, suitColor);
  }

  return canvas;
}

export function drawCatPaw(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, scale: number = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;

  // Main Pad
  ctx.beginPath();
  ctx.ellipse(0, 8, 22, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4 Toe beans
  const toes = [
    { x: -20, y: -16, r: 7 },
    { x: -7, y: -24, r: 8 },
    { x: 7, y: -24, r: 8 },
    { x: 20, y: -16, r: 7 },
  ];

  for (const toe of toes) {
    ctx.beginPath();
    ctx.arc(toe.x, toe.y, toe.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Creates Chip Canvas Texture with cat paw stamp and pastel color tiers
 */
export function createChipCanvasTexture(tierColor: string, valueLabel: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Base circle
  ctx.fillStyle = tierColor;
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();

  // Outer dashed ring
  ctx.lineWidth = 10;
  ctx.setLineDash([14, 10]);
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.setLineDash([]);

  // Inner circle
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(128, 128, 70, 0, Math.PI * 2);
  ctx.fill();

  // Cat Paw Stamp
  drawCatPaw(ctx, 128, 115, tierColor, 0.7);

  // Value text
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 26px "Arial Rounded MT Bold", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(valueLabel, 128, 160);

  return canvas;
}
