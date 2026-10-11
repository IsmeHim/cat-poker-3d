'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { usePokerSocket } from '@/hooks/use-poker-socket';
import { Lobby } from '@/components/ui/Lobby';
import { PokerHUD } from '@/components/ui/PokerHUD';

// Strictly client-side dynamic import for Three.js / React-Three-Fiber to prevent SSR hydration mismatches
const PokerCanvas3D = dynamic(() => import('@/components/3d/PokerCanvas3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-pink-100 text-pink-600 font-black text-lg animate-pulse">
      Loading Cat Poker 3D Table... 🐾
    </div>
  ),
});

export default function GamePage() {
  const {
    connected,
    room,
    mySeatIndex,
    myPlayerId,
    timer,
    chatMessages,
    joinRoom,
    leaveRoom,
    startGame,
    sendAction,
    sendChatMessage,
  } = usePokerSocket();

  // If player has not joined a room yet, render Lobby
  if (!room) {
    return <Lobby onJoin={joinRoom} connected={connected} />;
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-pink-100">
      {/* 3D Canvas Background & Seated Table */}
      <PokerCanvas3D room={room} mySeatIndex={mySeatIndex} />

      {/* Floating UI HUD Overlay */}
      <PokerHUD
        room={room}
        mySeatIndex={mySeatIndex}
        myPlayerId={myPlayerId}
        timer={timer}
        chatMessages={chatMessages}
        onAction={sendAction}
        onStartGame={startGame}
        onLeaveRoom={leaveRoom}
        onSendChat={sendChatMessage}
      />
    </main>
  );
}
