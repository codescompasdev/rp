'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, ClipboardList, Eye, Pencil, Plus } from 'lucide-react';
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
import { fmtDate, fmtDateTime, fmtKg, fmtNum, fmtWeight, toNum } from '@/lib/format';
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
    totalQtyKg: '',
    tolerance: 5,
    formula: 'LME',
    formulaValue: '',
    paymentTerms: 'DAP',
    status: 'Aktivan',
    startDate: '',
    endDate: '',
};

const toIso = (d) => (d ? new Date(d).toISOString() : null);

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
    const [detailLoading, setDetailLoading] = useState(false);
    const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
    const [items, setItems] = useState([]); // { materialId, label, qtyKg, pricePerKg }
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
        setItems((prev) => [...prev, { materialId: backend.id, label: formatPickedMaterial(material), qtyKg: '', pricePerKg: null }]);
    };

    const validate = () => {
        if (!formData.partnerId) return `${isBuy ? 'Dobavljač' : 'Kupac'} je obavezan.`;
        if (!items.length) return 'Dodaj bar jedan materijal.';
        if (formData.qtyMode === 'PER_MATERIAL' && items.some((it) => !(Number(it.qtyKg) > 0))) return 'Unesi količinu (kg) za svaki materijal.';
        if (formData.qtyMode === 'TOTAL' && !(Number(formData.totalQtyKg) > 0)) return 'Unesi ukupnu količinu narudžbe.';
        return '';
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
            const res = await api.post('/sourcing/contracts', {
                direction: formData.direction,
                partnerId: formData.partnerId,
                items: buildItemsPayload(),
                qtyMode: formData.qtyMode,
                totalQtyKg: formData.qtyMode === 'TOTAL' ? Number(formData.totalQtyKg) : null,
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
            totalQtyKg: c.totalQtyKg ? String(Number(c.totalQtyKg)) : '',
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
            qtyKg: l.qtyKg !== null && l.qtyKg !== undefined ? String(Number(l.qtyKg)) : '',
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
                totalQtyKg: formData.qtyMode === 'TOTAL' ? Number(formData.totalQtyKg) : null,
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
        setDetailLoading(true);
        try {
            const res = await api.get('/gate/tickets', { params: { contractId: c.id } });
            setDetailTickets(normalizeApiList(res));
        } catch {
            setDetailTickets([]);
        } finally {
            setDetailLoading(false);
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
                <StatCard label="Preostalo za prijem" icon={ArrowDownToLine} value={fmtWeight(stats.buyRemaining)} hint="aktivne nabavke" loading={listLoading} />
                <StatCard label="Preostalo za isporuku" icon={ArrowUpFromLine} tone="orange" value={fmtWeight(stats.sellRemaining)} hint="aktivne prodaje" loading={listLoading} />
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
                                                                    {isTotal ? fmtKg(l.doneKg) : `${fmtNum(l.doneKg)} / ${fmtNum(l.qtyKg)} kg`}
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
                                                    footLeft={`${fmtWeight(done)} od ${fmtWeight(planned)}`}
                                                    tone={c.status === 'Otkazan' ? 'neutral' : undefined}
                                                />
                                            </td>
                                            <td className="num" style={{ fontWeight: 700 }}>{fmtKg(remaining)}</td>
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
                onClose={() => setDetailContract(null)}
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
                                footLeft={`Ispunjeno ${fmtKg(orderDoneKg(detailContract))} od ${fmtKg(detailPlanned)}`}
                                footRight={`Preostalo ${fmtKg(orderRemainingKg(detailContract))}`}
                            />
                            {detailContract.qtyMode !== 'TOTAL' && detailLines.length > 0 && (
                                <div className="stack" style={{ gap: 14, marginTop: 18 }}>
                                    {detailLines.map((l) => {
                                        const rem = lineRemainingKg(l);
                                        return (
                                            <ProgressBar
                                                key={l.id || l.materialId}
                                                label={`${l.material?.code || '-'} · ${l.material?.name || ''}`}
                                                valueText={`${fmtNum(l.doneKg)} / ${fmtNum(l.qtyKg)} kg`}
                                                value={l.doneKg}
                                                max={l.qtyKg}
                                                tolerancePct={detailTolerance}
                                                footRight={rem !== null ? `preostalo ${fmtKg(Math.max(0, rem))}` : ''}
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
                                            <b className="font-mono">{fmtKg(l.doneKg)}</b>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="ui-section-title">Vaganja na narudžbi</div>
                            {detailLoading ? (
                                <div className="ui-skeleton" style={{ height: 60 }} />
                            ) : detailTickets.length === 0 ? (
                                <div className="muted" style={{ fontSize: 12.5 }}>Još nema vaganja vezanih za ovu narudžbu.</div>
                            ) : (
                                <div className="ui-card" style={{ overflow: 'hidden' }}>
                                    <div className="ui-table-wrap" style={{ maxHeight: 280 }}>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Datum</th>
                                                    <th>Kod</th>
                                                    <th>Tablice</th>
                                                    <th>Materijal</th>
                                                    <th className="num">Neto</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detailTickets.map((t) => (
                                                    <tr key={t.id}>
                                                        <td>{fmtDateTime(t.date)}</td>
                                                        <td className="font-code" style={{ fontSize: 12 }}><Link href={`/gate/${t.id}`} style={{ color: 'var(--primary-ink)' }}>{t.code}</Link></td>
                                                        <td>{t.plate || '-'}</td>
                                                        <td>{t.material?.code || '-'} · {t.material?.name || ''}</td>
                                                        <td className="num">{fmtKg(t.net)}</td>
                                                        <td><StatusBadge status={t.status} /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>Na ispunjenost se računaju samo zatvorena vaganja; storno vraća količinu.</div>
                        </div>

                        <div className="ui-modal-footer" style={{ marginTop: 0 }}>
                            <Button variant="secondary" onClick={() => setDetailContract(null)}>Zatvori</Button>
                            <Button icon={Pencil} onClick={() => handleOpenEdit(detailContract)}>Uredi narudžbu</Button>
                        </div>
                    </div>
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
