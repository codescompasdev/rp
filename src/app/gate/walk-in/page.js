'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import MaterialPicker from '@/components/UI/MaterialPicker';
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

    return (
        <div className="walkin-page" style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div className="walkin-grid" style={{ display: 'flex', gap: '12px', alignItems: 'stretch', flexDirection: isCompact ? 'column' : 'row' }}>
            {/* Left Column: Identity */}
            <div className="scada-panel panel-seller" style={{ flex: isCompact ? '0 0 auto' : '0 0 300px', display: 'flex', flexDirection: 'column', minHeight: isCompact ? 'auto' : 0 }}>
                <div className="scada-header">PODACI O PRODAVCU</div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: '#f8fafc', border: '2px dashed var(--border-color)', padding: '32px', textAlign: 'center', cursor: 'pointer' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🪪</div>
                        <div style={{ fontWeight: 'bold' }}>UNOS DOKUMENTA</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>RUČNI UNOS JMBG / LIČNOG DOKUMENTA</div>
                    </div>

                    <div style={{ display: 'grid', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Ime i prezime</label>
                        <input
                            type="text"
                            list="walkin-seller-suggestions"
                            value={sellerName}
                            onChange={(event) => setSellerName(event.target.value)}
                            placeholder="Ime i prezime"
                            className="field-input"
                            style={{ padding: '10px' }}
                        />
                        <datalist id="walkin-seller-suggestions">
                            {sellerNameSuggestions.map((name) => (
                                <option key={name} value={name} />
                            ))}
                        </datalist>
                    </div>

                    <div style={{ display: 'grid', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>JMBG / Broj dokumenta</label>
                        <input type="text" className="font-mono field-input" value={sellerDoc} onChange={(event) => setSellerDoc(event.target.value)} placeholder="Opcionalno" style={{ padding: '10px' }} />
                    </div>

                    <div style={{
                        marginTop: 'auto',
                        background: '#ecfdf5',
                        border: '1px solid #10b981',
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#065f46'
                    }}>
                        <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '50%' }}></div>
                        <span style={{ fontWeight: 'bold', fontSize: '12px' }}>STATUS PROVJERE: U REDU</span>
                    </div>
                </div>
            </div>

            {/* Middle Column: Quick-Add Grid */}
            <div className="scada-panel panel-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: isCompact ? 'auto' : 0 }}>
                <div className="scada-header">DIREKTNI OTKUP MATERIJALA</div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>

                    <div style={{ display: 'grid', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={() => setMaterialPickerOpen(true)}
                            style={{ padding: '12px', background: selectedMaterial ? '#eef2ff' : '#f8fafc', border: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '12px', textAlign: 'left', cursor: 'pointer' }}
                        >
                            {selectedMaterial ? `Materijal: ${formatPickedMaterial(selectedMaterial)}` : 'Odaberi materijal iz kataloga'}
                        </button>
                    </div>

                    <div className="quick-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Količina</label>
                            <div className="unit-input-wrap" style={{ display: 'flex', minWidth: 0 }}>
                                <input type="text" className="font-mono field-input amount-input" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} style={{ flex: 1, padding: '12px', fontSize: '24px', textAlign: 'right' }} />
                                <div className="unit-tag" style={{ background: '#f1f5f9', border: '1px solid var(--border-color)', borderLeft: 'none', padding: '12px', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>KG</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Cijena po KG</label>
                            <div className="unit-input-wrap" style={{ display: 'flex', minWidth: 0 }}>
                                <input type="text" className="font-mono field-input amount-input" value={pricePerKg} onChange={(event) => setPricePerKg(event.target.value)} style={{ flex: 1, padding: '12px', fontSize: '24px', textAlign: 'right' }} />
                                <div className="unit-tag" style={{ background: '#f1f5f9', border: '1px solid var(--border-color)', borderLeft: 'none', padding: '12px', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>BAM</div>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                Default cijena se povlači iz kataloga materijala, možeš je ručno promijeniti.
                            </div>
                        </div>
                    </div>

                    <button className="btn-primary" style={{ padding: '12px', fontSize: '14px', marginTop: '8px' }} onClick={handleAddRow}>+ DODAJ STAVKU</button>
                    {formError && (
                        <div style={{ padding: '8px 10px', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: '12px' }}>
                            {formError}
                        </div>
                    )}

                    <div className="responsive-table" style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', flex: 1, minWidth: 0 }}>
                        <table style={{ width: '100%', fontSize: '12px' }}>
                            <thead>
                                <tr>
                                    <th>MATERIAL</th>
                                    <th style={{ textAlign: 'right' }}>KOLIČINA</th>
                                    <th style={{ textAlign: 'right' }}>CIJENA</th>
                                    <th style={{ textAlign: 'right' }}>UKUPNO</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.id}>
                                        <td>{row.label}</td>
                                        <td className="font-mono" style={{ textAlign: 'right' }}>{row.weightKg.toFixed(2)} KG</td>
                                        <td className="font-mono" style={{ textAlign: 'right' }}>
                                            <input
                                                type="text"
                                                className="field-input inline-price-input"
                                                value={row.pricePerKg}
                                                onChange={(event) => updateRow(row.id, { pricePerKg: event.target.value })}
                                                style={{ width: '90px', padding: '6px', textAlign: 'right' }}
                                            />
                                        </td>
                                        <td className="font-mono" style={{ textAlign: 'right', fontWeight: 'bold' }}>{row.total.toFixed(2)} BAM</td>
                                        <td style={{ textAlign: 'center', color: 'red', cursor: 'pointer' }} onClick={() => setRows((prev) => prev.filter((item) => item.id !== row.id))}>✕</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Right Column: Payment */}
            <div className="scada-panel panel-total" style={{ flex: isCompact ? '0 0 auto' : '0 0 350px', display: 'flex', flexDirection: 'column', background: '#0f172a', color: 'white', minHeight: isCompact ? 'auto' : 0 }}>
                <div className="scada-header" style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>ZAVRŠETAK TRANSAKCIJE</div>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>

                    <div style={{ display: 'grid', gap: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>UKUPNO ZA ISPLATU</div>
                        <div className="scada-readout" style={{ fontSize: isMobile ? '36px' : '48px', color: '#10b981', textAlign: 'right', borderBottom: '2px solid #334155', paddingBottom: '8px' }}>
                            {grandTotal.toFixed(2)} <span style={{ fontSize: '24px' }}>BAM</span>
                        </div>
                    </div>

                    <div style={{ marginTop: 'auto' }}>
                        <button onClick={handleFinalize} disabled={finalizing} style={{ width: '100%', padding: isMobile ? '14px' : '24px', background: '#fbbf24', color: '#78350f', border: 'none', fontWeight: 'bold', fontSize: isMobile ? '14px' : '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: finalizing ? 0.7 : 1, cursor: finalizing ? 'not-allowed' : 'pointer' }}>
                            <span>{finalizing ? 'OBRADA U TOKU...' : 'ZAVRŠI TRANSAKCIJU I ŠTAMPAJ'}</span>
                            <span style={{ fontSize: '12px', fontWeight: 'normal' }}>Direktni otkup</span>
                        </button>
                    </div>

                </div>
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
            <div className="scada-panel">
                <div className="scada-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
                    <span>LISTA DIREKTNIH OTKUPA</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 600 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Od
                            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="field-input" style={{ padding: '4px 8px' }} />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Do
                            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="field-input" style={{ padding: '4px 8px' }} />
                        </label>
                        <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                            onClick={() => {
                                const t = localYmd();
                                setDateFrom(t);
                                setDateTo(t);
                            }}
                        >
                            Danas
                        </button>
                    </div>
                </div>
                {listError && (
                    <div style={{ padding: '8px 12px', background: '#fef2f2', color: '#991b1b', fontSize: '12px', borderBottom: '1px solid #fecaca' }}>
                        {listError}
                    </div>
                )}
                <div className="responsive-table" style={{ maxHeight: '280px', overflow: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '12px' }}>
                        <thead>
                            <tr>
                                <th>Vrijeme</th>
                                <th>Osoba</th>
                                <th>Stavke</th>
                                <th style={{ textAlign: 'right' }}>KG ukupno</th>
                                <th style={{ textAlign: 'right' }}>Iznos</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'center' }}>Akcije</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedPurchaseHistory.map((group) => (
                                <tr key={group.key} style={{ opacity: group.allStorniran ? 0.65 : 1 }}>
                                    <td className="font-mono">{new Date(group.first.date || group.first.createdAt).toLocaleString()}</td>
                                    <td>{group.first.driver || '-'}</td>
                                    <td style={{ maxWidth: '200px', wordBreak: 'break-word' }}>{group.materialsLabel}</td>
                                    <td className="font-mono" style={{ textAlign: 'right' }}>{Number(group.kgTotal || 0).toLocaleString()}</td>
                                    <td className="font-mono" style={{ textAlign: 'right' }}>{Number(group.amountTotal || 0).toFixed(2)}</td>
                                    <td>
                                        {group.allStorniran ? 'Storniran' : group.anyStorniran ? 'Djelomično storniran' : 'Aktivan'}
                                    </td>
                                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            style={{ padding: '4px 8px', fontSize: '11px', marginRight: '4px' }}
                                            onClick={() => handleReprintGroup(group.tickets)}
                                        >
                                            Štampaj
                                        </button>
                                        {group.canVoid && (
                                            <button
                                                type="button"
                                                style={{ padding: '4px 8px', fontSize: '11px', background: '#7f1d1d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                onClick={() => handleVoidPurchase(group)}
                                            >
                                                Storno
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {!groupedPurchaseHistory.length && (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '12px', color: '#64748b' }}>Nema direktnih otkupa u izabranom periodu.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <style jsx>{`
                .walkin-page :global(input),
                .walkin-page :global(select),
                .walkin-page :global(textarea) {
                    box-sizing: border-box;
                }
                .panel-seller {
                    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
                }
                .panel-main {
                    background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
                }
                .field-input {
                    width: 100%;
                    min-width: 0;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    background: #fff;
                }
                .field-input:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
                    outline: none;
                }
                .amount-input {
                    border-top-right-radius: 0;
                    border-bottom-right-radius: 0;
                }
                .unit-tag {
                    min-width: 64px;
                    justify-content: center;
                    color: #334155;
                    background: #e2e8f0 !important;
                }
                .inline-price-input {
                    max-width: 100px;
                }
                .panel-total {
                    box-shadow: inset 0 0 0 1px #1e293b;
                }
                @media (max-width: 860px) {
                    .walkin-grid {
                        gap: 10px;
                    }
                    .quick-grid {
                        grid-template-columns: 1fr !important;
                        gap: 10px !important;
                    }
                    .amount-input {
                        font-size: 20px !important;
                    }
                    .panel-total :global(.scada-readout) {
                        font-size: 34px !important;
                    }
                    .responsive-table {
                        overflow-x: auto;
                    }
                }
            `}</style>
        </div>
    );
}
