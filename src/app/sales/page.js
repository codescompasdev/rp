'use client';
import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/UI/Modal';
import MaterialPicker from '@/components/UI/MaterialPicker';
import api from '@/lib/api';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

const LABEL = { fontSize: '11px', fontWeight: 700 };
const INPUT = { width: '100%', padding: '6px', marginTop: '4px' };

export default function SalesPage() {
    const [ordersList, setOrdersList] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [showNew, setShowNew] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [materialPickerOpenFor, setMaterialPickerOpenFor] = useState(null);
    const [lineItems, setLineItems] = useState([{ id: crypto.randomUUID(), material: null, qtyKg: '', pricePerKg: '' }]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ customerId: '', delivery: 'Domaća Prodaja', qtyKg: '', pricePerKg: '', currency: 'BAM', parity: 'FCA Pale' });

    const materialsByCode = useMemo(() => {
        const map = new Map();
        materials.forEach((material) => map.set(material.code, material));
        return map;
    }, [materials]);

    useEffect(() => {
        api.get('/sales/orders').then((res) => {
            const data = normalizeApiList(res);
            setOrdersList(data);
        }).catch(() => setOrdersList([]));
        api.get('/sourcing/customers').then((res) => {
            const data = normalizeApiList(res);
            setCustomers(data);
            if (data[0]) {
                setFormData((prev) => ({ ...prev, customerId: prev.customerId || data[0].id }));
            }
        }).catch(() => setCustomers([]));
        api.get('/materials').then((res) => setMaterials(normalizeApiList(res))).catch(() => setMaterials([]));
    }, []);

    const updateLineItem = (id, updates) => {
        setLineItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    };

    const addLineItem = () => {
        setLineItems((prev) => [...prev, { id: crypto.randomUUID(), material: null, qtyKg: '', pricePerKg: '' }]);
    };

    const removeLineItem = (id) => {
        setLineItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const items = lineItems.map((item) => {
            const backendMaterial = resolveBackendMaterial(materials, item.material) || materialsByCode.get(item.material?.code);
            return {
                materialId: backendMaterial?.id,
                qtyKg: parseFloat(item.qtyKg) || 0,
                pricePerKg: parseFloat(item.pricePerKg) || 0,
            };
        }).filter((row) => row.materialId && row.qtyKg > 0);
        if (!items.length || items.length !== lineItems.length) return;

        setLoading(true);
        try {
            await api.post('/sales/orders', {
                customerId: formData.customerId,
                items,
                status: 'Priprema dokumenata',
                exportDocs: formData.delivery?.includes('Izvoz') || false,
            });
            const refreshed = await api.get('/sales/orders');
            setOrdersList(refreshed.data?.data || []);
            setFormData((prev) => ({ ...prev, delivery: 'Domaća Prodaja' }));
            setLineItems([{ id: crypto.randomUUID(), material: null, qtyKg: '', pricePerKg: '' }]);
            setShowNew(false);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEdit = (o) => {
        setEditingOrder(o);
        const cust = customers.find(c => c.name === (o.customer?.name || o.customer));
        setFormData({ customerId: cust?.id || '', qtyKg: String(o.qtyKg), pricePerKg: String(o.pricePerKg), delivery: o.exportDocs ? 'Izvoz (EU)' : 'Domaća Prodaja' });
        setShowEdit(true);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingOrder) return;
        setLoading(true);
        const qty = parseFloat(formData.qtyKg) || 0;
        const price = parseFloat(formData.pricePerKg) || 0;
        try {
            await api.put(`/sales/orders/${editingOrder.id}`, {
                customerId: formData.customerId,
                qtyKg: qty,
                pricePerKg: price,
                total: qty * price,
                exportDocs: formData.delivery?.includes('Izvoz'),
            });
            const refreshed = await api.get('/sales/orders');
            setOrdersList(refreshed.data?.data || []);
            setShowEdit(false);
            setEditingOrder(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div className="responsive-row">
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Prodajni Nalozi</h2>
                <button className="btn-primary" onClick={() => setShowNew(true)}>+ NOVI PRODAJNI NALOG</button>
            </div>
            <div className="scada-panel responsive-table" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead><tr><th>BR.</th><th>KUPAC</th><th>MATERIJAL</th><th style={{ textAlign: 'right' }}>KG</th><th style={{ textAlign: 'right' }}>CIJENA/KG</th><th style={{ textAlign: 'right' }}>UKUPNO (BAM)</th><th>EXPORT</th><th>STATUS</th></tr></thead>
                    <tbody>
                        {ordersList.map(s => (
                            <tr key={s.id}>
                                <td className="font-mono" style={{ fontWeight: 600 }}>{s.code || s.id}</td>
                                <td>{s.customer?.name || '-'}</td>
                                <td>{(s.items || []).length ? s.items.map((i) => i.material?.code || '-').join(', ') : (s.material?.code || '-')}</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>{Number((s.items || []).reduce((sum, row) => sum + Number(row.qtyKg || 0), 0) || s.qtyKg || 0).toLocaleString()}</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>{Number(s.pricePerKg || 0).toFixed(2)}</td>
                                <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>{Number(s.total || 0).toLocaleString()}</td>
                                <td>{s.exportDocs ? '🌍 DA' : 'Domaće'}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <span style={{ padding: '2px 6px', fontSize: '11px', fontWeight: 700, background: s.status === 'Utovar' ? '#fef3c7' : s.status === 'Završen' ? '#dcfce7' : '#dbeafe', color: s.status === 'Utovar' ? '#b45309' : s.status === 'Završen' ? '#15803d' : '#1d4ed8' }}>{s.status || '-'}</span>
                                        <button type="button" onClick={() => handleOpenEdit(s)} style={{ padding: '2px 8px', fontSize: '10px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>✎</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Novi Prodajni Nalog" width={750}>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        <div><label style={LABEL}>Kupac *</label><select style={INPUT} value={formData.customerId} onChange={e => setFormData({ ...formData, customerId: e.target.value })} required>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select></div>
                        <div><label style={LABEL}>Isporuka</label><select style={INPUT} value={formData.delivery} onChange={e => setFormData({ ...formData, delivery: e.target.value })}>
                            <option value="Domaća Prodaja">Domaća Prodaja</option>
                            <option value="Izvoz (EU)">Izvoz (EU)</option>
                        </select></div>
                        <div><label style={LABEL}>Valuta</label><select style={INPUT} value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}><option value="BAM">BAM</option><option value="EUR">EUR</option><option value="USD">USD</option></select></div>
                        <div><label style={LABEL}>Paritet</label><select style={INPUT} value={formData.parity} onChange={e => setFormData({ ...formData, parity: e.target.value })}><option value="FCA Pale">FCA Pale</option><option value="DAP">DAP</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Dokumenti</label>
                        <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                            <label><input type="checkbox" defaultChecked /> Faktura</label>
                            <label><input type="checkbox" /> CMR</label>
                            <label><input type="checkbox" /> EUR1</label>
                            <label><input type="checkbox" /> Annex VII</label>
                        </div>
                    </div>
                    </div>
                    <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700 }}>Stavke narudžbe</div>
                        {lineItems.map((item, index) => (
                            <div key={item.id} style={{ border: '1px solid #e2e8f0', padding: '10px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 700 }}>Materijal #{index + 1}</label>
                                    <button type="button" onClick={() => setMaterialPickerOpenFor(item.id)} style={{ width: '100%', padding: '6px', marginTop: '4px', textAlign: 'left', border: '1px solid var(--border-color)', background: item.material ? '#f8fafc' : '#fff', cursor: 'pointer' }}>
                                        {item.material ? formatPickedMaterial(item.material) : 'Odaberi materijal...'}
                                    </button>
                                </div>
                                <div><label style={LABEL}>Količina (KG)</label><input type="number" className="font-mono" style={INPUT} value={item.qtyKg} onChange={e => updateLineItem(item.id, { qtyKg: e.target.value })} required /></div>
                                <div><label style={LABEL}>Cijena (BAM/KG)</label><input type="number" step={0.01} className="font-mono" style={INPUT} value={item.pricePerKg} onChange={e => updateLineItem(item.id, { pricePerKg: e.target.value })} required /></div>
                                <button type="button" style={{ padding: '6px 10px' }} onClick={() => removeLineItem(item.id)}>Ukloni</button>
                            </div>
                        ))}
                        <div>
                            <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={addLineItem}>+ Dodaj materijal</button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button type="button" onClick={() => setShowNew(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                        <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'ČUVANJE...' : 'KREIRAJ NALOG'}</button>
                    </div>
                </form>
            </Modal>
            <MaterialPicker
                open={Boolean(materialPickerOpenFor)}
                onClose={() => setMaterialPickerOpenFor(null)}
                onSelect={({ material }) => {
                    if (!materialPickerOpenFor) return;
                    updateLineItem(materialPickerOpenFor, { material });
                    setMaterialPickerOpenFor(null);
                }}
            />

            <Modal open={showEdit} onClose={() => { setShowEdit(false); setEditingOrder(null); }} title="Uredi Prodajni Nalog" width={550}>
                {editingOrder && (
                    <form onSubmit={handleSaveEdit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                            <div><label style={LABEL}>Kupac</label><select style={INPUT} value={formData.customerId} onChange={e => setFormData({ ...formData, customerId: e.target.value })}>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select></div>
                            <div><label style={LABEL}>Isporuka</label><select style={INPUT} value={formData.delivery} onChange={e => setFormData({ ...formData, delivery: e.target.value })}>
                                <option value="Domaća Prodaja">Domaća Prodaja</option>
                                <option value="Izvoz (EU)">Izvoz (EU)</option>
                            </select></div>
                            <div><label style={LABEL}>Količina (KG)</label><input type="number" className="font-mono" style={INPUT} value={formData.qtyKg} onChange={e => setFormData({ ...formData, qtyKg: e.target.value })} /></div>
                            <div><label style={LABEL}>Cijena (BAM/KG)</label><input type="number" step={0.01} className="font-mono" style={INPUT} value={formData.pricePerKg} onChange={e => setFormData({ ...formData, pricePerKg: e.target.value })} /></div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            <button type="button" onClick={() => { setShowEdit(false); setEditingOrder(null); }} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                            <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'ČUVANJE...' : 'SAČUVAJ'}</button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
