'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, ClipboardList, Eye, Pencil, Plus, Undo2 } from 'lucide-react';
import Modal from '@/components/UI/Modal';
import MaterialPicker from '@/components/UI/MaterialPicker';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import StatCard from '@/components/UI/StatCard';
import Button from '@/components/UI/Button';
import Field from '@/components/UI/Field';
import Segmented from '@/components/UI/Segmented';
import SearchInput from '@/components/UI/SearchInput';
import EmptyState from '@/components/UI/EmptyState';
import ProgressBar from '@/components/UI/ProgressBar';
import Alert from '@/components/UI/Alert';
import { Badge, StatusBadge } from '@/components/UI/Badge';
import OrderFormFields from '@/components/Orders/OrderFormFields';
import api from '@/lib/api';
import { fmtDate, fmtDateTime, fmtNum, fmtTime, fmtTons, kgToTonsInput, localYmd, toNum, tonsToKg } from '@/lib/format';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';
import {
    buildFormula,
    formulaLabel,
    lineRemainingKg,
    orderDirection,
    orderDoneKg,
    orderLines,
    orderPartnerName,
    orderPlannedKg,
    orderRemainingKg,
    parseFormula,
    PAYMENT_TERMS,
} from '@/lib/orders';

const EMPTY_FORM = {
    direction: 'BUY',
    partnerId: '',
    qtyMode: 'PER_MATERIAL',
    totalQtyT: '',
    tolerance: 5,
    formula: 'LME',
    formulaValue: '',
    paymentTerms: 'DAP',
    status: 'Aktivan',
    startDate: '',
    endDate: '',
};

const toIso = (d) => (d ? new Date(d).toISOString() : null);

const nowLocalInput = () => {
    const d = new Date();
    return `${localYmd(d)}T${fmtTime(d)}`;
};

/** "25,34 / 2.000 t" */
const tonsPair = (doneKg, plannedKg) => `${fmtNum(toNum(doneKg) / 1000, 3)} / ${fmtTons(plannedKg)}`;

const DIRECTION_FILTERS = [
    { value: 'ALL', label: 'Sve' },
    { value: 'BUY', label: 'Nabavka' },
    { value: 'SELL', label: 'Prodaja' },
];

const STATUS_FILTERS = [
    { value: 'ALL', label: 'Svi statusi' },
    { value: 'Aktivan', label: 'Aktivne' },
    { value: 'Završen', label: 'Završene' },
    { value: 'Otkazan', label: 'Otkazane' },
];

function DirectionBadge({ contract }) {
    const sell = orderDirection(contract) === 'SELL';
    return <Badge tone={sell ? 'orange' : 'info'}>{sell ? 'Prodaja' : 'Nabavka'}</Badge>;
}

export default function ContractsPage() {
    const [contractsList, setContractsList] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [filterDir, setFilterDir] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [search, setSearch] = useState('');
    const [listLoading, setListLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingContract, setEditingContract] = useState(null);
    const [detailContract, setDetailContract] = useState(null);
    const [detailTickets, setDetailTickets] = useState([]);
    const [detailTransactions, setDetailTransactions] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [txFormOpen, setTxFormOpen] = useState(false);
    const [txForm, setTxForm] = useState({ date: '', materialId: '', qtyT: '', note: '' });
    const [txError, setTxError] = useState('');
    const [txSaving, setTxSaving] = useState(false);
    const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
    const [items, setItems] = useState([]); // { materialId, label, qtyT, pricePerKg }
    const [partnerQuery, setPartnerQuery] = useState('');
    const [createPartnerOpen, setCreatePartnerOpen] = useState(false);
    const [newPartnerName, setNewPartnerName] = useState('');
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [pageInfo, setPageInfo] = useState('');

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
            } finally {
                setListLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const selected = partners.find((p) => p.id === formData.partnerId);
        setPartnerQuery(selected?.name || '');
    }, [formData.partnerId, suppliers, customers, formData.direction]);

    const visibleContracts = useMemo(() => {
        const q = search.trim().toLowerCase();
        return contractsList.filter((c) => {
            if (filterDir !== 'ALL' && orderDirection(c) !== filterDir) return false;
            if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
            if (!q) return true;
            const haystack = [
                c.code,
                orderPartnerName(c),
                ...orderLines(c).map((l) => `${l.material?.code || ''} ${l.material?.name || ''}`),
            ].join(' ').toLowerCase();
            return haystack.includes(q);
        });
    }, [contractsList, filterDir, filterStatus, search]);

    const stats = useMemo(() => {
        const active = contractsList.filter((c) => c.status === 'Aktivan');
        return {
            active: active.length,
            buyRemaining: active.filter((c) => orderDirection(c) === 'BUY').reduce((sum, c) => sum + orderRemainingKg(c), 0),
            sellRemaining: active.filter((c) => orderDirection(c) === 'SELL').reduce((sum, c) => sum + orderRemainingKg(c), 0),
            finished: contractsList.filter((c) => c.status === 'Završen').length,
        };
    }, [contractsList]);

    const resolvePartnerId = (value) => {
        const normalized = String(value || '').trim().toLowerCase();
        if (!normalized) return '';
        const byId = partners.find((p) => p.id === value);
        if (byId) return byId.id;
        const byName = partners.find((p) => String(p.name || '').trim().toLowerCase() === normalized);
        return byName?.id || '';
    };

    const handlePartnerQueryChange = (value, opts = {}) => {
        setPartnerQuery(value);
        if (opts.reset) return;
        setFormData((prev) => ({ ...prev, partnerId: resolvePartnerId(value) }));
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
        setItems((prev) => [...prev, { materialId: backend.id, label: formatPickedMaterial(material), qtyT: '', pricePerKg: null }]);
    };

    const validate = () => {
        if (!formData.partnerId) return `${isBuy ? 'Dobavljač' : 'Kupac'} je obavezan.`;
        if (!items.length) return 'Dodaj bar jedan materijal.';
        if (formData.qtyMode === 'PER_MATERIAL' && items.some((it) => !(tonsToKg(it.qtyT) > 0))) return 'Unesi količinu (t) za svaki materijal.';
        if (formData.qtyMode === 'TOTAL' && !(tonsToKg(formData.totalQtyT) > 0)) return 'Unesi ukupnu količinu narudžbe.';
        return '';
    };

    const buildItemsPayload = () => items.map((it) => ({
        materialId: it.materialId,
        qtyKg: formData.qtyMode === 'PER_MATERIAL' ? tonsToKg(it.qtyT) : null,
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
            const res = await api.post('/sourcing/contracts', {
                direction: formData.direction,
                partnerId: formData.partnerId,
                items: buildItemsPayload(),
                qtyMode: formData.qtyMode,
                totalQtyKg: formData.qtyMode === 'TOTAL' ? tonsToKg(formData.totalQtyT) : null,
                tolerance: formData.tolerance,
                formula: buildFormula(formData.formula, formData.formulaValue),
                paymentTerms: formData.paymentTerms,
                period: formData.startDate && formData.endDate ? `${formData.startDate} - ${formData.endDate}` : 'Spot',
                status: 'Aktivan',
                startDate: formData.startDate || null,
                endDate: formData.endDate || null,
            });
            await refreshContracts();
            setShowNew(false);
            const code = res?.data?.data?.code;
            setPageInfo(`Narudžba ${code || ''} je kreirana.`);
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
            totalQtyT: c.totalQtyKg ? kgToTonsInput(c.totalQtyKg) : '',
            tolerance: c.tolerance !== null && c.tolerance !== undefined ? Number(c.tolerance) : 5,
            formula: type,
            formulaValue: value,
            paymentTerms: c.paymentTerms || 'DAP',
            status: c.status || 'Aktivan',
            startDate: c.startDate ? String(c.startDate).slice(0, 10) : '',
            endDate: c.endDate ? String(c.endDate).slice(0, 10) : '',
        });
        setItems(orderLines(c).map((l) => ({
            materialId: l.materialId,
            label: `${l.material?.code || '-'} - ${l.material?.name || ''}`,
            qtyT: kgToTonsInput(l.qtyKg),
            pricePerKg: l.pricePerKg !== undefined && l.pricePerKg !== null ? Number(l.pricePerKg) : null,
        })));
        setFormError('');
        setDetailContract(null);
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
                totalQtyKg: formData.qtyMode === 'TOTAL' ? tonsToKg(formData.totalQtyT) : null,
                tolerance: formData.tolerance !== '' ? Number(formData.tolerance) : null,
                formula: buildFormula(formData.formula, formData.formulaValue),
                paymentTerms: formData.paymentTerms,
                status: formData.status,
                period: formData.startDate && formData.endDate ? `${formData.startDate} - ${formData.endDate}` : editingContract.period || 'Spot',
                startDate: toIso(formData.startDate),
                endDate: toIso(formData.endDate),
            });
            await refreshContracts();
            setPageInfo(`Narudžba ${editingContract.code} je sačuvana.`);
            closeEdit();
        } catch (error) {
            setFormError(error?.response?.data?.error || 'Čuvanje nije uspjelo.');
        } finally {
            setLoading(false);
        }
    };

    const openDetail = async (c) => {
        setDetailContract(c);
        setDetailTickets([]);
        setDetailTransactions([]);
        setDetailError('');
        setTxFormOpen(false);
        setDetailLoading(true);
        const [ticketsRes, txRes] = await Promise.allSettled([
            api.get('/gate/tickets', { params: { contractId: c.id } }),
            api.get(`/sourcing/contracts/${c.id}/transactions`),
        ]);
        setDetailTickets(ticketsRes.status === 'fulfilled' ? normalizeApiList(ticketsRes.value) : []);
        setDetailTransactions(txRes.status === 'fulfilled' ? normalizeApiList(txRes.value) : []);
        setDetailLoading(false);
    };

    // backend vraća narudžbu sa novom ispunjenošću nakon knjiženja/storna
    const applyUpdatedContract = (updated) => {
        setDetailContract(updated);
        setContractsList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    };

    const openTxForm = () => {
        const lines = orderLines(detailContract);
        setTxForm({
            date: nowLocalInput(),
            materialId: detailContract.qtyMode !== 'TOTAL' && lines.length === 1 ? lines[0].materialId : '',
            qtyT: '',
            note: '',
        });
        setTxError('');
        setTxFormOpen(true);
    };

    const handleTxSubmit = async (e) => {
        e.preventDefault();
        if (!detailContract) return;
        const qtyKg = tonsToKg(txForm.qtyT);
        if (!(qtyKg > 0)) { setTxError('Unesi količinu u tonama.'); return; }
        if (detailContract.qtyMode !== 'TOTAL' && !txForm.materialId) { setTxError('Odaberi materijal sa narudžbe.'); return; }
        setTxSaving(true);
        try {
            const res = await api.post(`/sourcing/contracts/${detailContract.id}/transactions`, {
                materialId: txForm.materialId || null,
                qtyKg,
                date: toIso(txForm.date),
                note: txForm.note,
            });
            const { transaction, contract } = res?.data?.data || {};
            if (contract) applyUpdatedContract(contract);
            if (transaction) setDetailTransactions((prev) => [transaction, ...prev]);
            setTxFormOpen(false);
        } catch (error) {
            setTxError(error?.response?.data?.error || 'Knjiženje nije uspjelo.');
        } finally {
            setTxSaving(false);
        }
    };

    const handleTxStorno = async (t) => {
        if (!detailContract) return;
        if (!window.confirm(`Stornirati ručni unos od ${fmtTons(t.qtyKg)}? Količina se vraća na narudžbu.`)) return;
        setDetailError('');
        try {
            const res = await api.post(`/sourcing/contracts/${detailContract.id}/transactions/${t.id}/storno`);
            const { transaction, contract } = res?.data?.data || {};
            if (contract) applyUpdatedContract(contract);
            if (transaction) setDetailTransactions((prev) => prev.map((x) => (x.id === transaction.id ? transaction : x)));
        } catch (error) {
            setDetailError(error?.response?.data?.error || 'Storno nije uspio.');
        }
    };

    const formProps = {
        form: formData,
        setForm: setFormData,
        items,
        setItems,
        partners,
        partnerQuery,
        onPartnerQueryChange: handlePartnerQueryChange,
        onOpenMaterialPicker: () => setMaterialPickerOpen(true),
        onOpenCreatePartner: () => setCreatePartnerOpen(true),
        error: formError,
        datalistId: 'contracts-page-partners',
    };

    const detailLines = detailContract ? orderLines(detailContract) : [];
    const detailPlanned = detailContract ? orderPlannedKg(detailContract) : 0;
    const detailTolerance = toNum(detailContract?.tolerance);
    const detailIsSell = orderDirection(detailContract) === 'SELL';

    // vaganja i ručni unosi u jednoj listi; na ispunjenost idu samo zatvorena vaganja i neostornirani unosi
    const history = useMemo(() => {
        const weighings = detailTickets.map((t) => ({
            key: `w-${t.id}`,
            kind: 'weighing',
            date: t.date,
            source: t,
            material: t.material,
            qtyKg: t.net,
            status: t.status,
            counts: String(t.status || '').toLowerCase() === 'zatvoren',
        }));
        const manual = detailTransactions.map((t) => ({
            key: `m-${t.id}`,
            kind: 'manual',
            date: t.date,
            source: t,
            material: t.material,
            qtyKg: t.qtyKg,
            status: t.status,
            counts: t.status !== 'Storniran',
        }));
        const rows = [...weighings, ...manual].sort((a, b) => new Date(b.date) - new Date(a.date));
        const totals = rows.reduce((acc, r) => {
            if (r.counts) acc[r.kind] += toNum(r.qtyKg);
            return acc;
        }, { weighing: 0, manual: 0 });
        return { rows, totals };
    }, [detailTickets, detailTransactions]);

    const txQtyKg = tonsToKg(txForm.qtyT);
    const txRemainingNow = detailContract ? orderRemainingKg(detailContract) : 0;

    return (
        <div className="ui-page">
            <PageHeader
                title="Narudžbe"
                subtitle="Nabavka od dobavljača i prodaja kupcima — ispunjenost se ažurira automatski pri zatvaranju vaganja"
                actions={<Button icon={Plus} onClick={handleOpenNew}>Nova narudžba</Button>}
            />

            {pageInfo && <Alert tone="success" onClose={() => setPageInfo('')}>{pageInfo}</Alert>}

            <div className="ui-kpi-grid">
                <StatCard label="Aktivne narudžbe" icon={ClipboardList} value={fmtNum(stats.active)} loading={listLoading} />
                <StatCard label="Preostalo za prijem" icon={ArrowDownToLine} value={fmtTons(stats.buyRemaining)} hint="aktivne nabavke" loading={listLoading} />
                <StatCard label="Preostalo za isporuku" icon={ArrowUpFromLine} tone="orange" value={fmtTons(stats.sellRemaining)} hint="aktivne prodaje" loading={listLoading} />
                <StatCard label="Završene" icon={CheckCircle2} tone="success" value={fmtNum(stats.finished)} loading={listLoading} />
            </div>

            <Card flush>
                <div className="ui-toolbar" style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
                    <Segmented options={DIRECTION_FILTERS} value={filterDir} onChange={setFilterDir} ariaLabel="Vrsta narudžbe" />
                    <select className="ui-input" style={{ width: 'auto', minWidth: 150 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} aria-label="Status">
                        {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                    <SearchInput className="grow" value={search} onChange={setSearch} placeholder="Pretraži broj, partnera ili materijal..." />
                </div>

                {listLoading ? (
                    <div className="stack" style={{ padding: 18, gap: 10 }}>
                        {[0, 1, 2].map((i) => <div key={i} className="ui-skeleton" style={{ height: 44 }} />)}
                    </div>
                ) : visibleContracts.length === 0 ? (
                    <EmptyState
                        icon={ClipboardList}
                        title={contractsList.length ? 'Nema narudžbi za odabrane filtere' : 'Još nema narudžbi'}
                        text={contractsList.length ? 'Promijeni filter ili pretragu.' : 'Kreiraj prvu narudžbu za nabavku ili prodaju.'}
                        action={!contractsList.length && <Button icon={Plus} onClick={handleOpenNew}>Nova narudžba</Button>}
                    />
                ) : (
                    <div className="ui-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Narudžba</th>
                                    <th>Vrsta</th>
                                    <th>Partner</th>
                                    <th style={{ minWidth: 240 }}>Materijali (ispunjeno / plan)</th>
                                    <th style={{ minWidth: 180 }}>Ispunjenost</th>
                                    <th className="num">Preostalo</th>
                                    <th>Status</th>
                                    <th style={{ width: 90 }} />
                                </tr>
                            </thead>
                            <tbody>
                                {visibleContracts.map((c) => {
                                    const lines = orderLines(c);
                                    const planned = orderPlannedKg(c);
                                    const done = orderDoneKg(c);
                                    const remaining = orderRemainingKg(c);
                                    const isTotal = c.qtyMode === 'TOTAL';
                                    return (
                                        <tr key={c.id} onClick={() => openDetail(c)} style={{ cursor: 'pointer' }}>
                                            <td>
                                                <div style={{ fontWeight: 700 }}>{c.code || c.id}</div>
                                                <div className="muted" style={{ fontSize: 11.5 }}>{c.period || '-'}</div>
                                            </td>
                                            <td><DirectionBadge contract={c} /></td>
                                            <td style={{ fontWeight: 500 }}>{orderPartnerName(c) || '-'}</td>
                                            <td>
                                                <div style={{ display: 'grid', gap: 6 }}>
                                                    {lines.map((l) => (
                                                        <div key={l.id || l.materialId} style={{ display: 'grid', gap: 3 }}>
                                                            <div className="row-between" style={{ fontSize: 12 }}>
                                                                <span className="font-code" style={{ fontWeight: 600 }}>{l.material?.code || '-'}</span>
                                                                <span className="font-mono muted">
                                                                    {isTotal ? fmtTons(l.doneKg) : tonsPair(l.doneKg, l.qtyKg)}
                                                                </span>
                                                            </div>
                                                            {!isTotal && <ProgressBar size="sm" value={l.doneKg} max={l.qtyKg} tolerancePct={toNum(c.tolerance)} />}
                                                        </div>
                                                    ))}
                                                    {!lines.length && <span className="muted">-</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <ProgressBar
                                                    value={done}
                                                    max={planned}
                                                    tolerancePct={toNum(c.tolerance)}
                                                    valueText={planned > 0 ? `${fmtNum((done / planned) * 100)}%` : '-'}
                                                    footLeft={`${fmtTons(done)} od ${fmtTons(planned)}`}
                                                    tone={c.status === 'Otkazan' ? 'neutral' : undefined}
                                                />
                                            </td>
                                            <td className="num" style={{ fontWeight: 700 }}>{fmtTons(remaining)}</td>
                                            <td><StatusBadge status={c.status} /></td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                                                    <Button variant="ghost" size="sm" icon={Eye} aria-label={`Detalji ${c.code}`} title="Detalji" onClick={() => openDetail(c)} />
                                                    <Button variant="ghost" size="sm" icon={Pencil} aria-label={`Uredi ${c.code}`} title="Uredi" onClick={() => handleOpenEdit(c)} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {!listLoading && visibleContracts.length > 0 && (
                    <div className="muted" style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', fontSize: 12 }}>
                        {visibleContracts.length} od {contractsList.length} narudžbi
                    </div>
                )}
            </Card>

            {/* ---------- Detalji narudžbe ---------- */}
            <Modal
                open={Boolean(detailContract)}
                onClose={() => { if (!txFormOpen) setDetailContract(null); }}
                title={detailContract ? `Narudžba ${detailContract.code}` : ''}
                subtitle={detailContract ? `${orderPartnerName(detailContract) || '-'} · ${detailContract.direction === 'SELL' ? 'prodaja (vaganje IZLAZ)' : 'nabavka (vaganje ULAZ)'}` : ''}
                width={860}
            >
                {detailContract && (
                    <div className="stack" style={{ gap: 20 }}>
                        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                            <DirectionBadge contract={detailContract} />
                            <StatusBadge status={detailContract.status} />
                            <Badge tone="outline">{detailContract.qtyMode === 'TOTAL' ? 'Ukupna količina' : 'Količina po materijalu'}</Badge>
                        </div>

                        <div className="ui-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                            {[
                                ['Period', detailContract.period || '-'],
                                ['Početak', fmtDate(detailContract.startDate)],
                                ['Kraj', fmtDate(detailContract.endDate)],
                                ['Formula', formulaLabel(detailContract.formula)],
                                ['Paritet', PAYMENT_TERMS.find((t) => t.value === detailContract.paymentTerms)?.label || detailContract.paymentTerms || '-'],
                                ['Tolerancija', `${fmtNum(detailTolerance, 2)}%`],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <div className="ui-label" style={{ color: 'var(--text-3)', fontWeight: 500 }}>{label}</div>
                                    <div style={{ fontWeight: 600, marginTop: 2 }}>{value}</div>
                                </div>
                            ))}
                        </div>

                        <div className="ui-card" style={{ padding: 16, background: 'var(--surface-2)' }}>
                            <ProgressBar
                                size="lg"
                                label="Ukupna ispunjenost"
                                valueText={detailPlanned > 0 ? `${fmtNum((orderDoneKg(detailContract) / detailPlanned) * 100)}%` : '-'}
                                value={orderDoneKg(detailContract)}
                                max={detailPlanned}
                                tolerancePct={detailTolerance}
                                footLeft={`Ispunjeno ${fmtTons(orderDoneKg(detailContract))} od ${fmtTons(detailPlanned)}`}
                                footRight={`Preostalo ${fmtTons(orderRemainingKg(detailContract))}`}
                            />
                            {detailContract.qtyMode !== 'TOTAL' && detailLines.length > 0 && (
                                <div className="stack" style={{ gap: 14, marginTop: 18 }}>
                                    {detailLines.map((l) => {
                                        const rem = lineRemainingKg(l);
                                        return (
                                            <ProgressBar
                                                key={l.id || l.materialId}
                                                label={`${l.material?.code || '-'} · ${l.material?.name || ''}`}
                                                valueText={tonsPair(l.doneKg, l.qtyKg)}
                                                value={l.doneKg}
                                                max={l.qtyKg}
                                                tolerancePct={detailTolerance}
                                                footRight={rem !== null ? `preostalo ${fmtTons(Math.max(0, rem))}` : ''}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                            {detailContract.qtyMode === 'TOTAL' && detailLines.length > 0 && (
                                <div style={{ marginTop: 14, display: 'grid', gap: 6 }}>
                                    {detailLines.map((l) => (
                                        <div key={l.id || l.materialId} className="row-between" style={{ fontSize: 12.5 }}>
                                            <span>{l.material?.code || '-'} · {l.material?.name || ''}</span>
                                            <b className="font-mono">{fmtTons(l.doneKg)}</b>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="row-between" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                                <div>
                                    <div className="ui-section-title" style={{ marginBottom: 2 }}>Transakcije na narudžbi</div>
                                    <div className="muted" style={{ fontSize: 12 }}>
                                        Vaganja {fmtTons(history.totals.weighing)} · Ručno {fmtTons(history.totals.manual)}
                                    </div>
                                </div>
                                <Button variant="soft" size="sm" icon={Plus} onClick={openTxForm}>Ručna transakcija</Button>
                            </div>
                            {detailError && <Alert tone="danger" onClose={() => setDetailError('')}>{detailError}</Alert>}
                            {detailLoading ? (
                                <div className="ui-skeleton" style={{ height: 60 }} />
                            ) : history.rows.length === 0 ? (
                                <div className="muted" style={{ fontSize: 12.5 }}>Još nema vaganja ni ručnih unosa na ovoj narudžbi.</div>
                            ) : (
                                <div className="ui-card" style={{ overflow: 'hidden' }}>
                                    <div className="ui-table-wrap" style={{ maxHeight: 320 }}>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Datum</th>
                                                    <th>Vrsta</th>
                                                    <th>Dokument</th>
                                                    <th>Materijal</th>
                                                    <th className="num">Količina</th>
                                                    <th>Status</th>
                                                    <th style={{ width: 44 }} />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {history.rows.map((r) => (
                                                    <tr key={r.key} style={{ opacity: r.counts ? 1 : 0.55 }}>
                                                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(r.date)}</td>
                                                        <td>{r.kind === 'weighing' ? <Badge tone="info">Vaganje</Badge> : <Badge tone="orange">Ručno</Badge>}</td>
                                                        <td>
                                                            {r.kind === 'weighing' ? (
                                                                <>
                                                                    <Link href={`/gate/${r.source.id}`} className="font-code" style={{ color: 'var(--primary-ink)', fontSize: 12 }}>{r.source.code}</Link>
                                                                    <div className="muted" style={{ fontSize: 11.5 }}>{r.source.plate || '-'}</div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div style={{ fontSize: 12.5 }}>{r.source.note || '-'}</div>
                                                                    {r.source.createdByName && <div className="muted" style={{ fontSize: 11.5 }}>Unio: {r.source.createdByName}</div>}
                                                                </>
                                                            )}
                                                        </td>
                                                        <td>{r.material ? `${r.material.code || '-'} · ${r.material.name || ''}` : <span className="muted">cijela narudžba</span>}</td>
                                                        <td className="num" style={{ fontWeight: 600, textDecoration: r.counts ? 'none' : 'line-through' }}>{fmtTons(r.qtyKg)}</td>
                                                        <td><StatusBadge status={r.status} /></td>
                                                        <td>
                                                            {r.kind === 'manual' && r.counts && (
                                                                <Button variant="ghost" size="sm" icon={Undo2} aria-label="Storniraj ručni unos" title="Storno" onClick={() => handleTxStorno(r.source)} />
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
                                Na ispunjenost se računaju zatvorena vaganja i ručni unosi; storno vraća količinu. Ručni unos ne mijenja stanje skladišta.
                            </div>
                        </div>

                        <div className="ui-modal-footer" style={{ marginTop: 0 }}>
                            <Button variant="secondary" onClick={() => setDetailContract(null)}>Zatvori</Button>
                            <Button icon={Pencil} onClick={() => handleOpenEdit(detailContract)}>Uredi narudžbu</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ---------- Ručna transakcija ---------- */}
            <Modal
                open={txFormOpen && Boolean(detailContract)}
                onClose={() => setTxFormOpen(false)}
                title="Ručna transakcija"
                subtitle={detailContract ? `${detailContract.code} · ${orderPartnerName(detailContract) || '-'} · ${detailIsSell ? 'isporučeno kupcu' : 'primljeno od dobavljača'}` : ''}
                width={560}
                zIndex={3500}
            >
                {detailContract && (
                    <form onSubmit={handleTxSubmit} className="stack" style={{ gap: 16 }}>
                        <div className="ui-form-grid">
                            <Field label="Datum i vrijeme" required>
                                <input type="datetime-local" className="ui-input" value={txForm.date} onChange={(e) => setTxForm((p) => ({ ...p, date: e.target.value }))} />
                            </Field>
                            <Field label={detailIsSell ? 'Isporučeno (t)' : 'Primljeno (t)'} required>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="ui-input font-mono"
                                    placeholder="0"
                                    autoFocus
                                    value={txForm.qtyT}
                                    onChange={(e) => setTxForm((p) => ({ ...p, qtyT: e.target.value }))}
                                />
                            </Field>
                            <Field label="Materijal" required={detailContract.qtyMode !== 'TOTAL'} span="all">
                                <select className="ui-input" value={txForm.materialId} onChange={(e) => setTxForm((p) => ({ ...p, materialId: e.target.value }))}>
                                    <option value="">{detailContract.qtyMode === 'TOTAL' ? '- Cijela narudžba (bez materijala) -' : '- Odaberi materijal -'}</option>
                                    {detailLines.map((l) => {
                                        const rem = lineRemainingKg(l);
                                        return (
                                            <option key={l.id || l.materialId} value={l.materialId}>
                                                {`${l.material?.code || '-'} · ${l.material?.name || ''}${rem !== null ? ` (preostalo ${fmtTons(Math.max(0, rem))})` : ''}`}
                                            </option>
                                        );
                                    })}
                                </select>
                            </Field>
                            <Field label="Napomena" span="all">
                                <input
                                    className="ui-input"
                                    placeholder="npr. dovezeno prije uvođenja vage, otpremnica br. ..."
                                    value={txForm.note}
                                    onChange={(e) => setTxForm((p) => ({ ...p, note: e.target.value }))}
                                />
                            </Field>
                        </div>

                        <div className="ui-card" style={{ padding: 14, background: 'var(--surface-2)' }}>
                            <div className="row-between" style={{ fontSize: 13 }}>
                                <span className="muted">Preostalo na narudžbi</span>
                                <span className="font-mono">
                                    <b>{fmtTons(txRemainingNow)}</b>
                                    {txQtyKg > 0 && <> → <b>{fmtTons(Math.max(0, txRemainingNow - txQtyKg))}</b></>}
                                </span>
                            </div>
                        </div>

                        {txError && <Alert tone="danger">{txError}</Alert>}

                        <div className="ui-modal-footer" style={{ marginTop: 0 }}>
                            <Button variant="secondary" onClick={() => setTxFormOpen(false)}>Odustani</Button>
                            <Button type="submit" disabled={txSaving}>{txSaving ? 'Knjiženje...' : 'Proknjiži'}</Button>
                        </div>
                    </form>
                )}
            </Modal>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Nova narudžba" subtitle="Nabavka ili prodaja sa jednim ili više materijala" width={780}>
                <form onSubmit={handleSubmit}>
                    <OrderFormFields {...formProps} isEdit={false} />
                    <div className="ui-modal-footer">
                        <Button variant="secondary" onClick={() => setShowNew(false)}>Odustani</Button>
                        <Button type="submit" disabled={loading}>{loading ? 'Čuvanje...' : 'Kreiraj narudžbu'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal open={showEdit} onClose={closeEdit} title={`Uredi narudžbu ${editingContract?.code || ''}`} width={780}>
                {editingContract && (
                    <form onSubmit={handleSaveEdit}>
                        <OrderFormFields {...formProps} isEdit />
                        <div className="ui-modal-footer">
                            <Button variant="secondary" onClick={closeEdit}>Odustani</Button>
                            <Button type="submit" disabled={loading}>{loading ? 'Čuvanje...' : 'Sačuvaj'}</Button>
                        </div>
                    </form>
                )}
            </Modal>

            <MaterialPicker
                open={materialPickerOpen}
                onClose={() => setMaterialPickerOpen(false)}
                onSelect={({ material }) => { addMaterial(material); setMaterialPickerOpen(false); }}
            />

            <Modal open={createPartnerOpen} onClose={() => setCreatePartnerOpen(false)} title={isBuy ? 'Novi dobavljač' : 'Novi kupac'} width={480} zIndex={3500}>
                <Field label={isBuy ? 'Naziv dobavljača' : 'Naziv kupca'} required>
                    <input className="ui-input" value={newPartnerName} onChange={(e) => setNewPartnerName(e.target.value)} autoFocus />
                </Field>
                <div className="ui-modal-footer">
                    <Button variant="secondary" onClick={() => setCreatePartnerOpen(false)}>Odustani</Button>
                    <Button onClick={createPartner}>Sačuvaj</Button>
                </div>
            </Modal>
        </div>
    );
}
