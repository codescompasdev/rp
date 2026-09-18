import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/inventory', async (req, res) => {
  const companyId = req.activeCompanyId || req.userCompanyId || null;
  const where = companyId ? { companyId } : {};
  const [stocks, materials] = await Promise.all([
    prisma.inventoryStock.findMany({
      where,
      include: { material: true, materialVariant: true },
      orderBy: [{ zone: 'asc' }],
    }),
    prisma.material.findMany({
      include: { variants: true },
      orderBy: { code: 'asc' },
    }),
  ]);

  const existingKeys = new Set(stocks.map((row) => `${row.materialId}:${row.materialVariantId || 'base'}:${row.zone}`));
  const zeroRows = materials
    .flatMap((material) => {
      const variants = Array.isArray(material.variants) && material.variants.length
        ? material.variants
        : [{ id: null, grade: 'Osnovni kvalitet' }];
      return variants
        .filter((variant) => !existingKeys.has(`${material.id}:${variant.id || 'base'}:DEFAULT`))
        .map((variant) => ({
          id: `virtual-${companyId || 'global'}-${material.id}-${variant.id || 'base'}`,
          materialId: material.id,
          materialVariantId: variant.id || null,
          materialVariant: variant.id ? variant : null,
          zone: 'DEFAULT',
          stockKg: 0,
          avgBuyPrice: Number(variant.buyPrice || material.buyPrice || 0),
          mktPrice: Number(material.basePrice || 0),
          margin: 0,
          companyId: companyId || null,
          material,
        }));
    });

  const data = [...stocks, ...zeroRows].sort((a, b) => {
    const codeA = String(a?.material?.code || '');
    const codeB = String(b?.material?.code || '');
    if (codeA === codeB) {
      const variantA = String(a?.materialVariant?.grade || '');
      const variantB = String(b?.materialVariant?.grade || '');
      if (variantA !== variantB) {
        return variantA.localeCompare(variantB);
      }
      return String(a.zone || '').localeCompare(String(b.zone || ''));
    }
    return codeA.localeCompare(codeB);
  });
  res.json({ data });
});

router.get('/zones', async (req, res) => {
  const data = await prisma.warehouseZone.findMany({ orderBy: { zone: 'asc' } });
  res.json({ data });
});

router.get('/movements', async (req, res) => {
  res.json({ data: [] });
});

router.post('/movements', async (req, res) => {
  res.status(201).json({ data: req.body });
});

router.get('/inventory-check', async (req, res) => {
  res.json({ data: [] });
});

router.post('/inventory-check', async (req, res) => {
  res.status(201).json({ data: req.body });
});

export default router;
