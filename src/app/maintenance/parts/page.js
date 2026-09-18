'use client';
import { useState } from 'react';
import { spareParts as initialParts } from '@/lib/demoData';
import Modal from '@/components/UI/Modal';

const LABEL = { fontSize: '11px', fontWeight: 700 };
const INPUT = { width: '100%', padding: '6px', marginTop: '4px' };

export default function SparePartsPage() {
    const [partsList, setPartsList] = useState(initialParts);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ name: '', machine: 'Šreder #1', stockQty: '', minQty: '', price: '', supplier: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name?.trim()) return;
        setLoading(true);
        const code = `SP-${String(partsList.length + 1).padStart(3, '0')}`;
        const sq = Number(formData.stockQty) || 0;
        const mq = Number(formData.minQty) || 0;
        const status = sq >= mq ? 'OK' : sq > 0 ? 'Ispod Minimuma' : 'Nema na Stanju';
        setPartsList(prev => [...prev, { code, name: formData.name.trim(), machine: formData.machine, stockQty: sq, minQty: mq, price: Number(formData.price) || 0, status }]);
        setFormData({ name: '', machine: 'Šreder #1', stockQty: '', minQty: '', price: '', supplier: '' });
        setShowNew(false);
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Rezervni Dijelovi</h2>
                <button className="btn-primary" onClick={() => setShowNew(true)}>+ DODAJ DIO</button>
            </div>
            <div className="scada-panel" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead><tr><th>KOD</th><th>NAZIV</th><th>MAŠINA</th><th style={{ textAlign: 'right' }}>NA STANJU</th><th style={{ textAlign: 'right' }}>MINIMUM</th><th style={{ textAlign: 'right' }}>CIJENA</th><th>STATUS</th></tr></thead>
                    <tbody>
                        {partsList.map(p => (
                            <tr key={p.code}>
                                <td className="font-mono" style={{ fontWeight: 600 }}>{p.code}</td>
                                <td>{p.name}</td>
                                <td>{p.machine}</td>
                                <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700, color: p.stockQty < p.minQty ? 'var(--danger-color)' : 'var(--text-color)' }}>{p.stockQty}</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>{p.minQty}</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>{p.price.toLocaleString()}</td>
                                <td><span style={{ padding: '2px 6px', fontSize: '11px', fontWeight: 700, background: p.status === 'OK' ? '#dcfce7' : p.status === 'Ispod Minimuma' ? '#fef3c7' : '#fee2e2', color: p.status === 'OK' ? '#15803d' : p.status === 'Ispod Minimuma' ? '#b45309' : '#b91c1c' }}>{p.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Novi Rezervni Dio" width={500}>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div><label style={LABEL}>Naziv *</label><input type="text" style={INPUT} placeholder="npr. Noževi Šreder (Set)" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
                        <div><label style={LABEL}>Mašina</label><select style={INPUT} value={formData.machine} onChange={e => setFormData({ ...formData, machine: e.target.value })}><option>Šreder #1</option><option>Hidraulične Makaze</option><option>Vaga</option></select></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div><label style={LABEL}>Na Stanju *</label><input type="number" className="font-mono" style={INPUT} value={formData.stockQty} onChange={e => setFormData({ ...formData, stockQty: e.target.value })} /></div>
                            <div><label style={LABEL}>Min. Zaliha *</label><input type="number" className="font-mono" style={INPUT} value={formData.minQty} onChange={e => setFormData({ ...formData, minQty: e.target.value })} /></div>
                        </div>
                        <div><label style={LABEL}>Cijena (BAM)</label><input type="text" className="font-mono" style={INPUT} value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} /></div>
                        <div><label style={LABEL}>Dobavljač Dijela</label><input type="text" style={INPUT} value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button type="button" onClick={() => setShowNew(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                        <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'ČUVANJE...' : 'SAČUVAJ'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
