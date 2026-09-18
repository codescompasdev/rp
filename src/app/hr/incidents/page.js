'use client';

import { useState } from 'react';
import Modal from '@/components/UI/Modal';

const LABEL = { fontSize: '11px', fontWeight: 700 };
const INPUT = { width: '100%', padding: '6px', marginTop: '4px' };

const initialIncidents = [
    { id: 'INC-005', date: '2026-02-22', type: 'Povreda', location: 'Šreder #1', desc: 'Posjekotina na ruci prilikom zamjene noževa', worker: 'Petar Lukić', severity: 'Lakša', status: 'Zatvoreno' },
    { id: 'INC-004', date: '2026-02-18', type: 'Near-miss', location: 'Kapija', desc: 'Kamion prošao bez zaustavljanja na vagi', worker: '-', severity: 'Srednja', status: 'Istražuje Se' },
    { id: 'INC-003', date: '2026-02-10', type: 'Kvar Opreme', location: 'Hala 2', desc: 'Curenje hidrauličnog ulja iz grajfera', worker: '-', severity: 'Srednja', status: 'Zatvoreno' },
];

export default function IncidentsPage() {
    const [incidents, setIncidents] = useState(initialIncidents);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ type: 'Povreda', severity: 'Lakša', location: 'Šreder #1', worker: '', desc: '', correctiveAction: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.desc?.trim()) return;
        setLoading(true);
        const newId = `INC-${String(incidents.length + 6).padStart(3, '0')}`;
        const newInc = {
            id: newId,
            date: new Date().toISOString().slice(0, 10),
            type: formData.type,
            location: formData.location,
            desc: formData.desc.trim(),
            worker: formData.worker || '-',
            severity: formData.severity,
            status: 'Istražuje Se',
        };
        setIncidents(prev => [newInc, ...prev]);
        setFormData({ type: 'Povreda', severity: 'Lakša', location: 'Šreder #1', worker: '', desc: '', correctiveAction: '' });
        setShowNew(false);
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>HSE Incidenti</h2>
                <button className="btn-primary" onClick={() => setShowNew(true)}>+ PRIJAVI INCIDENT</button>
            </div>
            <div className="scada-panel" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead><tr><th>BR.</th><th>DATUM</th><th>TIP</th><th>LOKACIJA</th><th>OPIS</th><th>RADNIK</th><th>OZBILJNOST</th><th>STATUS</th></tr></thead>
                    <tbody>
                        {incidents.map(inc => (
                            <tr key={inc.id}>
                                <td className="font-mono">{inc.id}</td>
                                <td className="font-mono">{inc.date}</td>
                                <td>{inc.type}</td>
                                <td>{inc.location}</td>
                                <td style={{ fontSize: '11px', maxWidth: '250px' }}>{inc.desc}</td>
                                <td>{inc.worker}</td>
                                <td><span style={{ padding: '2px 6px', fontSize: '11px', fontWeight: 700, background: inc.severity === 'Lakša' ? '#dcfce7' : '#fef3c7', color: inc.severity === 'Lakša' ? '#15803d' : '#b45309' }}>{inc.severity}</span></td>
                                <td><span style={{ padding: '2px 6px', fontSize: '11px', fontWeight: 700, background: inc.status === 'Zatvoreno' ? '#f1f5f9' : '#fee2e2', color: inc.status === 'Zatvoreno' ? '#64748b' : '#b91c1c' }}>{inc.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Prijavi HSE Incident" width={600}>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={LABEL}>Tip Incidenta *</label><select style={INPUT} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                            <option value="Povreda">Povreda</option>
                            <option value="Near-miss">Near-miss</option>
                            <option value="Kvar Opreme">Kvar Opreme</option>
                            <option value="Požar">Požar</option>
                            <option value="Ekološki">Ekološki</option>
                        </select></div>
                        <div><label style={LABEL}>Ozbiljnost *</label><select style={INPUT} value={formData.severity} onChange={e => setFormData({ ...formData, severity: e.target.value })}>
                            <option value="Lakša">Lakša</option>
                            <option value="Srednja">Srednja</option>
                            <option value="Teška">Teška</option>
                        </select></div>
                        <div><label style={LABEL}>Lokacija *</label><select style={INPUT} value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })}>
                            <option value="Šreder #1">Šreder #1</option>
                            <option value="Kapija">Kapija</option>
                            <option value="Hala 1">Hala 1</option>
                            <option value="Hala 2">Hala 2</option>
                            <option value="Dvorište">Dvorište</option>
                        </select></div>
                        <div><label style={LABEL}>Radnik (Ako Povrijeđen)</label><input type="text" style={INPUT} value={formData.worker} onChange={e => setFormData({ ...formData, worker: e.target.value })} placeholder="- Nije primjenjivo -" /></div>
                        <div style={{ gridColumn: 'span 2' }}><label style={LABEL}>Opis Incidenta *</label><textarea style={{ ...INPUT, minHeight: '80px', resize: 'vertical' }} value={formData.desc} onChange={e => setFormData({ ...formData, desc: e.target.value })} required /></div>
                        <div style={{ gridColumn: 'span 2' }}><label style={LABEL}>Korektivna Mjera</label><input type="text" style={INPUT} value={formData.correctiveAction} onChange={e => setFormData({ ...formData, correctiveAction: e.target.value })} placeholder="Šta je preduzeto?" /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button type="button" onClick={() => setShowNew(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                        <button type="submit" style={{ padding: '8px 20px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }} disabled={loading}>{loading ? 'PRIJAVLJUJEM...' : 'PRIJAVI INCIDENT'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
