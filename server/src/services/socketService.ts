import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';

import { getJwtSecret } from '../middleware/auth';

let io: SocketIOServer | null = null;
const userSocketMap = new Map<string, string[]>(); // userId -> socketId[]

export const initSocketIO = (httpServer: HTTPServer) => {
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PATCH'],
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(); // Allow anonymous connection or skip strict handshake for MVP
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
    socket.on('webrtc:join-room', ({ roomId, user }: { roomId: string; user?: any }) => {
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

    // In-call collaborative whiteboard sync
    socket.on('webrtc:whiteboard-draw', ({ roomId, drawData, sender }: { roomId: string; drawData: any; sender: string }) => {
      socket.to(`meeting:${roomId}`).emit('webrtc:whiteboard-draw', { drawData, sender });
    });

    // In-call shared technical notes / live code sync
    socket.on('webrtc:notes-update', ({ roomId, notes, sender }: { roomId: string; notes: string; sender: string }) => {
      socket.to(`meeting:${roomId}`).emit('webrtc:notes-update', { notes, sender });
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

export const emitToUser = (userId: string, event: string, payload: any) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
};

export const emitBroadcast = (event: string, payload: any) => {
  if (!io) return;
  io.emit(event, payload);
};

export { io };
