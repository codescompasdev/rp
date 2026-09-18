'use client';
import { useState } from 'react';
import { drivers, vehicles } from '@/lib/demoData';
import Modal from '@/components/UI/Modal';

const LABEL = { fontSize: '11px', fontWeight: 700 };
const INPUT = { width: '100%', padding: '6px', marginTop: '4px' };

const initialOrders = [
    { id: 'NV-2026-088', driver: 'Dragan Milić', vehicle: 'T85-J-441', route: 'Pale → Sarajevo → Pale', status: 'Na Turi', eta: '14:30' },
    { id: 'NV-2026-087', driver: 'Nenad Savić', vehicle: 'T85-J-442', route: 'Pale → B. Luka → Pale', status: 'Na Turi', eta: '16:00' },
    { id: 'NV-2026-086', driver: 'Milan Jovanović', vehicle: '-', route: 'Čeka Dodjelu', status: 'Slobodan', eta: '-' },
];

export default function DispatchPage() {
    const [orders, setOrders] = useState(initialOrders);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ driver: drivers[0]?.name || '', vehicle: vehicles[0]?.plate || '', route: '', container: '', date: new Date().toISOString().slice(0, 10) });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.route?.trim()) return;
        setLoading(true);
        const newId = `NV-2026-${String(orders.length + 89).padStart(3, '0')}`;
        setOrders(prev => [{ id: newId, driver: formData.driver, vehicle: formData.vehicle, route: formData.route.trim(), status: 'Na Turi', eta: '--:--' }, ...prev]);
        setFormData({ driver: drivers[0]?.name || '', vehicle: vehicles[0]?.plate || '', route: '', container: '', date: new Date().toISOString().slice(0, 10) });
        setShowNew(false);
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Dispečerski Centar</h2>
                <button className="btn-primary" onClick={() => setShowNew(true)}>+ NOVI NALOG ZA VOŽNJU</button>
            </div>
            <div style={{ display: 'flex', gap: '12px', flex: 1, overflow: 'hidden' }}>
                <div className="scada-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="scada-header">AKTIVNI NALOZI</div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        <table>
                            <thead><tr><th>NALOG</th><th>VOZAČ</th><th>VOZILO</th><th>RUTA</th><th>STATUS</th><th>ETA</th></tr></thead>
                            <tbody>
                                {orders.map(o => (
                                    <tr key={o.id} style={o.status === 'Slobodan' ? { color: 'var(--text-muted)' } : {}}>
                                        <td className="font-mono" style={{ fontWeight: 600 }}>{o.id}</td>
                                        <td>{o.driver}</td>
                                        <td className="font-mono">{o.vehicle}</td>
                                        <td>{o.route}</td>
                                        <td><span style={{ padding: '2px 6px', background: o.status === 'Na Turi' ? '#dbeafe' : '#f1f5f9', color: o.status === 'Na Turi' ? '#1d4ed8' : '#64748b', fontSize: '11px', fontWeight: 700 }}>{o.status}</span></td>
                                        <td className="font-mono">{o.eta}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="scada-panel" style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column' }}>
                    <div className="scada-header" style={{ background: '#475569' }}>VOZAČI — STATUS</div>
                    <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        {drivers.map(d => (
                            <div key={d.id} style={{ padding: '8px', background: '#f8fafc', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div><div style={{ fontWeight: 600, fontSize: '12px' }}>{d.name}</div><div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{d.phone}</div></div>
                                <span style={{ padding: '2px 6px', background: d.status === 'Na Turi' ? '#dbeafe' : '#dcfce7', color: d.status === 'Na Turi' ? '#1d4ed8' : '#15803d', fontSize: '10px', fontWeight: 700 }}>{d.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Novi Nalog za Vožnju">
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={LABEL}>Vozač *</label><select style={INPUT} value={formData.driver} onChange={e => setFormData({ ...formData, driver: e.target.value })}>{drivers.map(d => <option key={d.id} value={d.name}>{d.name} ({d.vehicle || 'Slobodan'})</option>)}</select></div>
                        <div><label style={LABEL}>Vozilo *</label><select style={INPUT} value={formData.vehicle} onChange={e => setFormData({ ...formData, vehicle: e.target.value })}>{vehicles.map(v => <option key={v.id} value={v.plate}>{v.plate} ({v.brand})</option>)}</select></div>
                        <div style={{ gridColumn: 'span 2' }}><label style={LABEL}>Opis Ture *</label><input type="text" style={INPUT} placeholder="npr. Pale → Sarajevo (Fab. Prozora), pokupi CNT-002" value={formData.route} onChange={e => setFormData({ ...formData, route: e.target.value })} required /></div>
                        <div><label style={LABEL}>Kontejner</label><select style={INPUT} value={formData.container} onChange={e => setFormData({ ...formData, container: e.target.value })}><option value="">- Bez kontejnera -</option><option value="CNT-002">CNT-002</option><option value="CNT-004">CNT-004</option></select></div>
                        <div><label style={LABEL}>Datum</label><input type="date" className="font-mono" style={INPUT} value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button type="button" onClick={() => setShowNew(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                        <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'SLANJE...' : 'POŠALJI NALOG'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
