'use client';

import { useEffect, useMemo, useState } from 'react';
import { AtSign, Inbox, Mail, MailOpen, Phone, Search } from 'lucide-react';
import Modal from '@/components/UI/Modal';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import StatCard from '@/components/UI/StatCard';
import Button from '@/components/UI/Button';
import Alert from '@/components/UI/Alert';
import Segmented from '@/components/UI/Segmented';
import EmptyState from '@/components/UI/EmptyState';
import { Badge } from '@/components/UI/Badge';
import api from '@/lib/api';
import { getAuthUser } from '@/lib/authStorage';
import { fmtDateTime, fmtNum } from '@/lib/format';

const STATUS_OPTIONS = [
    { value: 'all', label: 'Sve' },
    { value: 'new', label: 'Novo' },
    { value: 'in_progress', label: 'U obradi' },
    { value: 'resolved', label: 'Riješeno' },
    { value: 'archived', label: 'Arhivirano' },
];

const STATUS_TONE = { new: 'info', in_progress: 'warning', resolved: 'success', archived: 'neutral' };
const statusLabel = (value) => STATUS_OPTIONS.find((o) => o.value === value)?.label || value;

export default function SystemMessagesPage() {
    const [allowed, setAllowed] = useState(null);
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openRow, setOpenRow] = useState(null);

    const load = async (nextStatus = status) => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/inbound-messages', {
                params: {
                    status: nextStatus,
                    search: search || undefined,
                    limit: 300,
                },
            });
            setRows(res?.data?.data || []);
        } catch (err) {
            setError(err?.response?.data?.error || 'Neuspjelo učitavanje poruka.');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, nextStatus) => {
        try {
            await api.patch(`/inbound-messages/${id}/status`, { status: nextStatus });
            setRows((current) => current.map((row) => (row.id === id ? { ...row, status: nextStatus } : row)));
            setOpenRow((current) => (current?.id === id ? { ...current, status: nextStatus } : current));
        } catch (err) {
            setError(err?.response?.data?.error || 'Neuspjela promjena statusa.');
        }
    };

    useEffect(() => {
        const ok = ['admin', 'manager', 'owner'].includes(String(getAuthUser()?.role || '').toLowerCase());
        setAllowed(ok);
        if (ok) load();
        else setLoading(false);
    }, []);

    const counts = useMemo(() => rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }), {}), [rows]);

    const changeFilter = (value) => {
        setStatus(value);
        load(value);
    };

    if (allowed === null) {
        return <div className="ui-page"><PageHeader title="Kontakt poruke" subtitle="Učitavanje..." /></div>;
    }

    if (!allowed) {
        return (
            <div className="ui-page">
                <PageHeader title="Kontakt poruke" />
                <Alert tone="warning">Ova stranica je dostupna samo vlasniku, adminu i manageru.</Alert>
            </div>
        );
    }

    return (
        <div className="ui-page">
            <PageHeader title="Kontakt poruke" subtitle="Upiti klijenata sa kontakt forme" />

            <div className="ui-kpi-grid">
                <StatCard label="Prikazano poruka" icon={Inbox} value={fmtNum(rows.length)} loading={loading && !rows.length} />
                <StatCard label="Nove" icon={Mail} value={fmtNum(counts.new || 0)} loading={loading && !rows.length} />
                <StatCard label="U obradi" icon={MailOpen} tone="warning" value={fmtNum(counts.in_progress || 0)} loading={loading && !rows.length} />
                <StatCard label="Riješene" icon={MailOpen} tone="success" value={fmtNum(counts.resolved || 0)} loading={loading && !rows.length} />
            </div>

            {error && <Alert tone="danger" onClose={() => setError('')}>{error}</Alert>}

            <Card flush>
                <div className="ui-toolbar" style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
                    <Segmented options={STATUS_OPTIONS} value={status} onChange={changeFilter} ariaLabel="Status poruke" />
                    <input
                        className="ui-input grow"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
                        placeholder="Pretraga: ime, email, telefon, poruka"
                    />
                    <Button icon={Search} onClick={() => load()} disabled={loading}>Primijeni</Button>
                </div>
                {loading && !rows.length ? (
                    <div className="stack" style={{ padding: 18, gap: 10 }}>{[0, 1, 2].map((i) => <div key={i} className="ui-skeleton" style={{ height: 48 }} />)}</div>
                ) : rows.length === 0 ? (
                    <EmptyState icon={Inbox} title="Nema poruka za odabrane filtere" />
                ) : (
                    <div className="ui-table-wrap" style={{ opacity: loading ? 0.55 : 1 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Datum</th>
                                    <th>Pošiljalac</th>
                                    <th>Poruka</th>
                                    <th>Izvor</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.id} onClick={() => setOpenRow(row)} style={{ cursor: 'pointer', background: row.status === 'new' ? 'var(--primary-50)' : undefined }}>
                                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(row.createdAt)}</td>
                                        <td>
                                            <div style={{ fontWeight: row.status === 'new' ? 700 : 600 }}>{row.firstName} {row.lastName}</div>
                                            <div className="muted" style={{ fontSize: 12 }}>{row.email}{row.phone ? ` · ${row.phone}` : ''}</div>
                                        </td>
                                        <td style={{ maxWidth: 420 }}>
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{row.message}</div>
                                        </td>
                                        <td className="muted">{row.source || '—'}</td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <select className="ui-input" style={{ height: 32, width: 140 }} value={row.status} onChange={(e) => updateStatus(row.id, e.target.value)} aria-label="Status poruke">
                                                {STATUS_OPTIONS.filter((item) => item.value !== 'all').map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal open={Boolean(openRow)} onClose={() => setOpenRow(null)} title={openRow ? `${openRow.firstName} ${openRow.lastName}` : ''} subtitle={openRow ? fmtDateTime(openRow.createdAt) : ''} width={640}>
                {openRow && (
                    <div className="stack" style={{ gap: 16 }}>
                        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                            <Badge tone={STATUS_TONE[openRow.status] || 'neutral'} dot>{statusLabel(openRow.status)}</Badge>
                            {openRow.source && <Badge tone="outline">{openRow.source}</Badge>}
                        </div>
                        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                            <Button variant="secondary" size="sm" icon={AtSign} href={`mailto:${openRow.email}`}>{openRow.email}</Button>
                            {openRow.phone && <Button variant="secondary" size="sm" icon={Phone} href={`tel:${openRow.phone}`}>{openRow.phone}</Button>}
                        </div>
                        <div style={{ padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--surface-2)', border: '1px solid var(--border)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {openRow.message}
                        </div>
                        <div>
                            <div className="ui-section-title">Promijeni status</div>
                            <Segmented
                                options={STATUS_OPTIONS.filter((o) => o.value !== 'all')}
                                value={openRow.status}
                                onChange={(value) => updateStatus(openRow.id, value)}
                                ariaLabel="Status poruke"
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
