'use client';

import { AlertTriangle, Package, Plus, Trash2 } from 'lucide-react';
import Button from '@/components/UI/Button';
import { fmtKg, fmtMoney, fmtNum } from '@/lib/format';
import { formatPickedMaterial, resolveBackendMaterial } from '@/lib/materialsAdapter';

/**
 * Stavke prodajnog naloga sa prikazom raspoloživog stanja.
 * stockByMaterialId: Map(materialId → kg) za aktivnu lokaciju.
 */
export default function SalesLineItems({ lineItems, materials, stockByMaterialId, onUpdate, onAdd, onRemove, onPickMaterial }) {
    const total = lineItems.reduce((sum, item) => sum + (Number(item.qtyKg) || 0) * (Number(item.pricePerKg) || 0), 0);
    const totalKg = lineItems.reduce((sum, item) => sum + (Number(item.qtyKg) || 0), 0);

    return (
        <div className="stack" style={{ gap: 10 }}>
            {lineItems.map((item, index) => {
                const backend = item.material ? resolveBackendMaterial(materials, item.material) : null;
                const available = backend?.id ? (stockByMaterialId.get(backend.id) ?? 0) : null;
                const qty = Number(item.qtyKg) || 0;
                const short = available !== null && qty > available + 0.009;
                const lineTotal = qty * (Number(item.pricePerKg) || 0);
                return (
                    <div key={item.id} className="sl-row" data-short={short}>
                        <div className="sl-material">
                            <span className="ui-label">Materijal #{index + 1}</span>
                            <button type="button" className="ui-input sl-pick" data-selected={Boolean(item.material)} onClick={() => onPickMaterial(item.id)}>
                                <Package size={16} />
                                <span>{item.material ? formatPickedMaterial(item.material) : 'Odaberi materijal...'}</span>
                            </button>
                            {available !== null && (
                                <span className="sl-stock" data-short={short}>
                                    {short && <AlertTriangle size={13} />}
                                    Na stanju: <b>{fmtKg(available)}</b>
                                    {short && ' — nedovoljno za ovu količinu'}
                                </span>
                            )}
                        </div>
                        <label className="sl-field">
                            <span className="ui-label">Količina (kg)</span>
                            <input type="number" min="0" className="ui-input font-mono" value={item.qtyKg} onChange={(e) => onUpdate(item.id, { qtyKg: e.target.value })} required />
                        </label>
                        <label className="sl-field">
                            <span className="ui-label">Cijena (KM/kg)</span>
                            <input type="number" min="0" step="0.01" className="ui-input font-mono" value={item.pricePerKg} onChange={(e) => onUpdate(item.id, { pricePerKg: e.target.value })} required />
                        </label>
                        <div className="sl-total">
                            <span className="ui-label">Iznos</span>
                            <b>{fmtMoney(lineTotal)}</b>
                        </div>
                        <Button variant="ghost" icon={Trash2} aria-label="Ukloni stavku" onClick={() => onRemove(item.id)} disabled={lineItems.length <= 1} style={{ alignSelf: 'end' }} />
                    </div>
                );
            })}
            <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
                <Button variant="soft" icon={Plus} onClick={onAdd}>Dodaj materijal</Button>
                <div className="sl-summary">
                    <span>{fmtNum(totalKg)} kg</span>
                    <b>{fmtMoney(total)}</b>
                </div>
            </div>
            <style>{`
                .sl-row {
                    display: grid; grid-template-columns: minmax(0, 2fr) 130px 130px 120px 36px; gap: 10px; align-items: start;
                    padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface-2);
                }
                .sl-row[data-short='true'] { border-color: #f3d79b; background: var(--warning-50); }
                .sl-material, .sl-field, .sl-total { display: grid; gap: 6px; min-width: 0; }
                .sl-pick { display: flex; align-items: center; gap: 8px; text-align: left; cursor: pointer; color: var(--text-3); overflow: hidden; white-space: nowrap; }
                .sl-pick svg { color: var(--primary); flex-shrink: 0; }
                .sl-pick span { overflow: hidden; text-overflow: ellipsis; }
                .sl-pick[data-selected='true'] { color: var(--text); font-weight: 600; }
                .sl-stock { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--text-3); }
                .sl-stock[data-short='true'] { color: var(--warning-ink); font-weight: 600; }
                .sl-total b { height: 38px; display: flex; align-items: center; justify-content: flex-end; font-variant-numeric: tabular-nums; }
                .sl-summary { display: flex; align-items: baseline; gap: 12px; font-size: 13px; color: var(--text-3); }
                .sl-summary b { font-size: 20px; color: var(--text); font-variant-numeric: tabular-nums; }
                @media (max-width: 760px) {
                    .sl-row { grid-template-columns: 1fr 1fr; }
                    .sl-material { grid-column: 1 / -1; }
                }
            `}</style>
        </div>
    );
}
