import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { frontendToVehicle, vehicleToFrontend } from '../lib/vehicleMap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

const uploadDir = path.join(__dirname, '../../uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

function companyScope(req, key = 'companyId') {
  return req.activeCompanyId ? { [key]: req.activeCompanyId } : {};
}

router.get('/vehicles', async (req, res) => {
  const data = await prisma.vehicle.findMany({
    where: companyScope(req),
    include: { drivers: true },
    orderBy: { code: 'asc' },
  });
  res.json({ data: data.map(vehicleToFrontend) });
});

router.get('/vehicles/:id', async (req, res) => {
  const data = await prisma.vehicle.findFirst({
    where: { id: req.params.id, ...companyScope(req) },
    include: {
      drivers: true,
      maintenanceLogs: { orderBy: { date: 'desc' }, take: 20 },
      fuelLogs: { orderBy: { date: 'desc' }, take: 20 },
      registrationLogs: { orderBy: { expiryDate: 'desc' }, take: 10 },
    },
  });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ data: vehicleToFrontend(data) });
});

router.post('/vehicles', upload.array('images', 10), async (req, res) => {
  const code = `V-${String(await prisma.vehicle.count() + 1).padStart(3, '0')}`;
  const images = (req.files || []).map((f) => `/uploads/${f.filename}`);
  const mapped = frontendToVehicle(req.body);
  const data = await prisma.vehicle.create({
    data: {
      ...mapped,
      code,
      images,
      type: mapped.type || 'Kamion',
      status: mapped.status || 'Active',
      companyId: req.activeCompanyId || req.userCompanyId || mapped.companyId || null,
    },
  });
  res.status(201).json({ data: vehicleToFrontend(data) });
});

router.put('/vehicles/:id', async (req, res) => {
  const existing = await prisma.vehicle.findFirst({
    where: { id: req.params.id, ...companyScope(req) },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const mapped = frontendToVehicle(req.body);
  const data = await prisma.vehicle.update({
    where: { id: req.params.id },
    data: Object.fromEntries(Object.entries(mapped).filter(([, v]) => v !== undefined)),
  });
  res.json({ data: vehicleToFrontend(data) });
});

router.get('/drivers', async (req, res) => {
  const data = await prisma.driver.findMany({
    where: companyScope(req),
    include: { vehicle: true },
    orderBy: { code: 'asc' },
  });
  res.json({ data });
});

router.get('/drivers/:id/history', async (req, res) => {
  const driver = await prisma.driver.findFirst({
    where: { id: req.params.id, ...companyScope(req) },
    select: { id: true },
  });
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  const data = await prisma.dispatchOrder.findMany({
    where: { driverId: req.params.id },
    orderBy: { code: 'desc' },
    take: 20,
  });
  res.json({ data });
});

router.post('/drivers', async (req, res) => {
  const code = `D-${String(await prisma.driver.count() + 1).padStart(3, '0')}`;
  const data = await prisma.driver.create({
    data: {
      ...req.body,
      code,
      companyId: req.activeCompanyId || req.userCompanyId || req.body.companyId || null,
    },
  });
  res.status(201).json({ data });
});

router.get('/orders', async (req, res) => {
  const data = await prisma.dispatchOrder.findMany({
    orderBy: { code: 'desc' },
  });
  res.json({ data });
});

router.post('/orders', async (req, res) => {
  const code = `NV-2026-${String(await prisma.dispatchOrder.count() + 88).padStart(3, '0')}`;
  const data = await prisma.dispatchOrder.create({
    data: { ...req.body, code },
  });
  res.status(201).json({ data });
});

router.post('/maintenance', upload.array('attachments', 5), async (req, res) => {
  const attachments = (req.files || []).map((f) => `/uploads/${f.filename}`);
  const { vehicleId, description, cost, date } = req.body;
  if (!vehicleId) return res.status(400).json({ error: 'vehicleId required' });
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ...companyScope(req) },
    select: { id: true },
  });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  const data = await prisma.fleetMaintenanceLog.create({
    data: {
      vehicleId,
      description: description || '',
      cost: parseFloat(cost) || 0,
      date: date ? new Date(date) : new Date(),
      attachments,
    },
  });
  res.status(201).json({ data });
});

router.post('/fuel', upload.single('receipt'), async (req, res) => {
  const receipt = req.file ? `/uploads/${req.file.filename}` : null;
  const { vehicleId, liters, cost, odometer, date } = req.body;
  if (!vehicleId) return res.status(400).json({ error: 'vehicleId required' });
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ...companyScope(req) },
    select: { id: true },
  });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  const data = await prisma.fleetFuelLog.create({
    data: {
      vehicleId,
      liters: parseFloat(liters) || 0,
      cost: parseFloat(cost) || 0,
      odometer: odometer ? parseInt(odometer, 10) : null,
      date: date ? new Date(date) : new Date(),
      receipt,
    },
  });
  res.status(201).json({ data });
});

router.post('/registrations', upload.array('documents', 5), async (req, res) => {
  const documents = (req.files || []).map((f) => `/uploads/${f.filename}`);
  const { vehicleId, expiryDate, cost, notes } = req.body;
  if (!vehicleId) return res.status(400).json({ error: 'vehicleId required' });
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ...companyScope(req) },
    select: { id: true },
  });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  const data = await prisma.fleetRegistrationLog.create({
    data: {
      vehicleId,
      expiryDate: expiryDate ? new Date(expiryDate) : new Date(),
      cost: parseFloat(cost) || 0,
      notes: notes || null,
      documents,
    },
  });
  res.status(201).json({ data });
});

export default router;
