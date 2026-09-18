import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

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
  const data = await prisma.contract.findMany({
    include: { supplier: true, material: true },
    orderBy: { code: 'desc' },
  });
  res.json({ data });
});

router.get('/contracts/:id', async (req, res) => {
  const data = await prisma.contract.findUnique({
    where: { id: req.params.id },
    include: { supplier: true, material: true },
  });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ data });
});

router.post('/contracts', async (req, res) => {
  const code = `UGV-2026-${String(await prisma.contract.count() + 1).padStart(3, '0')}`;
  const { supplierId, materialId, ...rest } = req.body;
  const data = await prisma.contract.create({
    data: { ...rest, code, supplierId, materialId },
    include: { supplier: true, material: true },
  });
  res.status(201).json({ data });
});

router.put('/contracts/:id', async (req, res) => {
  const data = await prisma.contract.update({
    where: { id: req.params.id },
    data: req.body,
    include: { supplier: true, material: true },
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
