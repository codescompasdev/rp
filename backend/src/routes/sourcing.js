import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

const CONTRACT_INCLUDE = {
  supplier: true,
  customer: true,
  material: true,
  items: { include: { material: true } },
};

router.get('/suppliers', async (req, res) => {
  const { search } = req.query;
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
    ];
  }
  const data = await prisma.supplier.findMany({ where, orderBy: { code: 'asc' } });
  res.json({ data });
});

router.get('/suppliers/:id', async (req, res) => {
  const data = await prisma.supplier.findUnique({
    where: { id: req.params.id },
    include: { contracts: true, announcements: { take: 5 } },
  });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ data });
});

router.post('/suppliers', async (req, res) => {
  const count = await prisma.supplier.count();
  const code = `S-${String(count + 1001)}`;
  const data = await prisma.supplier.create({
    data: { ...req.body, code },
  });
  res.status(201).json({ data });
});

router.put('/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  const data = await prisma.supplier.update({
    where: { id },
    data: req.body,
  });
  res.json({ data });
});

router.delete('/suppliers/:id', async (req, res) => {
  await prisma.supplier.update({
    where: { id: req.params.id },
    data: { active: false },
  });
  res.json({ message: 'Deactivated' });
});

router.get('/customers', async (req, res) => {
  const data = await prisma.customer.findMany({ orderBy: { code: 'asc' } });
  res.json({ data });
});

router.get('/customers/:id', async (req, res) => {
  const data = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: { salesOrders: { take: 10 } },
  });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ data });
});

router.post('/customers', async (req, res) => {
  const count = await prisma.customer.count();
  const code = `C-${String(count + 1).padStart(3, '0')}`;
  const data = await prisma.customer.create({
    data: { ...req.body, code },
  });
  res.status(201).json({ data });
});

router.put('/customers/:id', async (req, res) => {
  const data = await prisma.customer.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ data });
});

router.get('/contracts', async (req, res) => {
  const { direction } = req.query;
  const data = await prisma.contract.findMany({
    where: direction ? { direction: String(direction) } : {},
    include: CONTRACT_INCLUDE,
    orderBy: { code: 'desc' },
  });
  res.json({ data });
});

router.get('/contracts/:id', async (req, res) => {
  const data = await prisma.contract.findUnique({
    where: { id: req.params.id },
    include: CONTRACT_INCLUDE,
  });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ data });
});

function buildItems(items) {
  return (Array.isArray(items) ? items : [])
    .filter((i) => i?.materialId)
    .map((i) => ({
      materialId: i.materialId,
      qtyKg: i.qtyKg === null || i.qtyKg === undefined || i.qtyKg === '' ? null : Number(i.qtyKg),
      pricePerKg: i.pricePerKg ? Number(i.pricePerKg) : null,
    }));
}

router.post('/contracts', async (req, res) => {
  const {
    direction = 'BUY', partnerId, items, qtyMode = 'PER_MATERIAL',
    totalQtyKg, tolerance, ...rest
  } = req.body;

  const cleanItems = buildItems(items);
  if (!partnerId || !cleanItems.length) {
    return res.status(400).json({ error: 'Partner i bar jedan materijal su obavezni.' });
  }
  if (qtyMode === 'TOTAL' && !(Number(totalQtyKg) > 0)) {
    return res.status(400).json({ error: 'Ukupna količina narudžbe je obavezna.' });
  }
  if (qtyMode === 'PER_MATERIAL' && cleanItems.some((i) => !(i.qtyKg > 0))) {
    return res.status(400).json({ error: 'Svaki materijal mora imati količinu.' });
  }

  const code = `NAR-2026-${String(await prisma.contract.count() + 1).padStart(3, '0')}`;
  const data = await prisma.contract.create({
    data: {
      code,
      direction,
      qtyMode,
      totalQtyKg: qtyMode === 'TOTAL' ? Number(totalQtyKg) : null,
      tolerance: tolerance !== undefined && tolerance !== '' ? Number(tolerance) : null,
      supplierId: direction === 'BUY' ? partnerId : null,
      customerId: direction === 'SELL' ? partnerId : null,
      formula: rest.formula || null,
      paymentTerms: rest.paymentTerms || null,
      period: rest.period || null,
      status: rest.status || 'Aktivan',
      startDate: rest.startDate ? new Date(rest.startDate) : null,
      endDate: rest.endDate ? new Date(rest.endDate) : null,
      items: {
        create: qtyMode === 'TOTAL'
          ? cleanItems.map((i) => ({ ...i, qtyKg: null }))
          : cleanItems,
      },
    },
    include: CONTRACT_INCLUDE,
  });
  res.status(201).json({ data });
});

router.put('/contracts/:id', async (req, res) => {
  const { items, partnerId, direction, ...rest } = req.body;
  const data = await prisma.$transaction(async (tx) => {
    if (Array.isArray(items)) {
      const clean = buildItems(items);
      const keepIds = clean.map((i) => i.materialId);
      await tx.contractItem.deleteMany({
        where: { contractId: req.params.id, materialId: { notIn: keepIds } },
      });
      for (const it of clean) {
        const existing = await tx.contractItem.findFirst({
          where: { contractId: req.params.id, materialId: it.materialId },
        });
        if (existing) {
          await tx.contractItem.update({ where: { id: existing.id }, data: { qtyKg: it.qtyKg, pricePerKg: it.pricePerKg } });
        } else {
          await tx.contractItem.create({ data: { ...it, contractId: req.params.id } });
        }
      }
    }
    return tx.contract.update({
      where: { id: req.params.id },
      data: rest,
      include: CONTRACT_INCLUDE,
    });
  });
  res.json({ data });
});

router.get('/pricing', async (req, res) => {
  const materials = await prisma.material.findMany({
    where: { lmeLinked: true },
    select: { code: true, name: true, buyPrice: true, basePrice: true, margin: true },
  });
  const lme = await prisma.lmePrice.findMany();
  res.json({ data: { materials, lme } });
});

router.put('/pricing/:materialCode', async (req, res) => {
  const material = await prisma.material.update({
    where: { code: req.params.materialCode },
    data: { buyPrice: req.body.buyPrice },
  });
  res.json({ data: material });
});

export default router;
