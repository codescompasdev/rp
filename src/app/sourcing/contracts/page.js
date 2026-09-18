'use client';
import { useEffect, useState } from 'react';
import Modal from '@/components/UI/Modal';
import MaterialPicker from '@/components/UI/MaterialPicker';
import api from '@/lib/api';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

const LABEL = { fontSize: '11px', fontWeight: 700 };
const INPUT = { width: '100%', padding: '6px', marginTop: '4px' };

export default function ContractsPage() {
    const [contractsList, setContractsList] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [showNew, setShowNew] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingContract, setEditingContract] = useState(null);
    const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [supplierQuery, setSupplierQuery] = useState('');
    const [createSupplierOpen, setCreateSupplierOpen] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ supplierId: '', contractType: 'Dugoročni', qtyTons: '', formula: 'LME', formulaValue: '', paymentTerms: 'DAP', tolerance: 5, startDate: '', endDate: '' });

    useEffect(() => {
        const load = async () => {
            try {
                const [contractsRes, suppliersRes, materialsRes] = await Promise.all([
                    api.get('/sourcing/contracts'),
                    api.get('/sourcing/suppliers'),
                    api.get('/materials'),
                ]);
                const nextSuppliers = normalizeApiList(suppliersRes);
                setContractsList(normalizeApiList(contractsRes));
                setSuppliers(nextSuppliers);
                setMaterials(normalizeApiList(materialsRes));
                if (nextSuppliers[0]) {
                    setFormData((prev) => ({ ...prev, supplierId: prev.supplierId || nextSuppliers[0].id }));
                }
            } catch {
                setContractsList([]);
                setSuppliers([]);
                setMaterials([]);
            }
        };
        load();
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
        const suppliersRes = await api.get('/sourcing/suppliers');
        const nextSuppliers = normalizeApiList(suppliersRes);
        setSuppliers(nextSuppliers);
        if (supplier?.id) {
            setFormData((prev) => ({ ...prev, supplierId: supplier.id }));
            setSupplierQuery(supplier.name || name);
        }
        setCreateSupplierOpen(false);
        setNewSupplierName('');
    };

    const refreshContracts = async () => {
        const res = await api.get('/sourcing/contracts');
        setContractsList(normalizeApiList(res));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedMaterial) return;
        const backendMaterial = resolveBackendMaterial(materials, selectedMaterial);
        if (!backendMaterial?.id) {
            return;
        }
        setLoading(true);
        try {
            await api.post('/sourcing/contracts', {
                supplierId: formData.supplierId || suppliers[0]?.id,
                materialId: backendMaterial.id,
                formula: formData.formula === 'LME' ? `LME -${formData.formulaValue || ''}%` : `Fiksno ${formData.formulaValue || ''}`,
                qtyTons: Number(formData.qtyTons || 0),
                period: formData.startDate && formData.endDate ? `${formData.startDate} - ${formData.endDate}` : 'Spot',
                status: 'Aktivan',
                startDate: formData.startDate || null,
                endDate: formData.endDate || null,
            });
            await refreshContracts();
            setFormData((prev) => ({ ...prev, qtyTons: '', formulaValue: '', startDate: '', endDate: '' }));
            setSelectedMaterial(null);
            setShowNew(false);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEdit = (c) => {
        setEditingContract(c);
        setFormData({
            supplierId: c.supplierId || c.supplier?.id || '',
            contractType: 'Dugoročni',
            qtyTons: String(c.qtyTons || ''),
            formula: c.formula?.includes('LME') ? 'LME' : 'Fiksno',
            formulaValue: c.formula?.replace(/[^\d.-]/g, '') || '',
            paymentTerms: 'DAP',
            tolerance: 5,
            startDate: c.startDate ? String(c.startDate).slice(0, 10) : '',
            endDate: c.endDate ? String(c.endDate).slice(0, 10) : '',
        });
        setShowEdit(true);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingContract) return;
        setLoading(true);
        try {
            await api.put(`/sourcing/contracts/${editingContract.id}`, {
                supplierId: formData.supplierId,
                qtyTons: Number(formData.qtyTons || 0),
                formula: formData.formula === 'LME' ? `LME -${formData.formulaValue || ''}%` : `Fiksno ${formData.formulaValue || ''}`,
                period: formData.startDate && formData.endDate ? `${formData.startDate} - ${formData.endDate}` : editingContract.period || 'Spot',
                startDate: formData.startDate || null,
                endDate: formData.endDate || null,
            });
            await refreshContracts();
            setShowEdit(false);
            setEditingContract(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div className="responsive-row">
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Ugovori</h2>
                <button className="btn-primary" onClick={() => setShowNew(true)}>+ NOVI UGOVOR</button>
            </div>
            <div className="scada-panel responsive-table" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead><tr><th>BR.</th><th>DOBAVLJAČ</th><th>MATERIJAL</th><th>FORMULA</th><th style={{ textAlign: 'right' }}>KOLIČINA (T)</th><th>PERIOD</th><th>STATUS</th></tr></thead>
                    <tbody>
                        {contractsList.map(c => (
                            <tr key={c.id}>
                                <td className="font-mono" style={{ fontWeight: 600 }}>{c.code || c.id}</td>
                                <td>{c.supplier?.name || '-'}</td>
                                <td>{c.material?.code || '-'}</td>
                                <td className="font-mono">{c.formula}</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>{Number(c.qtyTons || 0)}</td>
                                <td className="font-mono" style={{ fontSize: '11px' }}>{c.period}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <span style={{ padding: '2px 6px', background: c.status === 'Aktivan' ? '#dcfce7' : '#fef3c7', color: c.status === 'Aktivan' ? '#15803d' : '#b45309', fontSize: '11px', fontWeight: 700 }}>{c.status}</span>
                                        <button type="button" onClick={() => handleOpenEdit(c)} style={{ padding: '2px 8px', fontSize: '10px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>✎</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Novi Ugovor" width={750}>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        <div>
                            <label style={LABEL}>Dobavljač *</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px', marginTop: '4px' }}>
                                <input
                                    list="contracts-page-suppliers"
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
                            <datalist id="contracts-page-suppliers">
                                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.name} />)}
                            </datalist>
                        </div>
                        <div><label style={LABEL}>Tip Ugovora</label><select style={INPUT} value={formData.contractType} onChange={e => setFormData({ ...formData, contractType: e.target.value })}>
                            <option value="Dugoročni">Dugoročni (Godišnji)</option>
                            <option value="Spot">Spot Deal (Jednokratni)</option>
                        </select></div>
                        <div><label style={LABEL}>Materijal *</label>
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                <button type="button" onClick={() => setMaterialPickerOpen(true)} style={{ flex: 1, padding: '6px', textAlign: 'left', border: '1px solid var(--border-color)', background: selectedMaterial ? '#f8fafc' : '#fff', cursor: 'pointer' }}>
                                    {selectedMaterial ? formatPickedMaterial(selectedMaterial) : 'Odaberi materijal...'}
                                </button>
                                <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setMaterialPickerOpen(true)}>Pretraži</button>
                            </div>
                        </div>
                        <div><label style={LABEL}>Količina (Tona) *</label><input type="number" className="font-mono" style={INPUT} value={formData.qtyTons} onChange={e => setFormData({ ...formData, qtyTons: e.target.value })} /></div>
                        <div><label style={LABEL}>Formula Cijene *</label><select style={INPUT} value={formData.formula} onChange={e => setFormData({ ...formData, formula: e.target.value })}>
                            <option value="LME">LME Cash Settlement - X%</option>
                            <option value="Fiksno">Fiksna Cijena (BAM/KG)</option>
                        </select></div>
                        <div><label style={LABEL}>Odbitak / Fiksno</label><input type="text" className="font-mono" style={INPUT} placeholder="15% ili 0.30" value={formData.formulaValue} onChange={e => setFormData({ ...formData, formulaValue: e.target.value })} /></div>
                        <div><label style={LABEL}>Paritet *</label><select style={INPUT} value={formData.paymentTerms} onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}>
                            <option value="DAP">DAP Pale</option>
                            <option value="EXW">EXW</option>
                            <option value="FCA">FCA</option>
                        </select></div>
                        <div><label style={LABEL}>Tolerancija (%)</label><input type="number" className="font-mono" style={INPUT} value={formData.tolerance} onChange={e => setFormData({ ...formData, tolerance: e.target.value })} /></div>
                        <div><label style={LABEL}>Početak</label><input type="date" className="font-mono" style={INPUT} value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} /></div>
                        <div><label style={LABEL}>Kraj</label><input type="date" className="font-mono" style={INPUT} value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button type="button" onClick={() => setShowNew(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                        <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'ČUVANJE...' : 'KREIRAJ UGOVOR'}</button>
                    </div>
                </form>
            </Modal>
            <MaterialPicker open={materialPickerOpen} onClose={() => setMaterialPickerOpen(false)} onSelect={({ material }) => setSelectedMaterial(material)} />
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

            <Modal open={showEdit} onClose={() => { setShowEdit(false); setEditingContract(null); }} title="Uredi Ugovor" width={550}>
                {editingContract && (
                    <form onSubmit={handleSaveEdit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                            <div>
                                <label style={LABEL}>Dobavljač</label>
                                <input
                                    list="contracts-page-suppliers"
                                    style={INPUT}
                                    value={supplierQuery}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSupplierQuery(value);
                                        setFormData({ ...formData, supplierId: resolveSupplierId(value) });
                                    }}
                                />
                            </div>
                            <div><label style={LABEL}>Količina (Tona)</label><input type="number" className="font-mono" style={INPUT} value={formData.qtyTons} onChange={e => setFormData({ ...formData, qtyTons: e.target.value })} /></div>
                            <div><label style={LABEL}>Formula</label><select style={INPUT} value={formData.formula} onChange={e => setFormData({ ...formData, formula: e.target.value })}>
                                <option value="LME">LME Cash - X%</option>
                                <option value="Fiksno">Fiksna Cijena</option>
                            </select></div>
                            <div><label style={LABEL}>Odbitak / Fiksno</label><input type="text" className="font-mono" style={INPUT} value={formData.formulaValue} onChange={e => setFormData({ ...formData, formulaValue: e.target.value })} /></div>
                            <div><label style={LABEL}>Početak</label><input type="date" className="font-mono" style={INPUT} value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} /></div>
                            <div><label style={LABEL}>Kraj</label><input type="date" className="font-mono" style={INPUT} value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} /></div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            <button type="button" onClick={() => { setShowEdit(false); setEditingContract(null); }} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                            <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'ČUVANJE...' : 'SAČUVAJ'}</button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
