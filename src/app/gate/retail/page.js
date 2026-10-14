'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, Package, Plus, Printer, Receipt, RotateCcw, Store, Trash2, UserRound, Wallet } from 'lucide-react';
import api from '@/lib/api';
import MaterialPicker from '@/components/UI/MaterialPicker';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import StatCard from '@/components/UI/StatCard';
import Button from '@/components/UI/Button';
import Field from '@/components/UI/Field';
import Alert from '@/components/UI/Alert';
import EmptyState from '@/components/UI/EmptyState';
import { Badge } from '@/components/UI/Badge';
import { fmtDateTime, fmtKg, fmtMoney, fmtNum, localYmd } from '@/lib/format';
import { printGoodsSlip } from '@/lib/slipPrint';
import { loadSellableStockByMaterial } from '@/lib/stock';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

const parseLocaleNumber = (value) => {
    const n = Number(String(value ?? '').trim().replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
};

const SLIP = {
    title: 'IZLAZ ROBE',
    partyLabel: 'Kupac',
    footLeft: 'Izdao:',
    footRightLabel: 'Primio (kupac):',
};

export default function RetailSalePage() {
    const [materials, setMaterials] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [stock, setStock] = useState(new Map());
    const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [weightKg, setWeightKg] = useState('');
    const [pricePerKg, setPricePerKg] = useState('');
    const [buyerName, setBuyerName] = useState('');
    const [buyerDoc, setBuyerDoc] = useState('');
    const [rows, setRows] = useState([]);
    const [history, setHistory] = useState([]);
    const [dateFrom, setDateFrom] = useState(() => localYmd());
    const [dateTo, setDateTo] = useState(() => localYmd());
    const [formError, setFormError] = useState('');
    const [listError, setListError] = useState('');
    const [info, setInfo] = useState('');
    const [finalizing, setFinalizing] = useState(false);

    const refreshStock = () => loadSellableStockByMaterial().then(setStock).catch(() => setStock(new Map()));

    const refreshHistory = useCallback(async () => {
        const res = await api.get('/gate/tickets', {
            params: {
                type: 'POS_OUT',
                ...(dateFrom ? { dateFrom } : {}),
                ...(dateTo ? { dateTo } : {}),
            },
        });
        setHistory(normalizeApiList(res));
    }, [dateFrom, dateTo]);

    useEffect(() => {
        api.get('/materials').then((res) => setMaterials(normalizeApiList(res))).catch(() => setMaterials([]));
        api.get('/sourcing/customers').then((res) => setCustomers(normalizeApiList(res))).catch(() => setCustomers([]));
        refreshStock();
    }, []);

    useEffect(() => {
        refreshHistory().catch(() => setHistory([]));
    }, [refreshHistory]);

    const backendSelected = selectedMaterial ? resolveBackendMaterial(materials, selectedMaterial) : null;
    const reservedKg = (materialId) => rows.filter((r) => r.materialId === materialId).reduce((sum, r) => sum + r.weightKg, 0);
    const availableFor = (materialId) => {
        const entry = stock.get(materialId);
        return entry ? entry.sellable : 0;
    };
    const selectedAvailable = backendSelected?.id ? availableFor(backendSelected.id) - reservedKg(backendSelected.id) : null;

    const handleAddRow = () => {
        if (!selectedMaterial) {
            setFormError('Odaberi materijal prije dodavanja stavke.');
            return;
        }
        if (!backendSelected?.id) {
            setFormError('Materijal nije mapiran na katalog. Uskladi šifru u Materijalima.');
            return;
        }
        const qty = parseLocaleNumber(weightKg);
        const price = parseLocaleNumber(pricePerKg);
        if (qty <= 0) {
            setFormError('Količina mora biti veća od 0.');
            return;
        }
        if (price <= 0) {
            setFormError('Unesi prodajnu cijenu po kg.');
            return;
        }
        if (qty > selectedAvailable + 0.009) {
            setFormError(`Nedovoljno stanja: raspoloživo za prodaju ${fmtKg(Math.max(0, selectedAvailable), 2)}.`);
            return;
        }
        setRows((prev) => [...prev, {
            id: `${Date.now()}-${prev.length}`,
            materialId: backendSelected.id,
            materialCode: backendSelected.code,
            materialName: backendSelected.name,
            label: formatPickedMaterial(selectedMaterial),
            weightKg: qty,
            pricePerKg: String(pricePerKg).trim(),
            total: qty * price,
        }]);
        setWeightKg('');
        setFormError('');
    };

    const updateRow = (rowId, patch) => {
        setRows((prev) => prev.map((row) => {
            if (row.id !== rowId) return row;
            const next = { ...row, ...patch };
            const price = parseLocaleNumber(next.pricePerKg);
            return { ...next, total: next.weightKg * price };
        }));
    };

    const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
    const totalKg = rows.reduce((sum, row) => sum + row.weightKg, 0);

    const buyerSuggestions = useMemo(() => {
        const seen = new Set();
        return [...customers.map((c) => c.name), ...history.map((t) => t.driver)]
            .map((name) => String(name || '').trim())
            .filter((name) => {
                const key = name.toLowerCase();
                if (!name || seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .slice(0, 60);
    }, [customers, history]);

    const groups = useMemo(() => {
        const map = new Map();
        history.forEach((t) => {
            const key = t.slipGroupId || `single:${t.id}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(t);
        });
        return Array.from(map.values()).map((tickets) => {
            const sorted = [...tickets].sort((a, b) => (Number(a.slipSeq) || 0) - (Number(b.slipSeq) || 0));
            const statuses = sorted.map((x) => String(x.status || '').toLowerCase());
            const allStorniran = statuses.every((st) => st === 'storniran');
            const anyStorniran = statuses.some((st) => st === 'storniran');
            return {
                key: sorted[0].slipGroupId || sorted[0].id,
                slipGroupId: sorted[0].slipGroupId,
                first: sorted[0],
                tickets: sorted,
                kgTotal: sorted.reduce((s, x) => s + Number(x.net || 0), 0),
                amountTotal: sorted.reduce((s, x) => s + Number(x.total || 0), 0),
                allStorniran,
                anyStorniran,
                canVoid: statuses.every((st) => st === 'completed'),
                materialsLabel: sorted.map((x) => x.material?.code || '-').join(', '),
            };
        }).sort((a, b) => new Date(b.first.date).getTime() - new Date(a.first.date).getTime());
    }, [history]);

    const periodTotals = groups
        .filter((g) => !g.allStorniran)
        .reduce((acc, g) => ({ count: acc.count + 1, kg: acc.kg + g.kgTotal, amount: acc.amount + g.amountTotal }), { count: 0, kg: 0, amount: 0 });

    const ticketsToItems = (tickets) => tickets.map((t) => ({
        materialName: t.material?.name || '',
        materialCode: t.material?.code || '',
        weightKg: Number(t.net || 0),
        pricePerKg: Number(t.pricePerKg || 0),
        total: Number(t.total || 0),
    }));

    const handleFinalize = async () => {
        if (finalizing) return;
        if (!rows.length) {
            setFormError('Dodaj barem jednu stavku prije završetka prodaje.');
            return;
        }
        if (!buyerName.trim()) {
            setFormError('Ime kupca je obavezno.');
            return;
        }
        // prozor za štampu otvaramo odmah (inače ga preglednik blokira nakon čekanja na server)
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (printWindow?.document) printWindow.document.write('<div style="font-family:Arial;padding:16px">Priprema izlaza robe...</div>');
        setFinalizing(true);
        try {
            const createdAt = new Date().toISOString();
            const res = await api.post('/gate/retail-sale/batch', {
                buyer: buyerName.trim(),
                buyerDocument: buyerDoc || undefined,
                date: createdAt,
                lines: rows.map((row) => ({ materialId: row.materialId, qtyKg: row.weightKg, pricePerKg: parseLocaleNumber(row.pricePerKg) })),
            });
            const data = res?.data?.data || {};
            printGoodsSlip({
                ...SLIP,
                party: buyerName.trim(),
                doc: buyerDoc,
                items: rows.map((row) => ({ materialName: row.materialName, materialCode: row.materialCode, weightKg: row.weightKg, pricePerKg: parseLocaleNumber(row.pricePerKg), total: row.total })),
                createdAt,
                slipNo: data.displaySlipNo,
                targetWindow: printWindow,
            });
            setInfo(`Prodaja ${data.displaySlipNo || ''} je knjižena (${fmtKg(totalKg, 2)}, ${fmtMoney(grandTotal)}) i roba je skinuta sa stanja.`);
            setRows([]);
            setBuyerName('');
            setBuyerDoc('');
            setFormError('');
            await Promise.all([refreshHistory(), refreshStock()]);
        } catch (err) {
            if (printWindow && !printWindow.closed) printWindow.close();
            setFormError(err?.response?.data?.error || 'Prodaja nije uspjela. Provjeri vezu sa serverom i pokušaj ponovo.');
        } finally {
            setFinalizing(false);
        }
    };

    const handleReprint = (group) => {
        printGoodsSlip({
            ...SLIP,
            party: group.first.driver || '',
            doc: group.first.sellerDocument || '',
            items: ticketsToItems(group.tickets),
            createdAt: group.first.date,
            slipNo: group.first.code,
        });
    };

    const handleVoid = async (group) => {
        if (!window.confirm('Stornirati prodaju? Roba se vraća na stanje.')) return;
        setListError('');
        try {
            if (group.slipGroupId) {
                await api.post('/gate/retail-sale/void-group', { slipGroupId: group.slipGroupId });
            } else {
                await api.post(`/gate/tickets/${group.first.id}/void`, {});
            }
            setInfo(`Prodaja ${group.first.code} je stornirana i roba je vraćena na stanje.`);
            await Promise.all([refreshHistory(), refreshStock()]);
        } catch (err) {
            setListError(err?.response?.data?.error || 'Storno nije uspio.');
        }
    };

    const qtyPreview = parseLocaleNumber(weightKg);
    const shortForPreview = selectedAvailable !== null && qtyPreview > selectedAvailable + 0.009;

    return (
        <div className="ui-page">
            <PageHeader
                title="Prodaja na malo"
                subtitle="Prodaja manjih količina bez vage — kilaža se upisuje ručno, roba se skida sa stanja i štampa se izlaz robe"
            />

            {info && <Alert tone="success" onClose={() => setInfo('')}>{info}</Alert>}

            <div className="rs-grid">
                <div className="stack" style={{ minWidth: 0 }}>
                    <Card title="Kupac" subtitle="Kome se prodaje" icon={UserRound}>
                        <div className="ui-form-grid">
                            <Field label="Ime i prezime / naziv" required>
                                <input
                                    type="text"
                                    className="ui-input lg"
                                    list="retail-buyer-suggestions"
                                    value={buyerName}
                                    onChange={(e) => setBuyerName(e.target.value)}
                                    placeholder="Kupac"
                                />
                                <datalist id="retail-buyer-suggestions">
                                    {buyerSuggestions.map((name) => <option key={name} value={name} />)}
                                </datalist>
                            </Field>
                            <Field label="JMBG / broj dokumenta" hint="Opciono">
                                <input type="text" className="ui-input lg font-code" value={buyerDoc} onChange={(e) => setBuyerDoc(e.target.value)} placeholder="—" />
                            </Field>
                        </div>
                    </Card>

                    <Card title="Stavke prodaje" subtitle="Odaberi materijal, upiši kilažu i cijenu, pa dodaj stavku" icon={Package}>
                        <div className="stack" style={{ gap: 14 }}>
                            <button
                                type="button"
                                className="ui-input lg rs-material-btn"
                                data-selected={Boolean(selectedMaterial)}
                                onClick={() => setMaterialPickerOpen(true)}
                            >
                                <Package size={18} />
                                <span>{selectedMaterial ? formatPickedMaterial(selectedMaterial) : 'Odaberi materijal iz kataloga'}</span>
                                <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-3)' }} />
                            </button>
                            {backendSelected?.id && (
                                <div className="rs-stock" data-short={shortForPreview || selectedAvailable <= 0}>
                                    {(shortForPreview || selectedAvailable <= 0) && <AlertTriangle size={14} />}
                                    Raspoloživo za prodaju: <b>{fmtKg(Math.max(0, selectedAvailable), 2)}</b>
                                    {stock.get(backendSelected.id) && Math.abs(stock.get(backendSelected.id).total - stock.get(backendSelected.id).sellable) > 0.01 && (
                                        <span className="muted"> · ukupno na stanju {fmtKg(stock.get(backendSelected.id).total, 2)} (ostalo je u drugim zonama/varijantama)</span>
                                    )}
                                </div>
                            )}

                            <div className="rs-qty-grid">
                                <Field label="Količina">
                                    <div className="rs-unit">
                                        <input type="text" inputMode="decimal" className="ui-input font-mono" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="0" />
                                        <span>kg</span>
                                    </div>
                                </Field>
                                <Field label="Prodajna cijena po kg" hint="Povlači se market cijena iz kataloga.">
                                    <div className="rs-unit">
                                        <input type="text" inputMode="decimal" className="ui-input font-mono" value={pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} placeholder="0,00" />
                                        <span>KM</span>
                                    </div>
                                </Field>
                                <div className="rs-preview">
                                    <span className="muted">Iznos stavke</span>
                                    <b>{fmtMoney(qtyPreview * parseLocaleNumber(pricePerKg))}</b>
                                </div>
                            </div>

                            <div className="row" style={{ justifyContent: 'flex-end' }}>
                                <Button size="lg" icon={Plus} onClick={handleAddRow}>Dodaj stavku</Button>
                            </div>
                            <Alert tone="danger" onClose={() => setFormError('')}>{formError}</Alert>

                            {rows.length > 0 ? (
                                <div className="ui-card" style={{ overflow: 'hidden' }}>
                                    <div className="ui-table-wrap">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Materijal</th>
                                                    <th className="num">Količina</th>
                                                    <th className="num">Cijena / kg</th>
                                                    <th className="num">Ukupno</th>
                                                    <th style={{ width: 48 }} />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.map((row) => (
                                                    <tr key={row.id}>
                                                        <td style={{ fontWeight: 600 }}>{row.label}</td>
                                                        <td className="num">{fmtNum(row.weightKg, 2)} kg</td>
                                                        <td className="num">
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                className="ui-input font-mono"
                                                                value={row.pricePerKg}
                                                                onChange={(e) => updateRow(row.id, { pricePerKg: e.target.value })}
                                                                style={{ width: 100, height: 32, textAlign: 'right' }}
                                                                aria-label={`Cijena za ${row.label}`}
                                                            />
                                                        </td>
                                                        <td className="num" style={{ fontWeight: 700 }}>{fmtMoney(row.total)}</td>
                                                        <td>
                                                            <Button variant="ghost" size="sm" icon={Trash2} aria-label={`Ukloni ${row.label}`} onClick={() => setRows((prev) => prev.filter((item) => item.id !== row.id))} />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="rs-empty">Još nema stavki. Dodaj prvu stavku iznad.</div>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="stack rs-side">
                    <section className="ui-card rs-total">
                        <div className="ui-card-header">
                            <div className="ui-card-title">Obračun</div>
                            <Badge tone="outline">{rows.length} {rows.length === 1 ? 'stavka' : 'stavki'}</Badge>
                        </div>
                        <div className="ui-card-body stack" style={{ gap: 14 }}>
                            <div className="row-between"><span className="muted">Kupac</span><b>{buyerName.trim() || '—'}</b></div>
                            <div className="row-between"><span className="muted">Ukupna količina</span><b className="font-mono">{fmtNum(totalKg, 2)} kg</b></div>
                            <div className="rs-grand">
                                <span>Ukupno za naplatu</span>
                                <strong>{fmtMoney(grandTotal)}</strong>
                            </div>
                            <Button variant="primary" size="xl" block icon={Printer} onClick={handleFinalize} disabled={finalizing}>
                                {finalizing ? 'Obrada u toku...' : 'Završi prodaju i štampaj'}
                            </Button>
                            <div className="ui-hint" style={{ textAlign: 'center' }}>Roba se odmah skida sa stanja i štampa se izlaz robe.</div>
                        </div>
                    </section>
                </div>
            </div>

            <div className="ui-kpi-grid">
                <StatCard label="Prodaja u periodu" icon={Receipt} value={fmtNum(periodTotals.count)} hint="bez storniranih" />
                <StatCard label="Prodano" icon={Store} tone="orange" value={fmtKg(periodTotals.kg)} />
                <StatCard label="Naplaćeno" icon={Wallet} tone="success" value={fmtMoney(periodTotals.amount)} />
            </div>

            <Card
                title="Lista prodaja na malo"
                flush
                actions={(
                    <div className="row no-print" style={{ gap: 6, flexWrap: 'wrap' }}>
                        <input type="date" className="ui-input" style={{ width: 150, height: 32 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Od datuma" />
                        <span className="muted">–</span>
                        <input type="date" className="ui-input" style={{ width: 150, height: 32 }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Do datuma" />
                        <Button variant="secondary" size="sm" onClick={() => { const t = localYmd(); setDateFrom(t); setDateTo(t); }}>Danas</Button>
                    </div>
                )}
            >
                {listError && <div style={{ padding: '12px 18px 0' }}><Alert tone="danger" onClose={() => setListError('')}>{listError}</Alert></div>}
                {groups.length === 0 ? (
                    <EmptyState icon={Store} title="Nema prodaja u izabranom periodu" />
                ) : (
                    <div className="ui-table-wrap" style={{ maxHeight: 420 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Vrijeme</th>
                                    <th>Broj</th>
                                    <th>Kupac</th>
                                    <th>Stavke</th>
                                    <th className="num">Ukupno kg</th>
                                    <th className="num">Iznos</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Akcije</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map((group) => (
                                    <tr key={group.key} style={{ opacity: group.allStorniran ? 0.6 : 1 }}>
                                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(group.first.date)}</td>
                                        <td className="font-code" style={{ fontSize: 12 }}>{group.first.code}</td>
                                        <td style={{ fontWeight: 600 }}>{group.first.driver || '-'}</td>
                                        <td><span className="font-code" style={{ whiteSpace: 'normal' }}>{group.materialsLabel}</span></td>
                                        <td className="num">{fmtNum(group.kgTotal, 2)}</td>
                                        <td className="num" style={{ fontWeight: 600 }}>{fmtMoney(group.amountTotal)}</td>
                                        <td>
                                            {group.allStorniran
                                                ? <Badge tone="danger" dot>Stornirano</Badge>
                                                : group.anyStorniran
                                                    ? <Badge tone="warning" dot>Djelomično stornirano</Badge>
                                                    : <Badge tone="success" dot>Prodano</Badge>}
                                        </td>
                                        <td>
                                            <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                                                <Button variant="ghost" size="sm" icon={Printer} onClick={() => handleReprint(group)}>Štampaj</Button>
                                                {group.canVoid && (
                                                    <Button variant="danger-soft" size="sm" icon={RotateCcw} onClick={() => handleVoid(group)}>Storno</Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <MaterialPicker
                open={materialPickerOpen}
                onClose={() => setMaterialPickerOpen(false)}
                onSelect={({ material }) => {
                    setSelectedMaterial(material);
                    setFormError('');
                    const backend = resolveBackendMaterial(materials, material);
                    const salePrice = Number(backend?.basePrice || 0);
                    setPricePerKg(salePrice > 0 ? String(salePrice) : '');
                }}
                onMaterialCreated={() => api.get('/materials').then((res) => setMaterials(normalizeApiList(res))).catch(() => null)}
            />

            <style>{`
                .rs-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 360px); gap: 16px; align-items: start; }
                .rs-side { position: sticky; top: 0; }
                .rs-material-btn { display: flex; align-items: center; gap: 10px; text-align: left; cursor: pointer; font-weight: 600; color: var(--text-2); }
                .rs-material-btn svg:first-child { color: var(--primary); }
                .rs-material-btn[data-selected='true'] { background: var(--primary-50); border-color: var(--primary-200); color: var(--text); }
                .rs-stock { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12.5px; color: var(--success-ink); padding: 8px 12px; border-radius: var(--radius); background: var(--success-50); }
                .rs-stock[data-short='true'] { color: var(--warning-ink); background: var(--warning-50); }
                .rs-qty-grid { display: grid; grid-template-columns: 1fr 1fr minmax(150px, .8fr); gap: 14px; align-items: start; }
                .rs-unit { display: flex; align-items: stretch; }
                .rs-unit .ui-input { height: 54px; font-size: 24px; font-weight: 600; text-align: right; border-top-right-radius: 0; border-bottom-right-radius: 0; }
                .rs-unit span {
                    display: grid; place-items: center; min-width: 54px; padding: 0 10px;
                    border: 1px solid var(--border-strong); border-left: none; border-radius: 0 var(--radius) var(--radius) 0;
                    background: var(--surface-3); color: var(--text-2); font-weight: 700;
                }
                .rs-preview {
                    display: grid; gap: 4px; align-content: center; text-align: right; padding: 10px 14px; margin-top: 21px; height: 54px;
                    border-radius: var(--radius); background: var(--surface-2); border: 1px dashed var(--border-strong);
                }
                .rs-preview span { font-size: 11.5px; }
                .rs-preview b { font-size: 16px; font-variant-numeric: tabular-nums; }
                .rs-empty { padding: 18px; text-align: center; color: var(--text-3); font-size: 12.5px; border: 1px dashed var(--border-strong); border-radius: var(--radius); }
                .rs-total { border-top: 3px solid var(--primary); }
                .rs-grand { display: grid; gap: 4px; padding: 16px; border-radius: var(--radius-lg); background: var(--primary-50); text-align: right; }
                .rs-grand span { font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--primary-ink); }
                .rs-grand strong { font-size: 34px; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
                @media (max-width: 1100px) { .rs-grid { grid-template-columns: minmax(0, 1fr); } .rs-side { position: static; } }
                @media (max-width: 720px) { .rs-qty-grid { grid-template-columns: minmax(0, 1fr); } .rs-preview { margin-top: 0; } .rs-grand strong { font-size: 28px; } }
            `}</style>
        </div>
    );
}
