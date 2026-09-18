'use client';
import { useState } from 'react';
import { vehicles as initialVehicles } from '@/lib/demoData';
import Modal from '@/components/UI/Modal';

const LABEL = { fontSize: '11px', fontWeight: 700 };
const INPUT = { width: '100%', padding: '6px', marginTop: '4px' };

export default function VehiclesPage() {
    const [vehiclesList, setVehiclesList] = useState(initialVehicles);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ plate: '', type: 'Kamion Kuka', brand: '', year: '', vin: '', km: '', regDate: '', regExpiry: '', fuelType: 'Diesel', tankL: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.plate?.trim()) return;
        setLoading(true);
        const newId = `V-${String(vehiclesList.length + 1).padStart(3, '0')}`;
        setVehiclesList(prev => [...prev, { id: newId, plate: formData.plate.trim(), type: formData.type, brand: formData.brand || formData.type, km: Number(formData.km) || 0, fuelAvg: 38, regExpiry: formData.regExpiry || new Date().toISOString().slice(0, 10), status: 'Aktivan' }]);
        setFormData({ plate: '', type: 'Kamion Kuka', brand: '', year: '', vin: '', km: '', regDate: '', regExpiry: '', fuelType: 'Diesel', tankL: '' });
        setShowNew(false);
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Upravljanje Vozilima</h2>
                <button className="btn-primary" onClick={() => setShowNew(true)}>+ DODAJ VOZILO</button>
            </div>
            <div className="scada-panel" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead><tr><th>ID</th><th>TABLICE</th><th>TIP</th><th>MARKA</th><th style={{ textAlign: 'right' }}>KM</th><th style={{ textAlign: 'right' }}>POTROŠNJA (l/100km)</th><th>REG. ISTIČE</th><th>STATUS</th></tr></thead>
                    <tbody>
                        {vehiclesList.map(v => {
                            const regDate = new Date(v.regExpiry);
                            const daysLeft = Math.floor((regDate - new Date()) / (1000 * 60 * 60 * 24));
                            return (
                                <tr key={v.id}>
                                    <td className="font-mono">{v.id}</td>
                                    <td className="font-mono" style={{ fontWeight: 600 }}>{v.plate}</td>
                                    <td>{v.type}</td>
                                    <td>{v.brand}</td>
                                    <td className="font-mono" style={{ textAlign: 'right' }}>{v.km.toLocaleString()}</td>
                                    <td className="font-mono" style={{ textAlign: 'right' }}>{v.fuelAvg}</td>
                                    <td className="font-mono" style={{ color: daysLeft < 30 ? 'var(--danger-color)' : 'var(--text-color)', fontWeight: daysLeft < 30 ? 700 : 400 }}>{v.regExpiry}{daysLeft < 30 ? ` (${daysLeft}d!)` : ''}</td>
                                    <td><span style={{ padding: '2px 6px', background: v.status === 'Aktivan' ? '#dcfce7' : '#fef3c7', color: v.status === 'Aktivan' ? '#15803d' : '#b45309', fontSize: '11px', fontWeight: 700 }}>{v.status}</span></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Novo Vozilo">
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={LABEL}>Registracija *</label><input type="text" className="font-mono" style={INPUT} placeholder="T85-J-441" value={formData.plate} onChange={e => setFormData({ ...formData, plate: e.target.value })} required /></div>
                        <div><label style={LABEL}>Tip Vozila *</label><select style={INPUT} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}><option>Kamion Kuka</option><option>Tegljač</option><option>Bager</option><option>Grajfer</option><option>Viljuškar</option><option>Prikolica</option></select></div>
                        <div><label style={LABEL}>Marka & Model</label><input type="text" style={INPUT} placeholder="MAN TGS 26.400" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} /></div>
                        <div><label style={LABEL}>Godina Proizvodnje</label><input type="number" className="font-mono" style={INPUT} value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} /></div>
                        <div><label style={LABEL}>Br. Šasije (VIN)</label><input type="text" className="font-mono" style={INPUT} value={formData.vin} onChange={e => setFormData({ ...formData, vin: e.target.value })} /></div>
                        <div><label style={LABEL}>Trenutna Kilometraža</label><input type="number" className="font-mono" style={INPUT} value={formData.km} onChange={e => setFormData({ ...formData, km: e.target.value })} /></div>
                        <div><label style={LABEL}>Datum Registracije</label><input type="date" className="font-mono" style={INPUT} value={formData.regDate} onChange={e => setFormData({ ...formData, regDate: e.target.value })} /></div>
                        <div><label style={LABEL}>Istek Registracije</label><input type="date" className="font-mono" style={INPUT} value={formData.regExpiry} onChange={e => setFormData({ ...formData, regExpiry: e.target.value })} /></div>
                        <div><label style={LABEL}>Tip Goriva</label><select style={INPUT} value={formData.fuelType} onChange={e => setFormData({ ...formData, fuelType: e.target.value })}><option>Diesel</option><option>Benzin</option><option>Električno</option></select></div>
                        <div><label style={LABEL}>Kapacitet Rezervoara (L)</label><input type="number" className="font-mono" style={INPUT} value={formData.tankL} onChange={e => setFormData({ ...formData, tankL: e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button type="button" onClick={() => setShowNew(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                        <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'ČUVANJE...' : 'SAČUVAJ VOZILO'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
