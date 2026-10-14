'use client';
import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/UI/Modal';
import MaterialPicker from '@/components/UI/MaterialPicker';
import api from '@/lib/api';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

const LABEL = { fontSize: '11px', fontWeight: 700 };
const INPUT = { width: '100%', padding: '6px', marginTop: '4px' };

const EMPTY_FORM = {
    direction: 'BUY',
    partnerId: '',
    qtyMode: 'PER_MATERIAL',
    totalQtyKg: '',
    tolerance: 5,
    formula: 'LME',
    formulaValue: '',
    paymentTerms: 'DAP',
    status: 'Aktivan',
    startDate: '',
    endDate: '',
};

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const toIso = (d) => (d ? new Date(d).toISOString() : null);

/* Stavke narudžbe; stari ugovori (bez items) se prikazuju kao jedna stavka */
function getLines(c) {
    if (Array.isArray(c.items) && c.items.length) return c.items;
    if (c.material) {
        return [{ id: `legacy-${c.id}`, materialId: c.materialId, material: c.material, qtyKg: Number(c.qtyTons || 0) * 1000, doneKg: 0, legacy: true }];
    }
    return [];
}

function getPlannedKg(c) {
    if (c.qtyMode === 'TOTAL') return Number(c.totalQtyKg || 0);
    return getLines(c).reduce((sum, l) => sum + Number(l.qtyKg || 0), 0);
}

function parseFormula(formula) {
    const text = String(formula || '');
    const type = text.startsWith('LME') ? 'LME' : 'Fiksno';
    const value = text.replace(/^(LME|Fiksno)\s*-?/, '').replace('%', '').trim();
    return { type, value };
}

export default function ContractsPage() {
    const [contractsList, setContractsList] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [filterDir, setFilterDir] = useState('ALL');
    const [showNew, setShowNew] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingContract, setEditingContract] = useState(null);
    const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
    const [items, setItems] = useState([]); // { materialId, label, qtyKg, pricePerKg }
    const [partnerQuery, setPartnerQuery] = useState('');
    const [createPartnerOpen, setCreatePartnerOpen] = useState(false);
    const [newPartnerName, setNewPartnerName] = useState('');
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [formData, setFormData] = useState(EMPTY_FORM);

    const isBuy = formData.direction === 'BUY';
    const partners = isBuy ? suppliers : customers;

    const refreshContracts = async () => {
        const res = await api.get('/sourcing/contracts');
        setContractsList(normalizeApiList(res));
    };

    useEffect(() => {
        const load = async () => {
            try {
                const [contractsRes, suppliersRes, customersRes, materialsRes] = await Promise.all([
                    api.get('/sourcing/contracts'),
                    api.get('/sourcing/suppliers'),
                    api.get('/sourcing/customers'),
                    api.get('/materials'),
                ]);
                setContractsList(normalizeApiList(contractsRes));
                setSuppliers(normalizeApiList(suppliersRes));
                setCustomers(normalizeApiList(customersRes));
                setMaterials(normalizeApiList(materialsRes));
            } catch {
                setContractsList([]);
                setSuppliers([]);
                setCustomers([]);
                setMaterials([]);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const selected = partners.find((p) => p.id === formData.partnerId);
        setPartnerQuery(selected?.name || '');
    }, [formData.partnerId, suppliers, customers, formData.direction]);

    const visibleContracts = useMemo(
        () => contractsList.filter((c) => filterDir === 'ALL' || (c.direction || 'BUY') === filterDir),
        [contractsList, filterDir]
    );

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
                created = await api.post('/sourcing/suppliers', { name, type: 'Partner', pdv: false, bonitet: 'B', balance: 0, active: true });
                setSuppliers(normalizeApiList(await api.get('/sourcing/suppliers')));
            } else {
                created = await api.post('/sourcing/customers', { name, country: 'BA', creditLimit: 0, balance: 0, blocked: false });
                setCustomers(normalizeApiList(await api.get('/sourcing/customers')));
            }
            const partner = created?.data?.data;
            if (partner?.id) {
                setFormData((prev) => ({ ...prev, partnerId: partner.id }));
                setPartnerQuery(partner.name || name);
            }
            setCreatePartnerOpen(false);
            setNewPartnerName('');
        } catch {
            setFormError('Kreiranje partnera nije uspjelo.');
        }
    };

    const addMaterial = (material) => {
        const backend = resolveBackendMaterial(materials, material);
        if (!backend?.id) {
            setFormError('Materijal nije pronađen u katalogu. Uskladi šifru u Materials katalogu.');
            return;
        }
        if (items.some((it) => it.materialId === backend.id)) {
            setFormError('Taj materijal je već na narudžbi.');
            return;
        }
        setFormError('');
        setItems((prev) => [...prev, { materialId: backend.id, label: formatPickedMaterial(material), qtyKg: '', pricePerKg: null }]);
    };

    const validate = () => {
        if (!formData.partnerId) return `${isBuy ? 'Dobavljač' : 'Kupac'} je obavezan.`;
        if (!items.length) return 'Dodaj bar jedan materijal.';
        if (formData.qtyMode === 'PER_MATERIAL' && items.some((it) => !(Number(it.qtyKg) > 0))) return 'Unesi količinu (kg) za svaki materijal.';
        if (formData.qtyMode === 'TOTAL' && !(Number(formData.totalQtyKg) > 0)) return 'Unesi ukupnu količinu narudžbe.';
        return '';
    };

    const buildFormula = () => {
        const v = String(formData.formulaValue || '').replace('%', '').trim();
        return formData.formula === 'LME' ? `LME -${v}%` : `Fiksno ${v}`;
    };

    const buildItemsPayload = () => items.map((it) => ({
        materialId: it.materialId,
        qtyKg: formData.qtyMode === 'PER_MATERIAL' ? Number(it.qtyKg) : null,
        pricePerKg: it.pricePerKg ?? null,
    }));

    const handleOpenNew = () => {
        setFormData(EMPTY_FORM);
        setItems([]);
        setPartnerQuery('');
        setFormError('');
        setShowNew(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const err = validate();
        if (err) { setFormError(err); return; }
        setLoading(true);
        try {
            await api.post('/sourcing/contracts', {
                direction: formData.direction,
                partnerId: formData.partnerId,
                items: buildItemsPayload(),
                qtyMode: formData.qtyMode,
                totalQtyKg: formData.qtyMode === 'TOTAL' ? Number(formData.totalQtyKg) : null,
                tolerance: formData.tolerance,
                formula: buildFormula(),
                paymentTerms: formData.paymentTerms,
                period: formData.startDate && formData.endDate ? `${formData.startDate} - ${formData.endDate}` : 'Spot',
                status: 'Aktivan',
                startDate: formData.startDate || null,
                endDate: formData.endDate || null,
            });
            await refreshContracts();
            setShowNew(false);
        } catch (error) {
            setFormError(error?.response?.data?.error || 'Kreiranje narudžbe nije uspjelo.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEdit = (c) => {
        const { type, value } = parseFormula(c.formula);
        const direction = c.direction || 'BUY';
        setEditingContract(c);
        setFormData({
            direction,
            partnerId: direction === 'BUY' ? (c.supplierId || '') : (c.customerId || ''),
            qtyMode: c.qtyMode || 'PER_MATERIAL',
            totalQtyKg: c.totalQtyKg ? String(Number(c.totalQtyKg)) : '',
            tolerance: c.tolerance !== null && c.tolerance !== undefined ? Number(c.tolerance) : 5,
            formula: type,
            formulaValue: value,
            paymentTerms: c.paymentTerms || 'DAP',
            status: c.status || 'Aktivan',
            startDate: c.startDate ? String(c.startDate).slice(0, 10) : '',
            endDate: c.endDate ? String(c.endDate).slice(0, 10) : '',
        });
        setItems(getLines(c).map((l) => ({
            materialId: l.materialId,
            label: `${l.material?.code || '-'} - ${l.material?.name || ''}`,
            qtyKg: l.qtyKg !== null && l.qtyKg !== undefined ? String(Number(l.qtyKg)) : '',
            pricePerKg: l.pricePerKg !== undefined && l.pricePerKg !== null ? Number(l.pricePerKg) : null,
        })));
        setFormError('');
        setShowEdit(true);
    };

    const closeEdit = () => { setShowEdit(false); setEditingContract(null); };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingContract) return;
        const err = validate();
        if (err) { setFormError(err); return; }
        setLoading(true);
        try {
            await api.put(`/sourcing/contracts/${editingContract.id}`, {
                items: buildItemsPayload(),
                qtyMode: formData.qtyMode,
                totalQtyKg: formData.qtyMode === 'TOTAL' ? Number(formData.totalQtyKg) : null,
                tolerance: formData.tolerance !== '' ? Number(formData.tolerance) : null,
                formula: buildFormula(),
                paymentTerms: formData.paymentTerms,
                status: formData.status,
                period: formData.startDate && formData.endDate ? `${formData.startDate} - ${formData.endDate}` : editingContract.period || 'Spot',
                startDate: toIso(formData.startDate),
                endDate: toIso(formData.endDate),
            });
            await refreshContracts();
            closeEdit();
        } catch (error) {
            setFormError(error?.response?.data?.error || 'Čuvanje nije uspjelo.');
        } finally {
            setLoading(false);
        }
    };

    /* Zajednička polja forme (nova + uredi) */
    const renderFormFields = (isEdit) => (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                    <label style={LABEL}>Vrsta narudžbe</label>
                    <select
                        style={INPUT}
                        value={formData.direction}
                        disabled={isEdit}
                        onChange={(e) => { setFormData({ ...formData, direction: e.target.value, partnerId: '' }); setPartnerQuery(''); }}
                    >
                        <option value="BUY">Nabavka (mi kupujemo)</option>
                        <option value="SELL">Prodaja (mi prodajemo)</option>
                    </select>
                </div>
                <div>
                    <label style={LABEL}>{isBuy ? 'Dobavljač *' : 'Kupac *'}</label>
                    <div style={{ display: 'grid', gridTemplateColumns: isEdit ? '1fr' : '1fr auto', gap: '6px', marginTop: '4px' }}>
                        <input
                            list="contracts-page-partners"
                            style={{ ...INPUT, marginTop: 0 }}
                            value={partnerQuery}
                            disabled={isEdit}
                            onChange={(e) => {
                                const value = e.target.value;
                                setPartnerQuery(value);
                                setFormData({ ...formData, partnerId: resolvePartnerId(value) });
                            }}
                        />
                        {!isEdit && <button type="button" className="btn-primary" onClick={() => setCreatePartnerOpen(true)}>+ Novi</button>}
                    </div>
                    <datalist id="contracts-page-partners">
                        {partners.map((p) => <option key={p.id} value={p.name} />)}
                    </datalist>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={LABEL}>Način zadavanja količine</label>
                    <select style={INPUT} value={formData.qtyMode} onChange={(e) => setFormData({ ...formData, qtyMode: e.target.value })}>
                        <option value="PER_MATERIAL">Količina po materijalu</option>
                        <option value="TOTAL">Ukupna količina cijele narudžbe</option>
                    </select>
                </div>
                {formData.qtyMode === 'TOTAL' && (
                    <div>
                        <label style={LABEL}>Ukupno (kg) *</label>
                        <input type="number" className="font-mono" style={INPUT} value={formData.totalQtyKg} onChange={(e) => setFormData({ ...formData, totalQtyKg: e.target.value })} />
                    </div>
                )}

                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={LABEL}>Materijali *</label>
                    {items.map((it, idx) => (
                        <div key={it.materialId} style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: '6px', marginTop: '4px' }}>
                            <div style={{ padding: '6px', border: '1px solid var(--border-color)' }}>{it.label}</div>
                            {formData.qtyMode === 'PER_MATERIAL' ? (
                                <input type="number" className="font-mono" placeholder="kg" value={it.qtyKg} style={{ padding: '6px' }}
                                    onChange={(e) => setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, qtyKg: e.target.value } : x)))} />
                            ) : <div />}
                            <button type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>✕</button>
                        </div>
                    ))}
                    {!items.length && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Nema dodanih materijala.</div>}
                    <button type="button" className="btn-primary" style={{ marginTop: '8px' }} onClick={() => setMaterialPickerOpen(true)}>+ Dodaj materijal</button>
                </div>

                <div>
                    <label style={LABEL}>Formula Cijene *</label>
                    <select style={INPUT} value={formData.formula} onChange={(e) => setFormData({ ...formData, formula: e.target.value })}>
                        <option value="LME">LME Cash Settlement - X%</option>
                        <option value="Fiksno">Fiksna Cijena (BAM/KG)</option>
                    </select>
                </div>
                <div>
                    <label style={LABEL}>Odbitak / Fiksno</label>
                    <input type="text" className="font-mono" style={INPUT} placeholder="15 ili 0.30" value={formData.formulaValue} onChange={(e) => setFormData({ ...formData, formulaValue: e.target.value })} />
                </div>
                <div>
                    <label style={LABEL}>Paritet *</label>
                    <select style={INPUT} value={formData.paymentTerms} onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}>
                        <option value="DAP">DAP Pale</option>
                        <option value="EXW">EXW</option>
                        <option value="FCA">FCA</option>
                    </select>
                </div>
                <div>
                    <label style={LABEL}>Tolerancija (%)</label>
                    <input type="number" className="font-mono" style={INPUT} value={formData.tolerance} onChange={(e) => setFormData({ ...formData, tolerance: e.target.value })} />
                </div>
                <div>
                    <label style={LABEL}>Početak</label>
                    <input type="date" className="font-mono" style={INPUT} value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                </div>
                <div>
                    <label style={LABEL}>Kraj</label>
                    <input type="date" className="font-mono" style={INPUT} value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
                </div>
                {isEdit && (
                    <div>
                        <label style={LABEL}>Status</label>
                        <select style={INPUT} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                            <option value="Aktivan">Aktivan</option>
                            <option value="Završen">Završen</option>
                            <option value="Otkazan">Otkazan</option>
                        </select>
                    </div>
                )}
            </div>
            {formError && (
                <div style={{ marginTop: '12px', padding: '8px 10px', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: '12px' }}>{formError}</div>
            )}
        </>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div className="responsive-row">
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Narudžbe / Ugovori</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select value={filterDir} onChange={(e) => setFilterDir(e.target.value)} style={{ padding: '6px' }}>
                        <option value="ALL">Sve</option>
                        <option value="BUY">Nabavka</option>
                        <option value="SELL">Prodaja</option>
                    </select>
                    <button className="btn-primary" onClick={handleOpenNew}>+ NOVA NARUDŽBA</button>
                </div>
            </div>

            <div className="scada-panel responsive-table" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead>
                        <tr>
                            <th>BR.</th>
                            <th>VRSTA</th>
                            <th>PARTNER</th>
                            <th>MATERIJALI (ISPUNJENO / PLAN)</th>
                            <th style={{ textAlign: 'right' }}>UKUPNO (KG)</th>
                            <th style={{ textAlign: 'right' }}>PREOSTALO (KG)</th>
                            <th>PERIOD</th>
                            <th>STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleContracts.map((c) => {
                            const direction = c.direction || 'BUY';
                            const lines = getLines(c);
                            const planned = getPlannedKg(c);
                            const done = Number(c.doneKg || 0);
                            const remaining = Math.max(0, planned - done);
                            const partnerName = direction === 'BUY' ? c.supplier?.name : c.customer?.name;
                            return (
                                <tr key={c.id}>
                                    <td className="font-mono" style={{ fontWeight: 600 }}>{c.code || c.id}</td>
                                    <td>
                                        <span style={{
                                            padding: '2px 6px', fontSize: '11px', fontWeight: 700,
                                            background: direction === 'BUY' ? '#dbeafe' : '#ffedd5',
                                            color: direction === 'BUY' ? '#1d4ed8' : '#b45309',
                                        }}>
                                            {direction === 'BUY' ? 'NABAVKA' : 'PRODAJA'}
                                        </span>
                                    </td>
                                    <td>{partnerName || '-'}</td>
                                    <td style={{ fontSize: '12px' }}>
                                        {lines.map((l) => (
                                            <div key={l.id || l.materialId} className="font-mono">
                                                {l.material?.code || '-'}:{' '}
                                                {c.qtyMode === 'TOTAL'
                                                    ? `${fmt(l.doneKg)} kg`
                                                    : `${fmt(l.doneKg)} / ${fmt(l.qtyKg)} kg`}
                                            </div>
                                        ))}
                                        {!lines.length && '-'}
                                        {c.qtyMode === 'TOTAL' && <div style={{ color: '#64748b' }}>(plan na cijelu narudžbu)</div>}
                                    </td>
                                    <td className="font-mono" style={{ textAlign: 'right' }}>{fmt(planned)}</td>
                                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(remaining)}</td>
                                    <td className="font-mono" style={{ fontSize: '11px' }}>{c.period || '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <span style={{
                                                padding: '2px 6px', fontSize: '11px', fontWeight: 700,
                                                background: c.status === 'Aktivan' ? '#dcfce7' : '#fef3c7',
                                                color: c.status === 'Aktivan' ? '#15803d' : '#b45309',
                                            }}>{c.status}</span>
                                            <button type="button" onClick={() => handleOpenEdit(c)} style={{ padding: '2px 8px', fontSize: '10px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>✎</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {!visibleContracts.length && (
                            <tr><td colSpan={8} style={{ padding: '16px', color: '#64748b' }}>Nema narudžbi.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Nova Narudžba" width={750}>
                <form onSubmit={handleSubmit}>
                    {renderFormFields(false)}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button type="button" onClick={() => setShowNew(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                        <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'ČUVANJE...' : 'KREIRAJ NARUDŽBU'}</button>
                    </div>
                </form>
            </Modal>

            <Modal open={showEdit} onClose={closeEdit} title={`Uredi narudžbu ${editingContract?.code || ''}`} width={750}>
                {editingContract && (
                    <form onSubmit={handleSaveEdit}>
                        {renderFormFields(true)}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            <button type="button" onClick={closeEdit} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                            <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'ČUVANJE...' : 'SAČUVAJ'}</button>
                        </div>
                    </form>
                )}
            </Modal>

            <MaterialPicker
                open={materialPickerOpen}
                onClose={() => setMaterialPickerOpen(false)}
                onSelect={({ material }) => { addMaterial(material); setMaterialPickerOpen(false); }}
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
