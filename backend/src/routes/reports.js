import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

function requireOwnerReview(req, res, next) {
  const role = String(req.userRole || '').toLowerCase();
  if (!['admin', 'manager', 'owner'].includes(role)) {
    return res.status(403).json({ error: 'Owner, admin or manager access required' });
  }
  return next();
}

function scopedWhere(req) {
  return req.activeCompanyId ? { companyId: req.activeCompanyId } : {};
}

router.get('/dashboard', requireOwnerReview, async (req, res) => {
  const [lme, fx, trucks, suppliers, customers] = await Promise.all([
    prisma.lmePrice.findMany(),
    prisma.fxRate.findMany(),
    prisma.truckOnSite.findMany({ where: scopedWhere(req) }),
    prisma.supplier.count(),
    prisma.customer.count(),
  ]);
  res.json({
    data: {
      lme,
      fx,
      trucksOnSite: trucks,
      supplierCount: suppliers,
      customerCount: customers,
    },
  });
});

router.get('/flow', requireOwnerReview, async (req, res) => {
  const { from, to, type, search } = req.query;
  const where = { ...scopedWhere(req) };

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999Z`);
  }

  if (type === 'IN') where.type = 'purchase';
  if (type === 'OUT') where.type = 'sale';

  const transactions = await prisma.inventoryTransaction.findMany({
    where,
    include: { material: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const searchText = String(search || '').trim().toLowerCase();
  const userIds = [...new Set(transactions.map((item) => item.createdBy).filter(Boolean))];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : [];
  const userById = new Map(users.map((u) => [u.id, u.name]));

  const normalized = transactions
    .map((item) => ({
      id: item.id,
      code: item.code,
      createdAt: item.createdAt,
      type: item.type === 'sale' ? 'OUT' : item.type === 'purchase' ? 'IN' : String(item.type || '').toUpperCase(),
      quantityKg: Number(item.quantityKg || 0),
      materialCode: item.material?.code || '-',
      materialName: item.material?.name || '-',
      actorName: userById.get(item.createdBy) || item.createdBy || 'Sistem',
      note: item.note || '',
      companyId: item.companyId || null,
    }))
    .filter((item) => {
      if (!searchText) return true;
      return (
        item.actorName.toLowerCase().includes(searchText) ||
        item.materialCode.toLowerCase().includes(searchText) ||
        item.materialName.toLowerCase().includes(searchText) ||
        String(item.note || '').toLowerCase().includes(searchText)
      );
    });

  const summary = normalized.reduce(
    (acc, item) => {
      if (item.type === 'IN') acc.totalInKg += item.quantityKg;
      if (item.type === 'OUT') acc.totalOutKg += item.quantityKg;
      return acc;
    },
    { totalInKg: 0, totalOutKg: 0 }
  );

  const byMaterialMap = new Map();
  normalized.forEach((item) => {
    const key = item.materialCode || item.materialName || 'N/A';
    if (!byMaterialMap.has(key)) {
      byMaterialMap.set(key, { material: key, inKg: 0, outKg: 0 });
    }
    const row = byMaterialMap.get(key);
    if (item.type === 'IN') row.inKg += item.quantityKg;
    if (item.type === 'OUT') row.outKg += item.quantityKg;
  });
  const byMaterial = [...byMaterialMap.values()]
    .sort((a, b) => (b.inKg + b.outKg) - (a.inKg + a.outKg))
    .slice(0, 8);

  const mostActiveProducts = [...byMaterialMap.entries()]
    .map(([key, row]) => ({
      material: key,
      movementKg: Number((row.inKg + row.outKg).toFixed(2)),
      inKg: Number(row.inKg.toFixed(2)),
      outKg: Number(row.outKg.toFixed(2)),
    }))
    .sort((a, b) => b.movementKg - a.movementKg)
    .slice(0, 10);

  const stockRows = await prisma.inventoryStock.findMany({
    where: scopedWhere(req),
    include: { material: true },
    orderBy: { stockKg: 'desc' },
    take: 8,
  });
  const topStock = stockRows.map((row) => ({
    material: row.material?.code || row.material?.name || '-',
    kg: Number(row.stockKg || 0),
  }));

  return res.json({
    data: {
      summary: {
        ...summary,
        transactionCount: normalized.length,
      },
      history: normalized.slice(0, 200),
      byMaterial,
      topStock,
      mostActiveProducts,
    },
  });
});

export default router;
