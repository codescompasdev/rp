'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, ClipboardList, Printer, Scale } from 'lucide-react';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import Alert from '@/components/UI/Alert';
import { Badge, StatusBadge } from '@/components/UI/Badge';
import api from '@/lib/api';
import { fmtDateTime, fmtKg, fmtMoney, fmtNum } from '@/lib/format';

const TYPE_LABEL = { IN: 'Ulaz (prijem)', OUT: 'Izlaz (isporuka)', POS: 'Direktan otkup', POS_OUT: 'Prodaja na malo' };

export default function WeighTicketDetailPage() {
    const params = useParams();
    const id = params?.id;
    const [ticket, setTicket] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        api.get(`/gate/tickets/${id}`)
            .then((res) => setTicket(res?.data?.data || null))
            .catch((err) => setError(err?.response?.status === 404 ? 'Vaganje nije pronađeno (ili pripada drugoj lokaciji).' : 'Učitavanje vaganja nije uspjelo.'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="ui-page">
                <PageHeader title="Vaganje" subtitle="Učitavanje..." />
                <div className="ui-skeleton" style={{ height: 240 }} />
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="ui-page">
                <PageHeader title="Vaganje" actions={<Button variant="secondary" icon={ArrowLeft} href="/gate">Vaganje</Button>} />
                <Alert tone="danger">{error || 'Vaganje nije pronađeno.'}</Alert>
            </div>
        );
    }

    const packaging = Array.isArray(ticket.packagingDetails) ? ticket.packagingDetails : [];
    const packagingKg = packaging.reduce((sum, row) => sum + Number(row?.kg || 0), 0);
    const info = [
        ['Datum', fmtDateTime(ticket.date)],
        ['Zadnja izmjena', fmtDateTime(ticket.updatedAt)],
        ['Tablice', <span key="p" className="font-code" style={{ fontSize: 15 }}>{ticket.plate || '—'}</span>],
        [ticket.type === 'POS_OUT' ? 'Kupac' : ticket.type === 'POS' ? 'Prodavac' : 'Vozač', ticket.driver || '—'],
        ['Komitent', ticket.supplier?.name || '—'],
        ['Materijal', ticket.material ? `${ticket.material.code} · ${ticket.material.name}` : '—'],
        ['Narudžba', ticket.contract?.code || '—'],
        [ticket.type === 'POS_OUT' ? 'Dokument kupca' : 'Dokument prodavca', ticket.sellerDocument || '—'],
    ];

    return (
        <div className="ui-page">
            <div className="print-only" style={{ fontSize: 16, fontWeight: 700 }}>MILKUS d.o.o. — Vagarski list {ticket.code}</div>
            <PageHeader
                title={`Vaganje ${ticket.code}`}
                subtitle={TYPE_LABEL[ticket.type] || ticket.type}
                actions={(
                    <>
                        <Button variant="secondary" icon={ArrowLeft} href="/gate">Vaganje</Button>
                        <Button icon={Printer} onClick={() => window.print()}>Štampaj</Button>
                    </>
                )}
            >
                <div className="row" style={{ gap: 6, marginTop: 8 }}>
                    <StatusBadge status={ticket.status} />
                    <Badge tone={ticket.type === 'OUT' || ticket.type === 'POS_OUT' ? 'orange' : ticket.type === 'POS' ? 'success' : 'info'}>{TYPE_LABEL[ticket.type] || ticket.type}</Badge>
                </div>
            </PageHeader>

            <div className="grid-main-side" style={{ gridTemplateColumns: 'minmax(0, 1fr) 340px' }}>
                <div className="stack">
                    <Card title="Mjerenje" icon={Scale}>
                        <div className="tk-weights">
                            <div><span>Bruto</span><b>{fmtNum(ticket.gross)} <small>kg</small></b></div>
                            <div><span>Tara</span><b>{fmtNum(ticket.tare)} <small>kg</small></b></div>
                            <div><span>Ambalaža</span><b>{fmtNum(packagingKg)} <small>kg</small></b></div>
                            <div className="tk-net"><span>Neto</span><b>{fmtNum(ticket.net)} <small>kg</small></b></div>
                        </div>
                        {packaging.length > 0 && (
                            <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>
                                Ambalaža: {packaging.map((row) => `${row.type || 'Ambalaža'} ${fmtKg(row.kg)}`).join(' · ')}
                            </div>
                        )}
                    </Card>
                    <Card title="Podaci o transakciji">
                        <div className="ui-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            {info.map(([label, value]) => (
                                <div key={label}>
                                    <div className="ui-label" style={{ color: 'var(--text-3)', fontWeight: 500 }}>{label}</div>
                                    <div style={{ fontWeight: 600, marginTop: 2 }}>{value}</div>
                                </div>
                            ))}
                        </div>
                    </Card>
                    {(ticket.lots || []).length > 0 && (
                        <Card title="Lotovi na skladištu" flush>
                            <div className="ui-table-wrap">
                                <table>
                                    <thead><tr><th>Lot</th><th>Lokacija</th><th className="num">Količina</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {ticket.lots.map((lot) => (
                                            <tr key={lot.id}>
                                                <td className="font-code">{lot.code}</td>
                                                <td>{lot.location || '—'}</td>
                                                <td className="num">{fmtKg(lot.kg)}</td>
                                                <td><StatusBadge status={lot.status} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </div>
                <div className="stack">
                    <Card title="Obračun">
                        <div className="stack" style={{ gap: 10, fontSize: 13 }}>
                            <div className="row-between"><span className="muted">Cijena / kg</span><b>{fmtNum(ticket.pricePerKg, 4)} KM</b></div>
                            <div className="row-between"><span className="muted">Neto</span><b>{fmtKg(ticket.net)}</b></div>
                            <div className="row-between" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                                <span className="muted">Ukupno</span><b style={{ fontSize: 20 }}>{fmtMoney(ticket.total)}</b>
                            </div>
                        </div>
                    </Card>
                    {ticket.contract && (
                        <Card title={`Narudžba ${ticket.contract.code}`} icon={ClipboardList} actions={<Button variant="ghost" size="sm" href="/sourcing/contracts">Narudžbe</Button>}>
                            <div className="stack" style={{ gap: 6, fontSize: 12.5 }}>
                                {(ticket.contract.items || []).map((item) => (
                                    <div key={item.id} className="row-between">
                                        <span>{item.material?.code || '-'}</span>
                                        <span className="font-mono">{fmtNum(item.doneKg)}{item.qtyKg !== null ? ` / ${fmtNum(item.qtyKg)}` : ''} kg</span>
                                    </div>
                                ))}
                                <StatusBadge status={ticket.contract.status} />
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            <style>{`
                .tk-weights { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
                .tk-weights > div { display: grid; gap: 4px; padding: 14px; border-radius: var(--radius-lg); background: var(--surface-2); border: 1px solid var(--border); }
                .tk-weights span { font-size: 12px; color: var(--text-3); font-weight: 600; }
                .tk-weights b { font-size: 24px; font-variant-numeric: tabular-nums; }
                .tk-weights small { font-size: 12px; color: var(--text-3); font-weight: 500; }
                .tk-weights .tk-net { background: var(--success-50); border-color: #bfe9da; }
                .tk-weights .tk-net span { color: var(--success-ink); }
                @media (max-width: 720px) { .tk-weights { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
            `}</style>
        </div>
    );
}
