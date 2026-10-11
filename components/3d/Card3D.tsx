'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Card as CardType } from '@/lib/types';
import { createCardCanvasTexture } from '@/lib/canvas-textures';

interface Card3DProps {
  card?: CardType;
  isFaceDown?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export const Card3D: React.FC<Card3DProps> = ({
  card,
  isFaceDown = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) => {
  const frontTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const dummyCard: CardType = card || { rank: 'A', suit: 's' };
    const canvas = createCardCanvasTexture(dummyCard, false);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [card?.rank, card?.suit]);

  const backTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = createCardCanvasTexture({ rank: 'A', suit: 's' }, true);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  // Card dimensions: width 0.7, height 1.0, depth 0.015
  const materials = useMemo(() => {
    const edgeMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.4 });
    const frontMat = new THREE.MeshStandardMaterial({
      map: frontTexture || undefined,
      roughness: 0.3,
      metalness: 0.05,
    });
    const backMat = new THREE.MeshStandardMaterial({
      map: backTexture || undefined,
      roughness: 0.3,
      metalness: 0.05,
    });

    // BoxGeometry material array: [right, left, top, bottom, front, back]
    // Here front is +Z and back is -Z
    return [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat];
  }, [frontTexture, backTexture]);

  // If face down, rotate 180 deg around Y or X
  const effectiveRotation: [number, number, number] = isFaceDown
    ? [rotation[0] + Math.PI, rotation[1], rotation[2]]
    : rotation;

  return (
    <group position={position} rotation={effectiveRotation} scale={scale}>
      <mesh castShadow receiveShadow material={materials}>
        <boxGeometry args={[0.7, 0.98, 0.01]} />
      </mesh>
    </group>
  );
};
