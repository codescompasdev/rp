'use client';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Package, Pencil, Plus, Truck } from 'lucide-react';
import Modal from '@/components/UI/Modal';
import MaterialPicker from '@/components/UI/MaterialPicker';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import StatCard from '@/components/UI/StatCard';
import Button from '@/components/UI/Button';
import Field from '@/components/UI/Field';
import Alert from '@/components/UI/Alert';
import Segmented from '@/components/UI/Segmented';
import SearchInput from '@/components/UI/SearchInput';
import EmptyState from '@/components/UI/EmptyState';
import { Badge, StatusBadge } from '@/components/UI/Badge';
import api from '@/lib/api';
import { fmtDate, fmtKg, fmtNum, fmtWeight, localYmd } from '@/lib/format';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

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
    const [formError, setFormError] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [search, setSearch] = useState('');

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
        if (!selectedMaterial) {
            setFormError('Odaberi materijal za najavu.');
            return;
        }
        setFormError('');
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
        } catch (error) {
            setFormError(error?.response?.data?.error || 'Kreiranje najave nije uspjelo.');
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

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const isOverdue = (a) => a.status === 'Najavljeno' && a.expectedDate && new Date(a.expectedDate).getTime() < todayStart.getTime();
    const isToday = (a) => a.expectedDate && localYmd(new Date(a.expectedDate)) === localYmd();
    const supplierName = (a) => suppliers.find((s) => s.id === (a.supplierId || a.supplier?.id))?.name || a.supplier?.name || '-';

    const statusOptions = [{ value: 'ALL', label: 'Sve' }, ...[...new Set(announcementsList.map((a) => a.status).filter(Boolean))].map((st) => ({ value: st, label: st }))];
    const visible = announcementsList.filter((a) => {
        if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [a.code, supplierName(a), a.material?.code, a.material?.name, a.truck, a.contract?.code].join(' ').toLowerCase().includes(q);
    });
    const pending = announcementsList.filter((a) => a.status === 'Najavljeno');
    const contractChoices = (currentId) => contracts.filter((c) => (c.direction || 'BUY') === 'BUY' || c.id === currentId);

    return (
        <div className="ui-page">
            <PageHeader
                title="Najave prijema"
                subtitle="Najavljeni dolasci dobavljača — portir ih vidi na kapiji, a pri vaganju se biraju iz liste"
                actions={<Button icon={Plus} onClick={() => { setFormError(''); setShowNew(true); }}>Nova najava</Button>}
            />

            <div className="ui-kpi-grid">
                <StatCard label="Na čekanju" icon={CalendarClock} value={fmtNum(pending.length)} hint="status Najavljeno" />
                <StatCard label="Očekuje se danas" icon={Truck} tone="aqua" value={fmtNum(pending.filter(isToday).length)} />
                <StatCard label="Očekivana količina" icon={Package} value={fmtWeight(pending.reduce((sum, a) => sum + Number(a.expectedKg || 0), 0))} hint="najave na čekanju" />
                <StatCard label="U kašnjenju" icon={AlertTriangle} tone={pending.some(isOverdue) ? 'warning' : 'success'} value={fmtNum(pending.filter(isOverdue).length)} hint="prošao očekivani datum" />
            </div>

            <Card flush>
                <div className="ui-toolbar" style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
                    <Segmented options={statusOptions} value={statusFilter} onChange={setStatusFilter} ariaLabel="Status" />
                    <SearchInput className="grow" value={search} onChange={setSearch} placeholder="Pretraži broj, dobavljača, materijal, tablice..." />
                </div>
                {visible.length === 0 ? (
                    <EmptyState
                        icon={CalendarClock}
                        title={announcementsList.length ? 'Nema najava za odabrane filtere' : 'Još nema najava'}
                        action={!announcementsList.length && <Button icon={Plus} onClick={() => setShowNew(true)}>Nova najava</Button>}
                    />
                ) : (
                    <div className="ui-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Broj</th>
                                    <th>Dobavljač</th>
                                    <th>Materijal</th>
                                    <th className="num">Očekivano</th>
                                    <th>Narudžba</th>
                                    <th>Kamion</th>
                                    <th>Datum</th>
                                    <th>Status</th>
                                    <th style={{ width: 52 }} />
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((a) => (
                                    <tr key={a.id}>
                                        <td className="font-code" style={{ fontWeight: 600 }}>{a.code || a.id}</td>
                                        <td style={{ fontWeight: 500 }}>{supplierName(a)}</td>
                                        <td>{a.material ? `${a.material.code} · ${a.material.name}` : '-'}</td>
                                        <td className="num">{fmtKg(a.expectedKg)}</td>
                                        <td className="font-code">{a.contract?.code || <span className="muted">Spot</span>}</td>
                                        <td className="font-code">{a.truck || <span className="muted">—</span>}</td>
                                        <td>
                                            <div className="row" style={{ gap: 6 }}>
                                                {fmtDate(a.expectedDate)}
                                                {isOverdue(a) && <Badge tone="warning">kasni</Badge>}
                                                {!isOverdue(a) && isToday(a) && <Badge tone="info">danas</Badge>}
                                            </div>
                                        </td>
                                        <td><StatusBadge status={a.status} /></td>
                                        <td>
                                            <Button variant="ghost" size="sm" icon={Pencil} aria-label={`Uredi ${a.code}`} title="Uredi" onClick={() => handleOpenEdit(a)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Nova najava prijema" subtitle="Najava će biti vidljiva portiru na kapiji" width={720}>
                <form onSubmit={handleSubmit}>
                    <div className="ui-form-grid">
                        <Field label="Dobavljač" required>
                            <div className="ui-input-group">
                                <input
                                    className="ui-input"
                                    list="ann-page-suppliers"
                                    value={supplierQuery}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSupplierQuery(value);
                                        setFormData({ ...formData, supplierId: resolveSupplierId(value) });
                                    }}
                                    required
                                />
                                <Button variant="secondary" icon={Plus} onClick={() => setCreateSupplierOpen(true)}>Novi</Button>
                            </div>
                            <datalist id="ann-page-suppliers">
                                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.name} />)}
                            </datalist>
                        </Field>
                        <Field label="Narudžba">
                            <select className="ui-input" value={formData.contract} onChange={(e) => setFormData({ ...formData, contract: e.target.value })}>
                                <option value="">- Spot (bez narudžbe) -</option>
                                {contractChoices(formData.contract).map((contract) => <option key={contract.id} value={contract.id}>{contract.code || contract.id} — {contract.supplier?.name || '-'}</option>)}
                            </select>
                        </Field>
                        <Field label="Materijal" required span="all">
                            <button type="button" className="ui-input ann-material-btn" data-selected={Boolean(selectedMaterial)} onClick={() => setMaterialPickerOpen(true)}>
                                <Package size={16} />
                                <span>{selectedMaterial ? formatPickedMaterial(selectedMaterial) : 'Odaberi materijal iz kataloga...'}</span>
                            </button>
                        </Field>
                        <Field label="Očekivana količina (kg)">
                            <input type="number" min="0" className="ui-input font-mono" value={formData.expectedKg} onChange={(e) => setFormData({ ...formData, expectedKg: e.target.value })} />
                        </Field>
                        <Field label="Tablice kamiona">
                            <input type="text" className="ui-input font-code" placeholder="E55-K-991" value={formData.truck} onChange={(e) => setFormData({ ...formData, truck: e.target.value })} />
                        </Field>
                        <Field label="Očekivani datum">
                            <input type="date" className="ui-input" value={formData.expectedDate} onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })} />
                        </Field>
                    </div>
                    {formError && <Alert tone="danger" style={{ marginTop: 14 }}>{formError}</Alert>}
                    <div className="ui-modal-footer">
                        <Button variant="secondary" onClick={() => setShowNew(false)}>Odustani</Button>
                        <Button type="submit" disabled={loading}>{loading ? 'Čuvanje...' : 'Kreiraj najavu'}</Button>
                    </div>
                </form>
            </Modal>
            <MaterialPicker open={materialPickerOpen} onClose={() => setMaterialPickerOpen(false)} onSelect={({ material }) => { setSelectedMaterial(material); setFormError(''); }} />
            <Modal open={createSupplierOpen} onClose={() => setCreateSupplierOpen(false)} title="Novi dobavljač" width={480} zIndex={3500}>
                <Field label="Naziv dobavljača" required>
                    <input className="ui-input" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} autoFocus />
                </Field>
                <div className="ui-modal-footer">
                    <Button variant="secondary" onClick={() => setCreateSupplierOpen(false)}>Odustani</Button>
                    <Button onClick={createSupplier}>Sačuvaj</Button>
                </div>
            </Modal>

            <Modal open={showEdit} onClose={() => { setShowEdit(false); setEditingAnn(null); }} title={`Uredi najavu ${editingAnn?.code || ''}`} width={640}>
                {editingAnn && (
                    <form onSubmit={handleSaveEdit}>
                        <div className="ui-form-grid">
                            <Field label="Dobavljač">
                                <select className="ui-input" value={formData.supplierId} onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}>
                                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </Field>
                            <Field label="Narudžba">
                                <select className="ui-input" value={formData.contract} onChange={(e) => setFormData({ ...formData, contract: e.target.value })}>
                                    <option value="">- Spot (bez narudžbe) -</option>
                                    {contractChoices(formData.contract).map((contract) => <option key={contract.id} value={contract.id}>{contract.code || contract.id} — {contract.supplier?.name || '-'}</option>)}
                                </select>
                            </Field>
                            <Field label="Očekivana količina (kg)">
                                <input type="number" min="0" className="ui-input font-mono" value={formData.expectedKg} onChange={(e) => setFormData({ ...formData, expectedKg: e.target.value })} />
                            </Field>
                            <Field label="Tablice kamiona">
                                <input type="text" className="ui-input font-code" value={formData.truck} onChange={(e) => setFormData({ ...formData, truck: e.target.value })} />
                            </Field>
                            <Field label="Očekivani datum">
                                <input type="date" className="ui-input" value={formData.expectedDate} onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })} />
                            </Field>
                        </div>
                        <div className="ui-modal-footer">
                            <Button variant="secondary" onClick={() => { setShowEdit(false); setEditingAnn(null); }}>Odustani</Button>
                            <Button type="submit" disabled={loading}>{loading ? 'Čuvanje...' : 'Sačuvaj'}</Button>
                        </div>
                    </form>
                )}
            </Modal>

            <style>{`
                .ann-material-btn { display: flex; align-items: center; gap: 8px; text-align: left; cursor: pointer; color: var(--text-2); font-weight: 500; }
                .ann-material-btn svg { color: var(--primary); flex-shrink: 0; }
                .ann-material-btn[data-selected='true'] { background: var(--primary-50); border-color: var(--primary-200); color: var(--text); font-weight: 600; }
            `}</style>
        </div>
    );
}
