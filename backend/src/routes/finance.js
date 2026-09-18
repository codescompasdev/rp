import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/summary', async (req, res) => {
  const payables = await prisma.supplier.aggregate({
    _sum: { balance: true },
    where: { balance: { lt: 0 } },
  });
  const receivables = await prisma.customer.aggregate({
    _sum: { balance: true },
    where: { balance: { gt: 0 } },
  });
  res.json({
    data: {
      cashflow: 145200,
      bankBalance: 342500,
      cashRegisters: [
        { location: 'Pale', balance: 12500, limit: 20000 },
        { location: 'Banja Luka', balance: 8200, limit: 15000 },
      ],
      overduePayables: Math.abs(Number(payables._sum.balance || 0)),
      pendingReceivables: Number(receivables._sum.balance || 0),
      tonnageInToday: 124.5,
      tonnageOutToday: 80,
      tonnageProcessedToday: 50,
    },
  });
});

router.get('/gl', async (req, res) => {
  const data = await prisma.glEntry.findMany({
    orderBy: { date: 'desc' },
    take: 50,
  });
  res.json({ data });
});

router.get('/payables', async (req, res) => {
  const data = await prisma.supplier.findMany({
    where: { balance: { lt: 0 } },
    orderBy: { balance: 'asc' },
  });
  res.json({ data });
});

router.get('/receivables', async (req, res) => {
  const data = await prisma.customer.findMany({
    where: { balance: { gt: 0 } },
    orderBy: { balance: 'desc' },
  });
  res.json({ data });
});

router.get('/cash', async (req, res) => {
  res.json({
    data: {
      cashRegisters: [
        { location: 'Pale', balance: 12500, limit: 20000 },
        { location: 'Banja Luka', balance: 8200, limit: 15000 },
      ],
    },
  });
});

router.get('/tax', async (req, res) => {
  res.json({ data: {} });
});

router.get('/costing', async (req, res) => {
  const stocks = await prisma.inventoryStock.findMany({
    include: { material: true },
  });
  res.json({ data: stocks });
});

export default router;
