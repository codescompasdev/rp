import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/vehicles', async (req, res) => {
  const data = await prisma.vehicle.findMany({ orderBy: { code: 'asc' } });
  res.json({ data });
});

router.get('/vehicles/:id', async (req, res) => {
  const data = await prisma.vehicle.findUnique({
    where: { id: req.params.id },
    include: { drivers: true },
  });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ data });
});

router.post('/vehicles', async (req, res) => {
  const code = `V-${String(await prisma.vehicle.count() + 1).padStart(3, '0')}`;
  const data = await prisma.vehicle.create({
    data: { ...req.body, code },
  });
  res.status(201).json({ data });
});

router.put('/vehicles/:id', async (req, res) => {
  const data = await prisma.vehicle.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ data });
});

router.get('/drivers', async (req, res) => {
  const data = await prisma.driver.findMany({
    include: { vehicle: true },
    orderBy: { code: 'asc' },
  });
  res.json({ data });
});

router.post('/drivers', async (req, res) => {
  const code = `D-${String(await prisma.driver.count() + 1).padStart(3, '0')}`;
  const data = await prisma.driver.create({
    data: { ...req.body, code },
  });
  res.status(201).json({ data });
});

router.put('/drivers/:id', async (req, res) => {
  const data = await prisma.driver.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ data });
});

router.get('/containers', async (req, res) => {
  const data = await prisma.container.findMany({ orderBy: { code: 'asc' } });
  res.json({ data });
});

router.post('/containers', async (req, res) => {
  const code = req.body.code || `CNT-${String(await prisma.container.count() + 1).padStart(3, '0')}`;
  const data = await prisma.container.create({
    data: { ...req.body, code },
  });
  res.status(201).json({ data });
});

router.put('/containers/:id', async (req, res) => {
  const data = await prisma.container.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ data });
});

router.get('/dispatch', async (req, res) => {
  const data = await prisma.dispatchOrder.findMany({ orderBy: { code: 'desc' } });
  res.json({ data });
});

router.post('/dispatch', async (req, res) => {
  const code = `NV-2026-${String(await prisma.dispatchOrder.count() + 88).padStart(3, '0')}`;
  const data = await prisma.dispatchOrder.create({
    data: { ...req.body, code },
  });
  res.status(201).json({ data });
});

router.put('/dispatch/:id', async (req, res) => {
  const data = await prisma.dispatchOrder.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ data });
});

export default router;
