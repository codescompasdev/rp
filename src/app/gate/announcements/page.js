'use client';
import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/UI/Modal';
import MaterialPicker from '@/components/UI/MaterialPicker';
import api from '@/lib/api';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

const LABEL = { fontSize: '11px', fontWeight: 700 };
const INPUT = { width: '100%', padding: '6px', marginTop: '4px' };

export default function AnnouncementsPage() {
    const [announcementsList, setAnnouncementsList] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [showNew, setShowNew] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingAnn, setEditingAnn] = useState(null);
    const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [supplierQuery, setSupplierQuery] = useState('');
    const [createSupplierOpen, setCreateSupplierOpen] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ supplierId: '', contract: '', expectedKg: '', truck: '', expectedDate: '' });

    const materialsByCode = useMemo(() => {
        const map = new Map();
        materials.forEach((material) => map.set(material.code, material));
        return map;
    }, [materials]);

    useEffect(() => {
        api.get('/gate/announcements').then((res) => setAnnouncementsList(normalizeApiList(res))).catch(() => setAnnouncementsList([]));
        api.get('/sourcing/suppliers').then((res) => {
            const data = normalizeApiList(res);
            setSuppliers(data);
            if (data[0]) {
                setFormData((prev) => ({ ...prev, supplierId: prev.supplierId || data[0].id }));
            }
        }).catch(() => setSuppliers([]));
        api.get('/sourcing/contracts').then((res) => setContracts(normalizeApiList(res))).catch(() => setContracts([]));
        api.get('/materials').then((res) => setMaterials(normalizeApiList(res))).catch(() => setMaterials([]));
    }, []);

    useEffect(() => {
        const selected = suppliers.find((s) => s.id === formData.supplierId);
        setSupplierQuery(selected?.name || '');
    }, [formData.supplierId, suppliers]);

    const resolveSupplierId = (value) => {
        const normalized = String(value || '').trim().toLowerCase();
        if (!normalized) return '';
        const byId = suppliers.find((s) => s.id === value);
        if (byId) return byId.id;
        const byName = suppliers.find((s) => String(s.name || '').trim().toLowerCase() === normalized);
        return byName?.id || '';
    };

    const createSupplier = async () => {
        const name = String(newSupplierName || '').trim();
        if (!name) return;
        const created = await api.post('/sourcing/suppliers', {
            name,
            type: 'Partner',
            pdv: false,
            bonitet: 'B',
            balance: 0,
            active: true,
        });
        const supplier = created?.data?.data;
        const refreshed = await api.get('/sourcing/suppliers');
        const nextSuppliers = normalizeApiList(refreshed);
        setSuppliers(nextSuppliers);
        if (supplier?.id) {
            setFormData((prev) => ({ ...prev, supplierId: supplier.id }));
            setSupplierQuery(supplier.name || name);
        }
        setCreateSupplierOpen(false);
        setNewSupplierName('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedMaterial) return;
        setLoading(true);
        const backendMaterial = resolveBackendMaterial(materials, selectedMaterial) || materialsByCode.get(selectedMaterial.code);
        try {
            await api.post('/gate/announcements', {
                supplierId: formData.supplierId || suppliers[0]?.id,
                materialId: backendMaterial?.id,
                expectedKg: Number(formData.expectedKg || 0),
                contractId: formData.contract || null,
                status: 'Najavljeno',
                expectedDate: formData.expectedDate || new Date().toISOString(),
                truck: formData.truck || '',
            });
            const refreshed = await api.get('/gate/announcements');
            setAnnouncementsList(refreshed.data?.data || []);
            setFormData((prev) => ({ ...prev, contract: '', expectedKg: '', truck: '', expectedDate: '' }));
            setSelectedMaterial(null);
            setShowNew(false);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEdit = (a) => {
        setEditingAnn(a);
        setFormData({ supplierId: a.supplierId || '', contract: a.contractId || '', expectedKg: String(a.expectedKg || ''), truck: a.truck || '', expectedDate: a.expectedDate ? String(a.expectedDate).slice(0, 10) : '' });
        setShowEdit(true);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingAnn) return;
        setLoading(true);
        try {
            await api.put(`/gate/announcements/${editingAnn.id}`, {
                supplierId: formData.supplierId,
                contractId: formData.contract || null,
                expectedKg: Number(formData.expectedKg || 0),
                truck: formData.truck,
                expectedDate: formData.expectedDate || new Date().toISOString(),
            });
            const refreshed = await api.get('/gate/announcements');
            setAnnouncementsList(refreshed.data?.data || []);
            setShowEdit(false);
            setEditingAnn(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div className="responsive-row">
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Najave Prijema (Gate Pass)</h2>
                <button className="btn-primary" onClick={() => setShowNew(true)}>+ NOVA NAJAVA</button>
            </div>
            <div className="scada-panel responsive-table" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead><tr><th>BR.</th><th>DOBAVLJAČ</th><th>MATERIJAL</th><th style={{ textAlign: 'right' }}>OČEKIVANO (KG)</th><th>UGOVOR</th><th>KAMION</th><th>DATUM</th><th>STATUS</th></tr></thead>
                    <tbody>
                        {announcementsList.map(a => {
                            const sup = suppliers.find(s => s.id === (a.supplierId || a.supplier?.id));
                            return (
                                <tr key={a.id}>
                                    <td className="font-mono" style={{ fontWeight: 600 }}>{a.code || a.id}</td>
                                    <td>{sup?.name || a.supplier?.name || '-'}</td>
                                    <td>{a.material?.code || '-'}</td>
                                    <td className="font-mono" style={{ textAlign: 'right' }}>{Number(a.expectedKg || 0).toLocaleString()}</td>
                                    <td className="font-mono">{a.contract?.code || '-'}</td>
                                    <td className="font-mono">{a.truck}</td>
                                    <td className="font-mono">{a.expectedDate ? String(a.expectedDate).slice(0, 10) : '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <span style={{ padding: '2px 6px', fontSize: '11px', fontWeight: 700, background: a.status === 'Najavljeno' ? '#dbeafe' : a.status === 'U Krugu' ? '#fef3c7' : '#dcfce7', color: a.status === 'Najavljeno' ? '#1d4ed8' : a.status === 'U Krugu' ? '#b45309' : '#15803d' }}>{a.status || '-'}</span>
                                            <button type="button" onClick={() => handleOpenEdit(a)} style={{ padding: '2px 8px', fontSize: '10px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>✎</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Nova Najava Prijema">
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        <div>
                            <label style={LABEL}>Dobavljač *</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px', marginTop: '4px' }}>
                                <input
                                    list="ann-page-suppliers"
                                    style={{ ...INPUT, marginTop: 0 }}
                                    value={supplierQuery}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSupplierQuery(value);
                                        setFormData({ ...formData, supplierId: resolveSupplierId(value) });
                                    }}
                                    required
                                />
                                <button type="button" className="btn-primary" onClick={() => setCreateSupplierOpen(true)}>+ Novi</button>
                            </div>
                            <datalist id="ann-page-suppliers">
                                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.name} />)}
                            </datalist>
                        </div>
                        <div><label style={LABEL}>Ugovor</label><select style={INPUT} value={formData.contract} onChange={e => setFormData({ ...formData, contract: e.target.value })}>
                            <option value="">- Spot -</option>
                            {contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.code || contract.id}</option>)}
                        </select></div>
                        <div><label style={LABEL}>Materijal *</label>
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                <button type="button" onClick={() => setMaterialPickerOpen(true)} style={{ flex: 1, padding: '6px', textAlign: 'left', border: '1px solid var(--border-color)', background: selectedMaterial ? '#f8fafc' : '#fff', cursor: 'pointer' }}>
                                    {selectedMaterial ? formatPickedMaterial(selectedMaterial) : 'Odaberi materijal...'}
                                </button>
                                <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setMaterialPickerOpen(true)}>Pretraži</button>
                            </div>
                        </div>
                        <div><label style={LABEL}>Očekivana Količina (KG)</label><input type="number" className="font-mono" style={INPUT} value={formData.expectedKg} onChange={e => setFormData({ ...formData, expectedKg: e.target.value })} /></div>
                        <div><label style={LABEL}>Tablice Kamiona</label><input type="text" className="font-mono" style={INPUT} placeholder="E55-K-991" value={formData.truck} onChange={e => setFormData({ ...formData, truck: e.target.value })} /></div>
                        <div><label style={LABEL}>Očekivani Datum</label><input type="date" className="font-mono" style={INPUT} value={formData.expectedDate} onChange={e => setFormData({ ...formData, expectedDate: e.target.value })} /></div>
                    </div>
                    <div style={{ marginTop: '12px', padding: '8px', background: '#eef2ff', border: '1px solid var(--primary-color)', fontSize: '11px' }}>ℹ️ Najava će biti vidljiva portiru na Kapiji.</div>
                    <div className="responsive-row" style={{ justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button type="button" onClick={() => setShowNew(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                        <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'ČUVANJE...' : 'KREIRAJ NAJAVU'}</button>
                    </div>
                </form>
            </Modal>
            <MaterialPicker open={materialPickerOpen} onClose={() => setMaterialPickerOpen(false)} onSelect={({ material }) => setSelectedMaterial(material)} />
            <Modal open={createSupplierOpen} onClose={() => setCreateSupplierOpen(false)} title="Novi dobavljač" width={520}>
                <div style={{ display: 'grid', gap: '10px' }}>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>Naziv dobavljača *</label>
                        <input value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                    <button type="button" onClick={() => setCreateSupplierOpen(false)} style={{ padding: '8px 16px', border: '1px solid var(--border-color)', background: '#fff' }}>Odustani</button>
                    <button type="button" className="btn-primary" onClick={createSupplier} style={{ padding: '8px 16px' }}>Sačuvaj</button>
                </div>
            </Modal>

            <Modal open={showEdit} onClose={() => { setShowEdit(false); setEditingAnn(null); }} title="Uredi Najavu" width={550}>
                {editingAnn && (
                    <form onSubmit={handleSaveEdit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                            <div><label style={LABEL}>Dobavljač</label><select style={INPUT} value={formData.supplierId} onChange={e => setFormData({ ...formData, supplierId: e.target.value })}>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select></div>
                            <div><label style={LABEL}>Ugovor</label><select style={INPUT} value={formData.contract} onChange={e => setFormData({ ...formData, contract: e.target.value })}>
                                <option value="">- Spot -</option>
                                {contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.code || contract.id}</option>)}
                            </select></div>
                            <div><label style={LABEL}>Očekivana Količina (KG)</label><input type="number" className="font-mono" style={INPUT} value={formData.expectedKg} onChange={e => setFormData({ ...formData, expectedKg: e.target.value })} /></div>
                            <div><label style={LABEL}>Tablice Kamiona</label><input type="text" className="font-mono" style={INPUT} value={formData.truck} onChange={e => setFormData({ ...formData, truck: e.target.value })} /></div>
                            <div><label style={LABEL}>Očekivani Datum</label><input type="date" className="font-mono" style={INPUT} value={formData.expectedDate} onChange={e => setFormData({ ...formData, expectedDate: e.target.value })} /></div>
                        </div>
                        <div className="responsive-row" style={{ justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            <button type="button" onClick={() => { setShowEdit(false); setEditingAnn(null); }} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                            <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'ČUVANJE...' : 'SAČUVAJ'}</button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
