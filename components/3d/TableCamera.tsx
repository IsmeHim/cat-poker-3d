'use client';

import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TableCameraProps {
  mySeatIndex: number; // 0 to 5, or -1 for spectator
}

export const TableCamera: React.FC<TableCameraProps> = ({ mySeatIndex }) => {
  const { camera } = useThree();
  const yawOffset = useRef(0); // in radians
  const pitchOffset = useRef(0); // in radians
  const isDragging = useRef(false);
  const lastTouch = useRef({ x: 0, y: 0 });

  // Compute camera position based on seat
  // Seats are at radius 3.6. Camera positioned at player's seat eye level
  const seatAngle = mySeatIndex !== -1 ? (mySeatIndex * Math.PI * 2) / 6 - Math.PI / 2 : -Math.PI / 2;
  const cameraDistance = mySeatIndex !== -1 ? 3.8 : 5.8;
  const cameraHeight = mySeatIndex !== -1 ? 1.7 : 3.4;

  const targetCamX = Math.cos(seatAngle) * cameraDistance;
  const targetCamZ = Math.sin(seatAngle) * cameraDistance;

  // Base forward direction is towards table center (0, 0, 0) from camera position
  const baseLookAngle = seatAngle + Math.PI;

  useEffect(() => {
    // 1. Mouse drag or move controls
    const handleMouseDown = (e: MouseEvent) => {
      // Allow dragging anywhere on 3D canvas
      if ((e.target as HTMLElement)?.tagName === 'CANVAS') {
        isDragging.current = true;
        lastTouch.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        const dx = e.clientX - lastTouch.current.x;
        const dy = e.clientY - lastTouch.current.y;
        lastTouch.current = { x: e.clientX, y: e.clientY };

        // Swivel yaw by drag (allow ~110 degrees left and right so you can clearly see adjacent neighbors)
        yawOffset.current = THREE.MathUtils.clamp(yawOffset.current - dx * 0.005, -1.9, 1.9);
        pitchOffset.current = THREE.MathUtils.clamp(pitchOffset.current - dy * 0.003, -0.6, 0.6);
      } else {
        // Subtle cursor glance when hovering without drag
        const normalizedX = (e.clientX / window.innerWidth) * 2 - 1;
        const normalizedY = -(e.clientY / window.innerHeight) * 2 + 1;
        // Blend with current yaw offset
        if (Math.abs(yawOffset.current) < 0.01) {
          yawOffset.current = normalizedX * 0.6;
          pitchOffset.current = normalizedY * 0.25;
        }
      }
    };

    // 2. Mobile & Tablet Touch drag controls
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1 && (e.target as HTMLElement)?.tagName === 'CANVAS') {
        isDragging.current = true;
        lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchEnd = () => {
      isDragging.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      yawOffset.current = THREE.MathUtils.clamp(yawOffset.current - dx * 0.006, -1.9, 1.9);
      pitchOffset.current = THREE.MathUtils.clamp(pitchOffset.current - dy * 0.004, -0.6, 0.6);
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  useFrame((_, delta) => {
    // Smooth camera position interpolation
    camera.position.lerp(new THREE.Vector3(targetCamX, cameraHeight, targetCamZ), 4 * delta);

    // Compute lookAt target point using spherical coordinates from camera eye
    const totalYaw = baseLookAngle + yawOffset.current;
    const totalPitch = pitchOffset.current - 0.22; // slight downward gaze towards table felt

    const lookDistance = 4.0;
    const lookX = targetCamX + Math.cos(totalYaw) * Math.cos(totalPitch) * lookDistance;
    const lookY = cameraHeight + Math.sin(totalPitch) * lookDistance;
    const lookZ = targetCamZ + Math.sin(totalYaw) * Math.cos(totalPitch) * lookDistance;

    camera.lookAt(lookX, lookY, lookZ);
  });

  return null;
};
