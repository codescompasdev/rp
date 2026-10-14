'use client';

import { useMemo, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Factory, FileSpreadsheet, Printer, Search, Users } from 'lucide-react';
import api from '@/lib/api';
import { getAuthUser } from '@/lib/authStorage';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import StatCard from '@/components/UI/StatCard';
import Button from '@/components/UI/Button';
import Field from '@/components/UI/Field';
import Alert from '@/components/UI/Alert';
import Segmented from '@/components/UI/Segmented';
import EmptyState from '@/components/UI/EmptyState';
import { Badge } from '@/components/UI/Badge';
import ColumnChart from '@/components/Charts/ColumnChart';
import BarList from '@/components/Charts/BarList';
import Legend from '@/components/Charts/Legend';
import { fmtCompact, fmtDate, fmtDateTime, fmtDayShort, fmtKg, fmtNum, fmtWeight, localYmd } from '@/lib/format';

const FLOW_SERIES = [
    { key: 'inKg', label: 'Ulaz', color: 'var(--series-1)' },
    { key: 'outKg', label: 'Izlaz', color: 'var(--series-2)' },
];

const PRESETS = [
    { value: 'today', label: 'Danas' },
    { value: '7d', label: '7 dana' },
    { value: '14d', label: '14 dana' },
    { value: '30d', label: '30 dana' },
    { value: '6m', label: '6 mjeseci' },
    { value: '1y', label: 'Godina' },
];

const TYPE_OPTIONS = [
    { value: 'ALL', label: 'Sve' },
    { value: 'IN', label: 'Ulaz' },
    { value: 'OUT', label: 'Izlaz' },
];

const HISTORY_PAGE = 100;

function toIsoDate(value) {
    return localYmd(new Date(value));
}

function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function addMonths(date, months) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
}

function resolveRangePreset(preset) {
    const today = new Date();
    const end = toIsoDate(today);
    if (preset === 'today') return { from: end, to: end };
    if (preset === '7d') return { from: toIsoDate(addDays(today, -6)), to: end };
    if (preset === '14d') return { from: toIsoDate(addDays(today, -13)), to: end };
    if (preset === '30d') return { from: toIsoDate(addDays(today, -29)), to: end };
    if (preset === '6m') return { from: toIsoDate(addMonths(today, -6)), to: end };
    if (preset === '1y') return { from: toIsoDate(addMonths(today, -12)), to: end };
    return { from: end, to: end };
}

function resolveMaterialLabel(row) {
    const code = String(row?.materialCode || '').trim();
    const name = String(row?.materialName || '').trim();
    if (code && name && name !== '-') return `${code} - ${name}`;
    if (code) return code;
    if (name && name !== '-') return name;
    return 'НЕПОЗНАТ МАТЕРИЈАЛ';
}

function resolveSectionName(companyName) {
    const value = String(companyName || '').toUpperCase();
    if (value.includes('БИЈЕЉИН') || value.includes('BIJELJ')) return 'П.Ј. БИЈЕЉИНА';
    if (value.includes('БАЊА ЛУКА') || value.includes('BANJA')) return 'П.Ј. БАЊА ЛУКА';
    return 'ЦЕНТРАЛНО СКЛАДИШТЕ МИЛКУС Д.О.О. ПАЛЕ';
}

function buildPrintSections(history) {
    const sectionOrder = [
        'П.Ј. БИЈЕЉИНА',
        'П.Ј. БАЊА ЛУКА',
        'ЦЕНТРАЛНО СКЛАДИШТЕ МИЛКУС Д.О.О. ПАЛЕ',
    ];
    const grouped = new Map();
    history.forEach((row) => {
        const sectionName = resolveSectionName(row.companyName);
        if (!grouped.has(sectionName)) grouped.set(sectionName, new Map());
        const byDate = grouped.get(sectionName);
        const dateKey = String(row.createdAt || '').slice(0, 10);
        if (!byDate.has(dateKey)) {
            byDate.set(dateKey, {
                date: dateKey,
                materials: {},
            });
        }
        const target = byDate.get(dateKey);
        const qty = Number(row.quantityKg || 0);
        const materialLabel = resolveMaterialLabel(row);
        const isIn = row.type === 'IN';
        if (!target.materials[materialLabel]) {
            target.materials[materialLabel] = { in: 0, out: 0 };
        }
        if (isIn) target.materials[materialLabel].in += qty;
        else target.materials[materialLabel].out += qty;
    });

    return sectionOrder.map((sectionName) => {
        const byDate = grouped.get(sectionName) || new Map();
        const rows = [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
        const materialMovement = new Map();
        rows.forEach((row) => {
            Object.entries(row.materials || {}).forEach(([label, values]) => {
                const current = materialMovement.get(label) || 0;
                materialMovement.set(label, current + Number(values.in || 0) + Number(values.out || 0));
            });
        });
        const materialColumns = [...materialMovement.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([label]) => label);
        const runningByMaterial = new Map(materialColumns.map((label) => [label, 0]));
        const computedRows = rows.map((row) => {
            const perMaterial = {};
            materialColumns.forEach((label) => {
                const values = row.materials?.[label] || { in: 0, out: 0 };
                const nextBalance = Number(runningByMaterial.get(label) || 0) + values.in - values.out;
                runningByMaterial.set(label, nextBalance);
                perMaterial[label] = {
                    in: values.in,
                    out: values.out,
                    total: nextBalance,
                };
            });
            return {
                date: row.date,
                perMaterial,
            };
        });
        const summaryByMaterial = {};
        materialColumns.forEach((label) => {
            summaryByMaterial[label] = { in: 0, out: 0, total: 0 };
        });
        computedRows.forEach((row) => {
            materialColumns.forEach((label) => {
                const item = row.perMaterial[label];
                summaryByMaterial[label].in += Number(item.in || 0);
                summaryByMaterial[label].out += Number(item.out || 0);
                summaryByMaterial[label].total = Number(item.total || 0);
            });
        });
        return { sectionName, materialColumns, rows: computedRows, summaryByMaterial };
    });
}

export default function ReportsPage() {
    // uloga se čita tek u pregledniku (localStorage) → bez hydration greške
    const [allowed, setAllowed] = useState(null);
    const isAllowedRole = () => ['admin', 'manager', 'owner'].includes(String(getAuthUser()?.role || '').toLowerCase());
    const today = localYmd();

    const [filters, setFilters] = useState({
        from: today,
        to: today,
        type: 'ALL',
        search: '',
    });
    const [dashboardStats, setDashboardStats] = useState(null);
    const [flow, setFlow] = useState({ summary: null, history: [], daily: [], byMaterial: [], topStock: [], mostActiveProducts: [] });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [activePreset, setActivePreset] = useState('today');
    const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE);

    const loadData = (nextFilters = filters) => {
        if (!isAllowedRole()) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setLoadError('');
        setHistoryLimit(HISTORY_PAGE);
        Promise.all([
            api.get('/reports/dashboard'),
            api.get('/reports/flow', { params: nextFilters }),
        ])
            .then(([dashRes, flowRes]) => {
                const payload = dashRes?.data?.data || {};
                setDashboardStats({
                    supplierCount: payload.supplierCount || 0,
                    customerCount: payload.customerCount || 0,
                    trucksOnSite: Array.isArray(payload.trucksOnSite) ? payload.trucksOnSite.length : 0,
                    lmeFeeds: Array.isArray(payload.lme) ? payload.lme.length : 0,
                    fxFeeds: Array.isArray(payload.fx) ? payload.fx.length : 0,
                });
                const flowData = flowRes?.data?.data || {};
                setFlow({
                    summary: flowData.summary || null,
                    history: Array.isArray(flowData.history) ? flowData.history : [],
                    daily: Array.isArray(flowData.daily) ? flowData.daily : [],
                    byMaterial: Array.isArray(flowData.byMaterial) ? flowData.byMaterial : [],
                    topStock: Array.isArray(flowData.topStock) ? flowData.topStock : [],
                    mostActiveProducts: Array.isArray(flowData.mostActiveProducts) ? flowData.mostActiveProducts : [],
                });
            })
            .catch((error) => {
                console.error(error);
                setLoadError(error?.response?.data?.error || 'Učitavanje izvještaja nije uspjelo.');
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        setAllowed(isAllowedRole());
        loadData();
    }, []);

    const chartData = useMemo(() => (flow.daily || []).map((row) => ({
        key: row.date,
        label: fmtDayShort(row.date),
        tooltipLabel: fmtDate(row.date),
        values: { inKg: row.inKg, outKg: row.outKg },
    })), [flow.daily]);

    const totalIn = Number(flow.summary?.totalInKg || 0);
    const totalOut = Number(flow.summary?.totalOutKg || 0);
    const maxActive = Math.max(1, ...flow.mostActiveProducts.map((r) => Number(r.inKg || 0) + Number(r.outKg || 0)));

    const exportExcel = () => {
        const wb = XLSX.utils.book_new();
        const summaryRows = [
            { KPI: 'Period od', Vrijednost: filters.from },
            { KPI: 'Period do', Vrijednost: filters.to },
            { KPI: 'Ukupno ulaz (KG)', Vrijednost: Number(flow.summary?.totalInKg || 0) },
            { KPI: 'Ukupno izlaz (KG)', Vrijednost: Number(flow.summary?.totalOutKg || 0) },
            { KPI: 'Broj transakcija', Vrijednost: Number(flow.summary?.transactionCount || 0) },
            { KPI: 'Ukupno dobavljaca', Vrijednost: Number(dashboardStats?.supplierCount || 0) },
            { KPI: 'Ukupno kupaca', Vrijednost: Number(dashboardStats?.customerCount || 0) },
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Pregled');

        const topStockRows = flow.topStock.map((row) => ({
            Materijal: row.material,
            StanjeKG: Number(row.kg || 0),
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topStockRows), 'TopStanje');

        const activeRows = flow.mostActiveProducts.map((row) => ({
            Materijal: row.material,
            UkupnoKretanjeKG: Number(row.movementKg || 0),
            UlazKG: Number(row.inKg || 0),
            IzlazKG: Number(row.outKg || 0),
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(activeRows), 'Najaktuelniji');

        const historyRows = flow.history.map((row) => ({
            Vrijeme: new Date(row.createdAt).toLocaleString('sr-RS'),
            Tip: row.type,
            Radnik: row.actorName,
            MaterijalSifra: row.materialCode,
            MaterijalNaziv: row.materialName,
            KolicinaKG: Number(row.quantityKg || 0),
            Napomena: row.note || '',
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historyRows), 'Tok');

        XLSX.writeFile(wb, `izvjestaj_${filters.from}_${filters.to}.xlsx`);
    };

    const printReport = () => {
        if (typeof window === 'undefined') return;
        const sections = buildPrintSections(flow.history);
        const fmt = (value) => Number(value || 0).toLocaleString('sr-RS');
        const sectionHtml = sections.map((section) => `
            <div class="section-title">${section.sectionName}</div>
            <table>
              <thead>
                <tr>
                    <th rowspan="2" class="date-col">ДАТУМ</th>
                    ${section.materialColumns.map((label) => `<th colspan="3" class="material-group">${label}</th>`).join('')}
                </tr>
                <tr>
                    ${section.materialColumns.map(() => `
                        <th>УЛАЗ</th>
                        <th>ИЗЛАЗ</th>
                        <th>УКУПНО</th>
                    `).join('')}
                </tr>
              </thead>
              <tbody>
                ${section.rows.map((row) => `
                  <tr>
                    <td>${row.date || ''}</td>
                    ${section.materialColumns.map((label) => `
                        <td>${fmt(row.perMaterial[label]?.in || 0)}</td>
                        <td>${fmt(row.perMaterial[label]?.out || 0)}</td>
                        <td>${fmt(row.perMaterial[label]?.total || 0)}</td>
                    `).join('')}
                  </tr>
                `).join('')}
                <tr class="summary-row">
                    <td>УКУПНО</td>
                    ${section.materialColumns.map((label) => `
                        <td>${fmt(section.summaryByMaterial[label]?.in || 0)}</td>
                        <td>${fmt(section.summaryByMaterial[label]?.out || 0)}</td>
                        <td>${fmt(section.summaryByMaterial[label]?.total || 0)}</td>
                    `).join('')}
                </tr>
              </tbody>
            </table>
        `).join('');

        const html = `
        <html>
        <head>
          <title>Izvjestaj ${filters.from} - ${filters.to}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 12px; }
            h1 { text-align: center; font-size: 14px; margin-bottom: 12px; }
            .section-title { background: #fde047; font-weight: 700; padding: 6px; border: 1px solid #111; margin-top: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: auto; }
            th, td { border: 1px solid #111; font-size: 10px; padding: 3px; text-align: right; }
            th:first-child, td:first-child { text-align: center; }
            thead th { background: #facc15; }
            .material-group { min-width: 180px; }
            .date-col { min-width: 85px; }
            .summary-row td { font-weight: 700; background: #fef3c7; }
            .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
            .footer-box h3 { margin: 0 0 6px 0; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>ПРЕГЛЕД УКУПНИХ КОЛИЧИНА РОБЕ НА СТОВАРИШТИМА (${filters.from} - ${filters.to})</h1>
          ${sectionHtml}
          <div class="footer-grid">
            <div class="footer-box">
              <h3>Proizvodi sa najvise stanja</h3>
              <table>
                <thead><tr><th style="text-align:left">Materijal</th><th>KG</th></tr></thead>
                <tbody>
                  ${flow.topStock.map((row) => `<tr><td style="text-align:left">${row.material}</td><td>${fmt(row.kg)}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>
            <div class="footer-box">
              <h3>Najaktuelniji proizvodi</h3>
              <table>
                <thead><tr><th style="text-align:left">Materijal</th><th>Kretanje KG</th></tr></thead>
                <tbody>
                  ${flow.mostActiveProducts.map((row) => `<tr><td style="text-align:left">${row.material}</td><td>${fmt(row.movementKg)}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <script>window.print();</script>
        </body>
        </html>`;

        const printWindow = window.open('', '_blank', 'width=1400,height=900');
        if (!printWindow) return;
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const applyPreset = (preset) => {
        setActivePreset(preset);
        const range = resolveRangePreset(preset);
        const merged = { ...filters, ...range };
        setFilters(merged);
        loadData(merged);
    };

    if (allowed === null) {
        return <div className="ui-page"><PageHeader title="Analitika ulaz/izlaz" subtitle="Učitavanje..." /></div>;
    }

    if (!allowed) {
        return (
            <div className="ui-page">
                <PageHeader title="Analitika ulaz/izlaz" />
                <Alert tone="warning">Ovu stranicu mogu vidjeti samo vlasnik, admin i manager.</Alert>
            </div>
        );
    }

    const historyRows = flow.history.slice(0, historyLimit);

    return (
        <div className="ui-page">
            <div className="print-only" style={{ fontSize: 16, fontWeight: 700 }}>Analitika ulaz/izlaz · {fmtDate(filters.from)} – {fmtDate(filters.to)}</div>
            <PageHeader
                title="Analitika ulaz/izlaz"
                subtitle={`Kretanje robe na skladištu · ${fmtDate(filters.from)} – ${fmtDate(filters.to)}`}
                actions={(
                    <>
                        <Button variant="secondary" icon={FileSpreadsheet} onClick={exportExcel} disabled={loading}>Excel tabela</Button>
                        <Button icon={Printer} onClick={printReport} disabled={loading}>Štampaj izvještaj</Button>
                    </>
                )}
            />

            <Card bodyClassName="no-print">
                <div className="stack" style={{ gap: 14 }}>
                    <Segmented options={PRESETS} value={activePreset} onChange={applyPreset} ariaLabel="Period" />
                    <div className="ui-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', alignItems: 'end' }}>
                        <Field label="Od datuma">
                            <input type="date" className="ui-input" value={filters.from} onChange={(e) => { setActivePreset('custom'); setFilters((prev) => ({ ...prev, from: e.target.value })); }} />
                        </Field>
                        <Field label="Do datuma">
                            <input type="date" className="ui-input" value={filters.to} onChange={(e) => { setActivePreset('custom'); setFilters((prev) => ({ ...prev, to: e.target.value })); }} />
                        </Field>
                        <Field label="Tip">
                            <Segmented options={TYPE_OPTIONS} value={filters.type} onChange={(value) => setFilters((prev) => ({ ...prev, type: value }))} ariaLabel="Tip transakcije" />
                        </Field>
                        <Field label="Pretraga">
                            <input
                                type="text"
                                className="ui-input"
                                placeholder="Radnik, materijal, napomena..."
                                value={filters.search}
                                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') loadData(); }}
                            />
                        </Field>
                        <Button icon={Search} onClick={() => loadData()} disabled={loading}>Primijeni</Button>
                    </div>
                </div>
            </Card>

            {loadError && <Alert tone="danger">{loadError}</Alert>}

            <div style={{ opacity: loading ? 0.55 : 1, transition: 'opacity .2s', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="ui-kpi-grid">
                    <StatCard label="Ukupno ulaz" icon={ArrowDownToLine} value={fmtWeight(totalIn)} hint={fmtKg(totalIn)} loading={loading && !flow.summary} />
                    <StatCard label="Ukupno izlaz" icon={ArrowUpFromLine} tone="orange" value={fmtWeight(totalOut)} hint={fmtKg(totalOut)} loading={loading && !flow.summary} />
                    <StatCard label="Neto promjena" icon={ArrowLeftRight} tone={totalIn - totalOut >= 0 ? 'success' : 'danger'} value={`${totalIn - totalOut >= 0 ? '+' : ''}${fmtWeight(totalIn - totalOut)}`} hint="ulaz − izlaz" loading={loading && !flow.summary} />
                    <StatCard label="Transakcija" icon={ArrowLeftRight} value={fmtNum(flow.summary?.transactionCount)} loading={loading && !flow.summary} />
                    <StatCard label="Dobavljači" icon={Factory} value={fmtNum(dashboardStats?.supplierCount)} hint="ukupno u sistemu" loading={loading && !dashboardStats} />
                    <StatCard label="Kupci" icon={Users} value={fmtNum(dashboardStats?.customerCount)} hint="ukupno u sistemu" loading={loading && !dashboardStats} />
                </div>

                <Card title="Ulaz i izlaz po danima" subtitle="Knjiženja na skladištu (kg)">
                    {chartData.length === 0 ? (
                        <EmptyState title="Nema kretanja u periodu" text="Odaberi drugi period ili tip." />
                    ) : (
                        <div className="stack" style={{ gap: 12 }}>
                            <Legend series={FLOW_SERIES} />
                            <ColumnChart
                                data={chartData}
                                series={FLOW_SERIES}
                                height={260}
                                formatValue={(v) => fmtKg(v)}
                                formatAxis={(v) => fmtCompact(v)}
                                ariaLabel="Ulaz i izlaz po danima"
                            />
                        </div>
                    )}
                </Card>

                <div className="grid-2">
                    <Card title="Najaktivniji materijali" subtitle="Ukupno kretanje u periodu" flush>
                        {flow.mostActiveProducts.length === 0 ? (
                            <EmptyState title="Nema podataka za period" />
                        ) : (
                            <div className="ui-table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Materijal</th>
                                            <th style={{ width: '34%' }}>Udio</th>
                                            <th className="num">Ulaz (kg)</th>
                                            <th className="num">Izlaz (kg)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {flow.mostActiveProducts.map((row, idx) => {
                                            const inPct = (Number(row.inKg || 0) / maxActive) * 100;
                                            const outPct = (Number(row.outKg || 0) / maxActive) * 100;
                                            return (
                                                <tr key={`${row.material}-${idx}`}>
                                                    <td style={{ fontWeight: 600 }}>{row.material}</td>
                                                    <td>
                                                        <div className="rp-split" title={`Ulaz ${fmtKg(row.inKg)} · Izlaz ${fmtKg(row.outKg)}`}>
                                                            <span style={{ width: `${inPct}%`, background: 'var(--series-1)' }} />
                                                            <span style={{ width: `${outPct}%`, background: 'var(--series-2)' }} />
                                                        </div>
                                                    </td>
                                                    <td className="num">{fmtNum(row.inKg)}</td>
                                                    <td className="num">{fmtNum(row.outKg)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                    <Card title="Najviše na stanju" subtitle="Trenutno stanje skladišta (kg)">
                        <BarList
                            items={flow.topStock.map((row, idx) => ({ key: `${row.material}-${idx}`, label: row.material, value: row.kg }))}
                            formatValue={(v) => fmtWeight(v)}
                            emptyText="Skladište je prazno."
                        />
                    </Card>
                </div>

                <Card
                    title="Historija transakcija"
                    subtitle={`${fmtNum(flow.history.length)} transakcija${flow.history.length > historyRows.length ? ` · prikazano ${fmtNum(historyRows.length)}` : ''}`}
                    flush
                >
                    {flow.history.length === 0 ? (
                        <EmptyState title="Nema transakcija za odabrane filtere" />
                    ) : (
                        <>
                            <div className="ui-table-wrap" style={{ maxHeight: 560 }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Vrijeme</th>
                                            <th>Tip</th>
                                            <th>Radnik</th>
                                            <th>Materijal</th>
                                            <th>Lokacija</th>
                                            <th className="num">Količina</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyRows.map((row) => (
                                            <tr key={row.id}>
                                                <td>{fmtDateTime(row.createdAt)}</td>
                                                <td>
                                                    <Badge tone={row.type === 'IN' ? 'info' : row.type === 'OUT' ? 'orange' : 'neutral'}>
                                                        {row.type === 'IN' ? 'Ulaz' : row.type === 'OUT' ? 'Izlaz' : 'Korekcija'}
                                                    </Badge>
                                                </td>
                                                <td>{row.actorName}</td>
                                                <td>{row.materialCode} · {row.materialName}</td>
                                                <td className="muted">{row.companyName || '-'}</td>
                                                <td className="num" style={{ fontWeight: 600 }}>{fmtKg(row.quantityKg)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {flow.history.length > historyRows.length && (
                                <div className="row" style={{ justifyContent: 'center', padding: 12, borderTop: '1px solid var(--border)' }}>
                                    <Button variant="secondary" onClick={() => setHistoryLimit((n) => n + HISTORY_PAGE)}>
                                        Prikaži još ({fmtNum(flow.history.length - historyRows.length)})
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </Card>
            </div>

            <style>{`
                .rp-split { display: flex; gap: 2px; height: 8px; border-radius: 999px; background: var(--surface-3); overflow: hidden; }
                .rp-split span { display: block; height: 100%; }
                .rp-split span:first-child { border-radius: 999px 0 0 999px; }
            `}</style>
        </div>
    );
}
