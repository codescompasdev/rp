import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { applyConversion, applyInbound, applyOutbound, applySortingSplit } from '../services/stockLedger.js';

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseCategoryPath(pathValue) {
  const [categoryNameRaw, subcategoryNameRaw] = String(pathValue || '').split('/');
  return {
    categoryName: String(categoryNameRaw || '').trim() || 'Nedefinisano',
    subcategoryName: String(subcategoryNameRaw || '').trim() || 'Opste',
  };
}

router.get('/materials', async (req, res) => {
  const data = await prisma.material.findMany({
    include: {
      variants: true,
      categoryRef: true,
      subcategoryRef: { include: { category: true } },
    },
    orderBy: { code: 'asc' },
  });
  res.json({ data });
});

router.post('/materials', async (req, res) => {
  const data = await prisma.material.create({
    data: req.body,
    include: { variants: true },
  });
  res.status(201).json({ data });
});

router.get('/suppliers', async (req, res) => {
  const data = await prisma.supplier.findMany({
    where: { active: true },
    orderBy: { code: 'asc' },
  });
  res.json({ data });
});

router.post('/suppliers', async (req, res) => {
  const code = `S-${String(await prisma.supplier.count() + 1001)}`;
  const data = await prisma.supplier.create({
    data: { ...req.body, code },
  });
  res.status(201).json({ data });
});

router.post('/transactions/purchase', async (req, res) => {
  const {
    materialId,
    materialVariantId = null,
    quantity,
    unitPrice,
    note,
    zone = 'DEFAULT',
  } = req.body || {};
  if (!materialId) {
    return res.status(400).json({ error: 'materialId is required' });
  }

  const qty = toNumber(quantity, 0);
  const price = toNumber(unitPrice, 0);
  const companyId = req.activeCompanyId || req.userCompanyId || null;

  const data = await prisma.$transaction(async (tx) => {
    await applyInbound(tx, {
      materialId,
      materialVariantId,
      quantityKg: qty,
      unitPrice: price,
      note: note || null,
      createdBy: req.userId || null,
      companyId,
      zone,
      movementType: 'purchase',
      movementPrefix: 'INV-IN',
    });
    return tx.inventoryTransaction.findFirst({
      where: {
        materialId,
        materialVariantId: materialVariantId || null,
        companyId,
        type: 'purchase',
        createdBy: req.userId || null,
      },
      include: { material: true, materialVariant: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  return res.status(201).json({ data });
});

router.post('/transactions/sale', async (req, res) => {
  const {
    materialId,
    materialVariantId = null,
    quantity,
    unitPrice,
    note,
    zone = 'DEFAULT',
  } = req.body || {};
  if (!materialId) {
    return res.status(400).json({ error: 'materialId is required' });
  }

  const qty = toNumber(quantity, 0);
  const price = toNumber(unitPrice, 0);
  const companyId = req.activeCompanyId || req.userCompanyId || null;

  try {
    const data = await prisma.$transaction(async (tx) => {
      await applyOutbound(tx, {
        materialId,
        materialVariantId,
        quantityKg: qty,
        unitPrice: price,
        note: note || null,
        createdBy: req.userId || null,
        companyId,
        zone,
        movementType: 'sale',
        movementPrefix: 'INV-OUT',
      });
      return tx.inventoryTransaction.findFirst({
        where: {
          materialId,
          materialVariantId: materialVariantId || null,
          companyId,
          type: 'sale',
          createdBy: req.userId || null,
        },
        include: { material: true, materialVariant: true },
        orderBy: { createdAt: 'desc' },
      });
    });
    return res.status(201).json({ data });
  } catch (error) {
    if (String(error?.message || '').startsWith('Insufficient stock')) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    throw error;
  }
});

router.post('/conversions', async (req, res) => {
  const {
    inputMaterialId,
    inputMaterialVariantId = null,
    outputMaterialId,
    outputMaterialVariantId = null,
    inputQtyKg,
    outputQtyKg,
    note,
    zone = 'DEFAULT',
  } = req.body || {};
  if (!inputMaterialId || !outputMaterialId) {
    return res.status(400).json({ error: 'inputMaterialId and outputMaterialId are required' });
  }
  const inputQty = toNumber(inputQtyKg, 0);
  const outputQty = toNumber(outputQtyKg, 0);
  if (inputQty <= 0 || outputQty <= 0) {
    return res.status(400).json({ error: 'inputQtyKg and outputQtyKg must be greater than zero' });
  }
  const companyId = req.activeCompanyId || req.userCompanyId || null;
  try {
    await prisma.$transaction(async (tx) => {
      await applyConversion(tx, {
        inputMaterialId,
        inputMaterialVariantId,
        outputMaterialId,
        outputMaterialVariantId,
        inputQtyKg: inputQty,
        outputQtyKg: outputQty,
        companyId,
        createdBy: req.userId || null,
        note: note || null,
        zone,
      });
    });
    return res.status(201).json({ data: { ok: true } });
  } catch (error) {
    if (String(error?.message || '').startsWith('Insufficient stock')) {
      return res.status(400).json({ error: 'Insufficient stock for conversion input material' });
    }
    throw error;
  }
});

router.post('/sorting', async (req, res) => {
  const {
    inputMaterialId,
    inputMaterialVariantId = null,
    inputQtyKg,
    outputs = [],
    note,
    zone = 'DEFAULT',
    operationId,
  } = req.body || {};

  if (!inputMaterialId) {
    return res.status(400).json({ error: 'inputMaterialId is required' });
  }
  const inputQty = toNumber(inputQtyKg, 0);
  if (inputQty <= 0) {
    return res.status(400).json({ error: 'inputQtyKg must be greater than zero' });
  }
  if (!Array.isArray(outputs) || outputs.length === 0) {
    return res.status(400).json({ error: 'outputs must include at least one item' });
  }

  const normalizedOutputs = outputs.map((line) => ({
    materialId: String(line?.materialId || '').trim(),
    materialVariantId: line?.materialVariantId ? String(line.materialVariantId).trim() : null,
    quantityKg: toNumber(line?.qtyKg ?? line?.quantityKg, 0),
  })).filter((line) => line.materialId && line.quantityKg > 0);

  if (normalizedOutputs.length !== outputs.length) {
    return res.status(400).json({ error: 'Each output must include materialId and qtyKg > 0' });
  }
  const totalOutput = normalizedOutputs.reduce((sum, line) => sum + line.quantityKg, 0);
  if (Math.abs(totalOutput - inputQty) > 0.01) {
    return res.status(400).json({ error: 'Sum of outputs must match inputQtyKg' });
  }

  const companyId = req.activeCompanyId || req.userCompanyId || null;
  const resolvedOperationId = String(operationId || '').trim() || `SORT-${randomUUID()}`;

  try {
    await prisma.$transaction(async (tx) => {
      await applySortingSplit(tx, {
        inputMaterialId,
        inputMaterialVariantId,
        inputQtyKg: inputQty,
        outputs: normalizedOutputs,
        companyId,
        createdBy: req.userId || null,
        note: note || null,
        operationId: resolvedOperationId,
        zone,
      });
    });

    return res.status(201).json({
      data: {
        ok: true,
        operationId: resolvedOperationId,
        inputQtyKg: inputQty,
        outputQtyKg: totalOutput,
      },
    });
  } catch (error) {
    if (String(error?.message || '').startsWith('Insufficient stock')) {
      return res.status(400).json({ error: 'Insufficient stock for sorting input material' });
    }
    return res.status(400).json({ error: error?.message || 'Sorting failed' });
  }
});

router.get('/transactions', async (req, res) => {
  const { type, materialId, materialVariantId } = req.query;
  const where = {};
  if (type) {
    where.type = String(type);
  }
  if (materialId) {
    where.materialId = String(materialId);
  }
  if (materialVariantId) {
    where.materialVariantId = String(materialVariantId);
  }
  if (req.activeCompanyId) {
    where.companyId = req.activeCompanyId;
  }
  const data = await prisma.inventoryTransaction.findMany({
    where,
    include: { material: true, materialVariant: true, stock: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ data });
});

router.get('/grid', async (req, res) => {
  const companyId = req.activeCompanyId || req.userCompanyId || null;
  const materials = await prisma.material.findMany({
    include: {
      variants: true,
      categoryRef: true,
      subcategoryRef: { include: { category: true } },
      inventoryStocks: {
        where: companyId ? { companyId } : {},
        include: { materialVariant: true },
      },
    },
    orderBy: { code: 'asc' },
  });
  const rows = materials.flatMap((material) => {
    const category = material.categoryRef?.name || material.subcategoryRef?.category?.name || parseCategoryPath(material.category).categoryName;
    const subcategory = material.subcategoryRef?.name || parseCategoryPath(material.category).subcategoryName;
    const variants = Array.isArray(material.variants) && material.variants.length
      ? material.variants
      : [{ id: null, grade: 'Osnovni kvalitet', buyPrice: material.buyPrice || 0 }];
    return variants.map((variant) => {
      const stocks = (material.inventoryStocks || []).filter((s) => {
        if (variant.id) return s.materialVariantId === variant.id;
        return !s.materialVariantId;
      });
      const stockKg = stocks.reduce((sum, row) => sum + toNumber(row.stockKg, 0), 0);
      const avgBuyPrice = stocks.length
        ? (stocks.reduce((sum, row) => sum + toNumber(row.avgBuyPrice, 0), 0) / stocks.length)
        : toNumber(variant.buyPrice, toNumber(material.buyPrice, 0));
      const mktPrice = stocks.length
        ? (stocks.reduce((sum, row) => sum + toNumber(row.mktPrice, 0), 0) / stocks.length)
        : toNumber(material.basePrice, 0);
      return {
        materialId: material.id,
        variantId: variant.id,
        code: material.code,
        materialName: material.name,
        variantName: variant.grade || 'Osnovni kvalitet',
        category,
        subcategory,
        unit: material.baseUnit || 'KG',
        stockKg,
        avgBuyPrice,
        mktPrice,
        margin: (mktPrice - avgBuyPrice) * stockKg,
        zones: stocks.map((row) => ({
          id: row.id,
          zone: row.zone,
          stockKg: toNumber(row.stockKg, 0),
          avgBuyPrice: toNumber(row.avgBuyPrice, 0),
          mktPrice: toNumber(row.mktPrice, 0),
          margin: toNumber(row.margin, 0),
        })),
      };
    });
  });
  res.json({ data: rows });
});

export default router;
