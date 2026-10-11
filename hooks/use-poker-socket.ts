'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { RoomState, ClientToServerEvents, ServerToClientEvents, PlayerActionType } from '@/lib/types';

export interface UsePokerSocketReturn {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  connected: boolean;
  room: RoomState | null;
  mySeatIndex: number;
  myPlayerId: string;
  myPlayer: any;
  timer: number;
  chatMessages: { sender: string; message: string; timestamp: number }[];
  joinRoom: (roomCode: string, playerName: string, seatIndex: number) => Promise<boolean>;
  leaveRoom: () => void;
  startGame: () => void;
  sendAction: (type: PlayerActionType, amount?: number) => void;
  sendChatMessage: (message: string) => void;
}

const LOCAL_STORAGE_KEY_PLAYER_ID = 'cat_poker_player_id';
const LOCAL_STORAGE_KEY_ROOM_CODE = 'cat_poker_room_code';
const LOCAL_STORAGE_KEY_NAME = 'cat_poker_player_name';

export function usePokerSocket(): UsePokerSocketReturn {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [mySeatIndex, setMySeatIndex] = useState<number>(-1);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [timer, setTimer] = useState<number>(20);
  const [chatMessages, setChatMessages] = useState<{ sender: string; message: string; timestamp: number }[]>([]);

  // Persistent Player ID
  useEffect(() => {
    let pid = localStorage.getItem(LOCAL_STORAGE_KEY_PLAYER_ID);
    if (!pid) {
      pid = 'cat_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem(LOCAL_STORAGE_KEY_PLAYER_ID, pid);
    }
    setMyPlayerId(pid);
  }, []);

  useEffect(() => {
    if (!myPlayerId) return;

    // If NEXT_PUBLIC_SOCKET_URL is set (e.g. deployed backend on Render/Railway), connect there.
    // Otherwise connect to the current origin (local dev or unified server).
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;

    const s: Socket<ServerToClientEvents, ClientToServerEvents> = io(socketUrl as any, {
      autoConnect: true,
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    s.on('connect_error', (err) => {
      console.warn('Socket connect error:', err.message);
    });

    s.on('connect', () => {
      setConnected(true);
      console.log('Socket connected:', s.id);

      // Attempt reconnection if saved room exists
      const savedRoom = localStorage.getItem(LOCAL_STORAGE_KEY_ROOM_CODE);
      if (savedRoom) {
        s.emit('reconnect-player', { roomCode: savedRoom, playerId: myPlayerId }, (res) => {
          if (res.success && res.room) {
            setRoom(res.room);
            if (res.seatIndex !== undefined) setMySeatIndex(res.seatIndex);
          } else {
            localStorage.removeItem(LOCAL_STORAGE_KEY_ROOM_CODE);
          }
        });
      }
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    s.on('room-updated', (updatedRoom: RoomState) => {
      setRoom(updatedRoom);
      // Find my seat index from updated room
      const mySeat = updatedRoom.players.findIndex((p) => p?.id === myPlayerId);
      if (mySeat !== -1) {
        setMySeatIndex(mySeat);
      }
    });

    s.on('timer-tick', (remaining: number) => {
      setTimer(remaining);
    });

    s.on('chat-message', (chat) => {
      setChatMessages((prev) => [...prev.slice(-49), chat]);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [myPlayerId]);

  const joinRoom = useCallback(
    async (roomCode: string, playerName: string, seatIndex: number): Promise<boolean> => {
      if (!socket || !connected) return false;

      return new Promise((resolve) => {
        socket.emit(
          'join-room',
          { roomCode, playerName, seatIndex, playerId: myPlayerId },
          (response) => {
            if (response.success && response.room) {
              setRoom(response.room);
              setMySeatIndex(response.seatIndex ?? seatIndex);
              localStorage.setItem(LOCAL_STORAGE_KEY_ROOM_CODE, response.room.roomCode);
              localStorage.setItem(LOCAL_STORAGE_KEY_NAME, playerName);
              resolve(true);
            } else {
              alert(response.message || 'Failed to join seat');
              resolve(false);
            }
          }
        );
      });
    },
    [socket, connected, myPlayerId]
  );

  const leaveRoom = useCallback(() => {
    if (socket) {
      socket.emit('leave-room');
      localStorage.removeItem(LOCAL_STORAGE_KEY_ROOM_CODE);
      setRoom(null);
      setMySeatIndex(-1);
    }
  }, [socket]);

  const startGame = useCallback(() => {
    if (socket) {
      socket.emit('start-game');
    }
  }, [socket]);

  const sendAction = useCallback(
    (type: PlayerActionType, amount?: number) => {
      if (socket) {
        socket.emit('player-action', { type, amount });
      }
    },
    [socket]
  );

  const sendChatMessage = useCallback(
    (message: string) => {
      if (socket && message.trim()) {
        socket.emit('send-chat', { message });
      }
    },
    [socket]
  );

  const myPlayer = mySeatIndex !== -1 && room ? room.players[mySeatIndex] : null;

  return {
    socket,
    connected,
    room,
    mySeatIndex,
    myPlayerId,
    myPlayer,
    timer,
    chatMessages,
    joinRoom,
    leaveRoom,
    startGame,
    sendAction,
    sendChatMessage,
  };
}
