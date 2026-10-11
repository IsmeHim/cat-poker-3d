'use client';

import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TableCameraProps {
  mySeatIndex: number; // 0 to 5, or -1 for spectator
}

export const TableCamera: React.FC<TableCameraProps> = ({ mySeatIndex }) => {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

  // Compute camera position based on seat
  // Seats are at radius 3.6. Camera should be at player eye height (y = 1.6), slightly pulled back (radius ~3.8)
  const seatAngle = mySeatIndex !== -1 ? (mySeatIndex * Math.PI * 2) / 6 - Math.PI / 2 : -Math.PI / 2;
  const cameraDistance = mySeatIndex !== -1 ? 3.8 : 5.8;
  const cameraHeight = mySeatIndex !== -1 ? 1.7 : 3.4;

  const targetCamX = Math.cos(seatAngle) * cameraDistance;
  const targetCamZ = Math.sin(seatAngle) * cameraDistance;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Gentle orbit/swivel based on cursor (-1 to 1 normalized)
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((_, delta) => {
    // Smooth camera position interpolation
    camera.position.lerp(new THREE.Vector3(targetCamX, cameraHeight, targetCamZ), 4 * delta);

    // Look towards center table, with gentle mouse swivel to glance at neighboring seats
    const swivelX = mouse.current.x * 0.9;
    const swivelY = mouse.current.y * 0.4;

    targetLookAt.current.set(swivelX, swivelY, 0);
    currentLookAt.current.lerp(targetLookAt.current, 5 * delta);

    camera.lookAt(currentLookAt.current);
  });

  return null;
};
