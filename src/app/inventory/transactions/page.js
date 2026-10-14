'use client';

import { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Package, Plus, Shuffle, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import Button from '@/components/UI/Button';
import Modal from '@/components/UI/Modal';
import MaterialPicker from '@/components/UI/MaterialPicker';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import StatCard from '@/components/UI/StatCard';
import Field from '@/components/UI/Field';
import Alert from '@/components/UI/Alert';
import Segmented from '@/components/UI/Segmented';
import SearchInput from '@/components/UI/SearchInput';
import EmptyState from '@/components/UI/EmptyState';
import { Badge } from '@/components/UI/Badge';
import { fmtDateTime, fmtKg, fmtMoney, fmtNum, fmtWeight } from '@/lib/format';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial, resolveBackendVariant } from '@/lib/materialsAdapter';

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [formVisible, setFormVisible] = useState(false);
    const [formData, setFormData] = useState({
        materialId: '',
        materialVariantId: '',
        quantity: '',
        type: 'purchase',
        materialLabel: '',
        outputMaterialId: '',
        outputMaterialVariantId: '',
        outputQuantity: '',
        outputMaterialLabel: '',
        note: '',
    });
    const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
    const [pickerTarget, setPickerTarget] = useState('input');
    const [sortingOutputs, setSortingOutputs] = useState([
        { materialId: '', materialVariantId: '', materialLabel: '', quantity: '' },
    ]);
    const [submitError, setSubmitError] = useState('');
    const [groupFilter, setGroupFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [detailTx, setDetailTx] = useState(null);

    const refreshMaterials = async () => {
        try {
            const response = await api.get('/materials');
            setMaterials(normalizeApiList(response));
        } catch {
            setMaterials([]);
        }
    };

    useEffect(() => {
        refreshMaterials();
        api.get('/inventory/transactions')
            .then((response) => setTransactions(normalizeApiList(response)))
            .catch(() => setTransactions([]));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!formData.materialId) {
                setSubmitError('Odaberi materijal koji je mapiran na backend katalog.');
                return;
            }
            const endpoint = `/inventory/transactions/${formData.type}`;
            if (formData.type === 'conversion') {
                if (!formData.materialId || !formData.outputMaterialId) {
                    setSubmitError('Odaberi ulazni i izlazni materijal za konverziju.');
                    return;
                }
                await api.post('/inventory/conversions', {
                    inputMaterialId: formData.materialId,
                    inputMaterialVariantId: formData.materialVariantId || null,
                    outputMaterialId: formData.outputMaterialId,
                    outputMaterialVariantId: formData.outputMaterialVariantId || null,
                    inputQtyKg: Number(formData.quantity || 0),
                    outputQtyKg: Number(formData.outputQuantity || 0),
                    note: formData.note || null,
                });
            } else if (formData.type === 'sorting') {
                const inputQty = Number(formData.quantity || 0);
                const outputs = sortingOutputs
                    .map((item) => ({
                        materialId: item.materialId,
                        materialVariantId: item.materialVariantId || null,
                        qtyKg: Number(item.quantity || 0),
                    }))
                    .filter((item) => item.materialId && item.qtyKg > 0);

                if (!formData.materialId) {
                    setSubmitError('Odaberi ulazni materijal za sortiranje.');
                    return;
                }
                if (!outputs.length) {
                    setSubmitError('Dodaj bar jednu izlaznu stavku za sortiranje.');
                    return;
                }
                const outputTotal = outputs.reduce((sum, item) => sum + item.qtyKg, 0);
                if (Math.abs(outputTotal - inputQty) > 0.01) {
                    setSubmitError('Zbir izlaza mora biti jednak ulaznoj kolicini.');
                    return;
                }

                await api.post('/inventory/sorting', {
                    inputMaterialId: formData.materialId,
                    inputMaterialVariantId: formData.materialVariantId || null,
                    inputQtyKg: inputQty,
                    outputs,
                    note: formData.note || null,
                });
            } else {
                await api.post(endpoint, {
                    materialId: formData.materialId,
                    materialVariantId: formData.materialVariantId || null,
                    quantity: Number(formData.quantity || 0),
                    type: formData.type,
                    note: formData.note || null,
                });
            }
            const refreshed = await api.get('/inventory/transactions');
            setTransactions(normalizeApiList(refreshed));
            setSubmitError('');
            setFormData({
                materialId: '',
                materialVariantId: '',
                quantity: '',
                type: 'purchase',
                materialLabel: '',
                outputMaterialId: '',
                outputMaterialVariantId: '',
                outputQuantity: '',
                outputMaterialLabel: '',
                note: '',
            });
            setSortingOutputs([{ materialId: '', materialVariantId: '', materialLabel: '', quantity: '' }]);
            setFormVisible(false);
        } catch (err) {
            console.error(err);
            const message = err?.response?.data?.error;
            setSubmitError(message || 'Greška pri transakciji. Provjeri unos i pokušaj ponovo.');
        }
    };

    const sortingInputQty = Number(formData.quantity || 0);
    const sortingOutputTotal = sortingOutputs.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const sortingRemaining = sortingInputQty - sortingOutputTotal;

    const updateSortingOutput = (index, patch) => {
        setSortingOutputs((current) => current.map((item, itemIndex) => (
            itemIndex === index ? { ...item, ...patch } : item
        )));
    };

    const typeLabel = (row) => {
        if (row.type === 'purchase') return 'Nabavka';
        if (row.type === 'sale') return 'Prodaja';
        if (row.type === 'production_issue') return String(row.operationId || '').startsWith('SORT-') ? 'Sortiranje izlaz' : 'Konverzija izlaz';
        if (row.type === 'production_receipt') return String(row.operationId || '').startsWith('SORT-') ? 'Sortiranje ulaz' : 'Konverzija ulaz';
        if (row.type === 'adjustment') return 'Korekcija / storno';
        return row.type;
    };
    const typeGroup = (row) => {
        if (row.type === 'purchase') return 'IN';
        if (row.type === 'sale') return 'OUT';
        if (row.type === 'production_issue' || row.type === 'production_receipt') return 'PROC';
        return 'ADJ';
    };
    const typeTone = { IN: 'info', OUT: 'orange', PROC: 'violet', ADJ: 'neutral' };

    const q = search.trim().toLowerCase();
    const visibleTx = transactions.filter((row) => {
        if (groupFilter !== 'ALL' && typeGroup(row) !== groupFilter) return false;
        if (!q) return true;
        return [row.code, row.material?.code, row.material?.name, row.materialVariant?.grade, row.note, row.operationId].join(' ').toLowerCase().includes(q);
    });
    const sumKg = (group) => transactions.filter((row) => typeGroup(row) === group).reduce((sum, row) => sum + Number(row.quantityKg || 0), 0);
    const purchaseValue = transactions.filter((row) => row.type === 'purchase').reduce((sum, row) => sum + Number(row.total || 0), 0);
    const isProcess = formData.type === 'conversion' || formData.type === 'sorting';

    const materialButton = (label, placeholder, onClick) => (
        <button type="button" className="ui-input tx-material-btn" data-selected={Boolean(label)} onClick={onClick}>
            <Package size={16} />
            <span>{label || placeholder}</span>
        </button>
    );

    return (
        <div className="ui-page">
            <PageHeader
                title="Analiza i knjiženje"
                subtitle="Ulazi, izlazi, konverzije i sortiranja na skladištu · zadnjih 200 knjiženja za lokaciju"
                actions={<Button icon={Plus} onClick={() => { setSubmitError(''); setFormVisible(true); }}>Nova transakcija</Button>}
            />

            <div className="ui-kpi-grid">
                <StatCard label="Ulaz (nabavka)" icon={ArrowDownToLine} value={fmtWeight(sumKg('IN'))} hint={`vrijednost ${fmtMoney(purchaseValue, 0)}`} />
                <StatCard label="Izlaz (prodaja)" icon={ArrowUpFromLine} tone="orange" value={fmtWeight(sumKg('OUT'))} />
                <StatCard label="Konverzije i sortiranja" icon={Shuffle} value={fmtNum(transactions.filter((row) => typeGroup(row) === 'PROC').length)} hint="knjiženja" />
                <StatCard label="Ukupno knjiženja" icon={ArrowLeftRight} value={fmtNum(transactions.length)} />
            </div>

            <Card flush>
                <div className="ui-toolbar" style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
                    <Segmented
                        options={[
                            { value: 'ALL', label: 'Sve' },
                            { value: 'IN', label: 'Ulaz' },
                            { value: 'OUT', label: 'Izlaz' },
                            { value: 'PROC', label: 'Konverzija / sortiranje' },
                            { value: 'ADJ', label: 'Korekcije' },
                        ]}
                        value={groupFilter}
                        onChange={setGroupFilter}
                        ariaLabel="Tip knjiženja"
                    />
                    <SearchInput className="grow" value={search} onChange={setSearch} placeholder="Pretraži šifru, materijal, napomenu..." />
                </div>
                {visibleTx.length === 0 ? (
                    <EmptyState title={transactions.length ? 'Nema knjiženja za odabrane filtere' : 'Nema transakcija za odabranu lokaciju'} />
                ) : (
                    <div className="ui-table-wrap" style={{ maxHeight: 640 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Šifra</th>
                                    <th>Datum</th>
                                    <th>Tip</th>
                                    <th>Materijal</th>
                                    <th>Podmaterijal</th>
                                    <th className="num">Količina</th>
                                    <th className="num">Cijena / kg</th>
                                    <th className="num">Ukupno</th>
                                    <th>Napomena</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleTx.map((row) => (
                                    <tr key={row.id} onClick={() => setDetailTx(row)} style={{ cursor: 'pointer' }}>
                                        <td className="font-code" style={{ fontSize: 12 }}>{row.code}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(row.createdAt)}</td>
                                        <td><Badge tone={typeTone[typeGroup(row)]}>{typeLabel(row)}</Badge></td>
                                        <td style={{ fontWeight: 500 }}>{row.material ? `${row.material.code} · ${row.material.name}` : row.materialId}</td>
                                        <td className="muted">{row.materialVariant?.grade || '—'}</td>
                                        <td className="num" style={{ fontWeight: 600 }}>{fmtKg(row.quantityKg, 2)}</td>
                                        <td className="num">{fmtNum(row.unitPrice, 2)}</td>
                                        <td className="num">{fmtMoney(row.total)}</td>
                                        <td className="muted" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.note || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal open={Boolean(detailTx)} onClose={() => setDetailTx(null)} title={detailTx ? `Knjiženje ${detailTx.code}` : ''} subtitle={detailTx ? typeLabel(detailTx) : ''} width={560}>
                {detailTx && (
                    <div className="stack" style={{ gap: 10, fontSize: 13 }}>
                        {[
                            ['Datum', fmtDateTime(detailTx.createdAt)],
                            ['Materijal', detailTx.material ? `${detailTx.material.code} · ${detailTx.material.name}` : detailTx.materialId],
                            ['Podmaterijal', detailTx.materialVariant?.grade || '—'],
                            ['Količina', fmtKg(detailTx.quantityKg, 2)],
                            ['Cijena / kg', `${fmtNum(detailTx.unitPrice, 4)} KM`],
                            ['Ukupno', fmtMoney(detailTx.total)],
                            ['Zona skladišta', detailTx.stock?.zone || '—'],
                            ['Operacija', detailTx.operationId || '—'],
                            ['Napomena', detailTx.note || '—'],
                        ].map(([label, value]) => (
                            <div key={label} className="row-between" style={{ alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                                <span className="muted">{label}</span>
                                <b style={{ textAlign: 'right', maxWidth: '65%', wordBreak: 'break-word' }}>{value}</b>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>

            <Modal open={formVisible} onClose={() => setFormVisible(false)} title="Nova transakcija" subtitle="Ručno knjiženje na skladištu za aktivnu lokaciju" width={680}>
                <form onSubmit={handleSubmit} className="stack" style={{ gap: 16 }}>
                    <Field label="Tip transakcije">
                        <select className="ui-input" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                            <option value="purchase">Nabavka (ulaz)</option>
                            <option value="sale">Prodaja (izlaz)</option>
                            <option value="conversion">Konverzija (npr. kablovi → bakar)</option>
                            <option value="sorting">Sortiranje (1 ulaz → više izlaza)</option>
                        </select>
                    </Field>
                    <div className="ui-form-grid">
                        <Field label={isProcess ? 'Ulazni materijal (skida se sa stanja)' : 'Materijal'} required>
                            {materialButton(formData.materialLabel, 'Odaberi iz kataloga materijala', () => { setPickerTarget('input'); setMaterialPickerOpen(true); })}
                        </Field>
                        <Field label={isProcess ? 'Ulazna količina (kg)' : 'Količina (kg)'} required>
                            <input type="number" className="ui-input font-mono" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required />
                        </Field>
                    </div>

                    {formData.type === 'conversion' && (
                        <div className="ui-form-grid">
                            <Field label="Izlazni materijal (dodaje se na stanje)" required>
                                {materialButton(formData.outputMaterialLabel, 'Odaberi izlazni materijal', () => { setPickerTarget('output'); setMaterialPickerOpen(true); })}
                            </Field>
                            <Field label="Izlazna količina (kg)" required>
                                <input type="number" className="ui-input font-mono" value={formData.outputQuantity} onChange={(e) => setFormData({ ...formData, outputQuantity: e.target.value })} required />
                            </Field>
                        </div>
                    )}

                    {formData.type === 'sorting' && (
                        <div className="ui-card" style={{ padding: 14, background: 'var(--surface-2)' }}>
                            <div className="row-between" style={{ marginBottom: 10 }}>
                                <b>Izlazne stavke sortiranja</b>
                                <Button
                                    variant="soft"
                                    size="sm"
                                    icon={Plus}
                                    onClick={() => setSortingOutputs((current) => [...current, { materialId: '', materialVariantId: '', materialLabel: '', quantity: '' }])}
                                >
                                    Dodaj izlaz
                                </Button>
                            </div>
                            <div className="stack" style={{ gap: 8 }}>
                                {sortingOutputs.map((row, index) => (
                                    <div key={`sorting-output-${index}`} className="tx-sort-row">
                                        {materialButton(row.materialLabel, `Izlazni materijal #${index + 1}`, () => { setPickerTarget(`sorting-${index}`); setMaterialPickerOpen(true); })}
                                        <input
                                            type="number"
                                            className="ui-input font-mono"
                                            placeholder="kg"
                                            value={row.quantity}
                                            onChange={(event) => updateSortingOutput(index, { quantity: event.target.value })}
                                            required
                                            aria-label={`Količina izlaza ${index + 1}`}
                                        />
                                        {sortingOutputs.length > 1 ? (
                                            <Button
                                                variant="ghost"
                                                icon={Trash2}
                                                aria-label="Ukloni stavku"
                                                onClick={() => setSortingOutputs((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                                            />
                                        ) : <span />}
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: sortingRemaining === 0 ? 'var(--success-ink)' : 'var(--warning-ink)' }}>
                                Preostalo za raspodjelu: {fmtNum(sortingRemaining, 2)} kg
                            </div>
                        </div>
                    )}

                    <Field label="Napomena">
                        <input className="ui-input" value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} />
                    </Field>
                    {submitError && <Alert tone="danger">{submitError}</Alert>}
                    <div className="ui-modal-footer" style={{ marginTop: 0 }}>
                        <Button variant="secondary" onClick={() => setFormVisible(false)}>Odustani</Button>
                        <Button type="submit">Izvrši knjiženje</Button>
                    </div>
                </form>
            </Modal>

            <MaterialPicker
                open={materialPickerOpen}
                onClose={() => setMaterialPickerOpen(false)}
                onSelect={({ material }) => {
                    const backendMaterial = resolveBackendMaterial(materials, material);
                    const backendVariant = resolveBackendVariant(backendMaterial, material);
                    const immediateMaterialId = backendMaterial?.id || material.backendMaterialId || material.materialId || '';
                    if (String(pickerTarget).startsWith('sorting-')) {
                        const index = Number(String(pickerTarget).split('-')[1]);
                        if (Number.isFinite(index)) {
                            updateSortingOutput(index, {
                                materialId: immediateMaterialId,
                                materialVariantId: backendVariant?.id || material.variantId || '',
                                materialLabel: formatPickedMaterial(material),
                            });
                        }
                    } else {
                        setFormData((prev) => {
                            if (pickerTarget === 'output') {
                                return {
                                    ...prev,
                                    outputMaterialId: immediateMaterialId,
                                    outputMaterialVariantId: backendVariant?.id || material.variantId || '',
                                    outputMaterialLabel: formatPickedMaterial(material),
                                };
                            }
                            return {
                                ...prev,
                                materialId: immediateMaterialId,
                                materialVariantId: backendVariant?.id || material.variantId || '',
                                materialLabel: formatPickedMaterial(material),
                            };
                        });
                    }
                    setSubmitError('');
                }}
                onMaterialCreated={() => {
                    refreshMaterials();
                }}
            />

            <style>{`
                .tx-material-btn { display: flex; align-items: center; gap: 8px; text-align: left; cursor: pointer; color: var(--text-3); overflow: hidden; white-space: nowrap; }
                .tx-material-btn svg { color: var(--primary); flex-shrink: 0; }
                .tx-material-btn span { overflow: hidden; text-overflow: ellipsis; }
                .tx-material-btn[data-selected='true'] { color: var(--text); font-weight: 600; background: var(--primary-50); border-color: var(--primary-200); }
                .tx-sort-row { display: grid; grid-template-columns: minmax(0, 1fr) 130px 36px; gap: 8px; }
            `}</style>
        </div>
    );
}
