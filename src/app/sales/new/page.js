'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import MaterialPicker from '@/components/UI/MaterialPicker';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

export default function NewSalesOrderPage() {
    const [customers, setCustomers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [pickerOpenFor, setPickerOpenFor] = useState(null);
    const [submitError, setSubmitError] = useState('');
    const [lineItems, setLineItems] = useState([{ id: crypto.randomUUID(), material: null, qtyKg: '', pricePerKg: '' }]);
    const [form, setForm] = useState({
        customerId: '',
        delivery: 'Domaća Prodaja',
        parity: 'FCA Pale',
    });

    useEffect(() => {
        api.get('/sourcing/customers').then((res) => {
            const data = normalizeApiList(res);
            setCustomers(data);
            if (data[0]) {
                setForm((prev) => ({ ...prev, customerId: data[0].id }));
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

    const handleCreate = async () => {
        if (!form.customerId || !lineItems.length) {
            setSubmitError('Odaberi kupca i dodaj bar jednu stavku prije kreiranja naloga.');
            return;
        }
        const items = lineItems.map((item) => {
            const backendMaterial = resolveBackendMaterial(materials, item.material);
            return {
                materialId: backendMaterial?.id,
                qtyKg: Number(item.qtyKg || 0),
                pricePerKg: Number(item.pricePerKg || 0),
            };
        }).filter((row) => row.materialId && row.qtyKg > 0);

        if (!items.length || items.length !== lineItems.length) {
            setSubmitError('Svaka stavka mora imati materijal i količinu veću od 0.');
            return;
        }

        try {
            await api.post('/sales/orders', {
                customerId: form.customerId,
                items,
                status: 'Priprema dokumenata',
                exportDocs: form.delivery.includes('Izvoz'),
            });
            setSubmitError('');
            setLineItems([{ id: crypto.randomUUID(), material: null, qtyKg: '', pricePerKg: '' }]);
        } catch {
            setSubmitError('Kreiranje naloga nije uspjelo. Provjeri podatke i pokušaj ponovo.');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Novi Prodajni Nalog</h2>
            <div className="scada-panel">
                <div className="scada-header">KUPAC & ROBA</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Kupac *</label><select value={form.customerId} onChange={(e) => setForm((prev) => ({ ...prev, customerId: e.target.value }))} style={{ width: '100%', padding: '6px', marginTop: '4px' }}>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Način Isporuke</label><select value={form.delivery} onChange={(e) => setForm((prev) => ({ ...prev, delivery: e.target.value }))} style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>Domaća Prodaja</option><option>Izvoz (EU)</option><option>Izvoz (Non-EU)</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Valuta</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>BAM</option><option>EUR</option><option>USD</option></select></div>
                </div>
                <div style={{ padding: '0 16px 16px', display: 'grid', gap: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700 }}>Stavke narudžbe *</div>
                    {lineItems.map((item, index) => (
                        <div key={item.id} style={{ border: '1px solid #e2e8f0', padding: '10px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700 }}>Materijal #{index + 1}</label>
                                <button type="button" onClick={() => setPickerOpenFor(item.id)} style={{ width: '100%', padding: '6px', marginTop: '4px', textAlign: 'left' }}>
                                    {item.material ? formatPickedMaterial(item.material) : 'Odaberi materijal...'}
                                </button>
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700 }}>Količina (KG)</label>
                                <input type="number" className="font-mono" value={item.qtyKg} onChange={(e) => updateLineItem(item.id, { qtyKg: e.target.value })} style={{ width: '100%', padding: '6px', marginTop: '4px' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700 }}>Cijena (BAM/KG)</label>
                                <input type="number" className="font-mono" value={item.pricePerKg} onChange={(e) => updateLineItem(item.id, { pricePerKg: e.target.value })} style={{ width: '100%', padding: '6px', marginTop: '4px' }} />
                            </div>
                            <button type="button" onClick={() => removeLineItem(item.id)} style={{ padding: '6px 10px' }}>Ukloni</button>
                        </div>
                    ))}
                    <div>
                        <button type="button" className="btn-primary" style={{ padding: '6px 12px' }} onClick={addLineItem}>
                            + Dodaj materijal
                        </button>
                    </div>
                </div>
            </div>
            <div className="scada-panel">
                <div className="scada-header" style={{ background: '#475569' }}>TRANSPORT & DOKUMENTI</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Paritet</label><select value={form.parity} onChange={(e) => setForm((prev) => ({ ...prev, parity: e.target.value }))} style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>FCA Pale</option><option>DAP (Mi dostavljamo)</option><option>CIF</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Potrebni Dokumenti</label>
                        <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                            <label><input type="checkbox" defaultChecked /> Faktura</label>
                            <label><input type="checkbox" /> CMR (Tovarni list)</label>
                            <label><input type="checkbox" /> EUR1 (Porijeklo)</label>
                            <label><input type="checkbox" /> Annex VII</label>
                            <label><input type="checkbox" /> Loading Report</label>
                        </div>
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button style={{ padding: '10px 24px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                <button className="btn-primary" style={{ padding: '10px 24px' }} onClick={handleCreate}>KREIRAJ NALOG</button>
            </div>
            {submitError && (
                <div style={{ padding: '10px 12px', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: '12px' }}>
                    {submitError}
                </div>
            )}
            <MaterialPicker
                open={Boolean(pickerOpenFor)}
                onClose={() => setPickerOpenFor(null)}
                onSelect={({ material }) => {
                    if (!pickerOpenFor) return;
                    updateLineItem(pickerOpenFor, { material });
                    setPickerOpenFor(null);
                }}
            />
        </div>
    );
}
