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
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

function documentScope(req) {
  return req.activeCompanyId ? { companyId: req.activeCompanyId } : {};
}

router.get('/', async (req, res) => {
  const data = await prisma.document.findMany({
    where: documentScope(req),
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: data.map((d) => ({ ...d, originalName: d.originalName || d.filename })) });
});

router.post('/', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${file.filename}`;
  const data = await prisma.document.create({
    data: {
      filename: file.filename,
      originalName: file.originalname,
      url,
      description: req.body.description,
      uploadedBy: req.userId,
      companyId: req.activeCompanyId || req.userCompanyId || null,
    },
  });
  res.status(201).json({ data: { ...data, originalName: data.originalName || data.filename } });
});

router.delete('/:id', async (req, res) => {
  const deleted = await prisma.document.deleteMany({ where: { id: req.params.id, ...documentScope(req) } });
  if (!deleted.count) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
