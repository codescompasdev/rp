'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    Boxes,
    ClipboardList,
    FileSpreadsheet,
    HandCoins,
    Printer,
    RefreshCw,
    Store,
    Truck,
    Wallet,
} from 'lucide-react';
import api from '@/lib/api';
import { getActiveCompanyId } from '@/lib/authStorage';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import StatCard from '@/components/UI/StatCard';
import Button from '@/components/UI/Button';
import Alert from '@/components/UI/Alert';
import Segmented from '@/components/UI/Segmented';
import EmptyState from '@/components/UI/EmptyState';
import ProgressBar from '@/components/UI/ProgressBar';
import { Badge, StatusBadge } from '@/components/UI/Badge';
import ColumnChart from '@/components/Charts/ColumnChart';
import AreaChart from '@/components/Charts/AreaChart';
import BarList from '@/components/Charts/BarList';
import Legend from '@/components/Charts/Legend';
import {
    addDaysYmd,
    fmtCompact,
    fmtDate,
    fmtDateTime,
    fmtDayShort,
    fmtKg,
    fmtMoney,
    fmtNum,
    fmtTons,
    fmtWeight,
    localYmd,
    pctChange,
} from '@/lib/format';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'];

const PRESETS = [
    { value: 'today', label: 'Danas' },
    { value: '7d', label: '7 dana' },
    { value: '30d', label: '30 dana' },
    { value: 'month', label: 'Ovaj mjesec' },
    { value: '90d', label: '90 dana' },
    { value: '1y', label: 'Godina' },
];

const FLOW_SERIES = [
    { key: 'inKg', label: 'Ulaz (vaga)', color: 'var(--series-1)' },
    { key: 'outKg', label: 'Izlaz (vaga)', color: 'var(--series-2)' },
    { key: 'posKg', label: 'Direktan otkup', color: 'var(--series-3)' },
    { key: 'retailKg', label: 'Prodaja na malo', color: 'var(--series-4)' },
];

function presetRange(preset) {
    const today = localYmd();
    if (preset === 'today') return { from: today, to: today };
    if (preset === '7d') return { from: addDaysYmd(today, -6), to: today };
    if (preset === '90d') return { from: addDaysYmd(today, -89), to: today };
    if (preset === '1y') return { from: addDaysYmd(today, -364), to: today };
    if (preset === 'month') return { from: `${today.slice(0, 8)}01`, to: today };
    return { from: addDaysYmd(today, -29), to: today };
}

function bucketLabel(key, granularity) {
    if (granularity === 'month') {
        const [y, m] = key.split('-');
        return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
    }
    return fmtDayShort(key);
}

function bucketTooltip(key, granularity) {
    if (granularity === 'month') {
        const [y, m] = key.split('-');
        return `${MONTHS[Number(m) - 1]} ${y}`;
    }
    if (granularity === 'week') return `Sedmica od ${fmtDate(key)}`;
    return fmtDate(key);
}

export default function DashboardPage() {
    const [preset, setPreset] = useState('30d');
    const [range, setRange] = useState(() => presetRange('30d'));
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [locationName, setLocationName] = useState('');
    const [showFlowTable, setShowFlowTable] = useState(false);

    const load = useCallback(async (nextRange) => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/reports/overview', { params: nextRange });
            setData(res?.data?.data || null);
        } catch (err) {
            const status = err?.response?.status;
            setError(status === 403
                ? 'Pregled poslovanja mogu vidjeti samo vlasnik, admin i manager.'
                : (err?.response?.data?.error || 'Učitavanje pregleda nije uspjelo. Provjeri vezu sa serverom.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load(range);
    }, [load, range]);

    useEffect(() => {
        api.get('/locations')
            .then((res) => {
                const rows = res?.data?.data || [];
                const active = rows.find((row) => row.id === getActiveCompanyId());
                setLocationName(active ? `${active.code} · ${active.name}` : '');
            })
            .catch(() => setLocationName(''));
    }, []);

    const applyPreset = (value) => {
        setPreset(value);
        setRange(presetRange(value));
    };

    const applyCustom = (field, value) => {
        if (!value) return;
        setPreset('custom');
        setRange((prev) => ({ ...prev, [field]: value }));
    };

    const granularity = data?.range?.granularity || 'day';

    const flowData = useMemo(() => (data?.series || []).map((row) => ({
        key: row.key,
        label: bucketLabel(row.key, granularity),
        tooltipLabel: bucketTooltip(row.key, granularity),
        values: { inKg: row.inKg, outKg: row.outKg, posKg: row.posKg, retailKg: row.retailKg },
    })), [data, granularity]);

    const posValueData = useMemo(() => (data?.series || []).map((row) => ({
        key: row.key,
        label: bucketLabel(row.key, granularity),
        tooltipLabel: bucketTooltip(row.key, granularity),
        value: row.posValue,
    })), [data, granularity]);

    const summary = data?.summary || {};
    const previous = data?.previous || {};
    const stock = data?.stock || {};
    const openTickets = data?.openTickets || [];
    const waitingClose = openTickets.filter((t) => String(t.status).toLowerCase() === 'čeka zatvaranje').length;
    const rangeText = data?.range ? `${fmtDate(data.range.from)} – ${fmtDate(data.range.to)}` : '';
    const prevText = data?.range ? `vs ${fmtDate(data.range.previousFrom)} – ${fmtDate(data.range.previousTo)}` : '';

    const exportExcel = () => {
        if (!data) return;
        const wb = XLSX.utils.book_new();
        const kpis = [
            { Pokazatelj: 'Period', Vrijednost: rangeText },
            { Pokazatelj: 'Lokacija', Vrijednost: locationName || 'Sve' },
            { Pokazatelj: 'Ulaz vaga (kg)', Vrijednost: summary.inKg, Prethodni: previous.inKg },
            { Pokazatelj: 'Ulaz vaga (broj)', Vrijednost: summary.inCount, Prethodni: previous.inCount },
            { Pokazatelj: 'Izlaz vaga (kg)', Vrijednost: summary.outKg, Prethodni: previous.outKg },
            { Pokazatelj: 'Izlaz vaga (broj)', Vrijednost: summary.outCount, Prethodni: previous.outCount },
            { Pokazatelj: 'Direktan otkup (kg)', Vrijednost: summary.posKg, Prethodni: previous.posKg },
            { Pokazatelj: 'Direktan otkup (KM)', Vrijednost: summary.posValue, Prethodni: previous.posValue },
            { Pokazatelj: 'Direktan otkup (broj)', Vrijednost: summary.posCount, Prethodni: previous.posCount },
            { Pokazatelj: 'Prodaja na malo (kg)', Vrijednost: summary.retailKg, Prethodni: previous.retailKg },
            { Pokazatelj: 'Prodaja na malo (KM)', Vrijednost: summary.retailValue, Prethodni: previous.retailValue },
            { Pokazatelj: 'Prodaja na malo (broj)', Vrijednost: summary.retailCount, Prethodni: previous.retailCount },
            { Pokazatelj: 'Stanje skladišta (kg)', Vrijednost: stock.kg },
            { Pokazatelj: 'Vrijednost skladišta (KM)', Vrijednost: stock.value },
            { Pokazatelj: 'Otvorena vaganja', Vrijednost: openTickets.length },
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpis), 'Pregled');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((data.series || []).map((r) => ({
            Period: bucketTooltip(r.key, granularity),
            'Ulaz vaga (kg)': r.inKg,
            'Izlaz vaga (kg)': r.outKg,
            'Direktan otkup (kg)': r.posKg,
            'Direktan otkup (KM)': r.posValue,
            'Prodaja na malo (kg)': r.retailKg,
            'Prodaja na malo (KM)': r.retailValue,
        }))), 'Tok robe');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((data.topMaterialsIn || []).map((r) => ({ Materijal: r.label, KG: r.kg, Broj: r.count }))), 'Materijali ulaz');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((data.topMaterialsOut || []).map((r) => ({ Materijal: r.label, KG: r.kg, Broj: r.count }))), 'Materijali izlaz');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((data.topStock || []).map((r) => ({ Materijal: r.label, KG: r.kg, 'Vrijednost KM': r.value }))), 'Skladište');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(openTickets.map((t) => ({
            Kod: t.code, Tip: t.type, Status: t.status, Tablice: t.plate, Komitent: t.partner, Materijal: t.material, Otvoreno: fmtDateTime(t.date), 'Starost (h)': t.ageHours,
        }))), 'Otvorena vaganja');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((data.orders || []).map((o) => ({
            Narudžba: o.code, Vrsta: o.direction === 'SELL' ? 'Prodaja' : 'Nabavka', Partner: o.partner, 'Plan (kg)': o.plannedKg, 'Ispunjeno (kg)': o.doneKg, 'Preostalo (kg)': o.remainingKg,
        }))), 'Narudžbe');
        XLSX.writeFile(wb, `pregled_poslovanja_${data.range.from}_${data.range.to}.xlsx`);
    };

    const isEmptyPeriod = data && !summary.inCount && !summary.outCount && !summary.posCount && !summary.retailCount;

    return (
        <div className="ui-page">
            <div className="print-only" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>MILKUS d.o.o. — Pregled poslovanja</div>
                <div style={{ color: '#475569' }}>
                    Period: {rangeText} {locationName ? `· Lokacija: ${locationName}` : ''} · Generisano: {fmtDateTime(data?.generatedAt)}
                </div>
            </div>

            <PageHeader
                title="Pregled poslovanja"
                subtitle={[locationName, rangeText].filter(Boolean).join(' · ') || 'Učitavanje...'}
                actions={(
                    <>
                        <Button variant="secondary" icon={RefreshCw} onClick={() => load(range)} disabled={loading}>Osvježi</Button>
                        <Button variant="secondary" icon={FileSpreadsheet} onClick={exportExcel} disabled={!data}>Excel</Button>
                        <Button variant="primary" icon={Printer} onClick={() => window.print()} disabled={!data}>Štampaj</Button>
                    </>
                )}
            />

            <div className="ui-toolbar no-print">
                <Segmented options={PRESETS} value={preset} onChange={applyPreset} ariaLabel="Period" />
                <div className="row" style={{ gap: 6 }}>
                    <input type="date" className="ui-input" style={{ width: 150 }} value={range.from} max={range.to} onChange={(e) => applyCustom('from', e.target.value)} aria-label="Od datuma" />
                    <span className="muted">–</span>
                    <input type="date" className="ui-input" style={{ width: 150 }} value={range.to} min={range.from} onChange={(e) => applyCustom('to', e.target.value)} aria-label="Do datuma" />
                </div>
            </div>

            {error && <Alert tone="danger">{error}</Alert>}

            <div style={{ opacity: loading && data ? 0.55 : 1, transition: 'opacity .2s', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="ui-kpi-grid kpi-4">
                    <StatCard
                        label="Ulaz preko vage"
                        icon={ArrowDownToLine}
                        value={fmtWeight(summary.inKg)}
                        delta={data ? pctChange(summary.inKg, previous.inKg) : null}
                        deltaLabel={prevText}
                        hint={data ? `${fmtNum(summary.inCount)} vaganja` : ''}
                        loading={loading && !data}
                    />
                    <StatCard
                        label="Izlaz preko vage"
                        icon={ArrowUpFromLine}
                        tone="orange"
                        value={fmtWeight(summary.outKg)}
                        delta={data ? pctChange(summary.outKg, previous.outKg) : null}
                        deltaLabel={prevText}
                        hint={data ? `${fmtNum(summary.outCount)} vaganja` : ''}
                        loading={loading && !data}
                    />
                    <StatCard
                        label="Direktan otkup"
                        icon={HandCoins}
                        tone="aqua"
                        value={fmtWeight(summary.posKg)}
                        delta={data ? pctChange(summary.posKg, previous.posKg) : null}
                        deltaLabel={prevText}
                        hint={data ? `${fmtNum(summary.posCount)} kupovina` : ''}
                        loading={loading && !data}
                    />
                    <StatCard
                        label="Isplaćeno za otkup"
                        icon={Wallet}
                        tone="success"
                        value={fmtMoney(summary.posValue, 0)}
                        delta={data ? pctChange(summary.posValue, previous.posValue) : null}
                        deltaLabel={prevText}
                        upIsGood={false}
                        loading={loading && !data}
                    />
                    <StatCard
                        label="Prodaja na malo"
                        icon={Store}
                        tone="warning"
                        value={fmtWeight(summary.retailKg)}
                        delta={data ? pctChange(summary.retailKg, previous.retailKg) : null}
                        deltaLabel={prevText}
                        hint={data ? `${fmtNum(summary.retailCount)} prodaja` : ''}
                        loading={loading && !data}
                    />
                    <StatCard
                        label="Naplaćeno (mala prodaja)"
                        icon={Wallet}
                        tone="success"
                        value={fmtMoney(summary.retailValue, 0)}
                        delta={data ? pctChange(summary.retailValue, previous.retailValue) : null}
                        deltaLabel={prevText}
                        loading={loading && !data}
                    />
                    <StatCard
                        label="Stanje skladišta"
                        icon={Boxes}
                        value={fmtWeight(stock.kg)}
                        hint={data ? `vrijednost ${fmtMoney(stock.value, 0)} · ${fmtNum(stock.materials)} materijala` : ''}
                        loading={loading && !data}
                    />
                    <StatCard
                        label="Vozila u krugu"
                        icon={Truck}
                        tone={openTickets.length ? 'warning' : 'info'}
                        value={fmtNum(openTickets.length)}
                        hint={data ? `${fmtNum(waitingClose)} čeka zatvaranje` : ''}
                        loading={loading && !data}
                    />
                </div>

                {data?.alerts?.length > 0 && (
                    <div className="grid-2">
                        {data.alerts.map((alert) => (
                            <Alert key={alert.key} tone={alert.level}>
                                <div className="row-between" style={{ alignItems: 'flex-start' }}>
                                    <div>
                                        <b>{alert.title}</b>
                                        <div>{alert.text}</div>
                                    </div>
                                    <Link href={alert.href} className="ui-btn ghost sm no-print" style={{ color: 'inherit' }}>Otvori</Link>
                                </div>
                            </Alert>
                        ))}
                    </div>
                )}

                {isEmptyPeriod && (
                    <Alert tone="info">U odabranom periodu nema zatvorenih vaganja ni direktnog otkupa. Odaberi duži period.</Alert>
                )}

                <div className="grid-main-side">
                    <Card
                        title="Tok robe"
                        subtitle={`Zatvorena vaganja, direktan otkup i prodaja na malo po ${granularity === 'day' ? 'danima' : granularity === 'week' ? 'sedmicama' : 'mjesecima'} (kg)`}
                        actions={(
                            <button type="button" className="ui-btn ghost sm no-print" onClick={() => setShowFlowTable((v) => !v)}>
                                {showFlowTable ? 'Grafikon' : 'Tabela'}
                            </button>
                        )}
                    >
                        <div className="stack" style={{ gap: 12 }}>
                            <Legend series={FLOW_SERIES} />
                            {!showFlowTable && (
                                <ColumnChart
                                    data={flowData}
                                    series={FLOW_SERIES}
                                    height={260}
                                    formatValue={(v) => fmtKg(v)}
                                    formatAxis={(v) => fmtCompact(v)}
                                    ariaLabel="Tok robe kroz vrijeme"
                                />
                            )}
                            <div className={showFlowTable ? '' : 'print-only'} style={{ maxHeight: showFlowTable ? 320 : undefined, overflow: 'auto' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Period</th>
                                            <th className="num">Ulaz (kg)</th>
                                            <th className="num">Izlaz (kg)</th>
                                            <th className="num">Otkup (kg)</th>
                                            <th className="num">Otkup (KM)</th>
                                            <th className="num">Mala prodaja (kg)</th>
                                            <th className="num">Mala prodaja (KM)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data?.series || []).filter((r) => r.inKg || r.outKg || r.posKg || r.retailKg).map((r) => (
                                            <tr key={r.key}>
                                                <td>{bucketTooltip(r.key, granularity)}</td>
                                                <td className="num">{fmtNum(r.inKg)}</td>
                                                <td className="num">{fmtNum(r.outKg)}</td>
                                                <td className="num">{fmtNum(r.posKg)}</td>
                                                <td className="num">{fmtNum(r.posValue, 2)}</td>
                                                <td className="num">{fmtNum(r.retailKg)}</td>
                                                <td className="num">{fmtNum(r.retailValue, 2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Card>

                    {data?.byLocation?.length > 0 ? (
                        <Card title="Po lokacijama" subtitle="Isti period, sve lokacije">
                            <div className="stack" style={{ gap: 14 }}>
                                {data.byLocation.map((loc) => (
                                    <div key={loc.id} style={{ display: 'grid', gap: 6 }}>
                                        <div className="row-between">
                                            <b style={{ fontSize: 13 }}>{loc.code} · {loc.name}</b>
                                            <span className="muted" style={{ fontSize: 12 }}>{fmtNum(loc.inCount + loc.outCount + loc.posCount + (loc.retailCount || 0))} transakcija</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8, fontSize: 12 }}>
                                            <div><div className="muted">Ulaz</div><b>{fmtWeight(loc.inKg)}</b></div>
                                            <div><div className="muted">Izlaz</div><b>{fmtWeight(loc.outKg)}</b></div>
                                            <div><div className="muted">Otkup</div><b>{fmtWeight(loc.posKg)}</b></div>
                                            <div><div className="muted">Mala prod.</div><b>{fmtWeight(loc.retailKg)}</b></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ) : (
                        <Card title="Top dobavljači" subtitle="Ulaz preko vage i otkup (kg)">
                            <BarList
                                items={(data?.topSuppliers || []).map((r) => ({ key: r.key, label: r.label, value: r.kg }))}
                                formatValue={(v) => fmtWeight(v)}
                                emptyText="Nema ulaza od dobavljača u periodu."
                            />
                        </Card>
                    )}
                </div>

                <div className="grid-2">
                    <Card title="Isplaćeno za direktan otkup" subtitle="KM po periodu">
                        <AreaChart
                            data={posValueData}
                            color="var(--series-3)"
                            height={220}
                            seriesLabel="Isplaćeno"
                            formatValue={(v) => fmtMoney(v)}
                            formatAxis={(v) => fmtCompact(v)}
                            ariaLabel="Isplaćeno za direktan otkup"
                        />
                    </Card>
                    <Card title="Najviše primljeno" subtitle="Materijali — ulaz preko vage i otkup (kg)">
                        <BarList
                            items={(data?.topMaterialsIn || []).map((r) => ({ key: r.key, label: r.label, value: r.kg, sub: `${fmtNum(r.count)}×` }))}
                            formatValue={(v) => fmtWeight(v)}
                            emptyText="Nema ulaza u periodu."
                        />
                    </Card>
                </div>

                <div className="grid-2">
                    <Card
                        title="Aktivne narudžbe"
                        subtitle="Ispunjenost plana"
                        icon={ClipboardList}
                        actions={<Link href="/sourcing/contracts" className="ui-btn ghost sm no-print">Sve narudžbe</Link>}
                    >
                        {(data?.orders || []).length === 0 ? (
                            <EmptyState title="Nema aktivnih narudžbi" />
                        ) : (
                            <div className="stack" style={{ gap: 16 }}>
                                {data.orders.slice(0, 6).map((order) => (
                                    <ProgressBar
                                        key={order.id}
                                        label={(
                                            <span className="row" style={{ gap: 8 }}>
                                                {order.code}
                                                <Badge tone={order.direction === 'SELL' ? 'orange' : 'info'}>{order.direction === 'SELL' ? 'Prodaja' : 'Nabavka'}</Badge>
                                                <span className="muted" style={{ fontWeight: 400 }}>{order.partner}</span>
                                            </span>
                                        )}
                                        valueText={order.plannedKg > 0 ? `${Math.round((order.doneKg / order.plannedKg) * 100)}%` : ''}
                                        value={order.doneKg}
                                        max={order.plannedKg}
                                        tolerancePct={order.tolerance}
                                        footLeft={`${fmtTons(order.doneKg)} / ${fmtTons(order.plannedKg)}`}
                                        footRight={`preostalo ${fmtTons(order.remainingKg)}`}
                                    />
                                ))}
                            </div>
                        )}
                    </Card>
                    <Card title="Stanje skladišta" subtitle="Materijali sa najviše stanja (kg)" icon={Boxes}>
                        <BarList
                            items={(data?.topStock || []).map((r) => ({ key: r.key, label: r.label, value: r.kg, sub: fmtMoney(r.value, 0) }))}
                            formatValue={(v) => fmtWeight(v)}
                            emptyText="Skladište je prazno."
                        />
                    </Card>
                </div>

                <div className="grid-main-side">
                    <Card
                        title="Vozila u krugu"
                        subtitle="Otvorena vaganja (bez obzira na period)"
                        icon={Truck}
                        flush
                        actions={<Link href="/gate" className="ui-btn ghost sm no-print">Vaganje</Link>}
                    >
                        {openTickets.length === 0 ? (
                            <EmptyState title="Nema otvorenih vaganja" />
                        ) : (
                            <div className="ui-table-wrap" style={{ maxHeight: 360 }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Vaganje</th>
                                            <th>Tip</th>
                                            <th>Komitent</th>
                                            <th>Materijal</th>
                                            <th>Status</th>
                                            <th className="num">Otvoreno</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {openTickets.map((t) => (
                                            <tr key={t.id}>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{t.plate || '-'}</div>
                                                    <Link href={`/gate/${t.id}`} className="font-code" style={{ fontSize: 11, color: 'var(--primary-ink)' }}>{t.code}</Link>
                                                </td>
                                                <td><Badge tone={t.type === 'OUT' ? 'orange' : 'info'}>{t.type === 'OUT' ? 'Izlaz' : 'Ulaz'}</Badge></td>
                                                <td>{t.partner}</td>
                                                <td>{t.material}</td>
                                                <td><StatusBadge status={t.status} /></td>
                                                <td className="num">
                                                    <div>{fmtDateTime(t.date)}</div>
                                                    <div style={{ fontSize: 11, color: t.ageHours >= 12 ? 'var(--warning-ink)' : 'var(--text-3)' }}>
                                                        {t.ageHours >= 48 ? `${fmtNum(t.ageHours / 24, 0)} dana` : `${fmtNum(t.ageHours, 0)} h`}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    <div className="stack">
                        <Card
                            title="Najave prijema"
                            subtitle={data ? `${fmtNum(data.announcements?.pending)} na čekanju · ${fmtNum(data.announcements?.overdue)} u kašnjenju` : ''}
                            actions={<Link href="/gate/announcements" className="ui-btn ghost sm no-print">Sve</Link>}
                        >
                            {(data?.announcements?.upcoming || []).length === 0 ? (
                                <div className="muted" style={{ fontSize: 12.5 }}>Nema nadolazećih najava.</div>
                            ) : (
                                <div className="stack" style={{ gap: 10 }}>
                                    {data.announcements.upcoming.map((a) => (
                                        <div key={a.id} className="row-between" style={{ alignItems: 'flex-start' }}>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: 12.5 }}>{a.supplier}</div>
                                                <div className="muted" style={{ fontSize: 11.5 }}>{a.code} · {a.material}</div>
                                            </div>
                                            <div style={{ textAlign: 'right', fontSize: 12 }}>
                                                <div style={{ fontWeight: 600 }}>{fmtKg(a.expectedKg)}</div>
                                                <div className="muted">{fmtDate(a.expectedDate)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                        <Card title="Najviše izdano" subtitle="Materijali — izlaz preko vage i prodaja na malo (kg)">
                            <BarList
                                items={(data?.topMaterialsOut || []).map((r) => ({ key: r.key, label: r.label, value: r.kg }))}
                                color="var(--series-2)"
                                formatValue={(v) => fmtWeight(v)}
                                emptyText="Nema izlaza u periodu."
                            />
                        </Card>
                    </div>
                </div>

                <Card title="Zadnje transakcije" subtitle="Zatvorena vaganja, otkup i prodaja na malo u periodu" flush>
                    {(data?.recentTickets || []).length === 0 ? (
                        <EmptyState title="Nema transakcija u periodu" />
                    ) : (
                        <div className="ui-table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Vrijeme</th>
                                        <th>Kod</th>
                                        <th>Tip</th>
                                        <th>Komitent</th>
                                        <th>Materijal</th>
                                        <th className="num">Neto</th>
                                        <th className="num">Iznos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.recentTickets.map((t) => (
                                        <tr key={t.id}>
                                            <td>{fmtDateTime(t.date)}</td>
                                            <td className="font-code" style={{ fontSize: 12 }}><Link href={`/gate/${t.id}`} style={{ color: 'var(--primary-ink)' }}>{t.code}</Link></td>
                                            <td>
                                                <Badge tone={t.type === 'OUT' || t.type === 'POS_OUT' ? 'orange' : t.type === 'POS' ? 'success' : 'info'}>
                                                    {t.type === 'OUT' ? 'Izlaz' : t.type === 'POS' ? 'Otkup' : t.type === 'POS_OUT' ? 'Mala prodaja' : 'Ulaz'}
                                                </Badge>
                                            </td>
                                            <td>{t.partner}</td>
                                            <td>{t.material}</td>
                                            <td className="num">{fmtKg(t.net)}</td>
                                            <td className="num">{t.type === 'POS' || t.type === 'POS_OUT' ? fmtMoney(t.total) : <span className="muted">—</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                <div className="muted" style={{ fontSize: 11.5 }}>
                    Iznosi u KM postoje samo za direktan otkup — vaganja ulaz/izlaz nemaju unesenu cijenu. Vrijednost skladišta = stanje × prosječna nabavna cijena.
                </div>
            </div>
        </div>
    );
}
