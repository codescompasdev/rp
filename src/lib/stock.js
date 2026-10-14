import api from './api';
import { toNum } from './format';

/** Stanje po materijalu (kg) za aktivnu lokaciju, iz /inventory/grid. */
export async function loadStockByMaterial() {
    const res = await api.get('/inventory/grid');
    const rows = res?.data?.data || [];
    const map = new Map();
    rows.forEach((row) => {
        if (!row.materialId) return;
        map.set(row.materialId, (map.get(row.materialId) || 0) + toNum(row.stockKg));
    });
    return map;
}

/**
 * Raspoloživo za izlaz po materijalu — ista logika kao backend (prva varijanta materijala, zona DEFAULT).
 * Vraća Map(materialId → { sellable, total }).
 */
export async function loadSellableStockByMaterial() {
    const res = await api.get('/inventory/grid');
    const rows = res?.data?.data || [];
    const byMaterial = new Map();
    rows.forEach((row) => {
        if (!row.materialId) return;
        const entry = byMaterial.get(row.materialId) || { total: 0, variants: [] };
        entry.total += toNum(row.stockKg);
        entry.variants.push(row);
        byMaterial.set(row.materialId, entry);
    });
    const result = new Map();
    byMaterial.forEach((entry, materialId) => {
        const realVariants = entry.variants.filter((v) => v.variantId).sort((a, b) => String(a.variantId).localeCompare(String(b.variantId)));
        const first = realVariants[0];
        const sellable = first
            ? (first.zones || []).filter((z) => z.zone === 'DEFAULT').reduce((sum, z) => sum + toNum(z.stockKg), 0)
            : 0;
        result.set(materialId, { sellable, total: entry.total });
    });
    return result;
}
