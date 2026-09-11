import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';

import { EndedRoom } from '../models/EndedRoom';
import { getJwtSecret } from '../middleware/auth';

let io: SocketIOServer | null = null;
const userSocketMap = new Map<string, string[]>(); // userId -> socketId[]

const roomWhiteboardMap = new Map<string, any[]>();
const roomNotesMap = new Map<string, string>();
const endedRoomsSet = new Set<string>();

export const initSocketIO = (httpServer: HTTPServer) => {
  const defaultOrigins = [
    'https://sih26044-ayush-portal.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'https://sih26044-ayush-portal-production.up.railway.app',
  ];

  const envOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, ''))
    : [];

  const frontendUrlOrigin = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL.trim().replace(/\/+$/, '')]
    : [];

  const allowedOrigins = Array.from(
    new Set([...defaultOrigins, ...envOrigins, ...frontendUrlOrigin])
  ).filter(Boolean);

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const normalizedOrigin = origin.replace(/\/+$/, '');
        const isProd = process.env.NODE_ENV === 'production';

        const isOfficialVercelDeployment =
          normalizedOrigin === 'https://sih26044-ayush-portal.vercel.app' ||
          /^https:\/\/sih26044-ayush-portal(-[a-zA-Z0-9_-]+)?\.vercel\.app$/.test(normalizedOrigin);

        const isOfficialRailwayDeployment =
          normalizedOrigin === 'https://sih26044-ayush-portal-production.up.railway.app' ||
          /^https:\/\/sih26044-ayush-portal(-[a-zA-Z0-9_-]+)?\.up\.railway\.app$/.test(normalizedOrigin);

        if (
          allowedOrigins.includes(normalizedOrigin) ||
          isOfficialVercelDeployment ||
          isOfficialRailwayDeployment ||
          !isProd
        ) {
          callback(null, true);
        } else {
          callback(new Error(`Socket CORS blocked for origin: ${origin}`));
        }
      },
      methods: ['GET', 'POST', 'PATCH'],
      credentials: true,
    },
  });

  EndedRoom.find({})
    .select('roomId')
    .lean()
    .then((rooms) => {
      rooms.forEach((r: any) => endedRoomsSet.add(r.roomId));
      console.log(`[Socket.IO] Pre-loaded ${endedRoomsSet.size} concluded rooms into termination registry`);
    })
    .catch((err) => console.error('[Socket.IO] Failed to pre-load concluded rooms:', err));

  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1] ||
      (typeof socket.handshake.query?.token === 'string' ? socket.handshake.query.token : undefined);

    if (!token) {
      return next(); // Allow development or public demo access, authenticated sockets will have user context
    }

    try {
      const jwtSecret = getJwtSecret();
      const decoded = jwt.verify(token, jwtSecret) as { id: string; role: string };
      (socket as any).userId = decoded.id;
      (socket as any).userRole = decoded.role;
      next();
    } catch {
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    if (userId) {
      const existing = userSocketMap.get(userId) || [];
      existing.push(socket.id);
      userSocketMap.set(userId, existing);
      socket.join(`user:${userId}`);
    }

    // WebRTC Signaling Channels for in-app peer-to-peer video calls (Unlimited duration)
    socket.on('webrtc:join-room', async ({ roomId, user }: { roomId: string; user?: any }) => {
      if (!roomId) return;

      // Prevent anyone from joining a concluded meeting
      if (endedRoomsSet.has(roomId)) {
        socket.emit('webrtc:room-error', {
          code: 'MEETING_ENDED',
          message: 'This meeting session has ended and is no longer accessible. New participants cannot join.',
        });
        return;
      }

      try {
        const isEnded = await EndedRoom.findOne({ roomId });
        if (isEnded) {
          endedRoomsSet.add(roomId);
          socket.emit('webrtc:room-error', {
            code: 'MEETING_ENDED',
            message: 'This meeting session has ended and is no longer accessible. New participants cannot join.',
          });
          return;
        }
      } catch (err) {
        console.error('[Socket] Error checking ended room status:', err);
      }

      const roomKey = `meeting:${roomId}`;
      socket.join(roomKey);

      const room = io?.sockets.adapter.rooms.get(roomKey);
      const participantCount = room ? room.size : 1;

      // Broadcast to existing peers in room that a new peer joined
      socket.to(roomKey).emit('webrtc:peer-joined', {
        peerId: socket.id,
        user: user || { name: 'Remote Participant' },
      });

      socket.emit('webrtc:room-joined', {
        roomId,
        peerId: socket.id,
        participantCount,
      });

      // Send existing whiteboard stroke history & notes to newly joined peer
      const existingStrokes = roomWhiteboardMap.get(roomId) || [];
      socket.emit('webrtc:whiteboard-init', { strokes: existingStrokes });

      const existingNotes = roomNotesMap.get(roomId) || '';
      if (existingNotes) {
        socket.emit('webrtc:notes-init', { notes: existingNotes });
      }
    });

    socket.on('webrtc:offer', ({ roomId, sdp, targetId }: { roomId: string; sdp: any; targetId?: string }) => {
      if (targetId) {
        io?.to(targetId).emit('webrtc:offer', { sdp, peerId: socket.id });
      } else {
        socket.to(`meeting:${roomId}`).emit('webrtc:offer', { sdp, peerId: socket.id });
      }
    });

    socket.on('webrtc:answer', ({ roomId, sdp, targetId }: { roomId: string; sdp: any; targetId?: string }) => {
      if (targetId) {
        io?.to(targetId).emit('webrtc:answer', { sdp, peerId: socket.id });
      } else {
        socket.to(`meeting:${roomId}`).emit('webrtc:answer', { sdp, peerId: socket.id });
      }
    });

    socket.on('webrtc:ice-candidate', ({ roomId, candidate, targetId }: { roomId: string; candidate: any; targetId?: string }) => {
      if (targetId) {
        io?.to(targetId).emit('webrtc:ice-candidate', { candidate, peerId: socket.id });
      } else {
        socket.to(`meeting:${roomId}`).emit('webrtc:ice-candidate', { candidate, peerId: socket.id });
      }
    });

    socket.on('webrtc:chat-message', ({ roomId, message, sender }: { roomId: string; message: string; sender: string }) => {
      io?.to(`meeting:${roomId}`).emit('webrtc:chat-message', {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        message,
        sender,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    });

    // In-call collaborative whiteboard sync with stroke history caching
    socket.on('webrtc:whiteboard-draw', ({ roomId, drawData, sender }: { roomId: string; drawData: any; sender: string }) => {
      if (roomId && drawData) {
        if (drawData.isClear) {
          roomWhiteboardMap.set(roomId, []);
        } else {
          const existing = roomWhiteboardMap.get(roomId) || [];
          existing.push(drawData);
          if (existing.length > 2000) existing.shift();
          roomWhiteboardMap.set(roomId, existing);
        }
        socket.to(`meeting:${roomId}`).emit('webrtc:whiteboard-draw', { drawData, sender });
      }
    });

    // In-call shared technical notes / live code sync with caching
    socket.on('webrtc:notes-update', ({ roomId, notes, sender }: { roomId: string; notes: string; sender: string }) => {
      if (roomId) {
        roomNotesMap.set(roomId, notes || '');
        socket.to(`meeting:${roomId}`).emit('webrtc:notes-update', { notes, sender });
      }
    });

    // Explicit end meeting event broadcasted to all participants in room
    socket.on('webrtc:end-meeting', ({ roomId, endedBy }: { roomId: string; endedBy?: string }) => {
      markRoomEnded(roomId, endedBy);
    });

    socket.on('webrtc:leave-room', ({ roomId }: { roomId: string }) => {
      socket.leave(`meeting:${roomId}`);
      socket.to(`meeting:${roomId}`).emit('webrtc:peer-left', { peerId: socket.id });
    });

    socket.on('disconnecting', () => {
      socket.rooms.forEach((room) => {
        if (room.startsWith('meeting:')) {
          socket.to(room).emit('webrtc:peer-left', { peerId: socket.id });
        }
      });
    });

    socket.on('disconnect', () => {
      if (userId) {
        const sockets = userSocketMap.get(userId) || [];
        const filtered = sockets.filter((id) => id !== socket.id);
        if (filtered.length === 0) {
          userSocketMap.delete(userId);
        } else {
          userSocketMap.set(userId, filtered);
        }
      }
    });
  });

  console.log('[Socket.IO] Real-time event broker initialized');
  return io;
};

export const markRoomEnded = (roomId: string, endedBy?: string) => {
  if (!roomId) return;
  endedRoomsSet.add(roomId);
  const roomKey = `meeting:${roomId}`;
  if (io) {
    io.to(roomKey).emit('webrtc:meeting-ended', { roomId, endedBy });
    roomWhiteboardMap.delete(roomId);
    roomNotesMap.delete(roomId);
    io.in(roomKey).socketsLeave(roomKey);
  }
};

export const emitToUser = (userId: string, event: string, payload: any) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
};

export const emitBroadcast = (event: string, payload: any) => {
  if (!io) return;
  io.emit(event, payload);
};

export { io };
