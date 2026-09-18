'use client';

import { useMemo, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api from '@/lib/api';
import { getAuthUser } from '@/lib/authStorage';
import styles from '../fleet/vehicles/page.module.css';

function toIsoDate(value) {
    return new Date(value).toISOString().slice(0, 10);
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
    const authUser = getAuthUser();
    const backendRole = String(authUser?.role || '').toLowerCase();
    const allowed = ['admin', 'manager', 'owner'].includes(backendRole);
    const today = new Date().toISOString().slice(0, 10);

    const [filters, setFilters] = useState({
        from: today,
        to: today,
        type: 'ALL',
        search: '',
    });
    const [dashboardStats, setDashboardStats] = useState(null);
    const [flow, setFlow] = useState({ summary: null, history: [], byMaterial: [], topStock: [], mostActiveProducts: [] });
    const [loading, setLoading] = useState(true);

    const labels = {
        supplierCount: 'Ukupno dobavljaca',
        customerCount: 'Ukupno kupaca',
        trucksOnSite: 'Kamiona u krugu',
        lmeFeeds: 'LME feed zapisa',
        fxFeeds: 'FX feed zapisa',
    };

    const loadData = (nextFilters = filters) => {
        if (!allowed) {
            setLoading(false);
            return;
        }
        setLoading(true);
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
                    byMaterial: Array.isArray(flowData.byMaterial) ? flowData.byMaterial : [],
                    topStock: Array.isArray(flowData.topStock) ? flowData.topStock : [],
                    mostActiveProducts: Array.isArray(flowData.mostActiveProducts) ? flowData.mostActiveProducts : [],
                });
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, []);

    const pie = useMemo(() => {
        const totalIn = Number(flow.summary?.totalInKg || 0);
        const totalOut = Number(flow.summary?.totalOutKg || 0);
        const total = Math.max(1, totalIn + totalOut);
        const inPercent = totalIn / total;
        const radius = 52;
        const circumference = 2 * Math.PI * radius;
        return {
            inStroke: circumference * inPercent,
            outStroke: circumference - (circumference * inPercent),
            circumference,
            totalIn,
            totalOut,
        };
    }, [flow.summary]);

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
        const range = resolveRangePreset(preset);
        const merged = { ...filters, ...range };
        setFilters(merged);
        loadData(merged);
    };

    if (!allowed) {
        return (
            <div className={styles.container}>
                <div style={{ padding: '1rem', border: '1px solid #f59e0b', background: '#fffbeb', color: '#92400e' }}>
                    Ovu stranicu mogu vidjeti samo vlasnik, admin i manager.
                </div>
            </div>
        );
    }

    if (loading) return <div style={{ padding: '2rem' }}>Učitavanje...</div>;

    return (
        <div className={styles.container}>
            <div className={`${styles.header} responsive-row`}>
                <h1 className={styles.title}>Izvještaji i Analitika</h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" style={{ padding: '7px 12px' }} onClick={printReport}>Print (JANUAR2026 stil)</button>
                    <button style={{ padding: '7px 12px', border: '1px solid #0f766e', background: '#f0fdfa', color: '#0f766e', cursor: 'pointer' }} onClick={exportExcel}>
                        Excel tabela
                    </button>
                </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                <div>
                    <label style={{ fontSize: '0.75rem', color: '#666', fontWeight: 700 }}>Od datuma</label>
                    <input type="date" value={filters.from} onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))} style={{ width: '100%', marginTop: 4, padding: 6 }} />
                </div>
                <div>
                    <label style={{ fontSize: '0.75rem', color: '#666', fontWeight: 700 }}>Do datuma</label>
                    <input type="date" value={filters.to} onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))} style={{ width: '100%', marginTop: 4, padding: 6 }} />
                </div>
                <div>
                    <label style={{ fontSize: '0.75rem', color: '#666', fontWeight: 700 }}>Tip</label>
                    <select value={filters.type} onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))} style={{ width: '100%', marginTop: 4, padding: 6 }}>
                        <option value="ALL">Sve</option>
                        <option value="IN">Ulaz</option>
                        <option value="OUT">Izlaz</option>
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: '0.75rem', color: '#666', fontWeight: 700 }}>Pretraga</label>
                    <input type="text" placeholder="Ime, materijal..." value={filters.search} onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))} style={{ width: '100%', marginTop: 4, padding: 6 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
                    <button className="btn-primary" style={{ padding: '7px 12px' }} onClick={loadData}>Primijeni</button>
                    <button style={{ padding: '7px 12px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }} onClick={() => { const t = new Date().toISOString().slice(0, 10); setFilters({ from: t, to: t, type: 'ALL', search: '' }); }}>Danas</button>
                </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
                {[
                    { key: 'today', label: 'Danas' },
                    { key: '7d', label: '7 dana' },
                    { key: '14d', label: '14 dana' },
                    { key: '30d', label: '30 dana' },
                    { key: '6m', label: '6 mjeseci' },
                    { key: '1y', label: 'Godina' },
                ].map((preset) => (
                    <button
                        key={preset.key}
                        type="button"
                        onClick={() => applyPreset(preset.key)}
                        style={{ padding: '6px 10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '12px' }}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {dashboardStats && Object.entries(dashboardStats).map(([key, value]) => (
                    <div key={key} style={{ background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
                        <h3 style={{ textTransform: 'uppercase', color: '#666', fontSize: '0.8rem', letterSpacing: '0.5px' }}>{labels[key] || key}</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0 0 0', color: '#333' }}>{value}</p>
                    </div>
                ))}
                {!dashboardStats && <p>Nema dostupnih izvještaja.</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem' }}>
                    <h3 style={{ marginTop: 0 }}>Ulaz / Izlaz (KG)</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <svg width="150" height="150" viewBox="0 0 140 140" aria-label="Ulaz izlaz pie">
                            <circle cx="70" cy="70" r="52" fill="none" stroke="#e2e8f0" strokeWidth="20" />
                            <circle cx="70" cy="70" r="52" fill="none" stroke="#16a34a" strokeWidth="20" strokeDasharray={`${pie.inStroke} ${pie.circumference}`} transform="rotate(-90 70 70)" />
                            <circle cx="70" cy="70" r="52" fill="none" stroke="#dc2626" strokeWidth="20" strokeDasharray={`${pie.outStroke} ${pie.circumference}`} strokeDashoffset={-pie.inStroke} transform="rotate(-90 70 70)" />
                        </svg>
                        <div>
                            <div style={{ color: '#16a34a', fontWeight: 700 }}>Ulaz: {pie.totalIn.toLocaleString()} KG</div>
                            <div style={{ color: '#dc2626', fontWeight: 700 }}>Izlaz: {pie.totalOut.toLocaleString()} KG</div>
                            <div style={{ color: '#64748b', marginTop: 8 }}>Transakcija: {Number(flow.summary?.transactionCount || 0)}</div>
                        </div>
                    </div>
                </div>
                <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem' }}>
                    <h3 style={{ marginTop: 0 }}>Proizvodi sa najviše stanja</h3>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {flow.topStock.map((row) => {
                            const max = Math.max(1, ...flow.topStock.map((r) => Number(r.kg || 0)));
                            const width = (Number(row.kg || 0) / max) * 100;
                            return (
                                <div key={row.material}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                        <span>{row.material}</span>
                                        <span>{Number(row.kg || 0).toLocaleString()} KG</span>
                                    </div>
                                    <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99 }}>
                                        <div style={{ width: `${width}%`, height: 8, borderRadius: 99, background: '#2563eb' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', marginTop: '1rem' }}>
                <h3 style={{ marginTop: 0 }}>Najaktuelniji proizvodi (kretanje u periodu)</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '8px' }}>Materijal</th>
                                <th style={{ textAlign: 'right', borderBottom: '1px solid #e2e8f0', padding: '8px' }}>Ukupno kretanje (KG)</th>
                                <th style={{ textAlign: 'right', borderBottom: '1px solid #e2e8f0', padding: '8px' }}>Ulaz (KG)</th>
                                <th style={{ textAlign: 'right', borderBottom: '1px solid #e2e8f0', padding: '8px' }}>Izlaz (KG)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {flow.mostActiveProducts.map((row) => (
                                <tr key={row.material}>
                                    <td style={{ borderBottom: '1px solid #f1f5f9', padding: '8px' }}>{row.material}</td>
                                    <td style={{ borderBottom: '1px solid #f1f5f9', padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>{Number(row.movementKg || 0).toLocaleString()}</td>
                                    <td style={{ borderBottom: '1px solid #f1f5f9', padding: '8px', textAlign: 'right', color: '#16a34a' }}>{Number(row.inKg || 0).toLocaleString()}</td>
                                    <td style={{ borderBottom: '1px solid #f1f5f9', padding: '8px', textAlign: 'right', color: '#dc2626' }}>{Number(row.outKg || 0).toLocaleString()}</td>
                                </tr>
                            ))}
                            {!flow.mostActiveProducts.length && (
                                <tr><td colSpan={4} style={{ padding: '12px', color: '#64748b' }}>Nema podataka za period.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', marginTop: '1rem' }}>
                <h3 style={{ marginTop: 0 }}>Historija transakcija (ulaz/izlaz)</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '8px' }}>Vrijeme</th>
                                <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '8px' }}>Tip</th>
                                <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '8px' }}>Radnik</th>
                                <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '8px' }}>Materijal</th>
                                <th style={{ textAlign: 'right', borderBottom: '1px solid #e2e8f0', padding: '8px' }}>KG</th>
                            </tr>
                        </thead>
                        <tbody>
                            {flow.history.map((row) => (
                                <tr key={row.id}>
                                    <td style={{ borderBottom: '1px solid #f1f5f9', padding: '8px' }}>{new Date(row.createdAt).toLocaleString()}</td>
                                    <td style={{ borderBottom: '1px solid #f1f5f9', padding: '8px', color: row.type === 'IN' ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{row.type}</td>
                                    <td style={{ borderBottom: '1px solid #f1f5f9', padding: '8px' }}>{row.actorName}</td>
                                    <td style={{ borderBottom: '1px solid #f1f5f9', padding: '8px' }}>{row.materialCode} - {row.materialName}</td>
                                    <td style={{ borderBottom: '1px solid #f1f5f9', padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>{Number(row.quantityKg || 0).toLocaleString()}</td>
                                </tr>
                            ))}
                            {!flow.history.length && (
                                <tr>
                                    <td colSpan={5} style={{ padding: '12px', color: '#64748b' }}>Nema transakcija za odabrane filtere.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
