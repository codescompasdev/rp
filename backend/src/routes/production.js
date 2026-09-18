import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/work-orders', async (req, res) => {
  const data = await prisma.workOrder.findMany({
    include: { material: true },
    orderBy: { code: 'desc' },
  });
  res.json({ data });
});

router.get('/work-orders/:id', async (req, res) => {
  const data = await prisma.workOrder.findUnique({
    where: { id: req.params.id },
    include: { material: true },
  });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ data });
});

router.post('/work-orders', async (req, res) => {
  const code = `WO-2026-${String(await prisma.workOrder.count() + 44).padStart(3, '0')}`;
  const { materialId, ...rest } = req.body;
  const data = await prisma.workOrder.create({
    data: { ...rest, code, materialId },
    include: { material: true },
  });
  res.status(201).json({ data });
});

router.put('/work-orders/:id', async (req, res) => {
  const data = await prisma.workOrder.update({
    where: { id: req.params.id },
    data: req.body,
    include: { material: true },
  });
  res.json({ data });
});

router.get('/lots', async (req, res) => {
  const data = await prisma.lot.findMany({
    include: { material: true, ticket: true },
    orderBy: { dateReceived: 'desc' },
  });
  res.json({ data });
});

router.get('/lots/:id', async (req, res) => {
  const data = await prisma.lot.findUnique({
    where: { id: req.params.id },
    include: { material: true, ticket: true },
  });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ data });
});

router.post('/lots', async (req, res) => {
  const code = `LOT-26-${String(await prisma.lot.count() + 56).padStart(4, '0')}`;
  const { materialId, ticketId, ...rest } = req.body;
  const data = await prisma.lot.create({
    data: { ...rest, code, materialId, ticketId: ticketId || null },
    include: { material: true },
  });
  res.status(201).json({ data });
});

router.get('/oee', async (req, res) => {
  const orders = await prisma.workOrder.findMany({
    where: { status: 'Završen' },
    take: 10,
  });
  const avgYield = orders.length
    ? orders.reduce((a, o) => a + Number(o.yield), 0) / orders.length
    : 0;
  res.json({ data: { avgYield, orders } });
});

export default router;
