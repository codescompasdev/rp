'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronRight, Factory, Pencil, Plus, Scale } from 'lucide-react';
import Modal from '@/components/UI/Modal';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import StatCard from '@/components/UI/StatCard';
import Button from '@/components/UI/Button';
import Alert from '@/components/UI/Alert';
import Segmented from '@/components/UI/Segmented';
import SearchInput from '@/components/UI/SearchInput';
import EmptyState from '@/components/UI/EmptyState';
import { Badge } from '@/components/UI/Badge';
import SupplierFormFields from '@/components/Suppliers/SupplierFormFields';
import api from '@/lib/api';
import { fmtMoney, fmtNum } from '@/lib/format';
import { normalizeApiList } from '@/lib/materialsAdapter';
import { bonitetTone, EMPTY_SUPPLIER_FORM, supplierFormToPayload, supplierToForm } from '@/lib/suppliers';

export default function SuppliersPage() {
    const router = useRouter();
    const [suppliersList, setSuppliersList] = useState([]);
    const [listLoading, setListLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('active');
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [pageInfo, setPageInfo] = useState('');
    const [formData, setFormData] = useState(EMPTY_SUPPLIER_FORM);

    const loadSuppliers = async () => {
        const res = await api.get('/sourcing/suppliers');
        setSuppliersList(normalizeApiList(res));
    };

    useEffect(() => {
        loadSuppliers().catch(() => setSuppliersList([])).finally(() => setListLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return suppliersList.filter((s) => {
            if (activeFilter === 'active' && s.active === false) return false;
            if (activeFilter === 'inactive' && s.active !== false) return false;
            if (!q) return true;
            return [s.name, s.city, s.jib, s.code, s.phone, s.email].join(' ').toLowerCase().includes(q);
        });
    }, [suppliersList, search, activeFilter]);

    const stats = useMemo(() => ({
        active: suppliersList.filter((s) => s.active !== false).length,
        pdv: suppliersList.filter((s) => s.pdv && s.active !== false).length,
        bonitetA: suppliersList.filter((s) => s.bonitet === 'A' && s.active !== false).length,
    }), [suppliersList]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name?.trim()) {
            setFormError('Naziv je obavezan.');
            return;
        }
        setLoading(true);
        setFormError('');
        try {
            const res = await api.post('/sourcing/suppliers', { ...supplierFormToPayload(formData), balance: 0, active: true });
            await loadSuppliers();
            setFormData(EMPTY_SUPPLIER_FORM);
            setShowNew(false);
            setPageInfo(`Dobavljač ${res?.data?.data?.name || ''} je dodan.`);
        } catch (error) {
            setFormError(error?.response?.data?.error || 'Dodavanje dobavljača nije uspjelo.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenNew = () => {
        setFormData(EMPTY_SUPPLIER_FORM);
        setFormError('');
        setShowNew(true);
    };

    const handleOpenEdit = (s) => {
        setEditingSupplier(s);
        // sva polja iz baze (ranije su adresa/email/rok plaćanja bili prazni pa bi ih snimanje obrisalo)
        setFormData(supplierToForm(s));
        setFormError('');
        setShowEdit(true);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingSupplier) return;
        if (!formData.name?.trim()) {
            setFormError('Naziv je obavezan.');
            return;
        }
        setLoading(true);
        setFormError('');
        try {
            await api.put(`/sourcing/suppliers/${editingSupplier.id}`, supplierFormToPayload(formData));
            await loadSuppliers();
            setShowEdit(false);
            setPageInfo(`Dobavljač ${formData.name} je sačuvan.`);
            setEditingSupplier(null);
        } catch (error) {
            setFormError(error?.response?.data?.error || 'Čuvanje nije uspjelo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ui-page">
            <PageHeader
                title="Dobavljači"
                subtitle="Partneri od kojih otkupljujemo materijal"
                actions={<Button icon={Plus} onClick={handleOpenNew}>Novi dobavljač</Button>}
            />

            {pageInfo && <Alert tone="success" onClose={() => setPageInfo('')}>{pageInfo}</Alert>}

            <div className="ui-kpi-grid">
                <StatCard label="Aktivni dobavljači" icon={Factory} value={fmtNum(stats.active)} hint={`${fmtNum(suppliersList.length)} ukupno`} loading={listLoading} />
                <StatCard label="PDV obveznici" icon={CheckCircle2} tone="success" value={fmtNum(stats.pdv)} loading={listLoading} />
                <StatCard label="Bonitet A" icon={Scale} value={fmtNum(stats.bonitetA)} hint="odličan bonitet" loading={listLoading} />
            </div>

            <Card flush>
                <div className="ui-toolbar" style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
                    <Segmented
                        options={[{ value: 'active', label: 'Aktivni' }, { value: 'inactive', label: 'Neaktivni' }, { value: 'all', label: 'Svi' }]}
                        value={activeFilter}
                        onChange={setActiveFilter}
                        ariaLabel="Status dobavljača"
                    />
                    <SearchInput className="grow" value={search} onChange={setSearch} placeholder="Pretraži naziv, grad, JIB, telefon..." />
                </div>
                {listLoading ? (
                    <div className="stack" style={{ padding: 18, gap: 10 }}>
                        {[0, 1, 2].map((i) => <div key={i} className="ui-skeleton" style={{ height: 40 }} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState icon={Factory} title={suppliersList.length ? 'Nema dobavljača za odabrane filtere' : 'Još nema dobavljača'} />
                ) : (
                    <div className="ui-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Šifra</th>
                                    <th>Naziv</th>
                                    <th>JIB</th>
                                    <th>Tip</th>
                                    <th>Grad</th>
                                    <th>Kontakt</th>
                                    <th>Bonitet</th>
                                    <th>PDV</th>
                                    <th className="num">Bilans</th>
                                    <th style={{ width: 80 }} />
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((s) => (
                                    <tr key={s.id} onClick={() => router.push(`/sourcing/suppliers/${s.id}`)} style={{ cursor: 'pointer', opacity: s.active === false ? 0.6 : 1 }}>
                                        <td className="font-code" style={{ fontSize: 12 }}>{s.code}</td>
                                        <td style={{ fontWeight: 600 }}>
                                            <span className="row" style={{ gap: 6 }}>
                                                {s.name}
                                                {s.active === false && <Badge tone="neutral">neaktivan</Badge>}
                                            </span>
                                        </td>
                                        <td className="font-code" style={{ fontSize: 12 }}>{s.jib || <span className="muted">—</span>}</td>
                                        <td className="muted">{s.type || '—'}</td>
                                        <td>{s.city || <span className="muted">—</span>}</td>
                                        <td className="muted" style={{ fontSize: 12 }}>{s.phone || s.email || '—'}</td>
                                        <td><Badge tone={bonitetTone(s.bonitet)}>{s.bonitet || '-'}</Badge></td>
                                        <td>{s.pdv ? <Badge tone="info">PDV</Badge> : <span className="muted">Ne</span>}</td>
                                        <td className="num" style={{ fontWeight: 600, color: Number(s.balance || 0) < 0 ? 'var(--danger-ink)' : undefined }}>{fmtMoney(s.balance)}</td>
                                        <td onClick={(ev) => ev.stopPropagation()}>
                                            <div className="row" style={{ gap: 2, justifyContent: 'flex-end' }}>
                                                <Button variant="ghost" size="sm" icon={Pencil} aria-label={`Uredi ${s.name}`} title="Uredi" onClick={() => handleOpenEdit(s)} />
                                                <Button variant="ghost" size="sm" icon={ChevronRight} aria-label={`Otvori ${s.name}`} title="Profil" href={`/sourcing/suppliers/${s.id}`} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Novi dobavljač" width={760}>
                <form onSubmit={handleSubmit}>
                    <SupplierFormFields form={formData} setForm={setFormData} />
                    {formError && <Alert tone="danger" style={{ marginTop: 14 }}>{formError}</Alert>}
                    <div className="ui-modal-footer">
                        <Button variant="secondary" onClick={() => setShowNew(false)}>Odustani</Button>
                        <Button type="submit" disabled={loading}>{loading ? 'Čuvanje...' : 'Sačuvaj dobavljača'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal open={showEdit} onClose={() => { setShowEdit(false); setEditingSupplier(null); }} title={`Uredi dobavljača`} subtitle={editingSupplier?.code} width={760}>
                {editingSupplier && (
                    <form onSubmit={handleSaveEdit}>
                        <SupplierFormFields form={formData} setForm={setFormData} />
                        {formError && <Alert tone="danger" style={{ marginTop: 14 }}>{formError}</Alert>}
                        <div className="ui-modal-footer">
                            <Button variant="secondary" onClick={() => { setShowEdit(false); setEditingSupplier(null); }}>Odustani</Button>
                            <Button type="submit" disabled={loading}>{loading ? 'Čuvanje...' : 'Sačuvaj'}</Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
