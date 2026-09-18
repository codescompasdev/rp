'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import FilterBar from '@/components/UI/FilterBar';
import MaterialPicker from '@/components/UI/MaterialPicker';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial, resolveBackendVariant } from '@/lib/materialsAdapter';
import styles from '../../fleet/vehicles/page.module.css';

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

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Transakcije</h1>
                <Button onClick={() => setFormVisible(!formVisible)}>+ Nova Transakcija</Button>
            </div>

            {formVisible && (
                <div style={{ background: 'white', padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '8px', border: '1px solid #e0e0e0', maxWidth: '600px' }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Tip Transakcije</label>
                            <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                                <option value="purchase">Nabavka (Ulaz)</option>
                                <option value="sale">Prodaja (Izlaz)</option>
                                <option value="conversion">Konverzija (npr. kablovi → bakar)</option>
                                <option value="sorting">Sortiranje (1 ulaz → vise izlaza)</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>
                                {formData.type === 'conversion' || formData.type === 'sorting'
                                    ? 'Ulazni materijal (skida se sa stanja)'
                                    : 'Materijal'}
                            </label>
                            <button type="button" onClick={() => { setPickerTarget('input'); setMaterialPickerOpen(true); }} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'left', background: '#fff', cursor: 'pointer' }}>
                                {formData.materialLabel || 'Odaberi iz kataloga materijala'}
                            </button>
                        </div>
                        <Input
                            label={formData.type === 'conversion' || formData.type === 'sorting' ? 'Ulazna količina (KG)' : 'Količina'}
                            type="number"
                            value={formData.quantity}
                            onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                            required
                        />
                        {formData.type === 'conversion' && (
                            <>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Izlazni materijal (dodaje se na stanje)</label>
                                    <button type="button" onClick={() => { setPickerTarget('output'); setMaterialPickerOpen(true); }} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'left', background: '#fff', cursor: 'pointer' }}>
                                        {formData.outputMaterialLabel || 'Odaberi izlazni materijal'}
                                    </button>
                                </div>
                                <Input
                                    label="Izlazna količina (KG)"
                                    type="number"
                                    value={formData.outputQuantity}
                                    onChange={e => setFormData({ ...formData, outputQuantity: e.target.value })}
                                    required
                                />
                            </>
                        )}
                        {formData.type === 'sorting' && (
                            <div style={{ marginBottom: '1rem', border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '6px', background: '#f8fafc' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <strong style={{ fontSize: '0.9rem' }}>Izlazne stavke sortiranja</strong>
                                    <button
                                        type="button"
                                        onClick={() => setSortingOutputs((current) => [...current, { materialId: '', materialVariantId: '', materialLabel: '', quantity: '' }])}
                                        style={{ background: '#1e293b', color: '#f8fafc', border: 'none', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                                    >
                                        + Dodaj izlaz
                                    </button>
                                </div>
                                {sortingOutputs.map((row, index) => (
                                    <div key={`sorting-output-${index}`} style={{ marginBottom: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px', background: '#fff' }}>
                                        <div style={{ marginBottom: '6px' }}>
                                            <button
                                                type="button"
                                                onClick={() => { setPickerTarget(`sorting-${index}`); setMaterialPickerOpen(true); }}
                                                style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'left', background: '#fff', cursor: 'pointer' }}
                                            >
                                                {row.materialLabel || `Odaberi izlazni materijal #${index + 1}`}
                                            </button>
                                        </div>
                                        <Input
                                            label="Kolicina (KG)"
                                            type="number"
                                            value={row.quantity}
                                            onChange={(event) => updateSortingOutput(index, { quantity: event.target.value })}
                                            required
                                        />
                                        {sortingOutputs.length > 1 ? (
                                            <button
                                                type="button"
                                                onClick={() => setSortingOutputs((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                                                style={{ marginTop: '4px', background: '#7f1d1d', color: '#fee2e2', border: 'none', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                                            >
                                                Ukloni stavku
                                            </button>
                                        ) : null}
                                    </div>
                                ))}
                                <div style={{ fontSize: '12px', color: sortingRemaining === 0 ? '#166534' : '#b45309' }}>
                                    Preostalo za raspodjelu: {Number(sortingRemaining || 0).toLocaleString('sr-RS')} kg
                                </div>
                            </div>
                        )}
                        <Input label="Napomena" value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} />
                        <div style={{ marginTop: '1.5rem' }}>
                            <Button type="submit">Izvrši</Button>
                        </div>
                        {submitError && (
                            <div style={{ marginTop: '12px', padding: '10px 12px', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: '12px' }}>
                                {submitError}
                            </div>
                        )}
                    </form>
                </div>
            )}

            <FilterBar filters={[{ name: 'type', label: 'Tip', type: 'select', options: [{ value: 'purchase', label: 'Nabavka' }, { value: 'sale', label: 'Prodaja' }] }]} />
            <div className="scada-panel responsive-table" style={{ overflow: 'auto' }}>
                <table>
                    <thead>
                        <tr>
                            <th>Šifra</th>
                            <th>Datum</th>
                            <th>Tip</th>
                            <th>Materijal</th>
                            <th>Podmaterijal</th>
                            <th style={{ textAlign: 'right' }}>Količina</th>
                            <th style={{ textAlign: 'right' }}>Cijena/KG</th>
                            <th style={{ textAlign: 'right' }}>Ukupno</th>
                                <th>Napomena</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((row) => (
                            <tr key={row.id}>
                                <td className="font-mono">{row.code}</td>
                                <td className="font-mono">{new Date(row.createdAt).toLocaleString('sr-RS')}</td>
                                    <td>
                                        {row.type === 'purchase' ? 'Nabavka' :
                                            row.type === 'sale' ? 'Prodaja' :
                                                row.type === 'production_issue' ? (String(row.operationId || '').startsWith('SORT-') ? 'Sortiranje izlaz' : 'Konverzija izlaz') :
                                                    row.type === 'production_receipt' ? (String(row.operationId || '').startsWith('SORT-') ? 'Sortiranje ulaz' : 'Konverzija ulaz') : row.type}
                                    </td>
                                <td>{row.material?.code || row.materialId}</td>
                                <td>{row.materialVariant?.grade || '-'}</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>{Number(row.quantityKg || 0).toLocaleString()}</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>{Number(row.unitPrice || 0).toFixed(2)}</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>{Number(row.total || 0).toFixed(2)}</td>
                                    <td>{row.note || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!transactions.length && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                        Nema transakcija za odabranu lokaciju.
                    </div>
                )}
            </div>
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
        </div>
    );
}
