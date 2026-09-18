'use client';
import { useState } from 'react';
import { drivers as initialDrivers, vehicles } from '@/lib/demoData';
import Modal from '@/components/UI/Modal';

const LABEL = { fontSize: '11px', fontWeight: 700 };
const INPUT = { width: '100%', padding: '6px', marginTop: '4px' };

export default function DriversPage() {
    const [driversList, setDriversList] = useState(initialDrivers);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ name: '', jmbg: '', phone: '', address: '', license: 'CE', licenseNo: '', licenseExpiry: '', adr: 'NE', medicalExpiry: '', vehicle: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name?.trim()) return;
        setLoading(true);
        const newId = `D-${String(driversList.length + 1).padStart(3, '0')}`;
        const vLabel = formData.vehicle ? vehicles.find(v => v.plate === formData.vehicle)?.plate || formData.vehicle : null;
        setDriversList(prev => [...prev, { id: newId, name: formData.name.trim(), phone: formData.phone || '-', vehicle: vLabel, license: formData.license, hoursToday: 0, status: 'Slobodan' }]);
        setFormData({ name: '', jmbg: '', phone: '', address: '', license: 'CE', licenseNo: '', licenseExpiry: '', adr: 'NE', medicalExpiry: '', vehicle: '' });
        setShowNew(false);
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Vozači</h2>
                <button className="btn-primary" onClick={() => setShowNew(true)}>+ DODAJ VOZAČA</button>
            </div>
            <div className="scada-panel" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead><tr><th>ID</th><th>IME</th><th>TELEFON</th><th>VOZILO</th><th>KATEGORIJA</th><th style={{ textAlign: 'right' }}>SATI DANAS</th><th>STATUS</th></tr></thead>
                    <tbody>
                        {driversList.map(d => (
                            <tr key={d.id}>
                                <td className="font-mono">{d.id}</td>
                                <td style={{ fontWeight: 600 }}>{d.name}</td>
                                <td className="font-mono">{d.phone}</td>
                                <td className="font-mono">{d.vehicle || '-'}</td>
                                <td>{d.license}</td>
                                <td className="font-mono" style={{ textAlign: 'right', color: d.hoursToday > 8 ? 'var(--danger-color)' : 'var(--text-color)' }}>{d.hoursToday}h</td>
                                <td><span style={{ padding: '2px 6px', background: d.status === 'Na Turi' ? '#dbeafe' : '#dcfce7', color: d.status === 'Na Turi' ? '#1d4ed8' : '#15803d', fontSize: '11px', fontWeight: 700 }}>{d.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Novi Vozač">
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={LABEL}>Ime i Prezime *</label><input type="text" style={INPUT} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
                        <div><label style={LABEL}>JMBG</label><input type="text" className="font-mono" style={INPUT} value={formData.jmbg} onChange={e => setFormData({ ...formData, jmbg: e.target.value })} /></div>
                        <div><label style={LABEL}>Telefon *</label><input type="text" className="font-mono" style={INPUT} placeholder="+387 65 xxx xxx" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
                        <div><label style={LABEL}>Adresa</label><input type="text" style={INPUT} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} /></div>
                        <div><label style={LABEL}>Kategorija *</label><select style={INPUT} value={formData.license} onChange={e => setFormData({ ...formData, license: e.target.value })}><option>B</option><option>C</option><option>CE</option><option>D</option></select></div>
                        <div><label style={LABEL}>Br. Vozačke</label><input type="text" className="font-mono" style={INPUT} value={formData.licenseNo} onChange={e => setFormData({ ...formData, licenseNo: e.target.value })} /></div>
                        <div><label style={LABEL}>Istek Dozvole</label><input type="date" className="font-mono" style={INPUT} value={formData.licenseExpiry} onChange={e => setFormData({ ...formData, licenseExpiry: e.target.value })} /></div>
                        <div><label style={LABEL}>ADR Dozvola</label><select style={INPUT} value={formData.adr} onChange={e => setFormData({ ...formData, adr: e.target.value })}><option>NE</option><option>DA - Klasa 1-9</option></select></div>
                        <div><label style={LABEL}>Ljekarski (Istek)</label><input type="date" className="font-mono" style={INPUT} value={formData.medicalExpiry} onChange={e => setFormData({ ...formData, medicalExpiry: e.target.value })} /></div>
                        <div><label style={LABEL}>Dodjeljeno Vozilo</label><select style={INPUT} value={formData.vehicle} onChange={e => setFormData({ ...formData, vehicle: e.target.value })}><option value="">- Nije dodjeljen -</option>{vehicles.map(v => <option key={v.id} value={v.plate}>{v.plate} ({v.brand})</option>)}</select></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button type="button" onClick={() => setShowNew(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                        <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'ČUVANJE...' : 'SAČUVAJ VOZAČA'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
