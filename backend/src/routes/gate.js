import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { applyInbound, applyOutbound } from '../services/stockLedger.js';
import scaleSignalService from '../services/scaleSignalService.js';
import { createNotification } from '../services/notificationService.js';

const router = Router();
const prisma = new PrismaClient();
const SCALE_INGEST_TOKEN = process.env.SCALE_INGEST_TOKEN || '';
const PENDING_MATERIAL_CODE = 'PENDING-MATERIAL';
const PENDING_MATERIAL_NAME = 'Nedefinisan materijal (potvrditi prije zatvaranja)';

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toDate(value, fallback = new Date()) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function scopedWhere(req) {
  return req.activeCompanyId ? { companyId: req.activeCompanyId } : {};
}

function ymdStart(ymd) {
  const s = String(ymd || '').slice(0, 10);
  const parts = s.split('-').map((x) => Number(x));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function ymdEnd(ymd) {
  const s = String(ymd || '').slice(0, 10);
  const parts = s.split('-').map((x) => Number(x));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

function buildTicketsWhere(req) {
  // admin vidi vaganja narudžbe/dobavljača sa svih lokacija (nisu vezani za lokaciju)
  const allCompaniesForPartner = Boolean(req.query?.contractId || req.query?.supplierId) && req.userRole === 'admin';
  const where = allCompaniesForPartner ? {} : { ...scopedWhere(req) };
  const supplierId = req.query?.supplierId;
  if (supplierId) {
    where.supplierId = String(supplierId);
  }
  const type = req.query?.type;
  if (type) {
    where.type = String(type);
  }
  const contractId = req.query?.contractId;
  if (contractId) {
    where.contractId = String(contractId);
  }
  const df = req.query?.dateFrom;
  const dt = req.query?.dateTo;
  if (df || dt) {
    where.date = {};
    if (df) {
      const gte = ymdStart(df);
      if (gte) where.date.gte = gte;
    }
    if (dt) {
      const lte = ymdEnd(dt);
      if (lte) where.date.lte = lte;
    }
  }
  return where;
}

function isTerminalCancelledOrVoid(status) {
  const s = String(status || '').toLowerCase();
  return s === 'otkazan' || s === 'storniran';
}

function isClosedStatus(status) {
  return String(status || '').toLowerCase() === 'zatvoren';
}

function isPosCompletedStatus(status) {
  return String(status || '').toLowerCase() === 'completed';
}

async function voidPosTicketInTx(tx, ticket, req) {
  const net = toNumber(ticket.net, 0);
  if (net > 0) {
    const ticketVariantId = await resolveMaterialVariantId(tx, ticket.materialId);
    await applyOutbound(tx, {
      materialId: ticket.materialId,
      materialVariantId: ticketVariantId,
      quantityKg: net,
      unitPrice: toNumber(ticket.pricePerKg, 0),
      note: `Storno POS ${ticket.code}`,
      createdBy: req.userId || null,
      companyId: ticket.companyId || null,
      movementType: 'adjustment',
      movementPrefix: 'INV-STORNO',
    });
  }
  return tx.weighTicket.update({
    where: { id: ticket.id },
    data: { status: 'Storniran' },
    include: { supplier: true, material: true },
  });
}

// prodaja na malo (POS_OUT): storno vraća robu na stanje
async function voidPosOutTicketInTx(tx, ticket, req) {
  const net = toNumber(ticket.net, 0);
  if (net > 0) {
    const ticketVariantId = await resolveMaterialVariantId(tx, ticket.materialId);
    await applyInbound(tx, {
      materialId: ticket.materialId,
      materialVariantId: ticketVariantId,
      quantityKg: net,
      unitPrice: toNumber(ticket.pricePerKg, 0),
      note: `Storno prodaje na malo ${ticket.code}`,
      createdBy: req.userId || null,
      companyId: ticket.companyId || null,
      movementType: 'adjustment',
      movementPrefix: 'INV-STORNO-IN',
    });
  }
  return tx.weighTicket.update({
    where: { id: ticket.id },
    data: { status: 'Storniran' },
    include: { supplier: true, material: true },
  });
}

async function voidInClosedTicketInTx(tx, ticket, req) {
  const net = toNumber(ticket.net, 0);
  if (net > 0) {
    const ticketVariantId = await resolveMaterialVariantId(tx, ticket.materialId);
    await applyOutbound(tx, {
      materialId: ticket.materialId,
      materialVariantId: ticketVariantId,
      quantityKg: net,
      unitPrice: toNumber(ticket.pricePerKg, 0),
      note: `Storno IN weigh ticket ${ticket.code}`,
      createdBy: req.userId || null,
      companyId: ticket.companyId || null,
      movementType: 'adjustment',
      movementPrefix: 'INV-STORNO',
    });
  }
  await applyContractProgress(tx, ticket.contractId, ticket.materialId, net, -1);
  await tx.lot.updateMany({
    where: { ticketId: ticket.id },
    data: { status: 'Storniran' },
  });
  return tx.weighTicket.update({
    where: { id: ticket.id },
    data: { status: 'Storniran' },
    include: { supplier: true, material: true },
  });
}

async function voidOutClosedTicketInTx(tx, ticket, req) {
  const net = toNumber(ticket.net, 0);
  if (net > 0) {
    const ticketVariantId = await resolveMaterialVariantId(tx, ticket.materialId);
    await applyInbound(tx, {
      materialId: ticket.materialId,
      materialVariantId: ticketVariantId,
      quantityKg: net,
      unitPrice: toNumber(ticket.pricePerKg, 0),
      note: `Storno OUT weigh ticket ${ticket.code}`,
      createdBy: req.userId || null,
      companyId: ticket.companyId || null,
      movementType: 'adjustment',
      movementPrefix: 'INV-STORNO-IN',
    });
  }
  await applyContractProgress(tx, ticket.contractId, ticket.materialId, net, -1);
  return tx.weighTicket.update({
    where: { id: ticket.id },
    data: { status: 'Storniran' },
    include: { supplier: true, material: true },
  });
}

function uniqueCode(prefix) {
  const stamp = Date.now().toString().slice(-8);
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `${prefix}-${stamp}${rand}`;
}

function formatKg(value) {
  const numeric = toNumber(value, 0);
  return `${Number(numeric.toFixed(2)).toLocaleString('sr-RS')} kg`;
}

async function emitNotificationSafe(input) {
  try {
    await createNotification(input);
  } catch (error) {
    console.error('Notification dispatch failed', error);
  }
}

async function resolveMaterialIdOrPending(materialId) {
  const normalizedMaterialId = String(materialId || '').trim();
  if (normalizedMaterialId) return normalizedMaterialId;
  const existingPending = await prisma.material.findUnique({
    where: { code: PENDING_MATERIAL_CODE },
    select: { id: true },
  });
  if (existingPending?.id) return existingPending.id;
  const createdPending = await prisma.material.create({
    data: {
      code: PENDING_MATERIAL_CODE,
      name: PENDING_MATERIAL_NAME,
      category: 'Ostalo',
      baseUnit: 'KG',
    },
    select: { id: true },
  });
  return createdPending.id;
}

async function resolveMaterialVariantId(tx, materialId, preferredVariantId = null) {
  const preferred = String(preferredVariantId || '').trim();
  if (preferred) return preferred;
  const normalizedMaterialId = String(materialId || '').trim();
  if (!normalizedMaterialId) return null;

  const existing = await tx.materialVariant.findFirst({
    where: { materialId: normalizedMaterialId },
    orderBy: { id: 'asc' },
    select: { id: true },
  });
  if (existing?.id) return existing.id;

  const material = await tx.material.findUnique({
    where: { id: normalizedMaterialId },
    select: { buyPrice: true },
  });

  const created = await tx.materialVariant.create({
    data: {
      materialId: normalizedMaterialId,
      grade: 'Osnovni kvalitet',
      condition: 'Standard',
      buyPrice: toNumber(material?.buyPrice, 0),
      chemicalData: {},
    },
    select: { id: true },
  });
  return created.id;
}

// sign = 1 (zatvaranje tiketa), -1 (storno)
async function applyContractProgress(tx, contractId, materialId, kg, sign = 1) {
  const qty = toNumber(kg, 0);
  if (!contractId || qty <= 0) return;
  const contract = await tx.contract.findUnique({
    where: { id: contractId },
    include: { items: true },
  });
  if (!contract) return;

  const delta = sign * qty;
  const item = contract.items.find((i) => i.materialId === materialId);
  if (item) {
    await tx.contractItem.update({
      where: { id: item.id },
      data: { doneKg: { increment: delta } },
    });
  }
  const updated = await tx.contract.update({
    where: { id: contractId },
    data: { doneKg: { increment: delta } },
    include: { items: true },
  });

  let finished = false;
  if (updated.qtyMode === 'TOTAL') {
    finished = toNumber(updated.doneKg) >= toNumber(updated.totalQtyKg);
  } else {
    const withQty = updated.items.filter((i) => i.qtyKg !== null);
    finished = withQty.length > 0 && withQty.every((i) => toNumber(i.doneKg) >= toNumber(i.qtyKg));
  }
  const nextStatus = finished ? 'Završen' : 'Aktivan';
  if (updated.status !== nextStatus && ['Aktivan', 'Završen'].includes(updated.status)) {
    await tx.contract.update({ where: { id: contractId }, data: { status: nextStatus } });
  }
}

function assertContractDirection(contract, ticketType) {
  if (!contract) return;
  const ok = (contract.direction === 'BUY' && ticketType === 'IN')
    || (contract.direction === 'SELL' && ticketType === 'OUT');
  if (!ok) {
    const err = new Error('Tip tiketa ne odgovara smjeru narudžbe (kupovina=IN, prodaja=OUT).');
    err.status = 400;
    throw err;
  }
}

function isOwnerRole(role) {
  const normalized = String(role || '').toLowerCase();
  return normalized === 'admin' || normalized === 'manager' || normalized === 'owner';
}

router.post('/scale/ingest', async (req, res) => {
  if (!SCALE_INGEST_TOKEN) {
    return res.status(503).json({ error: 'Scale ingest token is not configured' });
  }
  const providedToken = String(req.headers['x-scale-token'] || '');
  if (!providedToken || providedToken !== SCALE_INGEST_TOKEN) {
    return res.status(401).json({ error: 'Invalid scale ingest token' });
  }
  try {
    const data = scaleSignalService.ingestWeight({
      weight: req.body?.weight,
      source: req.body?.source || 'INGEST',
      channel: req.body?.channel || req.body?.companyId || req.headers['x-scale-channel'] || '',
      scaleId: req.body?.scaleId || req.headers['x-scale-id'] || '',
    });
    return res.status(201).json({ data });
  } catch (error) {
    return res.status(400).json({ error: error?.message || 'Invalid ingest payload' });
  }
});

router.use(authMiddleware);

router.get('/inspection-workers', async (req, res) => {
  const companyId = req.activeCompanyId || req.userCompanyId || null;
  const isAdmin = String(req.userRole || '').toLowerCase() === 'admin';

  const workerWhere = companyId ? { companyId } : (isAdmin ? {} : null);
  const userWhere = companyId
    ? { companyId, role: { in: ['admin', 'manager', 'operator'] } }
    : (isAdmin ? { role: { in: ['admin', 'manager', 'operator'] } } : null);

  if (!workerWhere || !userWhere) {
    return res.json({ data: [] });
  }

  const [workers, users] = await Promise.all([
    prisma.worker.findMany({
      where: workerWhere,
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, role: true, status: true },
    }),
    prisma.user.findMany({
      where: userWhere,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, role: true },
    }),
  ]);

  const seenNames = new Set();
  const data = [];

  workers.forEach((worker) => {
    const key = String(worker.name || '').trim().toLowerCase();
    if (key) seenNames.add(key);
    data.push({
      id: worker.id,
      code: worker.code || `W-${worker.id.slice(-4).toUpperCase()}`,
      name: worker.name,
      role: worker.role || 'inspektor',
      status: worker.status || 'Aktivan',
    });
  });

  users.forEach((user) => {
    const key = String(user.name || '').trim().toLowerCase();
    if (!key || seenNames.has(key)) return;
    seenNames.add(key);
    data.push({
      id: `user-${user.id}`,
      code: `U-${user.id.slice(-4).toUpperCase()}`,
      name: user.name,
      role: user.role || 'operator',
      status: 'Aktivan',
    });
  });

  return res.json({ data });
});

router.get('/scale/config', async (_req, res) => {
  res.json({ data: scaleSignalService.getConfig() });
});

router.put('/scale/config', async (req, res) => {
  if (!isOwnerRole(req.userRole)) {
    return res.status(403).json({ error: 'Owner role required' });
  }
  const data = scaleSignalService.updateConfig(req.body || {});
  res.json({ data });
});

router.get('/scale/live', async (req, res) => {
  const channel = req.activeCompanyId || req.userCompanyId || req.query?.channel || '';
  const scaleId = req.query?.scaleId || '';
  res.json({ data: scaleSignalService.getSnapshot({ channel, scaleId }) });
});

router.get('/announcements', async (req, res) => {
  const data = await prisma.announcement.findMany({
    where: scopedWhere(req),
    include: { supplier: true, material: true },
    orderBy: { expectedDate: 'desc' },
  });
  res.json({ data });
});

router.get('/announcements/:id', async (req, res) => {
  const data = await prisma.announcement.findFirst({
    where: { id: req.params.id, ...scopedWhere(req) },
    include: { supplier: true, material: true, contract: true },
  });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ data });
});

router.post('/announcements', async (req, res) => {
  const code = `PO-2026-${String(await prisma.announcement.count() + 554).padStart(3, '0')}`;
  const { supplierId, materialId, contractId, expectedDate, ...rest } = req.body;
  const resolvedMaterialId = await resolveMaterialIdOrPending(materialId);
  const data = await prisma.announcement.create({
    data: {
      ...rest,
      code,
      supplierId,
      materialId: resolvedMaterialId,
      contractId: contractId || null,
      expectedDate: toDate(expectedDate),
      companyId: req.activeCompanyId || req.userCompanyId || null,
    },
    include: { supplier: true, material: true },
  });
  res.status(201).json({ data });
});

router.put('/announcements/:id', async (req, res) => {
  const allowed = {
    supplierId: req.body.supplierId,
    materialId: req.body.materialId,
    contractId: req.body.contractId,
    expectedKg: req.body.expectedKg,
    truck: req.body.truck,
    status: req.body.status,
  };
  const dataToUpdate = Object.fromEntries(
    Object.entries(allowed).filter(([, value]) => value !== undefined)
  );
  if (req.body.expectedDate !== undefined) {
    dataToUpdate.expectedDate = toDate(req.body.expectedDate);
  }
  if (dataToUpdate.contractId === '') {
    dataToUpdate.contractId = null;
  }

  const updated = await prisma.announcement.updateMany({
    where: { id: req.params.id, ...scopedWhere(req) },
    data: dataToUpdate,
  });
  if (!updated.count) return res.status(404).json({ error: 'Not found' });
  const data = await prisma.announcement.findUnique({
    where: { id: req.params.id },
    include: { supplier: true, material: true },
  });
  res.json({ data });
});

router.get('/tickets', async (req, res) => {
  const limit = Number(req.query?.limit);
  const data = await prisma.weighTicket.findMany({
    where: buildTicketsWhere(req),
    include: { supplier: true, material: true },
    orderBy: { date: 'desc' },
    ...(Number.isFinite(limit) && limit > 0 ? { take: Math.min(Math.floor(limit), 2000) } : {}),
  });
  res.json({ data });
});

router.get('/tickets/:id', async (req, res) => {
  const data = await prisma.weighTicket.findFirst({
    where: { id: req.params.id, ...scopedWhere(req) },
    include: {
    supplier: true,
    material: true,
    lots: true,
    contract: { include: { items: { include: { material: true } } } },
    },
  });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ data });
});

router.post('/tickets', async (req, res) => {
  const code = uniqueCode('W');
  const { supplierId, materialId, ...rest } = req.body;
  const resolvedMaterialId = await resolveMaterialIdOrPending(materialId);
  const gross = toNumber(rest.gross, 0);
  const tare = toNumber(rest.tare, 0);
  const kalo = 0;
  const net = rest.net !== undefined ? toNumber(rest.net, 0) : Math.max(0, gross - tare);
  const pricePerKg = toNumber(rest.pricePerKg, 0);
  const total = rest.total !== undefined ? toNumber(rest.total, 0) : net * pricePerKg;
  const data = await prisma.weighTicket.create({
    data: {
      ...rest,
      code,
      date: rest.date ? new Date(rest.date) : new Date(),
      supplierId: supplierId || null,
      materialId: resolvedMaterialId,
      gross,
      tare,
      kalo,
      net,
      pricePerKg,
      total,
      status: rest.status || 'Otvoren',
      type: rest.type || 'IN',
      companyId: req.activeCompanyId || req.userCompanyId || null,
    },
    include: { supplier: true, material: true },
  });
  res.status(201).json({ data });
});

router.put('/tickets/:id', async (req, res) => {
  const existing = await prisma.weighTicket.findFirst({
    where: { id: req.params.id, ...scopedWhere(req) },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const data = await prisma.weighTicket.update({
    where: { id: req.params.id },
    data: req.body,
    include: { supplier: true, material: true },
  });
  res.json({ data });
});

router.post('/tickets/:id/cancel', async (req, res) => {
  const ticket = await prisma.weighTicket.findFirst({
    where: { id: req.params.id, ...scopedWhere(req) },
  });
  if (!ticket) return res.status(404).json({ error: 'Not found' });
  if (isTerminalCancelledOrVoid(ticket.status)) {
    return res.status(400).json({ error: 'Tiket je već otkazan ili storniran.' });
  }
  if (isClosedStatus(ticket.status)) {
    return res.status(400).json({ error: 'Zatvoren tiket se ne može otkazati. Koristi storno.' });
  }
  if (ticket.type === 'POS' && isPosCompletedStatus(ticket.status)) {
    return res.status(400).json({ error: 'Direktni otkup je već knjižen. Koristi storno.' });
  }
  if (ticket.type === 'POS_OUT' && isPosCompletedStatus(ticket.status)) {
    return res.status(400).json({ error: 'Prodaja na malo je već knjižena. Koristi storno.' });
  }
  const data = await prisma.weighTicket.update({
    where: { id: req.params.id },
    data: { status: 'Otkazan' },
    include: { supplier: true, material: true },
  });
  res.json({ data });
});

router.post('/tickets/:id/void', async (req, res) => {
  const voidWholeSlipGroup = Boolean(req.body?.voidWholeSlipGroup);
  const anchor = await prisma.weighTicket.findFirst({
    where: { id: req.params.id, ...scopedWhere(req) },
    include: { material: true, lots: true },
  });
  if (!anchor) return res.status(404).json({ error: 'Not found' });

  try {
    const data = await prisma.$transaction(async (tx) => {
      if (voidWholeSlipGroup && anchor.slipGroupId) {
        const groupTickets = await tx.weighTicket.findMany({
          where: {
            slipGroupId: anchor.slipGroupId,
            ...scopedWhere(req),
            type: 'POS',
          },
          include: { material: true },
          orderBy: [{ slipSeq: 'asc' }, { createdAt: 'asc' }],
        });
        const results = [];
        for (const t of groupTickets) {
          if (isTerminalCancelledOrVoid(t.status)) continue;
          if (!isPosCompletedStatus(t.status)) {
            throw new Error('Sve stavke na listu moraju biti završene (Completed) za storno grupe.');
          }
          const updated = await voidPosTicketInTx(tx, t, req);
          results.push(updated);
        }
        if (!results.length) {
          throw new Error('Nema stavki za storno na ovom listu.');
        }
        return { voidedTickets: results, slipGroupId: anchor.slipGroupId };
      }

      if (isTerminalCancelledOrVoid(anchor.status)) {
        return tx.weighTicket.findUnique({
          where: { id: anchor.id },
          include: { supplier: true, material: true },
        });
      }

      if (anchor.type === 'POS' && isPosCompletedStatus(anchor.status)) {
        return voidPosTicketInTx(tx, anchor, req);
      }

      if (anchor.type === 'POS_OUT' && isPosCompletedStatus(anchor.status)) {
        return voidPosOutTicketInTx(tx, anchor, req);
      }

      if (isClosedStatus(anchor.status)) {
        if (anchor.type === 'IN') {
          return voidInClosedTicketInTx(tx, anchor, req);
        }
        if (anchor.type === 'OUT') {
          return voidOutClosedTicketInTx(tx, anchor, req);
        }
        throw new Error('Storno nije podržan za ovaj tip tiketa.');
      }

      throw new Error('Tiket nije zatvoren. Koristi otkazivanje umjesto storna.');
    });
    return res.json({ data });
  } catch (error) {
    const msg = error?.message || 'Storno nije uspjelo.';
    if (String(msg).startsWith('Insufficient stock')) {
      return res.status(400).json({ error: 'Nedovoljno stanja za storno (povrat na skladište).' });
    }
    return res.status(400).json({ error: msg });
  }
});

router.post('/walk-in/void-group', async (req, res) => {
  const slipGroupId = String(req.body?.slipGroupId || '').trim();
  if (!slipGroupId) return res.status(400).json({ error: 'slipGroupId je obavezan.' });
  try {
    const data = await prisma.$transaction(async (tx) => {
      const groupTickets = await tx.weighTicket.findMany({
        where: {
          slipGroupId,
          ...scopedWhere(req),
          type: 'POS',
        },
        include: { material: true },
        orderBy: [{ slipSeq: 'asc' }, { createdAt: 'asc' }],
      });
      if (!groupTickets.length) {
        throw new Error('Nema tiketa za ovaj list.');
      }
      const results = [];
      for (const t of groupTickets) {
        if (isTerminalCancelledOrVoid(t.status)) continue;
        if (!isPosCompletedStatus(t.status)) {
          throw new Error('Sve stavke moraju biti Completed prije storna.');
        }
        results.push(await voidPosTicketInTx(tx, t, req));
      }
      if (!results.length) {
        throw new Error('Sve stavke su već stornirane.');
      }
      return { voidedTickets: results, slipGroupId };
    });
    return res.json({ data });
  } catch (error) {
    const msg = error?.message || 'Storno grupe nije uspjelo.';
    if (String(msg).startsWith('Insufficient stock')) {
      return res.status(400).json({ error: 'Nedovoljno stanja za storno.' });
    }
    return res.status(400).json({ error: msg });
  }
});

router.post('/tickets/:id/first-weigh', async (req, res) => {
  const existing = await prisma.weighTicket.findFirst({
    where: { id: req.params.id, ...scopedWhere(req) },
    select: { id: true, type: true, gross: true, tare: true },
  });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const measuredWeight = toNumber(req.body.weight, NaN);
  const isOutbound = existing.type === 'OUT';

  if (isOutbound) {
    if (toNumber(existing.tare, 0) > 0) {
      return res.status(400).json({ error: 'Tara already captured for this ticket' });
    }
    const tare = toNumber(req.body.tare, measuredWeight);
    if (!Number.isFinite(tare) || tare <= 0) {
      return res.status(400).json({ error: 'Valid tare is required for OUT first weigh' });
    }
    const data = await prisma.weighTicket.update({
      where: { id: req.params.id },
      data: {
        tare,
        date: req.body.date ? new Date(req.body.date) : new Date(),
        status: req.body.status || 'Tara završena',
      },
      include: { supplier: true, material: true },
    });
    return res.json({ data });
  }

  if (toNumber(existing.gross, 0) > 0) {
    return res.status(400).json({ error: 'Gross already captured for this ticket' });
  }
  const gross = toNumber(req.body.gross, measuredWeight);
  if (!Number.isFinite(gross) || gross <= 0) {
    return res.status(400).json({ error: 'Valid gross is required for IN first weigh' });
  }
  const data = await prisma.weighTicket.update({
    where: { id: req.params.id },
    data: {
      gross,
      date: req.body.date ? new Date(req.body.date) : new Date(),
      status: req.body.status || 'Bruto završeno',
    },
    include: { supplier: true, material: true },
  });
  return res.json({ data });
});

router.post('/tickets/:id/inspection', async (req, res) => {
  const existing = await prisma.weighTicket.findFirst({
    where: { id: req.params.id, ...scopedWhere(req) },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const data = await prisma.weighTicket.update({
    where: { id: req.params.id },
    data: {
      materialId: req.body.materialId || undefined,
      status: req.body.status || 'Inspekcija završena',
    },
    include: { supplier: true, material: true },
  });
  res.json({ data });
});

router.post('/tickets/:id/second-weigh', async (req, res) => {
  const current = await prisma.weighTicket.findFirst({ where: { id: req.params.id, ...scopedWhere(req) } });
  if (!current) return res.status(404).json({ error: 'Not found' });
  const isOutbound = current.type === 'OUT';
  const packagingLines = Array.isArray(req.body.packagingLines)
    ? req.body.packagingLines
        .map((line) => ({
          type: String(line?.type || '').trim(),
          kg: Math.max(0, toNumber(line?.kg, 0)),
        }))
        .filter((line) => line.type || line.kg > 0)
    : [];
  const packagingKg = packagingLines.length > 0
    ? packagingLines.reduce((sum, line) => sum + line.kg, 0)
    : Math.max(0, toNumber(req.body.packagingKg, 0));
  const measuredWeight = toNumber(req.body.weight, NaN);

  let gross = toNumber(current.gross, 0);
  let tare = toNumber(current.tare, 0);

  if (isOutbound) {
    if (tare <= 0) {
      return res.status(400).json({ error: 'For OUT flow, first weigh must be tare' });
    }
    if (gross > 0) {
      return res.status(400).json({ error: 'Gross already captured for this OUT ticket' });
    }
    gross = toNumber(req.body.gross, measuredWeight);
    if (!Number.isFinite(gross) || gross <= 0) {
      return res.status(400).json({ error: 'Valid gross is required for OUT second weigh' });
    }
  } else {
    if (gross <= 0) {
      return res.status(400).json({ error: 'For IN flow, first weigh must be gross' });
    }
    if (tare > 0) {
      return res.status(400).json({ error: 'Tare already captured for this IN ticket' });
    }
    tare = toNumber(req.body.tare, measuredWeight);
    if (!Number.isFinite(tare) || tare <= 0) {
      return res.status(400).json({ error: 'Valid tare is required for IN second weigh' });
    }
  }

  const rawNet = Math.max(0, gross - tare);
  const net = Math.max(0, rawNet - packagingKg);
  const pricePerKg = toNumber(req.body.pricePerKg, toNumber(current.pricePerKg, 0));
  const total = net * pricePerKg;

  const data = await prisma.weighTicket.update({
    where: { id: req.params.id },
    data: {
      gross,
      tare,
      kalo: 0,
      net,
      pricePerKg,
      total,
      packagingDetails: packagingLines.length > 0 ? packagingLines : null,
      status: req.body.status || 'Čeka zatvaranje',
    },
    include: { supplier: true, material: true },
  });
  res.json({ data });
});

router.post('/tickets/:id/close', async (req, res) => {
  const ticket = await prisma.weighTicket.findFirst({
    where: { id: req.params.id, ...scopedWhere(req) },
    include: { material: true },
  });
  if (!ticket) return res.status(404).json({ error: 'Not found' });

  try {
    const fail = (message, status = 400) => {
      const error = new Error(message);
      error.status = status;
      throw error;
    };
    const data = await prisma.$transaction(async (tx) => {
      if (String(ticket.status || '').toLowerCase() === 'zatvoren') {
        return tx.weighTicket.findUnique({
          where: { id: req.params.id },
          include: { supplier: true, material: true },
        });
      }

      // narudžba: sa tiketa, a ako je nema, iz zahtjeva
      const contractId = ticket.contractId || req.body.contractId || null;

      const closed = await tx.weighTicket.update({
        where: { id: req.params.id },
        data: {
          status: req.body.status || 'Zatvoren',
          ...(contractId && !ticket.contractId ? { contractId } : {}),
        },
        include: { supplier: true, material: true },
      });

      if (ticket.type === 'POS_OUT') {
        fail('Prodaja na malo se ne zatvara preko vage.');
      }

      const net = toNumber(ticket.net, 0);
      const companyId = ticket.companyId || null;
      const isPos = ticket.type === 'POS';
      const isOutbound = ticket.type === 'OUT';

      if (!isPos && net <= 0) {
        fail('Net weight is zero. Complete second weigh or set net before closing.');
      }

      // provjera smjera narudžbe (BUY = IN, SELL = OUT)
      if (contractId && !isPos) {
        const contract = await tx.contract.findUnique({ where: { id: contractId } });
        if (!contract) fail('Narudžba nije pronađena.');
        assertContractDirection(contract, ticket.type);
      }

      if (net > 0 && !isPos) {
        const buyPrice = toNumber(ticket.pricePerKg, 0);
        const unresolvedMaterial = !ticket.materialId || String(ticket.material?.code || '') === PENDING_MATERIAL_CODE;
        if (unresolvedMaterial) {
          fail('Materijal nije potvrđen. Prije zatvaranja odaberi tačan materijal.');
        }

        if (isOutbound) {
          const outboundLines = Array.isArray(req.body.outboundLines)
            ? req.body.outboundLines
                .map((line) => ({
                  materialId: String(line?.materialId || '').trim(),
                  materialVariantId: line?.materialVariantId || null,
                  quantityKg: toNumber(line?.quantityKg, 0),
                }))
                .filter((line) => line.materialId && line.quantityKg > 0)
            : [];

          if (outboundLines.length > 0) {
            const splitTotal = outboundLines.reduce((sum, line) => sum + line.quantityKg, 0);
            if (Math.abs(splitTotal - net) > 0.01) {
              fail(`Outbound split total (${splitTotal}) must match measured net (${net})`);
            }
            for (const line of outboundLines) {
              const lineVariantId = await resolveMaterialVariantId(tx, line.materialId, line.materialVariantId);
              await applyOutbound(tx, {
                materialId: line.materialId,
                materialVariantId: lineVariantId,
                quantityKg: line.quantityKg,
                unitPrice: buyPrice,
                note: `Auto OUT split from weigh ticket ${ticket.code}`,
                createdBy: req.userId || null,
                companyId,
                movementType: 'sale',
                movementPrefix: 'INV-OUT',
              });
              await applyContractProgress(tx, contractId, line.materialId, line.quantityKg, 1);
            }
          } else {
            const ticketVariantId = await resolveMaterialVariantId(tx, ticket.materialId);
            await applyOutbound(tx, {
              materialId: ticket.materialId,
              materialVariantId: ticketVariantId,
              quantityKg: net,
              unitPrice: buyPrice,
              note: `Auto OUT from weigh ticket ${ticket.code}`,
              createdBy: req.userId || null,
              companyId,
              movementType: 'sale',
              movementPrefix: 'INV-OUT',
            });
            await applyContractProgress(tx, contractId, ticket.materialId, net, 1);
          }
        } else {
          const lotCode = uniqueCode('LOT');
          const ticketVariantId = await resolveMaterialVariantId(tx, ticket.materialId);
          await tx.lot.create({
            data: {
              code: lotCode,
              materialId: ticket.materialId,
              supplierId: ticket.supplierId || null,
              ticketId: ticket.id,
              dateReceived: new Date(),
              kg: net,
              location: req.body.location || 'Otvoreni lager C',
              status: 'Na stanju',
              contractId,
              companyId,
            },
          });
          await applyInbound(tx, {
            materialId: ticket.materialId,
            materialVariantId: ticketVariantId,
            quantityKg: net,
            unitPrice: buyPrice,
            note: `Auto IN from weigh ticket ${ticket.code}`,
            createdBy: req.userId || null,
            companyId,
            movementType: 'purchase',
            movementPrefix: 'INV-IN',
          });
          await applyContractProgress(tx, contractId, ticket.materialId, net, 1);
        }
      }
      return closed;
    });

    await emitNotificationSafe({
      type: 'ticket_ready_for_print',
      title: 'Vaganje je zavrseno',
      message: `Tiket ${data.code} je zatvoren i spreman za stampu.`,
      companyId: data.companyId || null,
      targetRole: 'operator',
      payload: {
        ticketId: data.id,
        ticketCode: data.code,
        ticketType: data.type,
        status: data.status,
      },
    });

    if (ticket.type === 'IN' && toNumber(ticket.net, 0) > 0) {
      const company = ticket.companyId
        ? await prisma.company.findUnique({
            where: { id: ticket.companyId },
            select: { name: true, code: true },
          })
        : null;
      const locationName = company?.name || company?.code || 'Milkus';
      await emitNotificationSafe({
        type: 'inventory_inbound',
        title: 'Ulaz na stanje',
        message: `${locationName} - Na stanje ubaceno ${formatKg(ticket.net)} ${ticket.material?.name || 'materijal'}`,
        companyId: ticket.companyId || null,
        targetRole: 'admin',
        payload: {
          ticketId: ticket.id,
          ticketCode: ticket.code,
          materialId: ticket.materialId,
          materialName: ticket.material?.name || null,
          netKg: toNumber(ticket.net, 0),
        },
      });
    }

    return res.json({ data });
  } catch (error) {
    if (String(error?.message || '').startsWith('Insufficient stock')) {
      return res.status(400).json({ error: 'Insufficient stock for OUT weigh close' });
    }
    const status = Number(error?.status) || 500;
    const message = status >= 500 ? 'Close ticket failed' : (error?.message || 'Close ticket failed');
    console.error('Close ticket error:', error);
    return res.status(status).json({ error: message });
  }
});

router.get('/trucks', async (req, res) => {
  const data = await prisma.truckOnSite.findMany({ where: scopedWhere(req), orderBy: { entryTime: 'desc' } });
  res.json({ data });
});

router.post('/trucks', async (req, res) => {
  const data = await prisma.truckOnSite.create({
    data: {
      ...req.body,
      companyId: req.activeCompanyId || req.userCompanyId || null,
    },
  });
  res.status(201).json({ data });
});

router.put('/trucks/:plate', async (req, res) => {
  const data = await prisma.truckOnSite.updateMany({
    where: { plate: decodeURIComponent(req.params.plate), ...scopedWhere(req) },
    data: req.body,
  });
  res.json({ data });
});

router.post('/walk-in/batch', async (req, res) => {
  const lines = Array.isArray(req.body?.lines) ? req.body.lines : [];
  if (!lines.length) {
    return res.status(400).json({ error: 'Navedi barem jednu stavku (lines).' });
  }
  const driver = String(req.body?.driver || '').trim();
  if (!driver) {
    return res.status(400).json({ error: 'Ime prodavca (driver) je obavezno.' });
  }
  const sellerDocument = String(req.body?.sellerDocument || '').trim() || null;
  const companyId = req.activeCompanyId || req.userCompanyId || null;
  const batchDate = req.body?.date ? new Date(req.body.date) : new Date();
  const slipGroupId = randomUUID();

  try {
    const tickets = await prisma.$transaction(async (tx) => {
      const createdList = [];
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const materialId = String(line?.materialId || '').trim();
        if (!materialId) {
          throw new Error('Svaka stavka mora imati materialId.');
        }
        const code = uniqueCode('W');
        const gross = toNumber(line.gross, 0);
        const tare = 0;
        const kalo = 0;
        const net = line.net !== undefined ? toNumber(line.net, 0) : Math.max(0, gross - tare);
        const pricePerKg = toNumber(line.pricePerKg, 0);
        const total = line.total !== undefined ? toNumber(line.total, 0) : net * pricePerKg;
        const created = await tx.weighTicket.create({
          data: {
            code,
            date: batchDate,
            plate: 'WALK-IN',
            driver,
            sellerDocument,
            materialId,
            gross,
            tare,
            kalo,
            net,
            pricePerKg,
            total,
            status: 'Completed',
            type: 'POS',
            companyId,
            slipGroupId,
            slipSeq: i + 1,
          },
          include: { material: true },
        });
        if (net > 0) {
          const ticketVariantId = await resolveMaterialVariantId(tx, created.materialId);
          await applyInbound(tx, {
            materialId: created.materialId,
            materialVariantId: ticketVariantId,
            quantityKg: net,
            unitPrice: pricePerKg,
            note: `Auto IN from walk-in ticket ${created.code} (list ${slipGroupId})`,
            createdBy: req.userId || null,
            companyId,
            movementType: 'purchase',
            movementPrefix: 'INV-IN',
          });
        }
        createdList.push(created);
      }
      return createdList;
    });
    const displaySlipNo = tickets[0]?.code || slipGroupId;
    const totalKg = tickets.reduce((sum, row) => sum + toNumber(row.net, 0), 0);
    await emitNotificationSafe({
      type: 'walkin_batch_created',
      title: 'Direktno vaganje (list)',
      message: `Kreiran je list ${displaySlipNo} (${tickets.length} stavki, ${formatKg(totalKg)}). Potrebna je stampa.`,
      companyId,
      targetRole: 'operator',
      payload: {
        slipGroupId,
        displaySlipNo,
        ticketIds: tickets.map((row) => row.id),
      },
    });
    return res.status(201).json({
      data: {
        slipGroupId,
        displaySlipNo,
        tickets,
      },
    });
  } catch (error) {
    const msg = error?.message || 'Batch walk-in nije uspio.';
    return res.status(400).json({ error: msg });
  }
});

/**
 * Prodaja na malo — kao direktan otkup, ali roba IZLAZI sa stanja.
 * Kilaža se upisuje ručno (bez vage). Body: { buyer, buyerDocument?, date?, lines: [{ materialId, qtyKg, pricePerKg }] }
 */
router.post('/retail-sale/batch', async (req, res) => {
  const lines = Array.isArray(req.body?.lines) ? req.body.lines : [];
  if (!lines.length) {
    return res.status(400).json({ error: 'Navedi barem jednu stavku.' });
  }
  const buyer = String(req.body?.buyer || '').trim();
  if (!buyer) {
    return res.status(400).json({ error: 'Ime kupca je obavezno.' });
  }
  const buyerDocument = String(req.body?.buyerDocument || '').trim() || null;
  const companyId = req.activeCompanyId || req.userCompanyId || null;
  const saleDate = req.body?.date ? new Date(req.body.date) : new Date();
  const slipGroupId = randomUUID();

  try {
    const tickets = await prisma.$transaction(async (tx) => {
      const createdList = [];
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const materialId = String(line?.materialId || '').trim();
        const qty = toNumber(line?.qtyKg, 0);
        if (!materialId) throw new Error('Svaka stavka mora imati materijal.');
        if (qty <= 0) throw new Error('Količina svake stavke mora biti veća od 0.');
        const pricePerKg = toNumber(line.pricePerKg, 0);
        const created = await tx.weighTicket.create({
          data: {
            code: uniqueCode('P'),
            date: saleDate,
            plate: 'MALOPRODAJA',
            driver: buyer,
            sellerDocument: buyerDocument,
            materialId,
            gross: qty,
            tare: 0,
            kalo: 0,
            net: qty,
            pricePerKg,
            total: qty * pricePerKg,
            status: 'Completed',
            type: 'POS_OUT',
            companyId,
            slipGroupId,
            slipSeq: i + 1,
          },
          include: { material: true },
        });
        const ticketVariantId = await resolveMaterialVariantId(tx, created.materialId);
        try {
          await applyOutbound(tx, {
            materialId: created.materialId,
            materialVariantId: ticketVariantId,
            quantityKg: qty,
            unitPrice: pricePerKg,
            note: `Prodaja na malo ${created.code} (list ${slipGroupId})`,
            createdBy: req.userId || null,
            companyId,
            movementType: 'sale',
            movementPrefix: 'INV-OUT',
          });
        } catch (error) {
          if (String(error?.message || '').startsWith('Insufficient stock')) {
            throw new Error(`Nedovoljno stanja za ${created.material?.code || 'materijal'} (${created.material?.name || ''}).`);
          }
          throw error;
        }
        createdList.push(created);
      }
      return createdList;
    });
    return res.status(201).json({
      data: {
        slipGroupId,
        displaySlipNo: tickets[0]?.code || slipGroupId,
        tickets,
      },
    });
  } catch (error) {
    return res.status(400).json({ error: error?.message || 'Prodaja na malo nije uspjela.' });
  }
});

router.post('/retail-sale/void-group', async (req, res) => {
  const slipGroupId = String(req.body?.slipGroupId || '').trim();
  if (!slipGroupId) return res.status(400).json({ error: 'slipGroupId je obavezan.' });
  try {
    const data = await prisma.$transaction(async (tx) => {
      const groupTickets = await tx.weighTicket.findMany({
        where: { slipGroupId, ...scopedWhere(req), type: 'POS_OUT' },
        orderBy: [{ slipSeq: 'asc' }, { createdAt: 'asc' }],
      });
      if (!groupTickets.length) throw new Error('Nema prodaje za ovaj list.');
      const results = [];
      for (const t of groupTickets) {
        if (isTerminalCancelledOrVoid(t.status)) continue;
        if (!isPosCompletedStatus(t.status)) throw new Error('Sve stavke moraju biti knjižene prije storna.');
        results.push(await voidPosOutTicketInTx(tx, t, req));
      }
      if (!results.length) throw new Error('Sve stavke su već stornirane.');
      return { voidedTickets: results, slipGroupId };
    });
    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error?.message || 'Storno prodaje nije uspio.' });
  }
});

router.post('/walk-in', async (req, res) => {
  const code = uniqueCode('W');
  const materialId = String(req.body.materialId || '').trim();
  if (!materialId) {
    return res.status(400).json({ error: 'materialId je obavezan.' });
  }
  const gross = toNumber(req.body.gross, 0);
  const tare = toNumber(req.body.tare, 0);
  const kalo = 0;
  const net = req.body.net !== undefined ? toNumber(req.body.net, 0) : Math.max(0, gross - tare);
  const pricePerKg = toNumber(req.body.pricePerKg, 0);
  const total = req.body.total !== undefined ? toNumber(req.body.total, 0) : net * pricePerKg;
  const companyId = req.activeCompanyId || req.userCompanyId || null;
  const data = await prisma.$transaction(async (tx) => {
    const created = await tx.weighTicket.create({
      data: {
        code,
        date: req.body.date ? new Date(req.body.date) : new Date(),
        plate: req.body.plate || 'WALK-IN',
        driver: req.body.driver || null,
        sellerDocument: req.body.sellerDocument || null,
        materialId,
        gross,
        tare,
        kalo,
        net,
        pricePerKg,
        total,
        status: req.body.status || 'Completed',
        type: 'POS',
        companyId,
        slipGroupId: req.body.slipGroupId || null,
        slipSeq: req.body.slipSeq != null ? Math.round(Number(req.body.slipSeq)) : null,
      },
      include: { material: true },
    });

    if (net > 0) {
      const ticketVariantId = await resolveMaterialVariantId(tx, created.materialId);
      await applyInbound(tx, {
        materialId: created.materialId,
        materialVariantId: ticketVariantId,
        quantityKg: net,
        unitPrice: pricePerKg,
        note: `Auto IN from walk-in ticket ${created.code}`,
        createdBy: req.userId || null,
        companyId,
        movementType: 'purchase',
        movementPrefix: 'INV-IN',
      });
    }
    return created;
  });
  await emitNotificationSafe({
    type: 'walkin_created',
    title: 'Direktno vaganje',
    message: `Direktno vaganje ${data.code} (${formatKg(data.net)}) je evidentirano. Potrebna je stampa.`,
    companyId,
    targetRole: 'operator',
    payload: {
      ticketId: data.id,
      ticketCode: data.code,
      materialId: data.materialId,
      netKg: toNumber(data.net, 0),
    },
  });
  res.status(201).json({ data });
});

export default router;
