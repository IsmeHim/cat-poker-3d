'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Card as CardType } from '@/lib/types';
import { Card3D } from './Card3D';

interface AnimatedCardProps {
  card: CardType;
  targetPos: [number, number, number];
  targetRot: [number, number, number];
  isFaceDown?: boolean;
  scale?: number;
  delayIndex?: number;
}

/**
 * AnimatedCard: glides smoothly from dealer shoe / center deck with a slight flip
 */
export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  card,
  targetPos,
  targetRot,
  isFaceDown = false,
  scale = 1,
  delayIndex = 0,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  // Start origin: center dealer position higher up
  const startPos = useRef(new THREE.Vector3(0, 1.2, -0.6));
  const startTimeRef = useRef<number | null>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.getElapsedTime() + delayIndex * 0.15;
    }

    const elapsed = state.clock.getElapsedTime();
    if (elapsed < startTimeRef.current) {
      // Haven't started yet, position at dealer spawn hidden/small
      groupRef.current.position.copy(startPos.current);
      groupRef.current.scale.setScalar(0.01);
      return;
    }

    progressRef.current = Math.min(1, progressRef.current + delta * 1.6);
    // Smooth easeOutCubic
    const t = 1 - Math.pow(1 - progressRef.current, 3);

    // Position interpolation with an arc
    const currX = THREE.MathUtils.lerp(startPos.current.x, targetPos[0], t);
    const currZ = THREE.MathUtils.lerp(startPos.current.z, targetPos[2], t);
    const arcHeight = Math.sin(t * Math.PI) * 0.35;
    const currY = THREE.MathUtils.lerp(startPos.current.y, targetPos[1], t) + arcHeight;

    groupRef.current.position.set(currX, currY, currZ);

    // Rotation interpolation
    const rotX = THREE.MathUtils.lerp(0, targetRot[0], t);
    const rotY = THREE.MathUtils.lerp(Math.PI, targetRot[1], t);
    const rotZ = THREE.MathUtils.lerp(0, targetRot[2], t);
    groupRef.current.rotation.set(rotX, rotY, rotZ);

    // Scale back up to target
    const currScale = THREE.MathUtils.lerp(0.5, scale, t);
    groupRef.current.scale.setScalar(currScale);
  });

  return (
    <group ref={groupRef}>
      <Card3D card={card} isFaceDown={isFaceDown} scale={1} />
    </group>
  );
};
