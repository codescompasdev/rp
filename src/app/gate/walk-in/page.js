'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Package, Plus, Printer, RotateCcw, Trash2, UserRound } from 'lucide-react';
import api from '@/lib/api';
import MaterialPicker from '@/components/UI/MaterialPicker';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import Field from '@/components/UI/Field';
import Alert from '@/components/UI/Alert';
import EmptyState from '@/components/UI/EmptyState';
import { Badge } from '@/components/UI/Badge';
import { fmtDateTime, fmtMoney, fmtNum } from '@/lib/format';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

function localYmd(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export default function WalkInPOS() {
    const [isCompact, setIsCompact] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [materials, setMaterials] = useState([]);
    const [weightKg, setWeightKg] = useState('');
    const [pricePerKg, setPricePerKg] = useState('');
    const [sellerName, setSellerName] = useState('');
    const [sellerDoc, setSellerDoc] = useState('');
    const [rows, setRows] = useState([]);
    const [purchaseHistory, setPurchaseHistory] = useState([]);
    const [dateFrom, setDateFrom] = useState(() => localYmd());
    const [dateTo, setDateTo] = useState(() => localYmd());
    const [formError, setFormError] = useState('');
    const [listError, setListError] = useState('');
    const [finalizing, setFinalizing] = useState(false);

    const parseLocaleNumber = (value) => {
        const normalized = String(value ?? '').trim().replace(',', '.');
        const n = Number(normalized);
        return Number.isFinite(n) ? n : 0;
    };

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const onResize = () => {
            const width = window.innerWidth;
            setIsCompact(width < 1180);
            setIsMobile(width < 860);
        };
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const refreshMaterials = async () => {
        const res = await api.get('/materials');
        setMaterials(normalizeApiList(res));
    };

    const refreshPurchaseHistory = useCallback(async () => {
        const res = await api.get('/gate/tickets', {
            params: {
                type: 'POS',
                ...(dateFrom ? { dateFrom } : {}),
                ...(dateTo ? { dateTo } : {}),
            },
        });
        const rows = normalizeApiList(res).sort(
            (a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()
        );
        setPurchaseHistory(rows);
    }, [dateFrom, dateTo]);

    useEffect(() => {
        refreshMaterials().catch(() => setMaterials([]));
    }, []);

    useEffect(() => {
        refreshPurchaseHistory().catch(() => setPurchaseHistory([]));
    }, [refreshPurchaseHistory]);

    const handleAddRow = () => {
        if (!selectedMaterial) {
            setFormError('Odaberi materijal prije dodavanja stavke.');
            return;
        }
        const backendMaterial = resolveBackendMaterial(materials, selectedMaterial);
        if (!backendMaterial?.id) {
            setFormError('Materijal nije mapiran na backend katalog. Uskladi šifru u Materials.');
            return;
        }
        const parsedWeight = parseLocaleNumber(weightKg || 0);
        const parsedPrice = parseLocaleNumber(pricePerKg || backendMaterial.buyPrice || 0);
        if (parsedWeight <= 0) {
            setFormError('Količina mora biti veća od 0.');
            return;
        }
        const row = {
            id: `${Date.now()}-${Math.random()}`,
            materialId: backendMaterial.id,
            materialCode: backendMaterial.code,
            materialName: backendMaterial.name,
            label: formatPickedMaterial(selectedMaterial),
            weightKg: parsedWeight,
            pricePerKg: parsedPrice,
            total: parsedWeight * parsedPrice,
        };
        setRows((prev) => [...prev, row]);
        setFormError('');
    };

    const updateRow = (rowId, patch) => {
        setRows((prev) => prev.map((row) => {
            if (row.id !== rowId) return row;
            const next = { ...row, ...patch };
            next.weightKg = parseLocaleNumber(next.weightKg || 0);
            next.pricePerKg = parseLocaleNumber(next.pricePerKg || 0);
            next.total = next.weightKg * next.pricePerKg;
            return next;
        }));
    };

    const printDirectPurchaseSlip = ({ seller, doc, items, createdAt, slipNo }) => {
        if (typeof window === 'undefined') return;
        const w = window.open('', '_blank', 'width=900,height=700');
        if (!w) return;
        const htmlEscape = (v) => String(v ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;');
        const normalizedItems = Array.isArray(items) ? items : [];
        const rowsHtml = normalizedItems.map((row, idx) => `
            <tr>
                <td>${idx + 1}.</td>
                <td>${htmlEscape(row.materialName || row.materialCode || '-')}</td>
                <td>Kg</td>
                <td>${Number(row.weightKg || 0).toLocaleString()}</td>
                <td>${Number(row.weightKg || 0).toLocaleString()}</td>
                <td>${Number(row.pricePerKg || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>${Number(row.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
        `).join('');
        const grandTotal = normalizedItems.reduce((sum, row) => sum + Number(row.total || 0), 0);
        const issuedAt = createdAt ? new Date(createdAt) : new Date();
        w.document.write(`
            <!doctype html>
            <html>
              <head>
                <meta charset="utf-8" />
                <title>ULAZ ROBE</title>
                <style>
                  @page { size: A4; margin: 10mm; }
                  body { font-family: Arial, sans-serif; margin: 0; color: #163b67; font-size: 13px; }
                  .sheet { border: 2px solid #3b82f6; padding: 10px; }
                  .head { display: flex; justify-content: space-between; align-items: center; }
                  .title { font-size: 42px; font-weight: 800; letter-spacing: 1px; text-align: center; flex: 1; }
                  .meta { font-size: 16px; font-weight: 700; text-align: right; min-width: 220px; }
                  .line { border-bottom: 1px solid #3b82f6; margin: 8px 0; }
                  .who { font-size: 18px; font-weight: 700; margin: 8px 0 12px; }
                  table { width: 100%; border-collapse: collapse; font-size: 15px; color: #1f2937; }
                  th, td { border: 1px solid #3b82f6; padding: 6px; }
                  th { color: #1e3a8a; font-weight: 700; }
                  .right { text-align: right; font-family: 'Courier New', monospace; }
                  .sum { margin-top: 10px; display: flex; justify-content: flex-end; font-size: 16px; font-weight: 800; color: #1e3a8a; }
                  .foot { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                  .box { border: 1px solid #3b82f6; min-height: 42px; padding: 8px; font-size: 16px; }
                </style>
              </head>
              <body>
                <div class="sheet">
                  <div class="head">
                    <div style="font-size:14px;font-weight:700;">MILKUS d.o.o. PALE</div>
                    <div class="title">ULAZ ROBE</div>
                    <div class="meta">
                      Datum: ${htmlEscape(issuedAt.toLocaleDateString())}<br/>
                      № ${htmlEscape(slipNo || `POS-${Date.now().toString().slice(-6)}`)}
                    </div>
                  </div>
                  <div class="line"></div>
                  <div class="who">Od koga je primljeno: ${htmlEscape(seller || '-')}</div>
                  <table>
                    <thead>
                      <tr>
                        <th style="width:46px">R.br</th>
                        <th>Naziv robe</th>
                        <th style="width:70px">Jed.</th>
                        <th style="width:110px">Bruto</th>
                        <th style="width:110px">Neto</th>
                        <th style="width:100px">Cijena</th>
                        <th style="width:130px">Iznos KM</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${rowsHtml}
                    </tbody>
                  </table>
                  <div class="sum">UKUPNO: ${Number(grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM</div>
                  <div class="foot">
                    <div class="box">Kontrolisao:</div>
                    <div class="box">Primio: ${htmlEscape(doc || '')}</div>
                  </div>
                </div>
              </body>
            </html>
        `);
        w.document.close();
        setTimeout(() => w.print(), 120);
    };

    const ticketsToPrintItems = (tickets) => {
        const sorted = [...tickets].sort((a, b) => (Number(a.slipSeq) || 0) - (Number(b.slipSeq) || 0));
        return sorted.map((ticket) => ({
            materialName: ticket.material?.name || '',
            materialCode: ticket.material?.code || '',
            weightKg: Number(ticket.net || ticket.gross || 0),
            pricePerKg: Number(ticket.pricePerKg || 0),
            total: Number(ticket.total || 0),
        }));
    };

    const handleReprintGroup = (groupTickets) => {
        if (!groupTickets?.length) return;
        const sorted = [...groupTickets].sort((a, b) => (Number(a.slipSeq) || 0) - (Number(b.slipSeq) || 0));
        const first = sorted[0];
        printDirectPurchaseSlip({
            seller: first.driver || '',
            doc: first.sellerDocument || '',
            createdAt: first.date || first.createdAt || new Date().toISOString(),
            slipNo: first.code || '',
            items: ticketsToPrintItems(sorted),
        });
    };

    const handleVoidPurchase = async (group) => {
        if (!group?.tickets?.length) return;
        if (!window.confirm('Stornirati direktni otkup? Stanje skladišta će biti korigovano.')) return;
        setListError('');
        try {
            if (group.slipGroupId) {
                await api.post('/gate/walk-in/void-group', { slipGroupId: group.slipGroupId });
            } else {
                await api.post(`/gate/tickets/${group.first.id}/void`, {});
            }
            await refreshPurchaseHistory();
        } catch (err) {
            setListError(err?.response?.data?.error || 'Storno nije uspjelo.');
        }
    };

    const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
    const sellerNameSuggestions = useMemo(() => {
        const seen = new Set();
        return purchaseHistory
            .map((ticket) => String(ticket.driver || '').trim())
            .filter((name) => {
                if (!name) return false;
                const key = name.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .slice(0, 20);
    }, [purchaseHistory]);

    const groupedPurchaseHistory = useMemo(() => {
        const map = new Map();
        for (const t of purchaseHistory) {
            const key = t.slipGroupId || `single:${t.id}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(t);
        }
        return Array.from(map.values())
            .map((tickets) => {
                const sorted = [...tickets].sort(
                    (a, b) => (Number(a.slipSeq) || 0) - (Number(b.slipSeq) || 0)
                );
                const first = sorted[0];
                const kgTotal = sorted.reduce((s, x) => s + Number(x.net || x.gross || 0), 0);
                const amountTotal = sorted.reduce((s, x) => s + Number(x.total || 0), 0);
                const statuses = sorted.map((x) => String(x.status || '').toLowerCase());
                const allStorniran = statuses.length > 0 && statuses.every((s) => s === 'storniran');
                const anyStorniran = statuses.some((s) => s === 'storniran');
                const allCompleted = statuses.every((s) => s === 'completed');
                const canVoid = allCompleted && !anyStorniran;
                const materialsLabel = sorted
                    .map((x) => x.material?.code || '-')
                    .join(', ');
                return {
                    key: first.slipGroupId || first.id,
                    slipGroupId: first.slipGroupId,
                    tickets: sorted,
                    first,
                    kgTotal,
                    amountTotal,
                    allStorniran,
                    anyStorniran,
                    canVoid,
                    materialsLabel,
                };
            })
            .sort(
                (a, b) =>
                    new Date(b.first.date || b.first.createdAt).getTime() -
                    new Date(a.first.date || a.first.createdAt).getTime()
            );
    }, [purchaseHistory]);

    const handleFinalize = async () => {
        if (finalizing) return;
        if (!rows.length) {
            setFormError('Dodaj barem jednu stavku prije finalizacije.');
            return;
        }
        if (!String(sellerName || '').trim()) {
            setFormError('Ime i prezime osobe je obavezno.');
            return;
        }
        try {
            setFinalizing(true);
            const createdAt = new Date().toISOString();
            const lines = rows.map((row) => ({
                materialId: row.materialId,
                gross: row.weightKg,
                net: row.weightKg,
                pricePerKg: row.pricePerKg,
                total: row.total,
            }));
            const batchRes = await api.post('/gate/walk-in/batch', {
                driver: sellerName.trim(),
                sellerDocument: sellerDoc || undefined,
                date: createdAt,
                lines,
            });
            const batchData = batchRes?.data?.data || {};
            const displaySlipNo = batchData.displaySlipNo || '';
            const printItems = rows.map((row) => ({
                materialName: row.materialName,
                materialCode: row.materialCode,
                weightKg: row.weightKg,
                pricePerKg: row.pricePerKg,
                total: row.total,
            }));
            printDirectPurchaseSlip({
                seller: sellerName.trim(),
                doc: sellerDoc,
                items: printItems,
                createdAt,
                slipNo: displaySlipNo,
            });
            setRows([]);
            setSellerName('');
            setSellerDoc('');
            setFormError('');
            await refreshPurchaseHistory();
        } catch (err) {
            setFormError(err?.response?.data?.error || 'Finalizacija nije uspjela. Provjeri API i pokušaj ponovo.');
        } finally {
            setFinalizing(false);
        }
    };

    const totalKg = rows.reduce((sum, row) => sum + row.weightKg, 0);
    const periodTotals = groupedPurchaseHistory
        .filter((group) => !group.allStorniran)
        .reduce((acc, group) => ({ kg: acc.kg + group.kgTotal, amount: acc.amount + group.amountTotal, count: acc.count + 1 }), { kg: 0, amount: 0, count: 0 });
    const previewTotal = parseLocaleNumber(weightKg || 0) * parseLocaleNumber(pricePerKg || 0);

    return (
        <div className="ui-page walkin-page">
            <PageHeader
                title="Direktan otkup"
                subtitle="Brza kupovina materijala od fizičkih lica — stavke, obračun i štampa ulaza robe"
            />

            <div className="walkin-grid">
                <div className="stack" style={{ minWidth: 0 }}>
                    <Card title="Prodavac" subtitle="Osoba od koje se otkupljuje" icon={UserRound}>
                        <div className="ui-form-grid">
                            <Field label="Ime i prezime" required>
                                <input
                                    type="text"
                                    className="ui-input lg"
                                    list="walkin-seller-suggestions"
                                    value={sellerName}
                                    onChange={(event) => setSellerName(event.target.value)}
                                    placeholder="Ime i prezime"
                                />
                                <datalist id="walkin-seller-suggestions">
                                    {sellerNameSuggestions.map((name) => (
                                        <option key={name} value={name} />
                                    ))}
                                </datalist>
                            </Field>
                            <Field label="JMBG / broj dokumenta" hint="Opciono">
                                <input type="text" className="ui-input lg font-code" value={sellerDoc} onChange={(event) => setSellerDoc(event.target.value)} placeholder="—" />
                            </Field>
                        </div>
                    </Card>

                    <Card title="Stavke otkupa" subtitle="Odaberi materijal, unesi količinu i cijenu, pa dodaj stavku" icon={Package}>
                        <div className="stack" style={{ gap: 14 }}>
                            <button
                                type="button"
                                className="ui-input lg walkin-material-btn"
                                data-selected={Boolean(selectedMaterial)}
                                onClick={() => setMaterialPickerOpen(true)}
                            >
                                <Package size={18} />
                                <span>{selectedMaterial ? formatPickedMaterial(selectedMaterial) : 'Odaberi materijal iz kataloga'}</span>
                                <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-3)' }} />
                            </button>

                            <div className="walkin-qty-grid">
                                <Field label="Količina">
                                    <div className="walkin-unit">
                                        <input type="text" inputMode="decimal" className="ui-input font-mono" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} placeholder="0" />
                                        <span>kg</span>
                                    </div>
                                </Field>
                                <Field label="Cijena po kg" hint="Povlači se iz kataloga, može se promijeniti.">
                                    <div className="walkin-unit">
                                        <input type="text" inputMode="decimal" className="ui-input font-mono" value={pricePerKg} onChange={(event) => setPricePerKg(event.target.value)} placeholder="0,00" />
                                        <span>KM</span>
                                    </div>
                                </Field>
                                <div className="walkin-preview">
                                    <span className="muted">Iznos stavke</span>
                                    <b>{fmtMoney(previewTotal)}</b>
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
                                                                onChange={(event) => updateRow(row.id, { pricePerKg: event.target.value })}
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
                                <div className="walkin-empty">Još nema stavki. Dodaj prvu stavku iznad.</div>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="stack walkin-side">
                    <section className="ui-card walkin-total">
                        <div className="ui-card-header">
                            <div className="ui-card-title">Obračun</div>
                            <Badge tone="outline">{rows.length} {rows.length === 1 ? 'stavka' : 'stavki'}</Badge>
                        </div>
                        <div className="ui-card-body stack" style={{ gap: 14 }}>
                            <div className="row-between"><span className="muted">Prodavac</span><b>{sellerName.trim() || '—'}</b></div>
                            <div className="row-between"><span className="muted">Ukupna količina</span><b className="font-mono">{fmtNum(totalKg, 2)} kg</b></div>
                            <div className="walkin-grand">
                                <span>Ukupno za isplatu</span>
                                <strong>{fmtMoney(grandTotal)}</strong>
                            </div>
                            <Button variant="success" size="xl" block icon={Printer} onClick={handleFinalize} disabled={finalizing}>
                                {finalizing ? 'Obrada u toku...' : 'Završi i štampaj'}
                            </Button>
                            <div className="ui-hint" style={{ textAlign: 'center' }}>Stanje skladišta se odmah uvećava, a ulaz robe se štampa.</div>
                        </div>
                    </section>
                </div>
            </div>

            <MaterialPicker
                open={materialPickerOpen}
                onClose={() => setMaterialPickerOpen(false)}
                onSelect={({ material }) => {
                    setSelectedMaterial(material);
                    const backendMaterial = resolveBackendMaterial(materials, material);
                    const fallbackPrice = Number(material?.buyPrice || 0);
                    setPricePerKg(String(Number(backendMaterial?.buyPrice ?? fallbackPrice ?? 0)));
                }}
                onMaterialCreated={() => refreshMaterials().catch(() => null)}
            />

            <Card
                title="Lista direktnih otkupa"
                subtitle={`${fmtNum(periodTotals.count)} otkupa · ${fmtNum(periodTotals.kg)} kg · ${fmtMoney(periodTotals.amount)} (bez storniranih)`}
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
                {groupedPurchaseHistory.length === 0 ? (
                    <EmptyState title="Nema direktnih otkupa u izabranom periodu" />
                ) : (
                    <div className="ui-table-wrap" style={{ maxHeight: 420 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Vrijeme</th>
                                    <th>Osoba</th>
                                    <th>Stavke</th>
                                    <th className="num">Ukupno kg</th>
                                    <th className="num">Iznos</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Akcije</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupedPurchaseHistory.map((group) => (
                                    <tr key={group.key} style={{ opacity: group.allStorniran ? 0.6 : 1 }}>
                                        <td>{fmtDateTime(group.first.date || group.first.createdAt)}</td>
                                        <td style={{ fontWeight: 600 }}>{group.first.driver || '-'}</td>
                                        <td style={{ maxWidth: 260 }}>
                                            <span className="font-code" style={{ whiteSpace: 'normal' }}>{group.materialsLabel}</span>
                                        </td>
                                        <td className="num">{fmtNum(group.kgTotal, 2)}</td>
                                        <td className="num" style={{ fontWeight: 600 }}>{fmtMoney(group.amountTotal)}</td>
                                        <td>
                                            {group.allStorniran
                                                ? <Badge tone="danger" dot>Storniran</Badge>
                                                : group.anyStorniran
                                                    ? <Badge tone="warning" dot>Djelomično storniran</Badge>
                                                    : <Badge tone="success" dot>Aktivan</Badge>}
                                        </td>
                                        <td>
                                            <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                                                <Button variant="ghost" size="sm" icon={Printer} onClick={() => handleReprintGroup(group.tickets)}>Štampaj</Button>
                                                {group.canVoid && (
                                                    <Button variant="danger-soft" size="sm" icon={RotateCcw} onClick={() => handleVoidPurchase(group)}>Storno</Button>
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

            <style>{`
                .walkin-grid {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
                    gap: 16px;
                    align-items: start;
                }
                .walkin-side { position: sticky; top: 0; }
                .walkin-material-btn {
                    display: flex; align-items: center; gap: 10px; text-align: left; cursor: pointer;
                    font-weight: 600; color: var(--text-2);
                }
                .walkin-material-btn svg:first-child { color: var(--primary); }
                .walkin-material-btn[data-selected='true'] { background: var(--primary-50); border-color: var(--primary-200); color: var(--text); }
                .walkin-qty-grid { display: grid; grid-template-columns: 1fr 1fr minmax(150px, .8fr); gap: 14px; align-items: start; }
                .walkin-unit { display: flex; align-items: stretch; }
                .walkin-unit .ui-input {
                    height: 54px; font-size: 24px; font-weight: 600; text-align: right;
                    border-top-right-radius: 0; border-bottom-right-radius: 0;
                }
                .walkin-unit span {
                    display: grid; place-items: center; min-width: 54px; padding: 0 10px;
                    border: 1px solid var(--border-strong); border-left: none;
                    border-radius: 0 var(--radius) var(--radius) 0;
                    background: var(--surface-3); color: var(--text-2); font-weight: 700;
                }
                .walkin-preview {
                    display: grid; gap: 4px; align-self: stretch; align-content: center; text-align: right;
                    padding: 10px 14px; margin-top: 21px; height: 54px;
                    border-radius: var(--radius); background: var(--surface-2); border: 1px dashed var(--border-strong);
                }
                .walkin-preview span { font-size: 11.5px; }
                .walkin-preview b { font-size: 16px; font-variant-numeric: tabular-nums; }
                .walkin-empty {
                    padding: 18px; text-align: center; color: var(--text-3); font-size: 12.5px;
                    border: 1px dashed var(--border-strong); border-radius: var(--radius);
                }
                .walkin-total { border-top: 3px solid var(--success); }
                .walkin-grand {
                    display: grid; gap: 4px; padding: 16px; border-radius: var(--radius-lg);
                    background: var(--success-50); text-align: right;
                }
                .walkin-grand span { font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--success-ink); }
                .walkin-grand strong { font-size: 34px; font-weight: 700; letter-spacing: -0.02em; color: var(--text); font-variant-numeric: tabular-nums; }
                @media (max-width: 1100px) {
                    .walkin-grid { grid-template-columns: minmax(0, 1fr); }
                    .walkin-side { position: static; }
                }
                @media (max-width: 720px) {
                    .walkin-qty-grid { grid-template-columns: minmax(0, 1fr); }
                    .walkin-preview { margin-top: 0; }
                    .walkin-grand strong { font-size: 28px; }
                }
            `}</style>
        </div>
    );
}
