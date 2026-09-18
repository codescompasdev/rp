import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function normalizeCompanyHeader(value) {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

export async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.kind && payload.kind !== 'access') {
      return res.status(401).json({ error: 'Invalid token kind' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, companyId: true },
    });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const requestedCompanyId = normalizeCompanyHeader(req.headers['x-company-id']);
    let activeCompanyId = null;
    if (user.role === 'admin') {
      activeCompanyId = requestedCompanyId || null;
    } else {
      if (requestedCompanyId && requestedCompanyId !== user.companyId) {
        return res.status(403).json({ error: 'Forbidden company scope' });
      }
      activeCompanyId = user.companyId || null;
    }

    req.userId = payload.userId;
    req.userRole = user.role;
    req.userCompanyId = user.companyId || null;
    req.activeCompanyId = activeCompanyId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

export function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return next();
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    req.userRole = payload.role;
  } catch {}
  next();
}

export { JWT_SECRET };
