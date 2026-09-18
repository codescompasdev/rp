import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/orders', async (req, res) => {
  const data = await prisma.maintenanceOrder.findMany({
    orderBy: { scheduled: 'asc' },
  });
  res.json({ data });
});

router.post('/orders', async (req, res) => {
  const code = `MO-2026-${String(await prisma.maintenanceOrder.count() + 13).padStart(3, '0')}`;
  const data = await prisma.maintenanceOrder.create({
    data: { ...req.body, code },
  });
  res.status(201).json({ data });
});

router.put('/orders/:id', async (req, res) => {
  const data = await prisma.maintenanceOrder.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ data });
});

router.get('/parts', async (req, res) => {
  const data = await prisma.sparePart.findMany({ orderBy: { code: 'asc' } });
  res.json({ data });
});

router.post('/parts', async (req, res) => {
  const code = `SP-${String(await prisma.sparePart.count() + 1).padStart(3, '0')}`;
  const data = await prisma.sparePart.create({
    data: { ...req.body, code },
  });
  res.status(201).json({ data });
});

router.put('/parts/:id', async (req, res) => {
  const data = await prisma.sparePart.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ data });
});

export default router;
