import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, JWT_SECRET } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${JWT_SECRET}-refresh`;

function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}

function toAuthUser(user, activeCompanyId = null) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId || null,
    company: user.company || null,
    activeCompanyId: activeCompanyId || user.companyId || null,
  };
}

function signAccessToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, companyId: user.companyId || null, kind: 'access' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, companyId: user.companyId || null, kind: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: { select: { id: true, code: true, name: true } } },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.json({
    accessToken,
    refreshToken,
    user: toAuthUser(user),
  });
});

router.post('/register', async (req, res) => {
  const { name, email, password, role = 'operator', companyId } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password required' });
  }
  const normalizedRole = String(role || 'operator').toLowerCase();
  if (!['admin', 'manager', 'operator'].includes(normalizedRole)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (normalizedRole !== 'admin' && !companyId) {
    return res.status(400).json({ error: 'companyId is required for manager/operator users' });
  }
  if (companyId) {
    const company = await prisma.company.findUnique({ where: { id: String(companyId) } });
    if (!company) {
      return res.status(400).json({ error: 'Invalid companyId' });
    }
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: 'Email already registered' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: normalizedRole, companyId: companyId || null },
    include: { company: { select: { id: true, code: true, name: true } } },
  });
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.status(201).json({
    accessToken,
    refreshToken,
    user: toAuthUser(user),
  });
});

router.get('/users', authMiddleware, requireAdmin, async (_req, res) => {
  const data = await prisma.user.findMany({
    include: { company: { select: { id: true, code: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: data.map((user) => toAuthUser(user)) });
});

router.post('/users', authMiddleware, requireAdmin, async (req, res) => {
  const { name, email, password, role = 'operator', companyId } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password required' });
  }
  const normalizedRole = String(role || 'operator').toLowerCase();
  if (!['admin', 'manager', 'operator'].includes(normalizedRole)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (normalizedRole !== 'admin' && !companyId) {
    return res.status(400).json({ error: 'companyId is required for manager/operator users' });
  }
  if (companyId) {
    const company = await prisma.company.findUnique({ where: { id: String(companyId) } });
    if (!company) {
      return res.status(400).json({ error: 'Invalid companyId' });
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: 'Email already registered' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: normalizedRole, companyId: companyId || null },
    include: { company: { select: { id: true, code: true, name: true } } },
  });
  return res.status(201).json({ data: toAuthUser(user) });
});

router.put('/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { name, email, role, companyId, password } = req.body;
  const existing = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, email: true, role: true, companyId: true },
  });
  if (!existing) {
    return res.status(404).json({ error: 'User not found' });
  }

  const data = {};
  if (name !== undefined) data.name = String(name);
  if (email !== undefined) {
    const normalizedEmail = String(email).toLowerCase();
    const emailOwner = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
    if (emailOwner && emailOwner.id !== req.params.id) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    data.email = normalizedEmail;
  }
  if (role !== undefined) {
    const normalizedRole = String(role).toLowerCase();
    if (!['admin', 'manager', 'operator'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    data.role = normalizedRole;
  }
  if (companyId !== undefined) {
    if (companyId) {
      const company = await prisma.company.findUnique({ where: { id: String(companyId) } });
      if (!company) {
        return res.status(400).json({ error: 'Invalid companyId' });
      }
      data.companyId = String(companyId);
    } else {
      data.companyId = null;
    }
  }
  const nextRole = data.role || existing.role;
  const nextCompanyId = data.companyId !== undefined ? data.companyId : existing.companyId;
  if ((nextRole === 'manager' || nextRole === 'operator') && !nextCompanyId) {
    return res.status(400).json({ error: 'companyId is required for manager/operator users' });
  }
  if (password !== undefined && String(password).trim()) {
    data.passwordHash = await bcrypt.hash(String(password), 10);
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    include: { company: { select: { id: true, code: true, name: true } } },
  });
  return res.json({ data: toAuthUser(user) });
});

router.delete('/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  const existing = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, role: true } });
  if (!existing) return res.status(404).json({ error: 'User not found' });
  await prisma.user.delete({ where: { id: req.params.id } });
  return res.json({ message: 'User deleted' });
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    if (payload?.kind !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token kind' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { company: { select: { id: true, code: true, name: true } } },
    });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    return res.json({
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
      user: toAuthUser(user),
    });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, role: true, companyId: true, company: { select: { id: true, name: true, code: true } } },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ data: toAuthUser(user, req.activeCompanyId) });
});

router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out' });
});

export default router;
