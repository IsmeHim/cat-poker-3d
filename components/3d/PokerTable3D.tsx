'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { drawCatPaw } from '@/lib/canvas-textures';

export const PokerTable3D: React.FC = () => {
  // Felt canvas texture with cat paw watermark
  const feltTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Pastel Mint Green Felt Background
    ctx.fillStyle = '#6ee7b7'; // Mint green
    ctx.fillRect(0, 0, 1024, 1024);

    // Inner ring
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(512, 512, 420, 0, Math.PI * 2);
    ctx.stroke();

    // Center Big Cat Paw
    drawCatPaw(ctx, 512, 512, 'rgba(255, 255, 255, 0.35)', 4.0);

    // 6 Engraved Cat Paws around the table perimeter
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const x = 512 + Math.cos(angle) * 320;
      const y = 512 + Math.sin(angle) * 320;
      drawCatPaw(ctx, x, y, 'rgba(255, 255, 255, 0.4)', 1.5);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <group position={[0, 0, 0]}>
      {/* Table Top Felt (Mint Green) */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[3.2, 3.2, 0.15, 48]} />
        <meshStandardMaterial
          map={feltTexture || undefined}
          color={feltTexture ? '#ffffff' : '#6ee7b7'}
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>

      {/* Table Outer Padded Armrest (Soft Warm Oak Wood / Pastel Peach) */}
      <mesh position={[0, 0.04, 0]} receiveShadow castShadow>
        <torusGeometry args={[3.3, 0.22, 16, 48]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Table Base / Pedestal (Warm Wood) */}
      <mesh position={[0, -0.9, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.2, 1.8, 1.6, 32]} />
        <meshStandardMaterial color="#b45309" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Decorative center ring */}
      <mesh position={[0, 0.08, 0]}>
        <ringGeometry args={[0.9, 0.94, 32]} />
        <meshBasicMaterial color="#a7f3d0" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
