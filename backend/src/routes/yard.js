import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeElements(input) {
  if (Array.isArray(input)) {
    return input
      .map((row) => ({
        element: String(row?.element || row?.symbol || '').trim(),
        pct: toNumber(row?.pct ?? row?.percent, 0),
      }))
      .filter((row) => row.element);
  }
  if (input && typeof input === 'object') {
    return Object.entries(input)
      .map(([element, pct]) => ({ element: String(element), pct: toNumber(pct, 0) }))
      .filter((row) => row.element);
  }
  return [];
}

router.get('/xrf', async (req, res) => {
  const { ticketId, lotId } = req.query;
  const where = {};
  if (ticketId) where.ticketId = String(ticketId);
  if (lotId) where.lotId = String(lotId);
  const data = await prisma.xrfAnalysis.findMany({
    where,
    include: { ticket: true, lot: true, material: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ data });
});

router.get('/xrf/:id', async (req, res) => {
  const data = await prisma.xrfAnalysis.findUnique({
    where: { id: req.params.id },
    include: { ticket: true, lot: true, material: true },
  });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ data });
});

router.post('/xrf', async (req, res) => {
  const { ticketId, lotId, materialId, sampleRef, declaredLabel, elements, status } = req.body;
  const normalized = normalizeElements(elements);
  const totalPct = normalized.reduce((sum, row) => sum + toNumber(row.pct, 0), 0);
  const remainderPct = Math.max(0, 100 - totalPct);
  const code = `XRF-${String(await prisma.xrfAnalysis.count() + 1).padStart(6, '0')}`;

  const data = await prisma.xrfAnalysis.create({
    data: {
      code,
      ticketId: ticketId || null,
      lotId: lotId || null,
      materialId: materialId || null,
      sampleRef: sampleRef || null,
      declaredLabel: declaredLabel || null,
      elements: normalized,
      totalPct,
      remainderPct,
      status: status || 'Draft',
      createdBy: req.userId || null,
    },
    include: { ticket: true, lot: true, material: true },
  });
  res.status(201).json({ data });
});

export default router;
