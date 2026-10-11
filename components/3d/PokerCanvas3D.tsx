'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { SoftShadows } from '@react-three/drei';
import { RoomState } from '@/lib/types';
import { PokerTable3D } from './PokerTable3D';
import { Seat3D } from './Seat3D';
import { TableCamera } from './TableCamera';
import { Card3D } from './Card3D';
import { AnimatedCard } from './AnimatedCard';
import { ChipStack3D } from './Chip3D';

interface PokerCanvas3DProps {
  room: RoomState;
  mySeatIndex: number;
}

export const PokerCanvas3D: React.FC<PokerCanvas3DProps> = ({ room, mySeatIndex }) => {
  return (
    <div className="w-full h-full absolute inset-0 bg-gradient-to-b from-[#fdf2f8] via-[#fce7f3] to-[#ede9fe] overflow-hidden select-none">
      <Canvas
        shadows
        camera={{ position: [0, 2.5, 4.5], fov: 50, near: 0.5, far: 50 }}
        gl={{ antialias: true, alpha: false }}
      >
        <SoftShadows size={25} samples={10} focus={0.5} />

        {/* Ambient & Warm Pastel Lighting */}
        <ambientLight intensity={0.9} color="#fff1f2" />
        <directionalLight
          position={[4, 8, 4]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={20}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
          color="#fef3c7"
        />
        <pointLight position={[0, 4, 0]} intensity={0.8} color="#fbcfe8" />

        {/* 1st Person Perspective Seated Camera */}
        <TableCamera mySeatIndex={mySeatIndex} />

        {/* Table Felt, Rim & Engravings */}
        <PokerTable3D />

        {/* Center Community Cards (Flop, Turn, River) with Dealing Animation - Flat on table facing current player */}
        {(() => {
          // Calculate angle so cards are always facing the user's seat directly and flat on table felt
          const userSeatAngle = mySeatIndex !== -1 ? (mySeatIndex * Math.PI * 2) / 6 - Math.PI / 2 : -Math.PI / 2;
          // Perpendicular tangent vector for placing cards side-by-side relative to user's view
          const tangentX = -Math.sin(userSeatAngle);
          const tangentZ = Math.cos(userSeatAngle);

          return (
            <group position={[0, 0.08, 0]}>
              {room.communityCards.map((card, idx) => {
                const spacing = 0.76;
                const offset = (idx - 2) * spacing;
                const posX = tangentX * offset;
                const posZ = tangentZ * offset;
                const rotY = -userSeatAngle - Math.PI / 2;

                return (
                  <AnimatedCard
                    key={`${card.rank}-${card.suit}-${idx}`}
                    card={card}
                    targetPos={[posX, 0.005 * idx, posZ]}
                    targetRot={[-Math.PI / 2, 0, rotY]}
                    scale={0.92}
                    delayIndex={idx}
                  />
                );
              })}
            </group>
          );
        })()}

        {/* Center Pot Chips */}
        {room.pot > 0 && (
          <group position={[0, 0.1, -0.6]}>
            <ChipStack3D amount={room.pot} />
          </group>
        )}

        {/* 6 Seats & Cute Cat Players */}
        {room.players.map((player, idx) => (
          <Seat3D
            key={idx}
            seatIndex={idx}
            player={player}
            isCurrentTurn={room.activeTurnIndex === idx}
            isMySeat={mySeatIndex === idx}
            dealerIndex={room.dealerIndex}
          />
        ))}

        {/* Cozy Floor Plane */}
        <mesh position={[0, -1.8, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color="#fce7f3" roughness={0.9} />
        </mesh>
      </Canvas>
    </div>
  );
};
export default PokerCanvas3D;
