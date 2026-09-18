import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

function parseCategoryPath(pathValue) {
  const [categoryNameRaw, subcategoryNameRaw] = String(pathValue || '').split('/');
  return {
    categoryName: String(categoryNameRaw || '').trim(),
    subcategoryName: String(subcategoryNameRaw || '').trim(),
  };
}

function materialInclude(companyId = null, includeStock = false) {
  return {
    variants: true,
    categoryRef: true,
    subcategoryRef: { include: { category: true } },
    ...(includeStock
      ? {
        inventoryStocks: {
          where: companyId ? { companyId } : {},
          include: { materialVariant: true },
          orderBy: [{ zone: 'asc' }],
        },
      }
      : {}),
  };
}

async function resolveTaxonomy(tx, payload) {
  const parsed = parseCategoryPath(payload.category);
  const categoryName = String(payload.categoryName || parsed.categoryName || 'Nedefinisano').trim();
  const subcategoryName = String(payload.subcategoryName || parsed.subcategoryName || 'Opste').trim();

  let category = null;
  if (payload.categoryId) {
    category = await tx.materialCategory.findUnique({ where: { id: payload.categoryId } });
  }
  if (!category) {
    category = await tx.materialCategory.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName },
    });
  }

  let subcategory = null;
  if (payload.subcategoryId) {
    subcategory = await tx.materialSubcategory.findUnique({ where: { id: payload.subcategoryId } });
  }
  if (!subcategory) {
    subcategory = await tx.materialSubcategory.upsert({
      where: {
        categoryId_name: {
          categoryId: category.id,
          name: subcategoryName,
        },
      },
      update: {},
      create: {
        categoryId: category.id,
        name: subcategoryName,
      },
    });
  }

  return {
    categoryId: category.id,
    subcategoryId: subcategory.id,
    category: `${category.name} / ${subcategory.name}`,
  };
}

function isUnknownCategoryIdError(error) {
  const text = String(error?.message || '');
  return text.includes('Unknown argument `categoryId`') || text.includes('Unknown argument categoryId');
}

function buildLegacyMaterialData(input, taxonomy) {
  const data = { ...input };
  delete data.categoryId;
  delete data.subcategoryId;
  delete data.categoryName;
  delete data.subcategoryName;
  data.category = taxonomy?.category || data.category || 'Nedefinisano / Opste';
  return data;
}

router.get('/', async (req, res) => {
  const availableOnly = String(req.query.availableOnly || '').toLowerCase() === 'true';
  const includeStock = String(req.query.includeStock || '').toLowerCase() === 'true';
  const companyId = req.activeCompanyId || req.userCompanyId || null;
  const allMaterials = await prisma.material.findMany({
    include: materialInclude(companyId, includeStock || availableOnly),
    orderBy: { code: 'asc' },
  });
  if (!availableOnly) {
    return res.json({ data: allMaterials });
  }
  if (!companyId) {
    return res.json({ data: allMaterials });
  }
  const data = allMaterials.filter((material) => {
    const stocks = material.inventoryStocks || [];
    return stocks.some((row) => Number(row.stockKg || 0) > 0);
  });
  return res.json({ data });
});

router.get('/taxonomy/tree', async (_req, res) => {
  const data = await prisma.materialCategory.findMany({
    include: {
      subcategories: {
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });
  res.json({ data });
});

router.post('/taxonomy/categories', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name is required' });
  const data = await prisma.materialCategory.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  res.status(201).json({ data });
});

router.put('/taxonomy/categories/:id', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name is required' });
  const data = await prisma.materialCategory.update({
    where: { id: req.params.id },
    data: { name },
  });
  await prisma.$executeRawUnsafe(
    'UPDATE "Material" m SET "category" = CONCAT(c."name", \' / \', COALESCE(sc."name", \'Opste\')) FROM "MaterialCategory" c LEFT JOIN "MaterialSubcategory" sc ON sc."id" = m."subcategoryId" WHERE m."categoryId" = c."id" AND c."id" = $1',
    req.params.id,
  );
  res.json({ data });
});

router.delete('/taxonomy/categories/:id', async (req, res) => {
  const inUse = await prisma.material.count({ where: { categoryId: req.params.id } });
  if (inUse > 0) {
    return res.status(409).json({ error: 'Category is in use by materials' });
  }
  await prisma.materialCategory.delete({ where: { id: req.params.id } });
  res.json({ data: { ok: true } });
});

router.post('/taxonomy/subcategories', async (req, res) => {
  const categoryId = String(req.body?.categoryId || '').trim();
  const name = String(req.body?.name || '').trim();
  if (!categoryId || !name) return res.status(400).json({ error: 'categoryId and name are required' });
  const data = await prisma.materialSubcategory.upsert({
    where: {
      categoryId_name: {
        categoryId,
        name,
      },
    },
    update: {},
    create: {
      categoryId,
      name,
    },
  });
  res.status(201).json({ data });
});

router.put('/taxonomy/subcategories/:id', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name is required' });
  const current = await prisma.materialSubcategory.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ error: 'Subcategory not found' });
  const data = await prisma.materialSubcategory.update({
    where: { id: req.params.id },
    data: { name },
  });
  await prisma.$executeRawUnsafe(
    'UPDATE "Material" m SET "category" = CONCAT(c."name", \' / \', $1) FROM "MaterialCategory" c WHERE m."subcategoryId" = $2 AND m."categoryId" = c."id"',
    name,
    req.params.id,
  );
  res.json({ data });
});

router.delete('/taxonomy/subcategories/:id', async (req, res) => {
  const inUse = await prisma.material.count({ where: { subcategoryId: req.params.id } });
  if (inUse > 0) {
    return res.status(409).json({ error: 'Subcategory is in use by materials' });
  }
  await prisma.materialSubcategory.delete({ where: { id: req.params.id } });
  res.json({ data: { ok: true } });
});

router.post('/', async (req, res) => {
  const { variants, ...rest } = req.body || {};
  try {
    const data = await prisma.$transaction(async (tx) => {
      const taxonomy = await resolveTaxonomy(tx, rest);
      let createdMaterial;
      try {
        createdMaterial = await tx.material.create({
          data: {
            ...rest,
            ...taxonomy,
          },
        });
      } catch (error) {
        if (!isUnknownCategoryIdError(error)) throw error;
        createdMaterial = await tx.material.create({
          data: buildLegacyMaterialData(rest, taxonomy),
        });
      }
      const variantRows = Array.isArray(variants) && variants.length
        ? variants
        : [{
          grade: 'Osnovni kvalitet',
          condition: 'Standard',
          minPurity: null,
          buyPrice: Number(rest.buyPrice || 0),
          chemicalData: {},
        }];
      await tx.materialVariant.createMany({
        data: variantRows.map((v) => ({
          ...v,
          buyPrice: Number(v.buyPrice || rest.buyPrice || 0),
          materialId: createdMaterial.id,
        })),
      });
      return tx.material.findUnique({
        where: { id: createdMaterial.id },
        include: materialInclude(req.activeCompanyId || req.userCompanyId || null, true),
      });
    });
    return res.status(201).json({ data });
  } catch (error) {
    return res.status(400).json({ error: String(error?.message || 'Material create failed') });
  }
});

router.get('/:code', async (req, res) => {
  const companyId = req.activeCompanyId || req.userCompanyId || null;
  const data = await prisma.material.findUnique({
    where: { code: req.params.code },
    include: materialInclude(companyId, true),
  });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ data });
});

router.put('/:code', async (req, res) => {
  const { variants, ...rest } = req.body || {};
  try {
    const data = await prisma.$transaction(async (tx) => {
      const taxonomy = await resolveTaxonomy(tx, rest);
      let updated;
      try {
        updated = await tx.material.update({
          where: { code: req.params.code },
          data: {
            ...rest,
            ...taxonomy,
          },
        });
      } catch (error) {
        if (!isUnknownCategoryIdError(error)) throw error;
        updated = await tx.material.update({
          where: { code: req.params.code },
          data: buildLegacyMaterialData(rest, taxonomy),
        });
      }
      return tx.material.findUnique({
        where: { id: updated.id },
        include: materialInclude(req.activeCompanyId || req.userCompanyId || null, true),
      });
    });
    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: String(error?.message || 'Material update failed') });
  }
});

router.delete('/:code', async (req, res) => {
  const material = await prisma.material.findUnique({
    where: { code: req.params.code },
    select: { id: true, code: true },
  });
  if (!material) return res.status(404).json({ error: 'Material not found' });

  const [stockAggregate, txnCount] = await Promise.all([
    prisma.inventoryStock.aggregate({
      where: { materialId: material.id },
      _sum: { stockKg: true },
    }),
    prisma.inventoryTransaction.count({ where: { materialId: material.id } }),
  ]);
  const totalStockKg = Number(stockAggregate?._sum?.stockKg || 0);

  if (totalStockKg > 0 || txnCount > 0) {
    return res.status(409).json({ error: 'Material has stock/transactions and cannot be deleted' });
  }

  try {
    await prisma.inventoryStock.deleteMany({ where: { materialId: material.id } });
    await prisma.material.delete({
      where: { id: material.id },
    });
    return res.json({ data: { ok: true } });
  } catch {
    return res.status(409).json({ error: 'Material is referenced in other documents and cannot be deleted' });
  }
});

router.post('/:code/variants', async (req, res) => {
  const material = await prisma.material.findUnique({
    where: { code: req.params.code },
  });
  if (!material) return res.status(404).json({ error: 'Material not found' });
  const variant = await prisma.materialVariant.create({
    data: { ...req.body, materialId: material.id },
  });
  res.status(201).json({ data: variant });
});

router.put('/:code/variants/:id', async (req, res) => {
  const variant = await prisma.materialVariant.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ data: variant });
});

router.delete('/:code/variants/:id', async (req, res) => {
  const [stockAggregate, txnCount] = await Promise.all([
    prisma.inventoryStock.aggregate({
      where: { materialVariantId: req.params.id },
      _sum: { stockKg: true },
    }),
    prisma.inventoryTransaction.count({
      where: { materialVariantId: req.params.id },
    }),
  ]);
  const totalStockKg = Number(stockAggregate?._sum?.stockKg || 0);
  if (totalStockKg > 0 || txnCount > 0) {
    return res.status(409).json({ error: 'Variant has stock/transactions and cannot be deleted' });
  }
  await prisma.inventoryStock.deleteMany({
    where: { materialVariantId: req.params.id },
  });
  await prisma.materialVariant.delete({
    where: { id: req.params.id },
  });
  res.json({ data: { ok: true } });
});

export default router;
