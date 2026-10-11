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
  return suit === 'h' || suit === 'd' ? '#ef4444' : '#1e293b';
}

export function getRankDisplay(rank: Rank): string {
  if (rank === 'T') return '10';
  return rank;
}

const CAT_FACES: Record<string, string> = {
  J: '😸', // Grinning Cat
  Q: '😻', // Heart Eyes Cat
  K: '😼', // Smirking Cat King
  A: '😽', // Kissing Angel Cat
};

/**
 * Creates an HTML5 Canvas texture for a playing card.
 * Generates high-res cute pastel cartoon styling with cat drawings on royal cards.
 */
export function createCardCanvasTexture(card: Card, isBack: boolean = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 716;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background
  const radius = 32;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(4, 4, 504, 708, radius);
  ctx.fill();

  // Subtle pastel border
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#fbcfe8'; // soft pink border
  ctx.stroke();

  if (isBack) {
    // Cozy cute paw pattern back
    ctx.fillStyle = '#ec4899'; // Cozy strawberry pink
    ctx.beginPath();
    ctx.roundRect(16, 16, 480, 684, 24);
    ctx.fill();

    // Inner patterned frame
    ctx.strokeStyle = '#fdf2f8';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Center Big Cat Paw
    drawCatPaw(ctx, 256, 358, '#fdf2f8', 1.8);

    // Decorative corner paws
    drawCatPaw(ctx, 60, 60, '#fbcfe8', 0.6);
    drawCatPaw(ctx, 452, 60, '#fbcfe8', 0.6);
    drawCatPaw(ctx, 60, 656, '#fbcfe8', 0.6);
    drawCatPaw(ctx, 452, 656, '#fbcfe8', 0.6);

    return canvas;
  }

  // Front Face
  const suitColor = getSuitColor(card.suit);
  const suitSymbol = getSuitSymbol(card.suit);
  const rankDisplay = getRankDisplay(card.rank);

  // Top Left Rank & Suit
  ctx.fillStyle = suitColor;
  ctx.font = 'bold 54px "Arial Rounded MT Bold", "Nunito", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(rankDisplay, 28, 64);
  ctx.font = '48px serif';
  ctx.fillText(suitSymbol, 30, 115);

  // Bottom Right Rank & Suit (Inverted)
  ctx.save();
  ctx.translate(484, 652);
  ctx.rotate(Math.PI);
  ctx.font = 'bold 54px "Arial Rounded MT Bold", "Nunito", sans-serif';
  ctx.fillText(rankDisplay, 0, 0);
  ctx.font = '48px serif';
  ctx.fillText(suitSymbol, 2, 50);
  ctx.restore();

  // Center Art
  const isRoyal = ['J', 'Q', 'K', 'A'].includes(card.rank);
  if (isRoyal) {
    // Cute Cat Character inside pastel circle
    ctx.fillStyle = '#fff1f2';
    ctx.beginPath();
    ctx.arc(256, 358, 140, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 4;
    ctx.stroke();

    const catEmoji = CAT_FACES[card.rank] || '🐱';
    ctx.font = '130px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(catEmoji, 256, 350);

    ctx.fillStyle = suitColor;
    ctx.font = '36px "Arial Rounded MT Bold", sans-serif';
    ctx.fillText(`${rankDisplay} ${suitSymbol}`, 256, 460);
  } else {
    // Number Card: Center suit with mini cat paw inside
    ctx.fillStyle = suitColor;
    ctx.font = '160px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(suitSymbol, 256, 358);

    // Cute decorative paw watermark
    drawCatPaw(ctx, 256, 358, 'rgba(255, 255, 255, 0.45)', 1.0);
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
