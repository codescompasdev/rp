import { toNum } from './format';

export const ORDER_STATUSES = ['Aktivan', 'Završen', 'Otkazan'];

export function orderDirection(contract) {
    return contract?.direction === 'SELL' ? 'SELL' : 'BUY';
}

export function orderDirectionLabel(contract) {
    return orderDirection(contract) === 'SELL' ? 'Prodaja' : 'Nabavka';
}

export function orderPartnerName(contract) {
    if (!contract) return '';
    return (orderDirection(contract) === 'SELL' ? contract.customer?.name : contract.supplier?.name) || '';
}

/** Stavke narudžbe; stari ugovori (bez items) se prikazuju kao jedna stavka */
export function orderLines(contract) {
    if (Array.isArray(contract?.items) && contract.items.length) return contract.items;
    if (contract?.material) {
        return [{
            id: `legacy-${contract.id}`,
            materialId: contract.materialId,
            material: contract.material,
            qtyKg: toNum(contract.qtyTons) * 1000,
            doneKg: 0,
            legacy: true,
        }];
    }
    return [];
}

export function orderPlannedKg(contract) {
    if (contract?.qtyMode === 'TOTAL') return toNum(contract.totalQtyKg);
    return orderLines(contract).reduce((sum, line) => sum + toNum(line.qtyKg), 0);
}

export function orderDoneKg(contract) {
    return toNum(contract?.doneKg);
}

export function orderRemainingKg(contract) {
    return Math.max(0, orderPlannedKg(contract) - orderDoneKg(contract));
}

export function orderProgressPct(contract) {
    const planned = orderPlannedKg(contract);
    if (planned <= 0) return 0;
    return (orderDoneKg(contract) / planned) * 100;
}

export function lineRemainingKg(line) {
    if (line?.qtyKg === null || line?.qtyKg === undefined) return null;
    return toNum(line.qtyKg) - toNum(line.doneKg);
}

export function parseFormula(formula) {
    const text = String(formula || '');
    const type = text.startsWith('LME') ? 'LME' : 'Fiksno';
    const value = text.replace(/^(LME|Fiksno)\s*-?/, '').replace('%', '').trim();
    return { type, value };
}

export function buildFormula(type, rawValue) {
    const v = String(rawValue || '').replace('%', '').trim();
    return type === 'LME' ? `LME -${v}%` : `Fiksno ${v}`;
}

export function formulaLabel(formula) {
    const { type, value } = parseFormula(formula);
    if (!formula) return '-';
    return type === 'LME' ? `LME −${value || 0}%` : `Fiksno ${value || '-'} KM/kg`;
}

export const PAYMENT_TERMS = [
    { value: 'DAP', label: 'DAP Pale (oni dovoze)' },
    { value: 'EXW', label: 'EXW (mi preuzimamo)' },
    { value: 'FCA', label: 'FCA' },
];
