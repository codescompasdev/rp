'use client';

import { useEffect, useState } from 'react';
import MaterialPicker from '@/components/UI/MaterialPicker';
import Modal from '@/components/UI/Modal';
import api from '@/lib/api';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

export default function NewContractPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [supplierQuery, setSupplierQuery] = useState('');
    const [createSupplierOpen, setCreateSupplierOpen] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [form, setForm] = useState({ supplierId: '', contractType: 'Dugoročni', qtyTons: '', tolerance: 5, formula: 'LME', formulaValue: '', paymentTerms: 'DAP', startDate: '', endDate: '' });
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const [suppliersRes, materialsRes] = await Promise.all([
                    api.get('/sourcing/suppliers'),
                    api.get('/materials'),
                ]);
                const nextSuppliers = normalizeApiList(suppliersRes);
                setSuppliers(nextSuppliers);
                setMaterials(normalizeApiList(materialsRes));
                if (nextSuppliers[0]) {
                    setForm((prev) => ({ ...prev, supplierId: nextSuppliers[0].id }));
                }
            } catch {
                setSuppliers([]);
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
            setSubmitError('Dobavljač i materijal su obavezni. Ako mapping ne radi, uskladi šifru u Materials katalogu.');
            return;
        }
        try {
            await api.post('/sourcing/contracts', {
                supplierId: form.supplierId,
                materialId: backendMaterial.id,
                formula: form.formula === 'LME' ? `LME -${form.formulaValue || ''}%` : `Fiksno ${form.formulaValue || ''}`,
                qtyTons: Number(form.qtyTons || 0),
                period: form.startDate && form.endDate ? `${form.startDate} - ${form.endDate}` : 'Spot',
                status: 'Aktivan',
                startDate: form.startDate || null,
                endDate: form.endDate || null,
            });
            setSubmitError('');
        } catch {
            setSubmitError('Kreiranje ugovora nije uspjelo. Provjeri unesene podatke.');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Novi Ugovor</h2>
            <div className="scada-panel">
                <div className="scada-header">UGOVORNE STRANE</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>Dobavljač *</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px', marginTop: '4px' }}>
                            <input
                                list="contract-suppliers"
                                value={supplierQuery}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSupplierQuery(value);
                                    setForm((prev) => ({ ...prev, supplierId: resolveSupplierId(value) }));
                                }}
                                style={{ width: '100%', padding: '6px' }}
                            />
                            <button type="button" className="btn-primary" onClick={() => setCreateSupplierOpen(true)}>+ Novi</button>
                        </div>
                        <datalist id="contract-suppliers">
                            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.name} />)}
                        </datalist>
                    </div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Tip Ugovora</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={form.contractType} onChange={(e) => setForm((prev) => ({ ...prev, contractType: e.target.value }))}><option>Dugoročni (Godišnji)</option><option>Spot Deal (Jednokratni)</option></select></div>
                </div>
            </div>
            <div className="scada-panel">
                <div className="scada-header" style={{ background: '#475569' }}>ROBA & CIJENA</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Materijal *</label><button type="button" onClick={() => setPickerOpen(true)} style={{ width: '100%', padding: '6px', marginTop: '4px', textAlign: 'left' }}>{selectedMaterial ? formatPickedMaterial(selectedMaterial) : 'Odaberi materijal...'}</button></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Količina (T) *</label><input type="number" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={form.qtyTons} onChange={(e) => setForm((prev) => ({ ...prev, qtyTons: e.target.value }))} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Tolerancija (%)</label><input type="number" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={form.tolerance} onChange={(e) => setForm((prev) => ({ ...prev, tolerance: e.target.value }))} /></div>
                    <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '11px', fontWeight: 700 }}>Formula Cijene *</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={form.formula} onChange={(e) => setForm((prev) => ({ ...prev, formula: e.target.value }))}><option value="LME">LME Cash Settlement - X%</option><option value="Fiksno">Fiksna Cijena (BAM/KG)</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Odbitak / Fiksno</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} placeholder="15% ili 0.30" value={form.formulaValue} onChange={(e) => setForm((prev) => ({ ...prev, formulaValue: e.target.value }))} /></div>
                </div>
            </div>
            <div className="scada-panel">
                <div className="scada-header" style={{ background: '#475569' }}>ISPORUKA & PERIOD</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Paritet *</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={form.paymentTerms} onChange={(e) => setForm((prev) => ({ ...prev, paymentTerms: e.target.value }))}><option value="DAP">DAP Pale (Oni dovoze)</option><option value="EXW">EXW (Mi kupimo)</option><option value="FCA">FCA</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Početak</label><input type="date" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Kraj</label><input type="date" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={form.endDate} onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))} /></div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button style={{ padding: '10px 24px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                <button className="btn-primary" style={{ padding: '10px 24px' }} onClick={handleCreate}>KREIRAJ UGOVOR</button>
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
