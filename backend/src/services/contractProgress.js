function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Ispunjenost narudžbe: sign = 1 (zatvaranje tiketa / ručni unos), -1 (storno)
export async function applyContractProgress(tx, contractId, materialId, kg, sign = 1) {
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
