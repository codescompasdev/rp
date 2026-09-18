import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/lme', async (req, res) => {
  const data = await prisma.lmePrice.findMany({ orderBy: { metal: 'asc' } });
  res.json({ data });
});

router.get('/fx', async (req, res) => {
  const data = await prisma.fxRate.findMany({ orderBy: { pair: 'asc' } });
  res.json({ data });
});

router.put('/lme', async (req, res) => {
  const { metal, price, change } = req.body;
  const data = await prisma.lmePrice.upsert({
    where: { metal },
    update: { price, change },
    create: { metal, price, change, currency: 'USD/t' },
  });
  res.json({ data });
});

export default router;
