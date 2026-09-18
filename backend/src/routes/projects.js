import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const data = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data });
});

router.get('/:id', async (req, res) => {
  const data = await prisma.project.findUnique({
    where: { id: req.params.id },
  });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ data });
});

router.post('/', async (req, res) => {
  const data = await prisma.project.create({
    data: req.body,
  });
  res.status(201).json({ data });
});

router.put('/:id', async (req, res) => {
  const data = await prisma.project.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ data });
});

export default router;
