import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

const uploadDir = path.join(__dirname, '../../uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `incident-${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

function workerScope(req) {
  return req.activeCompanyId ? { companyId: req.activeCompanyId } : {};
}

router.get('/workers', async (req, res) => {
  const data = await prisma.worker.findMany({ where: workerScope(req), orderBy: { code: 'asc' } });
  res.json({ data });
});

router.post('/workers', async (req, res) => {
  const code = `W-${String(await prisma.worker.count() + 1).padStart(3, '0')}`;
  const data = await prisma.worker.create({
    data: {
      ...req.body,
      code,
      companyId: req.activeCompanyId || req.userCompanyId || req.body.companyId || null,
    },
  });
  res.status(201).json({ data });
});

router.put('/workers/:id', async (req, res) => {
  const data = await prisma.worker.updateMany({
    where: { id: req.params.id, ...workerScope(req) },
    data: req.body,
  });
  if (!data.count) return res.status(404).json({ error: 'Not found' });
  const worker = await prisma.worker.findUnique({ where: { id: req.params.id } });
  res.json({ data: worker });
});

router.get('/shifts', async (req, res) => {
  const data = await prisma.shift.findMany({
    orderBy: { date: 'desc' },
    take: 10,
  });
  res.json({ data });
});

router.post('/shifts', async (req, res) => {
  const data = await prisma.shift.create({ data: req.body });
  res.status(201).json({ data });
});

router.get('/incidents', async (req, res) => {
  const data = await prisma.incident.findMany({
    orderBy: { date: 'desc' },
  });
  res.json({ data });
});

router.post('/incidents', upload.single('photo'), async (req, res) => {
  const code = `INC-${String(await prisma.incident.count() + 6).padStart(3, '0')}`;
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const { type, location, description, workerId, severity, correctiveAction } = req.body;
  const data = await prisma.incident.create({
    data: {
      code,
      date: new Date(),
      type: type || 'Povreda',
      location: location || '',
      description: description || '',
      workerId: workerId || null,
      severity: severity || 'Lakša',
      status: 'Istražuje Se',
      correctiveAction: correctiveAction || null,
      photoUrl,
    },
  });
  res.status(201).json({ data });
});

router.put('/incidents/:id', async (req, res) => {
  const data = await prisma.incident.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ data });
});

export default router;
