'use client';
import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/UI/Modal';
import api from '@/lib/api';
import { normalizeApiList } from '@/lib/materialsAdapter';

const LABEL = { fontSize: '11px', fontWeight: 700 };
const INPUT = { width: '100%', padding: '6px', marginTop: '4px' };

export default function SuppliersPage() {
    const [suppliersList, setSuppliersList] = useState([]);
    const [showNew, setShowNew] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ name: '', jib: '', type: 'Industrija', pdv: true, city: '', address: '', phone: '', email: '', bonitet: 'B', paymentDays: 15 });

    const loadSuppliers = async () => {
        const res = await api.get('/sourcing/suppliers');
        setSuppliersList(normalizeApiList(res));
    };

    useEffect(() => {
        loadSuppliers().catch(() => setSuppliersList([]));
    }, []);

    const filtered = useMemo(
        () => suppliersList.filter((s) => String(s.name || '').toLowerCase().includes(search.toLowerCase()) || String(s.city || '').toLowerCase().includes(search.toLowerCase())),
        [suppliersList, search]
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name?.trim()) return;
        setLoading(true);
        try {
            await api.post('/sourcing/suppliers', {
                name: formData.name.trim(),
                jib: String(formData.jib || '').trim() || null,
                pdv: Boolean(formData.pdv),
                type: String(formData.type || 'Industrija'),
                bonitet: String(formData.bonitet || 'B'),
                city: String(formData.city || '').trim() || null,
                address: String(formData.address || '').trim() || null,
                phone: String(formData.phone || '').trim() || null,
                email: String(formData.email || '').trim() || null,
                paymentDays: Number(formData.paymentDays || 15),
                balance: 0,
                active: true,
            });
            await loadSuppliers();
            setFormData({ name: '', jib: '', type: 'Industrija', pdv: true, city: '', address: '', phone: '', email: '', bonitet: 'B', paymentDays: 15 });
            setShowNew(false);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEdit = (s) => {
        setEditingSupplier(s);
        setFormData({ name: s.name, jib: s.jib || '', type: s.type, pdv: s.pdv, city: s.city || '', address: '', phone: s.phone || '', email: '', bonitet: s.bonitet, paymentDays: 15 });
        setShowEdit(true);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingSupplier) return;
        setLoading(true);
        try {
            await api.put(`/sourcing/suppliers/${editingSupplier.id}`, {
                name: String(formData.name || '').trim(),
                jib: String(formData.jib || '').trim() || null,
                type: String(formData.type || 'Industrija'),
                pdv: Boolean(formData.pdv),
                city: String(formData.city || '').trim() || null,
                phone: String(formData.phone || '').trim() || null,
                bonitet: String(formData.bonitet || 'B'),
                address: String(formData.address || '').trim() || null,
                email: String(formData.email || '').trim() || null,
                paymentDays: Number(formData.paymentDays || 15),
            });
            await loadSuppliers();
            setShowEdit(false);
            setEditingSupplier(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Dobavljači (CRM)</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" placeholder="Pretraži..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '6px 10px', width: '200px' }} />
                    <button className="btn-primary" onClick={() => setShowNew(true)}>+ NOVI DOBAVLJAČ</button>
                </div>
            </div>
            <div className="scada-panel" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead><tr><th>ID</th><th>NAZIV</th><th>JIB</th><th>TIP</th><th>GRAD</th><th>BONITET</th><th style={{ textAlign: 'right' }}>BILANS (BAM)</th><th>PDV</th></tr></thead>
                    <tbody>
                        {filtered.map(s => (
                            <tr key={s.id}>
                                <td className="font-mono">{s.id}</td>
                                <td style={{ fontWeight: 600 }}>{s.name}</td>
                                <td className="font-mono" style={{ fontSize: '11px' }}>{s.jib}</td>
                                <td style={{ fontSize: '11px' }}>{s.type}</td>
                                <td>{s.city}</td>
                                <td><span style={{ padding: '2px 6px', background: s.bonitet === 'A' ? '#dcfce7' : '#fef3c7', color: s.bonitet === 'A' ? '#15803d' : '#b45309', fontWeight: 700, fontSize: '11px' }}>{s.bonitet}</span></td>
                                <td className="font-mono" style={{ textAlign: 'right', fontWeight: 600, color: Number(s.balance || 0) < 0 ? 'var(--danger-color)' : 'var(--success-color)' }}>{Number(s.balance || 0).toLocaleString()}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '11px' }}>{s.pdv ? 'DA' : 'NE'}</span>
                                        <button type="button" onClick={(ev) => { ev.stopPropagation(); ev.preventDefault(); handleOpenEdit(s); }} style={{ padding: '2px 8px', fontSize: '10px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>✎</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Novi Dobavljač" width={750}>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={LABEL}>Naziv Firme / Ime *</label><input type="text" style={INPUT} placeholder="npr. Zenica Steelworks d.o.o." value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
                        <div><label style={LABEL}>JIB *</label><input type="text" className="font-mono" style={INPUT} placeholder="4218109230004" value={formData.jib} onChange={e => setFormData({ ...formData, jib: e.target.value })} /></div>
                        <div><label style={LABEL}>Tip Partnera *</label><select style={INPUT} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                            <option value="Industrija">Industrija (Firma)</option>
                            <option value="Sakupljač">Sakupljač</option>
                            <option value="Komunalno">Komunalno</option>
                            <option value="Fizičko Lice">Fizičko Lice</option>
                        </select></div>
                        <div><label style={LABEL}>PDV Obveznik</label><select style={INPUT} value={formData.pdv ? 'DA' : 'NE'} onChange={e => setFormData({ ...formData, pdv: e.target.value === 'DA' })}>
                            <option value="DA">DA</option>
                            <option value="NE">NE</option>
                        </select></div>
                        <div><label style={LABEL}>Grad</label><input type="text" style={INPUT} value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} /></div>
                        <div><label style={LABEL}>Adresa</label><input type="text" style={INPUT} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} /></div>
                        <div><label style={LABEL}>Telefon</label><input type="text" className="font-mono" style={INPUT} placeholder="+387 xx xxx xxx" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
                        <div><label style={LABEL}>Email</label><input type="email" style={INPUT} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
                        <div><label style={LABEL}>Bonitet</label><select style={INPUT} value={formData.bonitet} onChange={e => setFormData({ ...formData, bonitet: e.target.value })}>
                            <option value="A">A — Odličan</option>
                            <option value="B">B — Prosječan</option>
                            <option value="C">C — Rizičan</option>
                        </select></div>
                        <div><label style={LABEL}>Rok Plaćanja (dana)</label><input type="number" className="font-mono" style={INPUT} value={formData.paymentDays} onChange={e => setFormData({ ...formData, paymentDays: e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button type="button" onClick={() => setShowNew(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                        <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'ČUVANJE...' : 'SAČUVAJ DOBAVLJAČA'}</button>
                    </div>
                </form>
            </Modal>

            <Modal open={showEdit} onClose={() => { setShowEdit(false); setEditingSupplier(null); }} title="Uredi Dobavljača" width={750}>
                {editingSupplier && (
                    <form onSubmit={handleSaveEdit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div><label style={LABEL}>Naziv Firme / Ime *</label><input type="text" style={INPUT} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
                            <div><label style={LABEL}>JIB</label><input type="text" className="font-mono" style={INPUT} value={formData.jib} onChange={e => setFormData({ ...formData, jib: e.target.value })} /></div>
                            <div><label style={LABEL}>Tip Partnera *</label><select style={INPUT} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                <option value="Industrija">Industrija (Firma)</option>
                                <option value="Sakupljač">Sakupljač</option>
                                <option value="Komunalno">Komunalno</option>
                                <option value="Fizičko Lice">Fizičko Lice</option>
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
                            <button type="button" onClick={() => { setShowEdit(false); setEditingSupplier(null); }} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                            <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'ČUVANJE...' : 'SAČUVAJ'}</button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
