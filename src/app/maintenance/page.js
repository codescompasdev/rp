'use client';
import { useState } from 'react';
import { maintenanceOrders as initialOrders } from '@/lib/demoData';
import Modal from '@/components/UI/Modal';

const LABEL = { fontSize: '11px', fontWeight: 700 };
const INPUT = { width: '100%', padding: '6px', marginTop: '4px' };

export default function MaintenancePage() {
    const [orders, setOrders] = useState(initialOrders);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ machine: 'Šreder #1', type: 'Preventivni', priority: 'Srednji', scheduled: '', assignedTo: 'Petar Lukić', task: '', description: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        const newId = `MO-2026-${String(orders.length + 13).padStart(3, '0')}`;
        setOrders(prev => [...prev, { id: newId, machine: formData.machine, type: formData.type, task: formData.task || 'Zadatak', scheduled: formData.scheduled || new Date().toISOString().slice(0, 10), assignedTo: formData.assignedTo, priority: formData.priority, status: 'Planirano' }]);
        setFormData({ machine: 'Šreder #1', type: 'Preventivni', priority: 'Srednji', scheduled: '', assignedTo: 'Petar Lukić', task: '', description: '' });
        setShowNew(false);
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Preventivno Održavanje (CMMS)</h2>
                <button className="btn-primary" onClick={() => setShowNew(true)}>+ NOVI NALOG</button>
            </div>
            <div className="scada-panel" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead><tr><th>BR.</th><th>MAŠINA</th><th>TIP</th><th>ZADATAK</th><th>ZAKAZANO</th><th>ZADUŽEN</th><th>PRIORITET</th><th>STATUS</th></tr></thead>
                    <tbody>
                        {orders.map(m => (
                            <tr key={m.id}>
                                <td className="font-mono" style={{ fontWeight: 600 }}>{m.id}</td>
                                <td style={{ fontWeight: 500 }}>{m.machine}</td>
                                <td>{m.type}</td>
                                <td>{m.task}</td>
                                <td className="font-mono">{m.scheduled}</td>
                                <td>{m.assignedTo}</td>
                                <td><span style={{ padding: '2px 6px', fontSize: '11px', fontWeight: 700, background: m.priority === 'Kritičan' ? '#fee2e2' : m.priority === 'Visok' ? '#fef3c7' : '#f1f5f9', color: m.priority === 'Kritičan' ? '#b91c1c' : m.priority === 'Visok' ? '#b45309' : '#64748b' }}>{m.priority}</span></td>
                                <td><span style={{ padding: '2px 6px', fontSize: '11px', fontWeight: 700, background: m.status === 'U Toku' ? '#dbeafe' : '#f1f5f9', color: m.status === 'U Toku' ? '#1d4ed8' : '#64748b' }}>{m.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Novi Nalog za Održavanje">
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={LABEL}>Mašina *</label><select style={INPUT} value={formData.machine} onChange={e => setFormData({ ...formData, machine: e.target.value })}><option>Šreder #1</option><option>Hidraulične Makaze</option><option>Bakar Granulator</option><option>Vaga Ulazna</option><option>Bager CAT 320</option></select></div>
                        <div><label style={LABEL}>Tip *</label><select style={INPUT} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}><option>Preventivni</option><option>Korektivni (Kvar)</option><option>Kalibracija</option></select></div>
                        <div><label style={LABEL}>Prioritet *</label><select style={INPUT} value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}><option>Srednji</option><option>Visok</option><option>Kritičan</option></select></div>
                        <div><label style={LABEL}>Zakazano Za</label><input type="date" className="font-mono" style={INPUT} value={formData.scheduled} onChange={e => setFormData({ ...formData, scheduled: e.target.value })} /></div>
                        <div><label style={LABEL}>Zadužen</label><select style={INPUT} value={formData.assignedTo} onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}><option>Petar Lukić</option><option>Eksterni Servis</option></select></div>
                        <div><label style={LABEL}>Zadatak</label><input type="text" style={INPUT} placeholder="npr. Zamjena noževa" value={formData.task} onChange={e => setFormData({ ...formData, task: e.target.value })} /></div>
                        <div style={{ gridColumn: 'span 2' }}><label style={LABEL}>Opis</label><textarea style={{ ...INPUT, resize: 'vertical', minHeight: '60px' }} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button type="button" onClick={() => setShowNew(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                        <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'KREIRANJE...' : 'KREIRAJ NALOG'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
