'use client';
import { useState } from 'react';
import { containers as initialContainers } from '@/lib/demoData';
import Modal from '@/components/UI/Modal';

const LABEL = { fontSize: '11px', fontWeight: 700 };
const INPUT = { width: '100%', padding: '6px', marginTop: '4px' };

export default function ContainersPage() {
    const [containersList, setContainersList] = useState(initialContainers);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ id: '', type: 'Abroll 20m³', location: 'Lager Pale', qrCode: '', note: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.id?.trim()) return;
        setLoading(true);
        const today = new Date().toISOString().slice(0, 10);
        setContainersList(prev => [...prev, { id: formData.id.trim(), type: formData.type, location: formData.location, status: 'Prazan', lastMoved: today }]);
        setFormData({ id: '', type: 'Abroll 20m³', location: 'Lager Pale', qrCode: '', note: '' });
        setShowNew(false);
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Upravljanje Kontejnerima</h2>
                <button className="btn-primary" onClick={() => setShowNew(true)}>+ REGISTRUJ KONTEJNER</button>
            </div>
            <div className="scada-panel" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead><tr><th>ID</th><th>TIP</th><th>LOKACIJA</th><th>STATUS</th><th>ZADNJE POMJERANJE</th><th>DANA KOD KLIJENTA</th></tr></thead>
                    <tbody>
                        {containersList.map(c => (
                            <tr key={c.id}>
                                <td className="font-mono" style={{ fontWeight: 600 }}>{c.id}</td>
                                <td>{c.type}</td>
                                <td>{c.location}</td>
                                <td><span style={{ padding: '2px 6px', fontSize: '11px', fontWeight: 700, background: c.status === 'Prazan' ? '#dcfce7' : c.status === 'Kod Klijenta' ? '#fef3c7' : c.status === 'Pun - Čeka Odvoz' ? '#fee2e2' : c.status === 'U Tranzitu' ? '#dbeafe' : '#f1f5f9', color: c.status === 'Prazan' ? '#15803d' : c.status === 'Kod Klijenta' ? '#b45309' : c.status === 'Pun - Čeka Odvoz' ? '#b91c1c' : c.status === 'U Tranzitu' ? '#1d4ed8' : '#64748b' }}>{c.status}</span></td>
                                <td className="font-mono">{c.lastMoved}</td>
                                <td className="font-mono" style={{ color: c.daysAtClient > 7 ? 'var(--danger-color)' : 'var(--text-color)', fontWeight: c.daysAtClient > 7 ? 700 : 400 }}>{c.daysAtClient ? `${c.daysAtClient} dana` + (c.daysAtClient > 7 ? ' ⚠️' : '') : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Registruj Kontejner" width={500}>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div><label style={LABEL}>ID Kontejnera *</label><input type="text" className="font-mono" style={INPUT} placeholder="CNT-006" value={formData.id} onChange={e => setFormData({ ...formData, id: e.target.value })} required /></div>
                        <div><label style={LABEL}>Tip *</label><select style={INPUT} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}><option>Abroll 20m³</option><option>Abroll 30m³</option><option>Abroll 40m³</option><option>Mulda 7m³</option><option>Mulda 10m³</option></select></div>
                        <div><label style={LABEL}>Početna Lokacija</label><select style={INPUT} value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })}><option>Lager Pale</option><option>Lager Banja Luka</option><option>Lager Bijeljina</option></select></div>
                        <div><label style={LABEL}>QR Kod / Barkod</label><input type="text" className="font-mono" style={INPUT} value={formData.qrCode} onChange={e => setFormData({ ...formData, qrCode: e.target.value })} /></div>
                        <div><label style={LABEL}>Napomena</label><textarea style={{ ...INPUT, resize: 'vertical', minHeight: '50px' }} value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button type="button" onClick={() => setShowNew(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                        <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'REGISTRACIJA...' : 'REGISTRUJ'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
