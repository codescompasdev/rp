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

function remarkScope(req) {
  return req.activeCompanyId ? { companyId: req.activeCompanyId } : {};
}

router.get('/', async (req, res) => {
  const data = await prisma.remark.findMany({
    where: remarkScope(req),
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: data.map((r) => ({ ...r, status: r.status || 'Aktivna' })) });
});

router.post('/', upload.array('images', 5), async (req, res) => {
  const images = (req.files || []).map((f) => `/uploads/${f.filename}`);
  const data = await prisma.remark.create({
    data: {
      ...req.body,
      images,
      status: req.body.status || 'Aktivna',
      companyId: req.activeCompanyId || req.userCompanyId || null,
    },
  });
  res.status(201).json({ data });
});

export default router;
