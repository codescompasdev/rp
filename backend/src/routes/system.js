import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { getPushPublicKey, isPushConfigured } from '../services/notificationService.js';

const router = Router();
const prisma = new PrismaClient();

function normalizeRole(role) {
  return String(role || '').toLowerCase().trim();
}

function parseLimit(value, fallback = 30) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(1, Math.round(parsed)));
}

function scopedCompanyId(req) {
  if (normalizeRole(req.userRole) === 'admin') {
    return req.activeCompanyId || null;
  }
  return req.userCompanyId || null;
}

function notificationsWhere(req) {
  const role = normalizeRole(req.userRole);
  const companyId = scopedCompanyId(req);
  if (normalizeRole(req.userRole) === 'admin' && !companyId) {
    return {
      OR: [
        { userId: req.userId },
        { targetRole: role },
      ],
    };
  }
  return {
    OR: [
      { userId: req.userId },
      { targetRole: role, companyId },
      { targetRole: role, companyId: null },
      { companyId, targetRole: null, userId: null },
    ],
  };
}

function isOwnerLike(req) {
  const role = normalizeRole(req.userRole);
  return role === 'admin' || role === 'manager' || role === 'owner';
}

router.get('/companies', authMiddleware, async (req, res) => {
  const where = req.userRole === 'admin' || !req.userCompanyId ? {} : { id: req.userCompanyId };
  const data = await prisma.company.findMany({ where, orderBy: { name: 'asc' } });
  res.json({ data });
});

router.get('/alerts', authMiddleware, (req, res) => {
  const where = notificationsWhere(req);
  prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      message: true,
      createdAt: true,
      type: true,
      isRead: true,
    },
  }).then((rows) => {
    res.json({
      data: rows.map((row) => ({
        id: row.id,
        time: new Date(row.createdAt).toLocaleTimeString('sr-RS', { hour12: false }),
        level: row.type?.slice(0, 3)?.toUpperCase() || 'SYS',
        message: row.message,
        color: row.isRead ? '#94a3b8' : '#ef4444',
      })),
    });
  }).catch(() => {
    res.json({ data: [] });
  });
});

router.get('/notifications', authMiddleware, async (req, res) => {
  const onlyUnread = String(req.query?.onlyUnread || '').toLowerCase();
  const where = notificationsWhere(req);
  if (onlyUnread === '1' || onlyUnread === 'true') {
    where.isRead = false;
  }

  const data = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: parseLimit(req.query?.limit, 30),
  });
  res.json({ data });
});

router.patch('/notifications/:id/read', authMiddleware, async (req, res) => {
  const where = notificationsWhere(req);
  const existing = await prisma.notification.findFirst({
    where: {
      id: req.params.id,
      ...where,
    },
    select: { id: true },
  });
  if (!existing) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  const data = await prisma.notification.update({
    where: { id: req.params.id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
  return res.json({ data });
});

router.patch('/notifications/read-all', authMiddleware, async (req, res) => {
  const where = notificationsWhere(req);
  const data = await prisma.notification.updateMany({
    where: {
      ...where,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
  return res.json({ data });
});

router.get('/notifications/push/public-key', authMiddleware, async (_req, res) => {
  return res.json({
    data: {
      configured: isPushConfigured(),
      publicKey: getPushPublicKey(),
    },
  });
});

router.post('/notifications/subscriptions', authMiddleware, async (req, res) => {
  const endpoint = String(req.body?.endpoint || '').trim();
  const p256dh = String(req.body?.keys?.p256dh || '').trim();
  const auth = String(req.body?.keys?.auth || '').trim();
  if (!endpoint || !p256dh || !auth) {
    return res.status(400).json({ error: 'endpoint, keys.p256dh and keys.auth are required' });
  }

  const companyId = scopedCompanyId(req);
  const data = await prisma.notificationSubscription.upsert({
    where: { endpoint },
    create: {
      endpoint,
      p256dh,
      auth,
      userId: req.userId,
      companyId,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 400) || null,
    },
    update: {
      p256dh,
      auth,
      userId: req.userId,
      companyId,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 400) || null,
    },
  });
  return res.status(201).json({ data });
});

router.delete('/notifications/subscriptions/:id', authMiddleware, async (req, res) => {
  const key = decodeURIComponent(String(req.params.id || ''));
  const data = await prisma.notificationSubscription.deleteMany({
    where: {
      userId: req.userId,
      OR: [{ id: key }, { endpoint: key }],
    },
  });
  return res.json({ data });
});

router.get('/inbound-messages', authMiddleware, async (req, res) => {
  if (!isOwnerLike(req)) {
    return res.status(403).json({ error: 'Owner role required' });
  }
  const status = String(req.query?.status || '').trim().toLowerCase();
  const search = String(req.query?.search || '').trim().toLowerCase();
  const limit = parseLimit(req.query?.limit, 100);
  const where = {};
  if (status && status !== 'all') {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { message: { contains: search, mode: 'insensitive' } },
    ];
  }
  const data = await prisma.inboundMessage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return res.json({ data });
});

router.patch('/inbound-messages/:id/status', authMiddleware, async (req, res) => {
  if (!isOwnerLike(req)) {
    return res.status(403).json({ error: 'Owner role required' });
  }
  const status = String(req.body?.status || '').trim().toLowerCase();
  if (!['new', 'in_progress', 'resolved', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const data = await prisma.inboundMessage.update({
    where: { id: req.params.id },
    data: { status },
  });
  return res.json({ data });
});

router.get('/locations', authMiddleware, async (req, res) => {
  const where = req.userRole === 'admin' || !req.userCompanyId ? {} : { id: req.userCompanyId };
  const companies = await prisma.company.findMany({ where, orderBy: { name: 'asc' } });
  res.json({
    data: companies.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      type: c.type,
      address: c.address,
    })),
  });
});

export default router;
