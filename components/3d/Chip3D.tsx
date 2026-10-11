'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createChipCanvasTexture } from '@/lib/canvas-textures';

interface Chip3DProps {
  amount: number;
  position?: [number, number, number];
}

// Pastel Chip Tiers
const CHIP_TIERS = [
  { value: 500, color: '#f472b6', label: '500' }, // Pastel Rose
  { value: 100, color: '#38bdf8', label: '100' }, // Soft Sky Blue
  { value: 50, color: '#a78bfa', label: '50' },   // Soft Purple
  { value: 20, color: '#4ade80', label: '20' },   // Mint Green
  { value: 10, color: '#fbbf24', label: '10' },   // Butter Yellow
  { value: 5, color: '#fb923c', label: '5' },     // Peach Orange
  { value: 1, color: '#e2e8f0', label: '1' },     // Warm Cream
];

export const ChipStack3D: React.FC<Chip3DProps> = ({ amount, position = [0, 0, 0] }) => {
  if (amount <= 0) return null;

  // Breakdown chips into max 8 visual chips to keep stack clean and low-poly
  const chipsToRender = useMemo(() => {
    let rem = amount;
    const chips: { color: string; label: string }[] = [];

    for (const tier of CHIP_TIERS) {
      while (rem >= tier.value && chips.length < 8) {
        chips.push({ color: tier.color, label: tier.label });
        rem -= tier.value;
      }
    }

    if (chips.length === 0 && amount > 0) {
      chips.push({ color: '#fbbf24', label: `${amount}` });
    }

    return chips;
  }, [amount]);

  return (
    <group position={position}>
      {chipsToRender.map((chip, idx) => (
        <SingleChip key={idx} color={chip.color} label={chip.label} index={idx} />
      ))}
    </group>
  );
};

const SingleChip: React.FC<{ color: string; label: string; index: number }> = ({ color, label, index }) => {
  const texture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = createChipCanvasTexture(color, label);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [color, label]);

  const materials = useMemo(() => {
    const sideMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3,
      metalness: 0.1,
    });
    const capMat = new THREE.MeshStandardMaterial({
      map: texture || undefined,
      roughness: 0.3,
      metalness: 0.1,
    });
    return [sideMat, capMat, capMat];
  }, [color, texture]);

  const chipHeight = 0.04;
  const y = index * (chipHeight + 0.005) + chipHeight / 2;
  const subtleJitterX = (Math.sin(index * 7) * 0.01);
  const subtleJitterZ = (Math.cos(index * 11) * 0.01);

  return (
    <mesh
      position={[subtleJitterX, y, subtleJitterZ]}
      rotation={[0, index * 0.4, 0]}
      castShadow
      receiveShadow
      material={materials}
    >
      <cylinderGeometry args={[0.22, 0.22, chipHeight, 24]} />
    </mesh>
  );
};
