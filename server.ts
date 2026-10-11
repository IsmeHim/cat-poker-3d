import { createServer } from 'http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { PokerRoom } from './server/poker-room';
import { ClientToServerEvents, ServerToClientEvents } from './lib/types';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory room manager
const rooms = new Map<string, PokerRoom>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    let currentRoomCode: string | null = null;
    let currentPlayerId: string | null = null;

    socket.on('join-room', ({ roomCode, playerName, seatIndex, playerId }, callback) => {
      const code = (roomCode || generateRoomCode()).toUpperCase();
      let room = rooms.get(code);

      if (!room) {
        room = new PokerRoom(code, io);
        rooms.set(code, room);
        console.log(`[Room] Created new room: ${code}`);
      }

      currentRoomCode = code;
      const pid = playerId || socket.id;
      currentPlayerId = pid;

      socket.join(code);

      const result = room.addPlayer(socket.id, pid, playerName, seatIndex);

      if (callback) {
        if (result.success) {
          callback({
            success: true,
            room: room.getSanitizedState(pid, false),
            seatIndex,
            playerId: pid,
          });
        } else {
          callback({
            success: false,
            message: result.message,
          });
        }
      }
    });

    socket.on('reconnect-player', ({ roomCode, playerId }, callback) => {
      const code = roomCode.toUpperCase();
      const room = rooms.get(code);

      if (!room) {
        if (callback) callback({ success: false, message: 'Room not found' });
        return;
      }

      const player = room.getPlayerById(playerId);
      if (!player) {
        if (callback) callback({ success: false, message: 'Player seat expired' });
        return;
      }

      currentRoomCode = code;
      currentPlayerId = playerId;
      socket.join(code);

      const success = room.reconnectPlayer(socket.id, playerId);
      if (callback) {
        callback({
          success,
          room: room.getSanitizedState(playerId, false),
          seatIndex: player.seatIndex,
        });
      }
    });

    socket.on('start-game', () => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (room && room.state.stage === 'idle') {
        room.startNewHand();
      }
    });

    socket.on('player-action', (action) => {
      if (!currentRoomCode || !currentPlayerId) return;
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.handlePlayerAction(currentPlayerId, action.type, action.amount);
      }
    });

    socket.on('send-chat', ({ message }) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (room && currentPlayerId) {
        const player = room.getPlayerById(currentPlayerId);
        const name = player ? player.name : 'Spectator';
        io.to(currentRoomCode).emit('chat-message', {
          sender: name,
          message: message.slice(0, 100),
          timestamp: Date.now(),
        });
      }
    });

    socket.on('leave-room', () => {
      if (currentRoomCode && currentPlayerId) {
        const room = rooms.get(currentRoomCode);
        if (room) {
          room.removePlayer(currentPlayerId);
        }
        socket.leave(currentRoomCode);
      }
      currentRoomCode = null;
      currentPlayerId = null;
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      if (currentRoomCode) {
        const room = rooms.get(currentRoomCode);
        if (room) {
          room.handleDisconnect(socket.id);
        }
      }
    });
  });

  server.listen(port, () => {
    console.log(`> 🐾 Cat Poker 3D server ready on http://${hostname}:${port}`);
  });
});
