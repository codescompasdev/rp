function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function ensureStock(tx, materialId, companyId = null, materialVariantId = null, zone = 'DEFAULT') {
  const existing = await tx.inventoryStock.findFirst({
    where: {
      materialId,
      materialVariantId: materialVariantId || null,
      zone,
      companyId,
    },
  });
  if (existing) return existing;
  return tx.inventoryStock.create({
    data: {
      materialId,
      materialVariantId: materialVariantId || null,
      zone,
      stockKg: 0,
      avgBuyPrice: 0,
      companyId,
    },
  });
}

async function nextTransactionCode(tx, prefix) {
  const count = await tx.inventoryTransaction.count();
  return `${prefix}-${String(count + 1).padStart(6, '0')}`;
}

export async function createMovement(tx, {
  prefix,
  materialId,
  materialVariantId = null,
  stockId,
  type,
  quantityKg,
  unitPrice = null,
  total = null,
  note = null,
  operationId = null,
  createdBy = null,
  companyId = null,
}) {
  const code = await nextTransactionCode(tx, prefix);
  return tx.inventoryTransaction.create({
    data: {
      code,
      materialId,
      materialVariantId: materialVariantId || null,
      stockId,
      type,
      quantityKg: toNumber(quantityKg, 0),
      unitPrice: unitPrice === null ? null : toNumber(unitPrice, 0),
      total: total === null ? null : toNumber(total, 0),
      note,
      operationId,
      createdBy,
      companyId,
    },
  });
}

export async function applyInbound(tx, {
  materialId,
  materialVariantId = null,
  quantityKg,
  unitPrice = 0,
  note = null,
  operationId = null,
  createdBy = null,
  companyId = null,
  movementType = 'purchase',
  movementPrefix = 'INV-IN',
  zone = 'DEFAULT',
}) {
  const qty = toNumber(quantityKg, 0);
  if (qty <= 0) throw new Error('Invalid inbound quantity');
  const stock = await ensureStock(tx, materialId, companyId, materialVariantId, zone);
  const previousStock = toNumber(stock.stockKg, 0);
  const previousAvg = toNumber(stock.avgBuyPrice, 0);
  const price = toNumber(unitPrice, 0);
  const nextStock = previousStock + qty;
  const nextAvg = nextStock > 0
    ? (((previousStock * previousAvg) + (qty * price)) / nextStock)
    : previousAvg;

  await tx.inventoryStock.update({
    where: { id: stock.id },
    data: {
      stockKg: nextStock,
      avgBuyPrice: nextAvg,
    },
  });

  await createMovement(tx, {
    prefix: movementPrefix,
    materialId,
    materialVariantId,
    stockId: stock.id,
    type: movementType,
    quantityKg: qty,
    unitPrice: price || null,
    total: price ? qty * price : null,
    note,
    operationId,
    createdBy,
    companyId,
  });

  return { stockId: stock.id, nextStock, avgBuyPrice: nextAvg };
}

export async function applyOutbound(tx, {
  materialId,
  materialVariantId = null,
  quantityKg,
  unitPrice = 0,
  note = null,
  operationId = null,
  createdBy = null,
  companyId = null,
  movementType = 'sale',
  movementPrefix = 'INV-OUT',
  zone = 'DEFAULT',
}) {
  const qty = toNumber(quantityKg, 0);
  if (qty <= 0) throw new Error('Invalid outbound quantity');
  const stock = await ensureStock(tx, materialId, companyId, materialVariantId, zone);
  const currentStock = toNumber(stock.stockKg, 0);
  if (qty > currentStock) {
    throw new Error('Insufficient stock');
  }

  await tx.inventoryStock.update({
    where: { id: stock.id },
    data: {
      stockKg: currentStock - qty,
    },
  });

  const price = toNumber(unitPrice, 0);
  await createMovement(tx, {
    prefix: movementPrefix,
    materialId,
    materialVariantId,
    stockId: stock.id,
    type: movementType,
    quantityKg: qty,
    unitPrice: price || null,
    total: price ? qty * price : null,
    note,
    operationId,
    createdBy,
    companyId,
  });

  return { stockId: stock.id, nextStock: currentStock - qty };
}

export async function applyConversion(tx, {
  inputMaterialId,
  inputMaterialVariantId = null,
  outputMaterialId,
  outputMaterialVariantId = null,
  inputQtyKg,
  outputQtyKg,
  companyId = null,
  createdBy = null,
  note = null,
  operationId = null,
  zone = 'DEFAULT',
}) {
  const conversionNote = note || `Conversion ${inputQtyKg}kg -> ${outputQtyKg}kg`;
  await applyOutbound(tx, {
    materialId: inputMaterialId,
    materialVariantId: inputMaterialVariantId,
    quantityKg: inputQtyKg,
    unitPrice: 0,
    note: `${conversionNote} (consume input)`,
    operationId,
    createdBy,
    companyId,
    movementType: 'production_issue',
    movementPrefix: 'INV-ISSUE',
    zone,
  });
  await applyInbound(tx, {
    materialId: outputMaterialId,
    materialVariantId: outputMaterialVariantId,
    quantityKg: outputQtyKg,
    unitPrice: 0,
    note: `${conversionNote} (produce output)`,
    operationId,
    createdBy,
    companyId,
    movementType: 'production_receipt',
    movementPrefix: 'INV-RECEIPT',
    zone,
  });
}

export async function applySortingSplit(tx, {
  inputMaterialId,
  inputMaterialVariantId = null,
  inputQtyKg,
  outputs = [],
  companyId = null,
  createdBy = null,
  note = null,
  operationId = null,
  zone = 'DEFAULT',
}) {
  const inputQty = toNumber(inputQtyKg, 0);
  if (inputQty <= 0) {
    throw new Error('Invalid sorting input quantity');
  }
  if (!Array.isArray(outputs) || outputs.length === 0) {
    throw new Error('Sorting outputs are required');
  }

  const normalizedOutputs = outputs.map((item) => ({
    materialId: String(item?.materialId || '').trim(),
    materialVariantId: item?.materialVariantId ? String(item.materialVariantId).trim() : null,
    quantityKg: toNumber(item?.quantityKg, 0),
  }));

  if (normalizedOutputs.some((item) => !item.materialId || item.quantityKg <= 0)) {
    throw new Error('Each sorting output must include materialId and positive quantity');
  }

  const outputsTotal = normalizedOutputs.reduce((sum, item) => sum + item.quantityKg, 0);
  if (Math.abs(outputsTotal - inputQty) > 0.01) {
    throw new Error('Sorting outputs total must match input quantity');
  }

  const sortingNote = note || `Sorting ${inputQty}kg into ${normalizedOutputs.length} outputs`;

  await applyOutbound(tx, {
    materialId: inputMaterialId,
    materialVariantId: inputMaterialVariantId,
    quantityKg: inputQty,
    unitPrice: 0,
    note: `${sortingNote} (consume input)`,
    operationId,
    createdBy,
    companyId,
    movementType: 'production_issue',
    movementPrefix: 'INV-SORT-OUT',
    zone,
  });

  for (const output of normalizedOutputs) {
    await applyInbound(tx, {
      materialId: output.materialId,
      materialVariantId: output.materialVariantId,
      quantityKg: output.quantityKg,
      unitPrice: 0,
      note: `${sortingNote} (output)`,
      operationId,
      createdBy,
      companyId,
      movementType: 'production_receipt',
      movementPrefix: 'INV-SORT-IN',
      zone,
    });
  }
}
