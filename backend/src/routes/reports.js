import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

function requireOwnerReview(req, res, next) {
  const role = String(req.userRole || '').toLowerCase();
  if (!['admin', 'manager', 'owner'].includes(role)) {
    return res.status(403).json({ error: 'Owner, admin or manager access required' });
  }
  return next();
}

function scopedWhere(req) {
  return req.activeCompanyId ? { companyId: req.activeCompanyId } : {};
}

const TZ = 'Europe/Sarajevo';
const DAY_MS = 24 * 60 * 60 * 1000;

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

const ymdFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

function ymdInTz(date) {
  return ymdFormatter.format(date);
}

function tzOffsetMs(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date).map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return asUtc - date.getTime();
}

/** Početak lokalnog dana (Europe/Sarajevo) kao UTC Date. */
function zonedDayStart(ymd) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d));
  return new Date(guess.getTime() - tzOffsetMs(guess));
}

function isValidYmd(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function addDaysYmd(ymd, days) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function daysBetween(fromYmd, toYmd) {
  const [y1, m1, d1] = fromYmd.split('-').map(Number);
  const [y2, m2, d2] = toYmd.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DAY_MS) + 1;
}

/** Ključ grupe za seriju: dan, sedmica (ponedjeljak) ili mjesec. */
function bucketKey(ymd, granularity) {
  if (granularity === 'month') return `${ymd.slice(0, 7)}-01`;
  if (granularity === 'week') {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const weekday = (dt.getUTCDay() + 6) % 7; // 0 = ponedjeljak
    return addDaysYmd(ymd, -weekday);
  }
  return ymd;
}

function classifyTicket(ticket) {
  const status = String(ticket.status || '').toLowerCase();
  if (ticket.type === 'IN' && status === 'zatvoren') return 'in';
  if (ticket.type === 'OUT' && status === 'zatvoren') return 'out';
  if (ticket.type === 'POS' && status === 'completed') return 'pos';
  if (ticket.type === 'POS_OUT' && status === 'completed') return 'retail';
  return null;
}

function summarizeTickets(tickets) {
  const acc = { inKg: 0, inCount: 0, outKg: 0, outCount: 0, posKg: 0, posValue: 0, posCount: 0, retailKg: 0, retailValue: 0, retailCount: 0 };
  tickets.forEach((t) => {
    const kind = classifyTicket(t);
    const net = toNumber(t.net);
    if (kind === 'in') { acc.inKg += net; acc.inCount += 1; }
    if (kind === 'out') { acc.outKg += net; acc.outCount += 1; }
    if (kind === 'pos') { acc.posKg += net; acc.posValue += toNumber(t.total); acc.posCount += 1; }
    if (kind === 'retail') { acc.retailKg += net; acc.retailValue += toNumber(t.total); acc.retailCount += 1; }
  });
  Object.keys(acc).forEach((k) => { acc[k] = round2(acc[k]); });
  return acc;
}

function contractProgress(contract) {
  const items = (contract.items || []).map((item) => ({
    id: item.id,
    materialId: item.materialId,
    materialCode: item.material?.code || '-',
    materialName: item.material?.name || '',
    qtyKg: item.qtyKg === null ? null : toNumber(item.qtyKg),
    doneKg: toNumber(item.doneKg),
  }));
  const legacyPlan = !items.length && contract.qtyTons ? toNumber(contract.qtyTons) * 1000 : 0;
  const plannedKg = contract.qtyMode === 'TOTAL'
    ? toNumber(contract.totalQtyKg)
    : (items.length ? items.reduce((sum, i) => sum + toNumber(i.qtyKg), 0) : legacyPlan);
  const doneKg = toNumber(contract.doneKg);
  return {
    id: contract.id,
    code: contract.code,
    direction: contract.direction || 'BUY',
    partner: (contract.direction === 'SELL' ? contract.customer?.name : contract.supplier?.name) || '-',
    qtyMode: contract.qtyMode,
    tolerance: toNumber(contract.tolerance),
    plannedKg: round2(plannedKg),
    doneKg: round2(doneKg),
    remainingKg: round2(Math.max(0, plannedKg - doneKg)),
    endDate: contract.endDate,
    items,
  };
}

router.get('/dashboard', requireOwnerReview, async (req, res) => {
  const [lme, fx, trucks, suppliers, customers] = await Promise.all([
    prisma.lmePrice.findMany(),
    prisma.fxRate.findMany(),
    prisma.truckOnSite.findMany({ where: scopedWhere(req) }),
    prisma.supplier.count(),
    prisma.customer.count(),
  ]);
  res.json({
    data: {
      lme,
      fx,
      trucksOnSite: trucks,
      supplierCount: suppliers,
      customerCount: customers,
    },
  });
});

/**
 * Pregled poslovanja za vlasnika — sve vrijednosti iz stvarnih tiketa, skladišta i narudžbi.
 * Query: from, to (YYYY-MM-DD, lokalno vrijeme). Default: zadnjih 30 dana.
 */
router.get('/overview', requireOwnerReview, async (req, res) => {
  const todayYmd = ymdInTz(new Date());
  let to = isValidYmd(req.query.to) ? String(req.query.to) : todayYmd;
  let from = isValidYmd(req.query.from) ? String(req.query.from) : addDaysYmd(to, -29);
  if (from > to) [from, to] = [to, from];

  const spanDays = Math.min(daysBetween(from, to), 3660);
  const granularity = spanDays <= 45 ? 'day' : spanDays <= 200 ? 'week' : 'month';
  const start = zonedDayStart(from);
  const endExclusive = zonedDayStart(addDaysYmd(to, 1));
  const prevFrom = addDaysYmd(from, -spanDays);
  const prevStart = zonedDayStart(prevFrom);

  const scope = scopedWhere(req);
  const ticketSelect = {
    id: true, code: true, type: true, status: true, net: true, total: true, date: true, updatedAt: true,
    plate: true, materialId: true, supplierId: true, contractId: true, companyId: true,
    material: { select: { code: true, name: true } },
    supplier: { select: { name: true } },
  };

  const [tickets, prevTickets, openTicketsRaw, stockRows, activeContracts, announcements, companies, allTickets] = await Promise.all([
    prisma.weighTicket.findMany({ where: { ...scope, date: { gte: start, lt: endExclusive } }, select: ticketSelect, orderBy: { date: 'desc' } }),
    prisma.weighTicket.findMany({ where: { ...scope, date: { gte: prevStart, lt: start } }, select: { type: true, status: true, net: true, total: true } }),
    prisma.weighTicket.findMany({ where: { ...scope, type: { in: ['IN', 'OUT'] }, NOT: { status: { in: ['Zatvoren', 'Otkazan', 'Storniran'] } } }, select: ticketSelect, orderBy: { date: 'desc' }, take: 50 }),
    prisma.inventoryStock.findMany({ where: scope, include: { material: { select: { code: true, name: true } } } }),
    prisma.contract.findMany({
      where: { status: 'Aktivan' },
      include: { supplier: true, customer: true, items: { include: { material: true } } },
      orderBy: { code: 'desc' },
    }),
    prisma.announcement.findMany({
      where: { ...scope, status: 'Najavljeno' },
      include: { supplier: { select: { name: true } }, material: { select: { code: true, name: true } } },
      orderBy: { expectedDate: 'asc' },
      take: 50,
    }),
    req.userRole === 'admin' ? prisma.company.findMany({ select: { id: true, code: true, name: true } }) : Promise.resolve([]),
    req.userRole === 'admin'
      ? prisma.weighTicket.findMany({
        where: { date: { gte: start, lt: endExclusive } },
        select: { type: true, status: true, net: true, total: true, companyId: true },
      })
      : Promise.resolve([]),
  ]);

  const summary = summarizeTickets(tickets);
  const previous = summarizeTickets(prevTickets);

  // serija kroz vrijeme
  const buckets = new Map();
  for (let ymd = from; ymd <= to; ymd = addDaysYmd(ymd, 1)) {
    const key = bucketKey(ymd, granularity);
    if (!buckets.has(key)) buckets.set(key, { key, inKg: 0, outKg: 0, posKg: 0, posValue: 0, retailKg: 0, retailValue: 0 });
  }
  const byMaterialIn = new Map();
  const byMaterialOut = new Map();
  const bySupplier = new Map();
  tickets.forEach((t) => {
    const kind = classifyTicket(t);
    if (!kind) return;
    const net = toNumber(t.net);
    const bucket = buckets.get(bucketKey(ymdInTz(t.date), granularity));
    if (bucket) {
      if (kind === 'in') bucket.inKg += net;
      if (kind === 'out') bucket.outKg += net;
      if (kind === 'pos') { bucket.posKg += net; bucket.posValue += toNumber(t.total); }
      if (kind === 'retail') { bucket.retailKg += net; bucket.retailValue += toNumber(t.total); }
    }
    const matKey = t.material?.code || t.materialId;
    const matLabel = t.material ? `${t.material.code} · ${t.material.name}` : '-';
    const target = kind === 'out' || kind === 'retail' ? byMaterialOut : byMaterialIn;
    const row = target.get(matKey) || { key: matKey, label: matLabel, kg: 0, count: 0 };
    row.kg += net;
    row.count += 1;
    target.set(matKey, row);
    if ((kind === 'in' || kind === 'pos') && t.supplierId) {
      const s = bySupplier.get(t.supplierId) || { key: t.supplierId, label: t.supplier?.name || '-', kg: 0, value: 0, count: 0 };
      s.kg += net;
      s.value += kind === 'pos' ? toNumber(t.total) : 0;
      s.count += 1;
      bySupplier.set(t.supplierId, s);
    }
  });
  const series = [...buckets.values()].map((b) => ({
    key: b.key,
    inKg: round2(b.inKg),
    outKg: round2(b.outKg),
    posKg: round2(b.posKg),
    posValue: round2(b.posValue),
    retailKg: round2(b.retailKg),
    retailValue: round2(b.retailValue),
  }));
  const topList = (map) => [...map.values()]
    .sort((a, b) => b.kg - a.kg)
    .slice(0, 8)
    .map((r) => ({ ...r, kg: round2(r.kg), value: r.value !== undefined ? round2(r.value) : undefined }));

  // skladište
  const stockByMaterial = new Map();
  let stockKg = 0;
  let stockValue = 0;
  let negativeStockRows = 0;
  stockRows.forEach((row) => {
    const kg = toNumber(row.stockKg);
    const value = kg * toNumber(row.avgBuyPrice);
    stockKg += kg;
    stockValue += value;
    if (kg < -0.009) negativeStockRows += 1;
    const key = row.material?.code || row.materialId;
    const agg = stockByMaterial.get(key) || { key, label: row.material ? `${row.material.code} · ${row.material.name}` : '-', kg: 0, value: 0 };
    agg.kg += kg;
    agg.value += value;
    stockByMaterial.set(key, agg);
  });
  const topStock = [...stockByMaterial.values()]
    .filter((r) => r.kg > 0)
    .sort((a, b) => b.kg - a.kg)
    .slice(0, 8)
    .map((r) => ({ ...r, kg: round2(r.kg), value: round2(r.value) }));

  // otvorena vaganja (vozila u krugu)
  const now = Date.now();
  const openTickets = openTicketsRaw.map((t) => ({
    id: t.id,
    code: t.code,
    type: t.type,
    status: t.status,
    plate: t.plate,
    partner: t.supplier?.name || '-',
    material: t.material ? `${t.material.code} · ${t.material.name}` : '-',
    pendingMaterial: String(t.material?.code || '') === 'PENDING',
    date: t.date,
    ageHours: round2((now - new Date(t.date).getTime()) / 3600000),
    net: round2(t.net),
  }));

  const recentTickets = tickets
    .filter((t) => classifyTicket(t))
    .slice(0, 10)
    .map((t) => ({
      id: t.id,
      code: t.code,
      type: t.type,
      status: t.status,
      plate: t.plate,
      partner: t.supplier?.name || '-',
      material: t.material ? `${t.material.code} · ${t.material.name}` : '-',
      date: t.date,
      net: round2(t.net),
      total: round2(t.total),
    }));

  const orders = activeContracts.map(contractProgress);
  const ordersOverPlan = orders.filter((o) => o.plannedKg > 0 && o.doneKg > o.plannedKg * (1 + o.tolerance / 100));
  const overdueAnnouncements = announcements.filter((a) => new Date(a.expectedDate).getTime() < zonedDayStart(todayYmd).getTime());
  const upcomingAnnouncements = announcements
    .filter((a) => new Date(a.expectedDate).getTime() >= zonedDayStart(todayYmd).getTime())
    .slice(0, 8)
    .map((a) => ({
      id: a.id,
      code: a.code,
      supplier: a.supplier?.name || '-',
      material: a.material ? `${a.material.code} · ${a.material.name}` : '-',
      expectedKg: round2(a.expectedKg),
      expectedDate: a.expectedDate,
      truck: a.truck,
    }));

  const staleOpen = openTickets.filter((t) => t.ageHours >= 12);
  const waitingClose = openTickets.filter((t) => String(t.status).toLowerCase() === 'čeka zatvaranje');
  const pendingMaterial = openTickets.filter((t) => t.pendingMaterial);
  const alerts = [];
  if (staleOpen.length) alerts.push({ level: 'warning', key: 'stale', title: 'Dugo otvorena vaganja', text: `${staleOpen.length} vaganja otvoreno je duže od 12 sati.`, href: '/gate' });
  if (waitingClose.length) alerts.push({ level: 'info', key: 'waiting', title: 'Čeka zatvaranje', text: `${waitingClose.length} vaganja ima oba mjerenja i čeka zatvaranje.`, href: '/gate' });
  if (pendingMaterial.length) alerts.push({ level: 'warning', key: 'pending-material', title: 'Nepotvrđen materijal', text: `${pendingMaterial.length} otvorenih vaganja ima privremeni materijal.`, href: '/gate' });
  if (negativeStockRows) alerts.push({ level: 'danger', key: 'negative-stock', title: 'Negativno stanje', text: `${negativeStockRows} stavki skladišta ima negativno stanje.`, href: '/inventory' });
  if (ordersOverPlan.length) alerts.push({ level: 'warning', key: 'orders-over', title: 'Narudžbe preko plana', text: `${ordersOverPlan.map((o) => o.code).join(', ')} prelaze plan uz toleranciju.`, href: '/sourcing/contracts' });
  if (overdueAnnouncements.length) alerts.push({ level: 'info', key: 'overdue-ann', title: 'Najave u kašnjenju', text: `${overdueAnnouncements.length} najava ima prošao očekivani datum.`, href: '/gate/announcements' });

  // po lokacijama (samo admin vidi sve lokacije)
  let byLocation = [];
  if (companies.length) {
    byLocation = companies.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      ...summarizeTickets(allTickets.filter((t) => t.companyId === c.id)),
    }));
  }

  res.json({
    data: {
      range: { from, to, days: spanDays, granularity, previousFrom: prevFrom, previousTo: addDaysYmd(from, -1) },
      scope: { companyId: req.activeCompanyId || null },
      summary,
      previous,
      stock: { kg: round2(stockKg), value: round2(stockValue), negativeRows: negativeStockRows, materials: stockByMaterial.size },
      series,
      topMaterialsIn: topList(byMaterialIn),
      topMaterialsOut: topList(byMaterialOut),
      topSuppliers: topList(bySupplier),
      topStock,
      openTickets,
      recentTickets,
      orders,
      announcements: { pending: announcements.length, overdue: overdueAnnouncements.length, upcoming: upcomingAnnouncements },
      alerts,
      byLocation,
      generatedAt: new Date().toISOString(),
    },
  });
});

router.get('/flow', requireOwnerReview, async (req, res) => {
  const { from, to, type, search } = req.query;
  const where = { ...scopedWhere(req) };

  // granice dana po lokalnom vremenu (Europe/Sarajevo)
  if (isValidYmd(from) || isValidYmd(to)) {
    where.createdAt = {};
    if (isValidYmd(from)) where.createdAt.gte = zonedDayStart(String(from));
    if (isValidYmd(to)) where.createdAt.lt = zonedDayStart(addDaysYmd(String(to), 1));
  }

  if (type === 'IN') where.type = 'purchase';
  if (type === 'OUT') where.type = 'sale';

  // sve transakcije u periodu (ranije samo zadnjih 500 → netačni zbirovi za duže periode)
  const transactions = await prisma.inventoryTransaction.findMany({
    where,
    include: { material: { select: { code: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20000,
  });

  const searchText = String(search || '').trim().toLowerCase();
  const userIds = [...new Set(transactions.map((item) => item.createdBy).filter(Boolean))];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : [];
  const userById = new Map(users.map((u) => [u.id, u.name]));
  const companyIds = [...new Set(transactions.map((item) => item.companyId).filter(Boolean))];
  const companies = companyIds.length
    ? await prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } })
    : [];
  const companyById = new Map(companies.map((c) => [c.id, c.name]));

  const normalized = transactions
    .map((item) => ({
      id: item.id,
      code: item.code,
      createdAt: item.createdAt,
      type: item.type === 'sale' ? 'OUT' : item.type === 'purchase' ? 'IN' : String(item.type || '').toUpperCase(),
      quantityKg: Number(item.quantityKg || 0),
      materialCode: item.material?.code || '-',
      materialName: item.material?.name || '-',
      actorName: userById.get(item.createdBy) || item.createdBy || 'Sistem',
      note: item.note || '',
      companyId: item.companyId || null,
      companyName: companyById.get(item.companyId) || null,
    }))
    .filter((item) => {
      if (!searchText) return true;
      return (
        item.actorName.toLowerCase().includes(searchText) ||
        item.materialCode.toLowerCase().includes(searchText) ||
        item.materialName.toLowerCase().includes(searchText) ||
        String(item.note || '').toLowerCase().includes(searchText)
      );
    });

  const summary = normalized.reduce(
    (acc, item) => {
      if (item.type === 'IN') acc.totalInKg += item.quantityKg;
      if (item.type === 'OUT') acc.totalOutKg += item.quantityKg;
      return acc;
    },
    { totalInKg: 0, totalOutKg: 0 }
  );

  const byMaterialMap = new Map();
  normalized.forEach((item) => {
    const key = item.materialCode || item.materialName || 'N/A';
    if (!byMaterialMap.has(key)) {
      byMaterialMap.set(key, { material: key, inKg: 0, outKg: 0 });
    }
    const row = byMaterialMap.get(key);
    if (item.type === 'IN') row.inKg += item.quantityKg;
    if (item.type === 'OUT') row.outKg += item.quantityKg;
  });
  const byMaterial = [...byMaterialMap.values()]
    .sort((a, b) => (b.inKg + b.outKg) - (a.inKg + a.outKg))
    .slice(0, 8);

  const mostActiveProducts = [...byMaterialMap.entries()]
    .map(([key, row]) => ({
      material: key,
      movementKg: Number((row.inKg + row.outKg).toFixed(2)),
      inKg: Number(row.inKg.toFixed(2)),
      outKg: Number(row.outKg.toFixed(2)),
    }))
    .sort((a, b) => b.movementKg - a.movementKg)
    .slice(0, 10);

  const dailyMap = new Map();
  normalized.forEach((item) => {
    if (item.type !== 'IN' && item.type !== 'OUT') return;
    const day = ymdInTz(new Date(item.createdAt));
    const row = dailyMap.get(day) || { date: day, inKg: 0, outKg: 0 };
    if (item.type === 'IN') row.inKg += item.quantityKg;
    else row.outKg += item.quantityKg;
    dailyMap.set(day, row);
  });
  const daily = [...dailyMap.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => ({ date: row.date, inKg: round2(row.inKg), outKg: round2(row.outKg) }));

  // stanje sabrano po materijalu (isti materijal može imati više zona/varijanti)
  const stockRows = await prisma.inventoryStock.findMany({
    where: scopedWhere(req),
    include: { material: { select: { code: true, name: true } } },
  });
  const stockByMaterial = new Map();
  stockRows.forEach((row) => {
    const key = row.material?.code || row.material?.name || '-';
    stockByMaterial.set(key, (stockByMaterial.get(key) || 0) + Number(row.stockKg || 0));
  });
  const topStock = [...stockByMaterial.entries()]
    .map(([material, kg]) => ({ material, kg: round2(kg) }))
    .filter((row) => row.kg > 0)
    .sort((a, b) => b.kg - a.kg)
    .slice(0, 8);

  return res.json({
    data: {
      summary: {
        totalInKg: round2(summary.totalInKg),
        totalOutKg: round2(summary.totalOutKg),
        transactionCount: normalized.length,
      },
      history: normalized,
      daily,
      byMaterial,
      topStock,
      mostActiveProducts,
    },
  });
});

export default router;
