'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Player } from '@/lib/types';
import { Card3D } from './Card3D';
import { AnimatedCard } from './AnimatedCard';
import { ChipStack3D } from './Chip3D';

interface Seat3DProps {
  seatIndex: number; // 0 to 5
  player: Player | null;
  isCurrentTurn: boolean;
  isMySeat: boolean;
  dealerIndex: number;
}

const CAT_COLORS = [
  '#fbcfe8', // Pink
  '#fed7aa', // Orange
  '#fef08a', // Yellow
  '#bbf7d0', // Green
  '#bae6fd', // Blue
  '#e9d5ff', // Purple
];

/**
 * Creates pure 3D Canvas Texture for player badge (No React DOM / Html portal unmount issues)
 */
function createPlayerBadgeTexture(
  player: Player | null,
  seatIndex: number,
  isCurrentTurn: boolean
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 512, 256);

  if (player) {
    // Background pill badge
    ctx.fillStyle = player.hasFolded ? 'rgba(30, 41, 59, 0.85)' : isCurrentTurn ? 'rgba(190, 24, 93, 0.95)' : 'rgba(255, 255, 255, 0.92)';
    ctx.beginPath();
    ctx.roundRect(32, 32, 448, 192, 40);
    ctx.fill();

    // Border
    ctx.strokeStyle = isCurrentTurn ? '#f472b6' : player.hasFolded ? '#64748b' : '#fbcfe8';
    ctx.lineWidth = isCurrentTurn ? 12 : 6;
    ctx.stroke();

    // Player Name
    ctx.fillStyle = isCurrentTurn || player.hasFolded ? '#ffffff' : '#1e293b';
    ctx.font = 'bold 44px "Arial Rounded MT Bold", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.name, 256, 88);

    // Chips
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 36px "Arial Rounded MT Bold", sans-serif';
    ctx.fillText(`🪙 ${player.chips}`, 256, 145);

    // Last Action or Thinking
    if (isCurrentTurn) {
      ctx.fillStyle = '#fdf2f8';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('Thinking... 🐾', 256, 195);
    } else if (player.lastAction) {
      ctx.fillStyle = player.hasFolded ? '#94a3b8' : '#ec4899';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(player.lastAction, 256, 195);
    }
  } else {
    // Empty seat pill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.roundRect(96, 72, 320, 112, 32);
    ctx.fill();

    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 6;
    ctx.setLineDash([12, 8]);
    ctx.stroke();

    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 36px "Arial Rounded MT Bold", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Seat ${seatIndex + 1}`, 256, 128);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const Seat3D: React.FC<Seat3DProps> = ({
  seatIndex,
  player,
  isCurrentTurn,
  isMySeat,
  dealerIndex,
}) => {
  // Table radius 3.2. Seat position at radius 3.6 around table
  const angle = (seatIndex * Math.PI * 2) / 6 - Math.PI / 2;
  const radius = 3.6;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  // Cat color
  const catColor = CAT_COLORS[seatIndex % CAT_COLORS.length];

  // Chip bet placement closer to table center (radius 2.2)
  const betRadius = 2.2;
  const betX = Math.cos(angle) * betRadius;
  const betZ = Math.sin(angle) * betRadius;

  // Opponent cards position slightly on the table felt (radius 2.7)
  const cardRadius = 2.7;
  const cardX = Math.cos(angle) * cardRadius;
  const cardZ = Math.sin(angle) * cardRadius;
  const cardRotationY = -angle - Math.PI / 2;

  const isDealer = dealerIndex === seatIndex;

  // Dealer puck texture
  const dealerTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(128, 128, 124, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 50px "Arial Rounded MT Bold", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DEALER', 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  // Pure 3D Canvas Badge Texture
  const badgeTexture = useMemo(() => {
    if (typeof window === 'undefined' || isMySeat) return null;
    return createPlayerBadgeTexture(player, seatIndex, isCurrentTurn);
  }, [player?.name, player?.chips, player?.lastAction, player?.hasFolded, isCurrentTurn, isMySeat, seatIndex]);

  return (
    <group>
      {/* Cute Wooden Chair with Pastel Cushion (Don't render the chair user is sitting on) */}
      {!isMySeat && (
        <group position={[x, -0.4, z]} rotation={[0, -angle - Math.PI / 2, 0]}>
          {/* Chair Seat */}
          <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.55, 0.55, 0.1, 24]} />
            <meshStandardMaterial color={catColor} roughness={0.5} />
          </mesh>
          {/* Chair Legs */}
          <mesh position={[-0.3, 0.2, -0.3]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.4, 12]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </mesh>
          <mesh position={[0.3, 0.2, -0.3]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.4, 12]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </mesh>
          <mesh position={[-0.3, 0.2, 0.3]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.4, 12]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </mesh>
          <mesh position={[0.3, 0.2, 0.3]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.4, 12]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </mesh>
          {/* Cat-eared Chair Back */}
          <group position={[0, 0.8, -0.45]}>
            <mesh castShadow>
              <boxGeometry args={[0.7, 0.7, 0.08]} />
              <meshStandardMaterial color={catColor} roughness={0.5} />
            </mesh>
            {/* Left Cat Ear */}
            <mesh position={[-0.22, 0.42, 0]} rotation={[0, 0, 0.2]} castShadow>
              <coneGeometry args={[0.14, 0.25, 3]} />
              <meshStandardMaterial color={catColor} roughness={0.5} />
            </mesh>
            {/* Right Cat Ear */}
            <mesh position={[0.22, 0.42, 0]} rotation={[0, 0, -0.2]} castShadow>
              <coneGeometry args={[0.14, 0.25, 3]} />
              <meshStandardMaterial color={catColor} roughness={0.5} />
            </mesh>
          </group>
        </group>
      )}

      {/* 3D Cat Character Model sitting at chair facing inwards to the table center */}
      {player && !isMySeat && (
        <group position={[x, 0.45, z]} rotation={[0, -angle - Math.PI / 2, 0]}>
          {/* Cat Body */}
          <mesh position={[0, 0, 0]} castShadow>
            <sphereGeometry args={[0.42, 24, 24]} />
            <meshStandardMaterial color={catColor} roughness={0.4} />
          </mesh>
          {/* Cat Head */}
          <group position={[0, 0.55, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.34, 24, 24]} />
              <meshStandardMaterial color={catColor} roughness={0.4} />
            </mesh>
            {/* Cute Ears */}
            <mesh position={[-0.2, 0.3, 0]} rotation={[0, 0, 0.3]} castShadow>
              <coneGeometry args={[0.14, 0.25, 4]} />
              <meshStandardMaterial color="#f472b6" roughness={0.4} />
            </mesh>
            <mesh position={[0.2, 0.3, 0]} rotation={[0, 0, -0.3]} castShadow>
              <coneGeometry args={[0.14, 0.25, 4]} />
              <meshStandardMaterial color="#f472b6" roughness={0.4} />
            </mesh>
            {/* Eyes (facing +Z in local space towards table) */}
            <mesh position={[-0.1, 0.05, 0.3]}>
              <sphereGeometry args={[0.04, 12, 12]} />
              <meshBasicMaterial color="#1e293b" />
            </mesh>
            <mesh position={[0.1, 0.05, 0.3]}>
              <sphereGeometry args={[0.04, 12, 12]} />
              <meshBasicMaterial color="#1e293b" />
            </mesh>
            {/* Cute Nose */}
            <mesh position={[0, -0.02, 0.33]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.03, 0.03, 3]} />
              <meshBasicMaterial color="#f43f5e" />
            </mesh>
          </group>
        </group>
      )}

      {/* Current Bet Chips on Table */}
      {player && player.currentBet > 0 && (
        <group position={[betX, 0.1, betZ]}>
          <ChipStack3D amount={player.currentBet} />
        </group>
      )}

      {/* Dealer Button with Pure Texture */}
      {isDealer && (
        <mesh position={[betX * 0.85 + 0.3, 0.1, betZ * 0.85]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.06, 24]} />
          <meshStandardMaterial
            map={dealerTexture || undefined}
            color={dealerTexture ? '#ffffff' : '#f43f5e'}
            roughness={0.2}
            metalness={0.1}
          />
        </mesh>
      )}

      {/* Opponent's Cards on Table with Dealing Animation (Hidden or Revealed) */}
      {player && !isMySeat && player.cards && player.cards.length > 0 && !player.hasFolded && (
        <group position={[cardX, 0.1, cardZ]} rotation={[-Math.PI / 2, 0, cardRotationY]}>
          <group position={[-0.2, 0, 0]} rotation={[0, 0, -0.1]}>
            <AnimatedCard
              card={player.cards[0]}
              isFaceDown={!player.cards[0]?.rank || (player.cards[0] as any).rank === '?'}
              scale={0.65}
              targetPos={[0, 0, 0]}
              targetRot={[0, 0, 0]}
              delayIndex={seatIndex * 0.2}
            />
          </group>
          <group position={[0.2, 0, 0.01]} rotation={[0, 0, 0.1]}>
            <AnimatedCard
              card={player.cards[1]}
              isFaceDown={!player.cards[1]?.rank || (player.cards[1] as any).rank === '?'}
              scale={0.65}
              targetPos={[0, 0, 0]}
              targetRot={[0, 0, 0]}
              delayIndex={seatIndex * 0.2 + 0.1}
            />
          </group>
        </group>
      )}

      {/* Floating 3D Cat Status Badge - Pure Three.js Plane with Texture (No DOM nodes, completely fixes removeChild & unmount race condition) */}
      {!isMySeat && badgeTexture && (
        <mesh
          position={[x, 1.8, z]}
          rotation={[0, -angle - Math.PI / 2, 0]}
          scale={isCurrentTurn ? [1.1, 1.1, 1.1] : [1, 1, 1]}
        >
          <planeGeometry args={[1.4, 0.7]} />
          <meshBasicMaterial map={badgeTexture} transparent depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};
