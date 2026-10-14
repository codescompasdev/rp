'use client';

import { useEffect, useState } from 'react';
import MaterialPicker from '@/components/UI/MaterialPicker';
import Modal from '@/components/UI/Modal';
import api from '@/lib/api';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

const LABEL = { fontSize: '11px', fontWeight: 700 };
const INPUT = { width: '100%', padding: '6px', marginTop: '4px' };
const GRID = { padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' };

const EMPTY_FORM = {
    direction: 'BUY',
    partnerId: '',
    qtyMode: 'PER_MATERIAL',
    totalQtyKg: '',
    tolerance: 5,
    formula: 'LME',
    formulaValue: '',
    paymentTerms: 'DAP',
    startDate: '',
    endDate: '',
};

export default function NewOrderPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [items, setItems] = useState([]); // { materialId, label, qtyKg }
    const [partnerQuery, setPartnerQuery] = useState('');
    const [createPartnerOpen, setCreatePartnerOpen] = useState(false);
    const [newPartnerName, setNewPartnerName] = useState('');
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitError, setSubmitError] = useState('');
    const [submitOk, setSubmitOk] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const isBuy = form.direction === 'BUY';
    const partners = isBuy ? suppliers : customers;

    useEffect(() => {
        const load = async () => {
            try {
                const [suppliersRes, customersRes, materialsRes] = await Promise.all([
                    api.get('/sourcing/suppliers'),
                    api.get('/sourcing/customers'),
                    api.get('/materials'),
                ]);
                setSuppliers(normalizeApiList(suppliersRes));
                setCustomers(normalizeApiList(customersRes));
                setMaterials(normalizeApiList(materialsRes));
            } catch {
                setSuppliers([]);
                setCustomers([]);
                setMaterials([]);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const selected = partners.find((p) => p.id === form.partnerId);
        setPartnerQuery(selected?.name || '');
    }, [form.partnerId, suppliers, customers, form.direction]);

    const resolvePartnerId = (value) => {
        const normalized = String(value || '').trim().toLowerCase();
        if (!normalized) return '';
        const byId = partners.find((p) => p.id === value);
        if (byId) return byId.id;
        const byName = partners.find((p) => String(p.name || '').trim().toLowerCase() === normalized);
        return byName?.id || '';
    };

    const createPartner = async () => {
        const name = String(newPartnerName || '').trim();
        if (!name) return;
        try {
            let created;
            if (isBuy) {
                created = await api.post('/sourcing/suppliers', {
                    name, type: 'Partner', pdv: false, bonitet: 'B', balance: 0, active: true,
                });
                setSuppliers(normalizeApiList(await api.get('/sourcing/suppliers')));
            } else {
                created = await api.post('/sourcing/customers', {
                    name, country: 'BA', creditLimit: 0, balance: 0, blocked: false,
                });
                setCustomers(normalizeApiList(await api.get('/sourcing/customers')));
            }
            const partner = created?.data?.data;
            if (partner?.id) {
                setForm((prev) => ({ ...prev, partnerId: partner.id }));
                setPartnerQuery(partner.name || name);
            }
            setCreatePartnerOpen(false);
            setNewPartnerName('');
        } catch {
            setSubmitError('Kreiranje partnera nije uspjelo.');
        }
    };

    const addMaterial = (material) => {
        const backend = resolveBackendMaterial(materials, material);
        if (!backend?.id) {
            setSubmitError('Materijal nije pronađen u katalogu. Uskladi šifru u Materials katalogu.');
            return;
        }
        if (items.some((it) => it.materialId === backend.id)) {
            setSubmitError('Taj materijal je već na narudžbi.');
            return;
        }
        setSubmitError('');
        setItems((prev) => [...prev, { materialId: backend.id, label: formatPickedMaterial(material), qtyKg: '' }]);
    };

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setItems([]);
        setPartnerQuery('');
        setSubmitError('');
    };

    const handleCreate = async () => {
        setSubmitOk('');
        if (!form.partnerId) {
            setSubmitError(`${isBuy ? 'Dobavljač' : 'Kupac'} je obavezan.`);
            return;
        }
        if (!items.length) {
            setSubmitError('Dodaj bar jedan materijal.');
            return;
        }
        if (form.qtyMode === 'PER_MATERIAL' && items.some((it) => !(Number(it.qtyKg) > 0))) {
            setSubmitError('Unesi količinu (kg) za svaki materijal.');
            return;
        }
        if (form.qtyMode === 'TOTAL' && !(Number(form.totalQtyKg) > 0)) {
            setSubmitError('Unesi ukupnu količinu narudžbe.');
            return;
        }
        setSubmitting(true);
        try {
            const formulaValue = String(form.formulaValue || '').replace('%', '').trim();
            const res = await api.post('/sourcing/contracts', {
                direction: form.direction,
                partnerId: form.partnerId,
                items: items.map((it) => ({
                    materialId: it.materialId,
                    qtyKg: form.qtyMode === 'PER_MATERIAL' ? Number(it.qtyKg) : null,
                })),
                qtyMode: form.qtyMode,
                totalQtyKg: form.qtyMode === 'TOTAL' ? Number(form.totalQtyKg) : null,
                tolerance: form.tolerance,
                formula: form.formula === 'LME' ? `LME -${formulaValue}%` : `Fiksno ${formulaValue}`,
                paymentTerms: form.paymentTerms,
                period: form.startDate && form.endDate ? `${form.startDate} - ${form.endDate}` : 'Spot',
                status: 'Aktivan',
                startDate: form.startDate || null,
                endDate: form.endDate || null,
            });
            const code = res?.data?.data?.code;
            resetForm();
            setSubmitOk(`Narudžba ${code || ''} je kreirana.`);
        } catch (error) {
            setSubmitError(error?.response?.data?.error || 'Kreiranje narudžbe nije uspjelo. Provjeri unesene podatke.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Nova Narudžba</h2>

            <div className="scada-panel">
                <div className="scada-header">STRANE NARUDŽBE</div>
                <div style={GRID}>
                    <div>
                        <label style={LABEL}>Vrsta narudžbe</label>
                        <select
                            style={INPUT}
                            value={form.direction}
                            onChange={(e) => {
                                setForm((prev) => ({ ...prev, direction: e.target.value, partnerId: '' }));
                                setPartnerQuery('');
                            }}
                        >
                            <option value="BUY">Nabavka (mi kupujemo)</option>
                            <option value="SELL">Prodaja (mi prodajemo)</option>
                        </select>
                    </div>
                    <div>
                        <label style={LABEL}>{isBuy ? 'Dobavljač *' : 'Kupac *'}</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px', marginTop: '4px' }}>
                            <input
                                list="order-partners"
                                value={partnerQuery}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setPartnerQuery(value);
                                    setForm((prev) => ({ ...prev, partnerId: resolvePartnerId(value) }));
                                }}
                                style={{ width: '100%', padding: '6px' }}
                            />
                            <button type="button" className="btn-primary" onClick={() => setCreatePartnerOpen(true)}>+ Novi</button>
                        </div>
                        <datalist id="order-partners">
                            {partners.map((p) => <option key={p.id} value={p.name} />)}
                        </datalist>
                    </div>
                </div>
            </div>

            <div className="scada-panel">
                <div className="scada-header" style={{ background: '#475569' }}>ROBA & CIJENA</div>
                <div style={GRID}>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={LABEL}>Način zadavanja količine</label>
                        <select style={INPUT} value={form.qtyMode} onChange={(e) => setForm((p) => ({ ...p, qtyMode: e.target.value }))}>
                            <option value="PER_MATERIAL">Količina po materijalu</option>
                            <option value="TOTAL">Ukupna količina cijele narudžbe</option>
                        </select>
                    </div>

                    {form.qtyMode === 'TOTAL' && (
                        <div>
                            <label style={LABEL}>Ukupno (kg) *</label>
                            <input type="number" className="font-mono" style={INPUT} value={form.totalQtyKg}
                                onChange={(e) => setForm((p) => ({ ...p, totalQtyKg: e.target.value }))} />
                        </div>
                    )}

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={LABEL}>Materijali *</label>
                        {items.map((it, idx) => (
                            <div key={it.materialId} style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: '6px', marginTop: '4px' }}>
                                <div style={{ padding: '6px', border: '1px solid var(--border-color)' }}>{it.label}</div>
                                {form.qtyMode === 'PER_MATERIAL' ? (
                                    <input type="number" className="font-mono" placeholder="kg" value={it.qtyKg} style={{ padding: '6px' }}
                                        onChange={(e) => setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, qtyKg: e.target.value } : x)))} />
                                ) : <div />}
                                <button type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>✕</button>
                            </div>
                        ))}
                        {!items.length && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Nema dodanih materijala.</div>}
                        <button type="button" className="btn-primary" style={{ marginTop: '8px' }} onClick={() => setPickerOpen(true)}>+ Dodaj materijal</button>
                    </div>

                    <div>
                        <label style={LABEL}>Tolerancija (%)</label>
                        <input type="number" className="font-mono" style={INPUT} value={form.tolerance}
                            onChange={(e) => setForm((p) => ({ ...p, tolerance: e.target.value }))} />
                    </div>
                    <div>
                        <label style={LABEL}>Formula Cijene *</label>
                        <select style={INPUT} value={form.formula} onChange={(e) => setForm((p) => ({ ...p, formula: e.target.value }))}>
                            <option value="LME">LME Cash Settlement - X%</option>
                            <option value="Fiksno">Fiksna Cijena (BAM/KG)</option>
                        </select>
                    </div>
                    <div>
                        <label style={LABEL}>Odbitak / Fiksno</label>
                        <input type="text" className="font-mono" style={INPUT} placeholder="15 ili 0.30" value={form.formulaValue}
                            onChange={(e) => setForm((p) => ({ ...p, formulaValue: e.target.value }))} />
                    </div>
                </div>
            </div>

            <div className="scada-panel">
                <div className="scada-header" style={{ background: '#475569' }}>ISPORUKA & PERIOD</div>
                <div style={GRID}>
                    <div>
                        <label style={LABEL}>Paritet *</label>
                        <select style={INPUT} value={form.paymentTerms} onChange={(e) => setForm((p) => ({ ...p, paymentTerms: e.target.value }))}>
                            <option value="DAP">DAP Pale (Oni dovoze)</option>
                            <option value="EXW">EXW (Mi kupimo)</option>
                            <option value="FCA">FCA</option>
                        </select>
                    </div>
                    <div>
                        <label style={LABEL}>Početak</label>
                        <input type="date" className="font-mono" style={INPUT} value={form.startDate}
                            onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
                    </div>
                    <div>
                        <label style={LABEL}>Kraj</label>
                        <input type="date" className="font-mono" style={INPUT} value={form.endDate}
                            onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={resetForm} style={{ padding: '10px 24px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                <button type="button" className="btn-primary" style={{ padding: '10px 24px' }} onClick={handleCreate} disabled={submitting}>
                    {submitting ? 'ČUVANJE...' : 'KREIRAJ NARUDŽBU'}
                </button>
            </div>

            {submitOk && (
                <div style={{ padding: '10px 12px', border: '1px solid #86efac', background: '#f0fdf4', color: '#166534', fontSize: '12px' }}>{submitOk}</div>
            )}
            {submitError && (
                <div style={{ padding: '10px 12px', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: '12px' }}>{submitError}</div>
            )}

            <MaterialPicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={({ material }) => { addMaterial(material); setPickerOpen(false); }}
            />

            <Modal open={createPartnerOpen} onClose={() => setCreatePartnerOpen(false)} title={isBuy ? 'Novi dobavljač' : 'Novi kupac'} width={520}>
                <div style={{ display: 'grid', gap: '10px' }}>
                    <div>
                        <label style={LABEL}>{isBuy ? 'Naziv dobavljača *' : 'Naziv kupca *'}</label>
                        <input value={newPartnerName} onChange={(e) => setNewPartnerName(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                    <button type="button" onClick={() => setCreatePartnerOpen(false)} style={{ padding: '8px 16px', border: '1px solid var(--border-color)', background: '#fff' }}>Odustani</button>
                    <button type="button" className="btn-primary" onClick={createPartner} style={{ padding: '8px 16px' }}>Sačuvaj</button>
                </div>
            </Modal>
        </div>
    );
}
