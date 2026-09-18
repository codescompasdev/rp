'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { suppliers as initialSuppliers } from '@/lib/demoData';
import Modal from '@/components/UI/Modal';

const LABEL = { fontSize: '11px', fontWeight: 700 };
const INPUT = { width: '100%', padding: '6px', marginTop: '4px' };

export default function SupplierDetailPage() {
    const params = useParams();
    const id = params?.id ?? params;
    const [suppliersList, setSuppliersList] = useState(initialSuppliers);
    const [showEdit, setShowEdit] = useState(false);
    const [loading, setLoading] = useState(false);
    const supplier = suppliersList.find(s => s.id === id) || suppliersList[0];
    const [formData, setFormData] = useState(supplier ? { name: supplier.name, jib: supplier.jib, type: supplier.type, pdv: supplier.pdv, city: supplier.city, phone: supplier.phone, bonitet: supplier.bonitet } : {});

    const handleOpenEdit = () => {
        if (supplier) setFormData({ name: supplier.name, jib: supplier.jib, type: supplier.type, pdv: supplier.pdv, city: supplier.city, phone: supplier.phone, bonitet: supplier.bonitet });
        setShowEdit(true);
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (!supplier) return;
        setLoading(true);
        setSuppliersList(prev => prev.map(s => s.id === supplier.id ? { ...s, ...formData } : s));
        setShowEdit(false);
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Dobavljač: {supplier?.name}</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn-primary" onClick={handleOpenEdit}>✎ UREDI</button>
                    <button className="btn-warning">DEAKTIVIRAJ</button>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                <div className="scada-panel" style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column' }}>
                    <div className="scada-header">PROFIL PARTNERA</div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>ID:</span><span className="font-mono" style={{ fontWeight: 600 }}>{supplier.id}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>JIB:</span><span className="font-mono">{supplier.jib}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>PDV Obveznik:</span><span>{supplier.pdv ? 'DA' : 'NE'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Tip:</span><span>{supplier.type}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Grad:</span><span>{supplier.city}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Telefon:</span><span className="font-mono">{supplier.phone}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Bonitet:</span><span style={{ padding: '2px 6px', background: supplier.bonitet === 'A' ? '#dcfce7' : '#fef3c7', color: supplier.bonitet === 'A' ? '#15803d' : '#b45309', fontWeight: 700 }}>{supplier.bonitet}</span></div>
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Bilans:</span><span className="font-mono" style={{ fontWeight: 700, fontSize: '16px', color: supplier.balance < 0 ? 'var(--danger-color)' : 'var(--success-color)' }}>{supplier.balance.toLocaleString()} BAM</span></div>
                    </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="scada-panel" style={{ flex: 1 }}>
                        <div className="scada-header">ISTORIJA TRANSAKCIJA</div>
                        <table>
                            <thead><tr><th>DATUM</th><th>TIKET</th><th>MATERIJAL</th><th style={{ textAlign: 'right' }}>NETO KG</th><th style={{ textAlign: 'right' }}>IZNOS</th><th>STATUS</th></tr></thead>
                            <tbody>
                                <tr><td className="font-mono">2026-02-23</td><td className="font-mono">#W-108842</td><td>FE-E1</td><td className="font-mono" style={{ textAlign: 'right' }}>12,148</td><td className="font-mono" style={{ textAlign: 'right', color: 'var(--danger-color)' }}>-3,644.55</td><td><span style={{ padding: '2px 6px', background: '#fef3c7', color: '#b45309', fontSize: '11px', fontWeight: 700 }}>Neplaćeno</span></td></tr>
                                <tr><td className="font-mono">2026-02-22</td><td className="font-mono">#W-108840</td><td>FE-E3</td><td className="font-mono" style={{ textAlign: 'right' }}>24,347</td><td className="font-mono" style={{ textAlign: 'right', color: 'var(--danger-color)' }}>-9,738.80</td><td><span style={{ padding: '2px 6px', background: '#fef3c7', color: '#b45309', fontSize: '11px', fontWeight: 700 }}>Neplaćeno</span></td></tr>
                                <tr><td className="font-mono">2026-02-15</td><td className="font-mono">VIRMAN</td><td>Uplata</td><td className="font-mono" style={{ textAlign: 'right' }}>-</td><td className="font-mono" style={{ textAlign: 'right', color: 'var(--success-color)' }}>+45,000.00</td><td><span style={{ padding: '2px 6px', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700 }}>Izvršeno</span></td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="scada-panel">
                        <div className="scada-header" style={{ background: '#475569' }}>UGOVORI</div>
                        <table>
                            <thead><tr><th>BR.</th><th>MATERIJAL</th><th>FORMULA</th><th>STATUS</th></tr></thead>
                            <tbody>
                                <tr><td className="font-mono">UGV-2026-001</td><td>AL-PRF</td><td className="font-mono">LME -15%</td><td><span style={{ padding: '2px 6px', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700 }}>Aktivan</span></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Uredi Dobavljača" width={650}>
                {supplier && (
                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div><label style={LABEL}>Naziv Firme *</label><input type="text" style={INPUT} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
                            <div><label style={LABEL}>JIB</label><input type="text" className="font-mono" style={INPUT} value={formData.jib} onChange={e => setFormData({ ...formData, jib: e.target.value })} /></div>
                            <div><label style={LABEL}>Tip</label><select style={INPUT} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                <option value="Industrija">Industrija</option>
                                <option value="Sakupljač">Sakupljač</option>
                                <option value="Komunalno">Komunalno</option>
                            </select></div>
                            <div><label style={LABEL}>PDV Obveznik</label><select style={INPUT} value={formData.pdv ? 'DA' : 'NE'} onChange={e => setFormData({ ...formData, pdv: e.target.value === 'DA' })}>
                                <option value="DA">DA</option>
                                <option value="NE">NE</option>
                            </select></div>
                            <div><label style={LABEL}>Grad</label><input type="text" style={INPUT} value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} /></div>
                            <div><label style={LABEL}>Telefon</label><input type="text" className="font-mono" style={INPUT} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
                            <div><label style={LABEL}>Bonitet</label><select style={INPUT} value={formData.bonitet} onChange={e => setFormData({ ...formData, bonitet: e.target.value })}>
                                <option value="A">A — Odličan</option>
                                <option value="B">B — Prosječan</option>
                                <option value="C">C — Rizičan</option>
                            </select></div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            <button type="button" onClick={() => setShowEdit(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                            <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'ČUVANJE...' : 'SAČUVAJ'}</button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
