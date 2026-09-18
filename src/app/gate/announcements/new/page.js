'use client';

import { useEffect, useState } from 'react';
import MaterialPicker from '@/components/UI/MaterialPicker';
import Modal from '@/components/UI/Modal';
import api from '@/lib/api';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

export default function NewAnnouncementPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [supplierQuery, setSupplierQuery] = useState('');
    const [createSupplierOpen, setCreateSupplierOpen] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [form, setForm] = useState({ supplierId: '', contractId: '', expectedKg: '', truck: '', expectedDate: '' });
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const [suppliersRes, contractsRes, materialsRes] = await Promise.all([
                    api.get('/sourcing/suppliers'),
                    api.get('/sourcing/contracts'),
                    api.get('/materials'),
                ]);
                const nextSuppliers = normalizeApiList(suppliersRes);
                setSuppliers(nextSuppliers);
                setContracts(normalizeApiList(contractsRes));
                setMaterials(normalizeApiList(materialsRes));
                if (nextSuppliers[0]) {
                    setForm((prev) => ({ ...prev, supplierId: nextSuppliers[0].id }));
                }
            } catch {
                setSuppliers([]);
                setContracts([]);
                setMaterials([]);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const selected = suppliers.find((s) => s.id === form.supplierId);
        setSupplierQuery(selected?.name || '');
    }, [form.supplierId, suppliers]);

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
            setForm((prev) => ({ ...prev, supplierId: supplier.id }));
            setSupplierQuery(supplier.name || name);
        }
        setCreateSupplierOpen(false);
        setNewSupplierName('');
    };

    const handleCreate = async () => {
        const backendMaterial = resolveBackendMaterial(materials, selectedMaterial);
        if (!form.supplierId || !backendMaterial?.id) {
            setSubmitError('Dobavljač i materijal su obavezni. Materijal mora postojati u backend katalogu.');
            return;
        }
        try {
            await api.post('/gate/announcements', {
                supplierId: form.supplierId,
                contractId: form.contractId || null,
                materialId: backendMaterial.id,
                expectedKg: Number(form.expectedKg || 0),
                truck: form.truck || '',
                expectedDate: form.expectedDate || new Date().toISOString(),
                status: 'Najavljeno',
            });
            setSubmitError('');
        } catch {
            setSubmitError('Kreiranje najave nije uspjelo. Provjeri podatke i pokušaj ponovo.');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Nova Najava Prijema</h2>
            <div className="scada-panel">
                <div className="scada-header">NAJAVA</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>Dobavljač *</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px', marginTop: '4px' }}>
                            <input
                                list="announcement-suppliers"
                                style={{ width: '100%', padding: '6px' }}
                                value={supplierQuery}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSupplierQuery(value);
                                    setForm((prev) => ({ ...prev, supplierId: resolveSupplierId(value) }));
                                }}
                            />
                            <button type="button" className="btn-primary" onClick={() => setCreateSupplierOpen(true)}>+ Novi</button>
                        </div>
                        <datalist id="announcement-suppliers">
                            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.name} />)}
                        </datalist>
                    </div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Ugovor (Opciono)</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={form.contractId} onChange={(e) => setForm((prev) => ({ ...prev, contractId: e.target.value }))}><option value="">- Bez ugovora (Spot) -</option>{contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.code || contract.id}</option>)}</select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Materijal *</label><button type="button" style={{ width: '100%', padding: '6px', marginTop: '4px', textAlign: 'left' }} onClick={() => setPickerOpen(true)}>{selectedMaterial ? formatPickedMaterial(selectedMaterial) : 'Odaberi materijal...'}</button></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Očekivana Količina (KG)</label><input type="number" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={form.expectedKg} onChange={(e) => setForm((prev) => ({ ...prev, expectedKg: e.target.value }))} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Tablice Kamiona</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} placeholder="E55-K-991" value={form.truck} onChange={(e) => setForm((prev) => ({ ...prev, truck: e.target.value }))} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Očekivani Datum</label><input type="date" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={form.expectedDate} onChange={(e) => setForm((prev) => ({ ...prev, expectedDate: e.target.value }))} /></div>
                </div>
            </div>
            <div style={{ padding: '12px', background: '#eef2ff', border: '1px solid var(--primary-color)', fontSize: '12px' }}>
                <strong>ℹ️ INFO:</strong> Najava će biti vidljiva portiru na Kapiji. Kada kamion stigne, portir će automatski povezati tablice sa ovom najavom.
            </div>
            <div className="responsive-row" style={{ justifyContent: 'flex-end' }}>
                <button style={{ padding: '10px 24px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                <button className="btn-primary" style={{ padding: '10px 24px' }} onClick={handleCreate}>KREIRAJ NAJAVU</button>
            </div>
            {submitError && (
                <div style={{ padding: '10px 12px', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: '12px' }}>
                    {submitError}
                </div>
            )}
            <MaterialPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={({ material }) => setSelectedMaterial(material)} />
            <Modal open={createSupplierOpen} onClose={() => setCreateSupplierOpen(false)} title="Novi dobavljač" width={520}>
                <div style={{ display: 'grid', gap: '10px' }}>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>Naziv dobavljača *</label>
                        <input
                            value={newSupplierName}
                            onChange={(e) => setNewSupplierName(e.target.value)}
                            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                    <button type="button" onClick={() => setCreateSupplierOpen(false)} style={{ padding: '8px 16px', border: '1px solid var(--border-color)', background: '#fff' }}>Odustani</button>
                    <button type="button" className="btn-primary" onClick={createSupplier} style={{ padding: '8px 16px' }}>Sačuvaj</button>
                </div>
            </Modal>
        </div>
    );
}
