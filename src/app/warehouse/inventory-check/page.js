'use client';

import { useState } from 'react';
import { warehouseZones } from '@/lib/demoData';
import Modal from '@/components/UI/Modal';

const LABEL_STYLE = { fontSize: '11px', fontWeight: 700 };
const INPUT_STYLE = { width: '100%', padding: '6px', marginTop: '4px' };

const initialChecks = [
    { id: 'INV-2026-003', zone: 'Hala 1 - Sektor A', date: '2026-02-20', type: 'Parcijalna', systemKg: 56700, actualKg: 56450, status: 'Završena' },
    { id: 'INV-2026-002', zone: 'Otvoreni lager B', date: '2026-02-15', type: 'Parcijalna', systemKg: 4250000, actualKg: 4248500, status: 'Završena' },
    { id: 'INV-2026-001', zone: 'SVE ZONE', date: '2026-01-01', type: 'Godišnja', systemKg: 6400000, actualKg: 6385000, status: 'Završena' },
];

export default function InventoryCheckPage() {
    const [checks, setChecks] = useState(initialChecks);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ zone: '', type: 'Parcijalna' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.zone) return;
        setLoading(true);
        try {
            const newId = `INV-2026-${String(checks.length + 1).padStart(3, '0')}`;
            const newCheck = {
                id: newId,
                zone: formData.zone,
                date: new Date().toISOString().slice(0, 10),
                type: formData.type,
                systemKg: 0,
                actualKg: 0,
                status: 'U Toku',
            };
            setChecks(prev => [newCheck, ...prev]);
            setFormData({ zone: '', type: 'Parcijalna' });
            setShowNew(false);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatDiff = (system, actual) => {
        const diff = actual - system;
        const pct = system > 0 ? ((diff / system) * 100).toFixed(2) : 0;
        return `${diff >= 0 ? '+' : ''}${diff.toLocaleString()} (${diff >= 0 ? '+' : ''}${pct}%)`;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div className="responsive-row">
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Inventura (Popis)</h2>
                <button className="btn-primary" onClick={() => setShowNew(true)}>+ NOVA INVENTURA</button>
            </div>
            <div className="scada-panel responsive-table" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead><tr><th>BR. POPISA</th><th>ZONA</th><th>DATUM</th><th>TIP</th><th style={{ textAlign: 'right' }}>SISTEMSKO (KG)</th><th style={{ textAlign: 'right' }}>STVARNO (KG)</th><th style={{ textAlign: 'right' }}>RAZLIKA</th><th>STATUS</th></tr></thead>
                    <tbody>
                        {checks.map(c => {
                            const diff = c.actualKg - c.systemKg;
                            const diffColor = diff < 0 ? 'var(--danger-color)' : diff > 0 ? 'var(--warning-color)' : 'var(--success-color)';
                            return (
                                <tr key={c.id}>
                                    <td className="font-mono" style={{ fontWeight: 600 }}>{c.id}</td>
                                    <td>{c.zone}</td>
                                    <td className="font-mono">{c.date}</td>
                                    <td>{c.type}</td>
                                    <td className="font-mono" style={{ textAlign: 'right' }}>{c.systemKg.toLocaleString()}</td>
                                    <td className="font-mono" style={{ textAlign: 'right' }}>{c.actualKg.toLocaleString()}</td>
                                    <td className="font-mono" style={{ textAlign: 'right', color: diffColor, fontWeight: 700 }}>{formatDiff(c.systemKg, c.actualKg)}</td>
                                    <td><span style={{ padding: '2px 6px', background: c.status === 'Završena' ? '#dcfce7' : '#fef3c7', color: c.status === 'Završena' ? '#15803d' : '#b45309', fontSize: '11px', fontWeight: 700 }}>{c.status}</span></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Nova Inventura" width={500}>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        <div><label style={LABEL_STYLE}>Zona *</label><select style={INPUT_STYLE} value={formData.zone} onChange={e => setFormData({ ...formData, zone: e.target.value })} required>
                            <option value="">Odaberi zonu</option>
                            <option value="SVE ZONE">SVE ZONE</option>
                            {warehouseZones.map(z => <option key={z.zone} value={z.zone}>{z.zone}</option>)}
                        </select></div>
                        <div><label style={LABEL_STYLE}>Tip Inventure</label><select style={INPUT_STYLE} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                            <option value="Parcijalna">Parcijalna</option>
                            <option value="Godišnja">Godišnja</option>
                        </select></div>
                    </div>
                    <div style={{ marginTop: '12px', padding: '8px', background: '#eef2ff', border: '1px solid var(--primary-color)', fontSize: '11px' }}>ℹ️ Nova inventura će biti kreirana. Popis materijala po zoni možete unijeti u sljedećem koraku.</div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button type="button" onClick={() => setShowNew(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                        <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'KREIRANJE...' : 'KREIRAJ INVENTURU'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
