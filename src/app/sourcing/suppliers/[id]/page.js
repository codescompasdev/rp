'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarClock, ClipboardList, Factory, Pencil, Power, Scale, Wallet } from 'lucide-react';
import Modal from '@/components/UI/Modal';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import StatCard from '@/components/UI/StatCard';
import Button from '@/components/UI/Button';
import Alert from '@/components/UI/Alert';
import EmptyState from '@/components/UI/EmptyState';
import ProgressBar from '@/components/UI/ProgressBar';
import { Badge, StatusBadge } from '@/components/UI/Badge';
import SupplierFormFields from '@/components/Suppliers/SupplierFormFields';
import api from '@/lib/api';
import { fmtDate, fmtDateTime, fmtKg, fmtMoney, fmtNum, fmtTons, fmtWeight } from '@/lib/format';
import { normalizeApiList } from '@/lib/materialsAdapter';
import { orderDoneKg, orderLines, orderPlannedKg, orderRemainingKg } from '@/lib/orders';
import { bonitetTone, supplierFormToPayload, supplierToForm } from '@/lib/suppliers';

const HISTORY_LIMIT = 300;

function ticketKind(t) {
    if (t.type === 'POS') return { label: 'Otkup', tone: 'success' };
    if (t.type === 'OUT') return { label: 'Izlaz', tone: 'orange' };
    return { label: 'Ulaz', tone: 'info' };
}

export default function SupplierDetailPage() {
    const params = useParams();
    const id = params?.id;
    const [supplier, setSupplier] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [showEdit, setShowEdit] = useState(false);
    const [formData, setFormData] = useState(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError('');
        try {
            const [supplierRes, ticketsRes] = await Promise.all([
                api.get(`/sourcing/suppliers/${id}`),
                api.get('/gate/tickets', { params: { supplierId: id, limit: HISTORY_LIMIT } }),
            ]);
            setSupplier(supplierRes?.data?.data || null);
            setTickets(normalizeApiList(ticketsRes));
        } catch (err) {
            setError(err?.response?.status === 404 ? 'Dobavljač nije pronađen.' : 'Učitavanje dobavljača nije uspjelo.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const stats = useMemo(() => {
        const counted = tickets.filter((t) => {
            const st = String(t.status || '').toLowerCase();
            return (t.type === 'IN' && st === 'zatvoren') || (t.type === 'POS' && st === 'completed');
        });
        const kg = counted.reduce((sum, t) => sum + Number(t.net || 0), 0);
        const value = counted.reduce((sum, t) => sum + Number(t.total || 0), 0);
        return { count: counted.length, kg, value, last: counted[0]?.date || null };
    }, [tickets]);

    const openEdit = () => {
        setFormData(supplierToForm(supplier));
        setFormError('');
        setShowEdit(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData?.name?.trim()) {
            setFormError('Naziv je obavezan.');
            return;
        }
        setSaving(true);
        setFormError('');
        try {
            await api.put(`/sourcing/suppliers/${supplier.id}`, supplierFormToPayload(formData));
            setShowEdit(false);
            setInfo('Podaci dobavljača su sačuvani.');
            await load();
        } catch (err) {
            setFormError(err?.response?.data?.error || 'Čuvanje nije uspjelo.');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async () => {
        if (!supplier) return;
        const deactivate = supplier.active !== false;
        if (deactivate && !window.confirm(`Deaktivirati dobavljača "${supplier.name}"? Neće se nuditi u novim vaganjima.`)) return;
        try {
            if (deactivate) await api.delete(`/sourcing/suppliers/${supplier.id}`);
            else await api.put(`/sourcing/suppliers/${supplier.id}`, { active: true });
            setInfo(deactivate ? 'Dobavljač je deaktiviran.' : 'Dobavljač je ponovo aktivan.');
            await load();
        } catch (err) {
            setError(err?.response?.data?.error || 'Promjena statusa nije uspjela.');
        }
    };

    if (loading && !supplier) {
        return (
            <div className="ui-page">
                <PageHeader title="Dobavljač" subtitle="Učitavanje..." />
                <div className="ui-kpi-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="ui-skeleton" style={{ height: 110 }} />)}</div>
            </div>
        );
    }

    if (!supplier) {
        return (
            <div className="ui-page">
                <PageHeader title="Dobavljač" actions={<Button variant="secondary" icon={ArrowLeft} href="/sourcing/suppliers">Svi dobavljači</Button>} />
                <Alert tone="danger">{error || 'Dobavljač nije pronađen.'}</Alert>
            </div>
        );
    }

    const isActive = supplier.active !== false;
    const profileRows = [
        ['Šifra', <span key="c" className="font-code">{supplier.code}</span>],
        ['JIB', supplier.jib ? <span key="j" className="font-code">{supplier.jib}</span> : '—'],
        ['Tip', supplier.type || '—'],
        ['PDV obveznik', supplier.pdv ? 'Da' : 'Ne'],
        ['Grad', supplier.city || '—'],
        ['Adresa', supplier.address || '—'],
        ['Telefon', supplier.phone || '—'],
        ['Email', supplier.email || '—'],
        ['Bonitet', <Badge key="b" tone={bonitetTone(supplier.bonitet)}>{supplier.bonitet || '-'}</Badge>],
        ['Rok plaćanja', `${fmtNum(supplier.paymentDays)} dana`],
    ];

    return (
        <div className="ui-page">
            <PageHeader
                title={supplier.name}
                subtitle={`${supplier.type || 'Dobavljač'}${supplier.city ? ` · ${supplier.city}` : ''}`}
                actions={(
                    <>
                        <Button variant="secondary" icon={ArrowLeft} href="/sourcing/suppliers">Svi dobavljači</Button>
                        <Button variant={isActive ? 'danger-soft' : 'soft'} icon={Power} onClick={toggleActive}>{isActive ? 'Deaktiviraj' : 'Aktiviraj'}</Button>
                        <Button icon={Pencil} onClick={openEdit}>Uredi</Button>
                    </>
                )}
            >
                <div className="row" style={{ gap: 6, marginTop: 8 }}>
                    <Badge tone={isActive ? 'success' : 'neutral'} dot>{isActive ? 'Aktivan' : 'Neaktivan'}</Badge>
                    <Badge tone={bonitetTone(supplier.bonitet)}>Bonitet {supplier.bonitet || '-'}</Badge>
                </div>
            </PageHeader>

            {info && <Alert tone="success" onClose={() => setInfo('')}>{info}</Alert>}
            {error && <Alert tone="danger" onClose={() => setError('')}>{error}</Alert>}

            <div className="ui-kpi-grid">
                <StatCard label="Ukupno primljeno" icon={Scale} value={fmtWeight(stats.kg)} hint={`${fmtNum(stats.count)} vaganja i otkupa`} />
                <StatCard label="Isplaćeno (otkup)" icon={Wallet} tone="success" value={fmtMoney(stats.value, 0)} hint="direktan otkup sa cijenom" />
                <StatCard label="Zadnja isporuka" icon={CalendarClock} value={stats.last ? fmtDate(stats.last) : '—'} />
                <StatCard label="Bilans" icon={Factory} tone={Number(supplier.balance || 0) < 0 ? 'danger' : 'info'} value={fmtMoney(supplier.balance)} />
            </div>

            <div className="grid-main-side" style={{ gridTemplateColumns: 'minmax(0, 1fr) 340px' }}>
                <div className="stack" style={{ minWidth: 0 }}>
                    <Card
                        title="Historija vaganja"
                        subtitle={`Zadnjih ${fmtNum(Math.min(tickets.length, HISTORY_LIMIT))} vaganja i otkupa`}
                        flush
                    >
                        {tickets.length === 0 ? (
                            <EmptyState title="Nema vaganja za ovog dobavljača" />
                        ) : (
                            <div className="ui-table-wrap" style={{ maxHeight: 480 }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Datum</th>
                                            <th>Tiket</th>
                                            <th>Tip</th>
                                            <th>Materijal</th>
                                            <th className="num">Neto</th>
                                            <th className="num">Iznos</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tickets.map((t) => {
                                            const kind = ticketKind(t);
                                            return (
                                                <tr key={t.id}>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(t.date)}</td>
                                                    <td className="font-code" style={{ fontSize: 12 }}>{t.code}</td>
                                                    <td><Badge tone={kind.tone}>{kind.label}</Badge></td>
                                                    <td>{t.material ? `${t.material.code} · ${t.material.name}` : '-'}</td>
                                                    <td className="num" style={{ fontWeight: 600 }}>{fmtKg(t.net)}</td>
                                                    <td className="num">{Number(t.total || 0) > 0 ? fmtMoney(t.total) : <span className="muted">—</span>}</td>
                                                    <td><StatusBadge status={t.status} /></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    <Card title="Narudžbe" icon={ClipboardList} actions={<Button variant="ghost" size="sm" href="/sourcing/contracts">Sve narudžbe</Button>}>
                        {(supplier.contracts || []).length === 0 ? (
                            <div className="muted" style={{ fontSize: 12.5 }}>Nema narudžbi za ovog dobavljača.</div>
                        ) : (
                            <div className="stack" style={{ gap: 16 }}>
                                {supplier.contracts.map((c) => {
                                    const planned = orderPlannedKg(c);
                                    const done = orderDoneKg(c);
                                    return (
                                        <div key={c.id} style={{ display: 'grid', gap: 6 }}>
                                            <ProgressBar
                                                label={(
                                                    <span className="row" style={{ gap: 8 }}>
                                                        {c.code}
                                                        <StatusBadge status={c.status} />
                                                    </span>
                                                )}
                                                valueText={planned > 0 ? `${fmtNum((done / planned) * 100)}%` : '-'}
                                                value={done}
                                                max={planned}
                                                tolerancePct={Number(c.tolerance || 0)}
                                                footLeft={`${fmtTons(done)} / ${fmtTons(planned)} · ${orderLines(c).map((l) => l.material?.code).filter(Boolean).join(', ')}`}
                                                footRight={`preostalo ${fmtTons(orderRemainingKg(c))}`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>

                <div className="stack">
                    <Card title="Profil partnera" icon={Factory}>
                        <div className="stack" style={{ gap: 10, fontSize: 12.5 }}>
                            {profileRows.map(([label, value]) => (
                                <div key={label} className="row-between" style={{ alignItems: 'flex-start' }}>
                                    <span className="muted">{label}</span>
                                    <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '62%', wordBreak: 'break-word' }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                    <Card title="Najave" icon={CalendarClock}>
                        {(supplier.announcements || []).length === 0 ? (
                            <div className="muted" style={{ fontSize: 12.5 }}>Nema najava.</div>
                        ) : (
                            <div className="stack" style={{ gap: 10 }}>
                                {supplier.announcements.map((a) => (
                                    <div key={a.id} className="row-between" style={{ alignItems: 'flex-start', fontSize: 12.5 }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{a.code}</div>
                                            <div className="muted">{a.material?.code || '-'} · {fmtDate(a.expectedDate)}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 600 }}>{fmtKg(a.expectedKg)}</div>
                                            <StatusBadge status={a.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Uredi dobavljača" subtitle={supplier.code} width={760}>
                {formData && (
                    <form onSubmit={handleSave}>
                        <SupplierFormFields form={formData} setForm={setFormData} />
                        {formError && <Alert tone="danger" style={{ marginTop: 14 }}>{formError}</Alert>}
                        <div className="ui-modal-footer">
                            <Button variant="secondary" onClick={() => setShowEdit(false)}>Odustani</Button>
                            <Button type="submit" disabled={saving}>{saving ? 'Čuvanje...' : 'Sačuvaj'}</Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
