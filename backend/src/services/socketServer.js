import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { JWT_SECRET } from '../middleware/auth.js';

const prisma = new PrismaClient();

let ioInstance = null;

function normalizeCompanyId(value) {
  return String(value || '').trim() || null;
}

function companyRoom(companyId) {
  return `company:${companyId}`;
}

function roleRoom(role, companyId = null) {
  if (companyId) {
    return `role:${String(role || '').toLowerCase()}:${companyId}`;
  }
  return `role:${String(role || '').toLowerCase()}:global`;
}

function userRoom(userId) {
  return `user:${userId}`;
}

export function buildSocketUrlPath() {
  return '/api/v1/realtime';
}

export function initSocketServer(httpServer) {
  if (ioInstance) return ioInstance;
  const io = new Server(httpServer, {
    path: buildSocketUrlPath(),
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const authToken = String(
        socket.handshake.auth?.token
        || socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '')
        || ''
      );
      if (!authToken) return next(new Error('Unauthorized'));
      const payload = jwt.verify(authToken, JWT_SECRET);
      if (payload?.kind && payload.kind !== 'access') {
        return next(new Error('Invalid token kind'));
      }
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, role: true, companyId: true },
      });
      if (!user) return next(new Error('User not found'));

      const requestedCompanyId = normalizeCompanyId(socket.handshake.auth?.companyId);
      const activeCompanyId = user.role === 'admin'
        ? requestedCompanyId
        : (user.companyId || null);

      socket.data.userId = user.id;
      socket.data.userRole = user.role;
      socket.data.userCompanyId = user.companyId || null;
      socket.data.activeCompanyId = activeCompanyId;
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, userRole, activeCompanyId } = socket.data;
    socket.join(userRoom(userId));
    socket.join(roleRoom(userRole, activeCompanyId));
    if (userRole === 'admin') {
      socket.join(roleRoom('admin'));
    }
    if (activeCompanyId) {
      socket.join(companyRoom(activeCompanyId));
    }

    socket.emit('realtime:connected', {
      ok: true,
      userId,
      role: userRole,
      companyId: activeCompanyId,
      connectedAt: new Date().toISOString(),
    });

    socket.on('notifications:join-company', (rawCompanyId) => {
      if (String(userRole || '').toLowerCase() !== 'admin') return;
      const nextCompanyId = normalizeCompanyId(rawCompanyId);
      if (!nextCompanyId) return;
      socket.join(companyRoom(nextCompanyId));
      socket.join(roleRoom('admin', nextCompanyId));
    });
  });

  ioInstance = io;
  return ioInstance;
}

export function getSocketServer() {
  return ioInstance;
}

export function emitNotificationRealtime(notification) {
  if (!ioInstance || !notification) return;
  const payload = {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    payload: notification.payload || null,
    isRead: Boolean(notification.isRead),
    readAt: notification.readAt || null,
    companyId: notification.companyId || null,
    userId: notification.userId || null,
    targetRole: notification.targetRole || null,
    createdAt: notification.createdAt,
  };

  if (notification.userId) {
    ioInstance.to(userRoom(notification.userId)).emit('notifications:new', payload);
    return;
  }

  if (notification.targetRole && notification.companyId) {
    ioInstance.to(roleRoom(notification.targetRole, notification.companyId)).emit('notifications:new', payload);
  } else if (notification.targetRole) {
    ioInstance.to(roleRoom(notification.targetRole)).emit('notifications:new', payload);
  }

  if (notification.companyId) {
    ioInstance.to(companyRoom(notification.companyId)).emit('notifications:new', payload);
  }
}
