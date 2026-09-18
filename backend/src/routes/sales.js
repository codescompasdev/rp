import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { applyOutbound } from '../services/stockLedger.js';

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeItems(payloadItems = [], fallbackMaterial = null) {
  const source = Array.isArray(payloadItems) && payloadItems.length
    ? payloadItems
    : (fallbackMaterial?.materialId ? [fallbackMaterial] : []);

  return source
    .map((item) => {
      const qtyKg = toNumber(item.qtyKg, 0);
      const pricePerKg = toNumber(item.pricePerKg, 0);
      const lineTotal = qtyKg * pricePerKg;
      return {
        materialId: item.materialId,
        qtyKg,
        pricePerKg,
        lineTotal,
      };
    })
    .filter((item) => item.materialId && item.qtyKg > 0);
}

function scopedWhere(req) {
  return req.activeCompanyId ? { companyId: req.activeCompanyId } : {};
}

function uniqueCode(prefix) {
  const stamp = Date.now().toString().slice(-8);
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `${prefix}-${stamp}${rand}`;
}

router.get('/orders', async (req, res) => {
  const data = await prisma.salesOrder.findMany({
    where: scopedWhere(req),
    include: { customer: true, material: true, items: { include: { material: true } } },
    orderBy: { code: 'desc' },
  });
  res.json({ data });
});

router.get('/orders/:id', async (req, res) => {
  const data = await prisma.salesOrder.findFirst({
    where: { id: req.params.id, ...scopedWhere(req) },
    include: { customer: true, material: true, items: { include: { material: true } } },
  });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ data });
});

router.post('/orders', async (req, res) => {
  const code = uniqueCode('SO');
  const { customerId, materialId, qtyKg, pricePerKg, items, ...rest } = req.body;
  const normalizedItems = normalizeItems(items, { materialId, qtyKg, pricePerKg });
  if (!customerId || !normalizedItems.length) {
    return res.status(400).json({ error: 'customerId and at least one item are required' });
  }
  const total = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const leadItem = normalizedItems[0];

  const companyId = req.activeCompanyId || req.userCompanyId || null;
  try {
    const data = await prisma.$transaction(async (tx) => {
    const created = await tx.salesOrder.create({
      data: {
        ...rest,
        code,
        customerId,
        materialId: leadItem.materialId,
        qtyKg: leadItem.qtyKg,
        pricePerKg: leadItem.pricePerKg,
        total,
        companyId,
        items: {
          create: normalizedItems.map((item) => ({
            materialId: item.materialId,
            qtyKg: item.qtyKg,
            pricePerKg: item.pricePerKg,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: { customer: true, material: true, items: { include: { material: true } } },
    });

    for (const item of normalizedItems) {
      await applyOutbound(tx, {
        materialId: item.materialId,
        quantityKg: item.qtyKg,
        unitPrice: item.pricePerKg || 0,
        note: `Auto from sales order ${created.code}`,
        createdBy: req.userId || null,
        companyId,
        movementType: 'sale',
        movementPrefix: 'INV-OUT',
      });
    }
    return created;
    });
    return res.status(201).json({ data });
  } catch (error) {
    if (String(error?.message || '').startsWith('Insufficient stock')) {
      return res.status(400).json({ error: error.message });
    }
    throw error;
  }
});

router.put('/orders/:id', async (req, res) => {
  const { items, ...rest } = req.body;
  if (Array.isArray(items) && !normalizeItems(items).length) {
    return res.status(400).json({ error: 'At least one valid item is required' });
  }
  const data = await prisma.$transaction(async (tx) => {
    const existing = await tx.salesOrder.findFirst({
      where: { id: req.params.id, ...scopedWhere(req) },
      select: { id: true },
    });
    if (!existing) return null;

    let normalizedItems = [];
    if (Array.isArray(items)) {
      normalizedItems = normalizeItems(items);
      await tx.salesOrderItem.deleteMany({ where: { salesOrderId: req.params.id } });
      await tx.salesOrderItem.createMany({
        data: normalizedItems.map((item) => ({
          salesOrderId: req.params.id,
          materialId: item.materialId,
          qtyKg: item.qtyKg,
          pricePerKg: item.pricePerKg,
          lineTotal: item.lineTotal,
        })),
      });
    }

    const leadItem = normalizedItems[0];
    const updateData = { ...rest };
    if (leadItem) {
      updateData.materialId = leadItem.materialId;
      updateData.qtyKg = leadItem.qtyKg;
      updateData.pricePerKg = leadItem.pricePerKg;
      updateData.total = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    }

    return tx.salesOrder.update({
      where: { id: req.params.id },
      data: updateData,
      include: { customer: true, material: true, items: { include: { material: true } } },
    });
  });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ data });
});

router.get('/export-docs', async (req, res) => {
  res.json({ data: [] });
});

router.post('/export-docs', async (req, res) => {
  res.status(201).json({ data: req.body });
});

router.get('/loading', async (req, res) => {
  const orders = await prisma.salesOrder.findMany({
    where: { status: { in: ['Utovar', 'Priprema dokumenata'] }, ...scopedWhere(req) },
    include: { customer: true, material: true, items: { include: { material: true } } },
  });
  res.json({ data: orders });
});

export default router;
