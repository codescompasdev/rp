'use client';

import { useEffect, useMemo, useState } from 'react';
import { PackageSearch, Plus } from 'lucide-react';
import Modal from '@/components/UI/Modal';
import SearchInput from '@/components/UI/SearchInput';
import Field from '@/components/UI/Field';
import Button from '@/components/UI/Button';
import Alert from '@/components/UI/Alert';
import EmptyState from '@/components/UI/EmptyState';
import api from '@/lib/api';
import { fmtNum } from '@/lib/format';
import { normalizeApiList } from '@/lib/materialsAdapter';

export default function MaterialPicker({ open, onClose, onSelect, onMaterialCreated }) {
    const [search, setSearch] = useState('');
    const [backendItems, setBackendItems] = useState([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState('');
    const [newMaterial, setNewMaterial] = useState({
        code: '',
        name: '',
        category: '',
        baseUnit: 'KG',
        buyPrice: '',
    });

    const fetchMaterials = () => {
        api.get('/materials')
            .then((res) => {
                const materials = normalizeApiList(res);
                const rows = materials.flatMap((material) => {
                    const category = String(material.category || 'Nedefinisano');
                    const [categoryName, subcategoryName] = category.split('/').map((part) => String(part || '').trim());
                    const variants = Array.isArray(material.variants) ? material.variants : [];

                    if (!variants.length) {
                        return [{
                            id: `${material.id}:base`,
                            materialId: material.id,
                            variantId: null,
                            code: material.code,
                            name: material.name,
                            materialName: material.name,
                            categoryName: categoryName || 'Nedefinisano',
                            subcategoryName: subcategoryName || 'Opste',
                            unit: material.baseUnit || 'KG',
                            buyPrice: Number(material.buyPrice || 0),
                            composition: [],
                            displayName: `${material.code} - ${material.name}`,
                        }];
                    }

                    return variants.map((variant) => {
                        const composition = Object.entries(variant.chemicalData || {}).map(([element, percent]) => ({
                            element: String(element).toUpperCase(),
                            percent: Number(percent || 0),
                        }));
                        return {
                            id: `${material.id}:${variant.id}`,
                            materialId: material.id,
                            variantId: variant.id,
                            code: material.code,
                            name: variant.grade || material.name || 'Varijanta',
                            materialName: material.name,
                            categoryName: categoryName || 'Nedefinisano',
                            subcategoryName: subcategoryName || 'Opste',
                            unit: material.baseUnit || 'KG',
                            buyPrice: Number(material.buyPrice || 0),
                            composition,
                            displayName: `${material.code} - ${material.name}${variant.grade ? ` / ${variant.grade}` : ''}`,
                        };
                    });
                });
                setBackendItems(rows);
            })
            .catch(() => setBackendItems([]));
    };

    useEffect(() => {
        if (!open) return;
        fetchMaterials();
    }, [open]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return backendItems.filter((item) => {
            if (!q) return true;
            return (
                item.code.toLowerCase().includes(q) ||
                item.materialName.toLowerCase().includes(q) ||
                item.name.toLowerCase().includes(q) ||
                item.categoryName.toLowerCase().includes(q)
            );
        });
    }, [backendItems, search]);

    const handleSelect = (item) => {
        onSelect?.({
            material: {
                id: item.id,
                materialId: item.materialId || null,
                variantId: item.variantId || null,
                backendMaterialId: item.materialId || null,
                code: item.code,
                name: item.name,
                materialName: item.materialName,
                categoryName: item.categoryName,
                subcategoryName: item.subcategoryName,
                unit: item.unit,
                buyPrice: Number(item.buyPrice || 0),
                composition: item.composition,
                displayName: item.displayName,
            },
            variant: null,
        });
        onClose();
    };

    const handleOpenCreate = () => {
        setCreateOpen(true);
        setCreateError('');
        setNewMaterial((prev) => ({
            ...prev,
            name: search.trim() || prev.name,
            code: prev.code || String(search || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
        }));
    };

    const handleCreateMaterial = async () => {
        if (!newMaterial.code.trim() || !newMaterial.name.trim() || !newMaterial.category.trim()) {
            setCreateError('Šifra, naziv i kategorija su obavezni.');
            return;
        }
        try {
            setCreateLoading(true);
            const res = await api.post('/materials', {
                code: newMaterial.code.trim().toUpperCase(),
                name: newMaterial.name.trim(),
                category: newMaterial.category.trim(),
                baseUnit: newMaterial.baseUnit || 'KG',
                lmeLinked: false,
                buyPrice: newMaterial.buyPrice === '' ? null : Number(newMaterial.buyPrice),
            });
            const created = res?.data?.data;
            onMaterialCreated?.(created);
            setCreateOpen(false);
            setCreateError('');
            setNewMaterial({ code: '', name: '', category: '', baseUnit: 'KG', buyPrice: '' });
            await fetchMaterials();
            if (created?.id) {
                handleSelect({
                    id: `${created.id}:base`,
                    materialId: created.id,
                    variantId: null,
                    code: created.code,
                    name: created.name,
                    materialName: created.name,
                    categoryName: String(created.category || 'Nedefinisano').split('/')[0]?.trim() || 'Nedefinisano',
                    subcategoryName: String(created.category || 'Opste').split('/')[1]?.trim() || 'Opste',
                    unit: created.baseUnit || 'KG',
                    buyPrice: Number(created.buyPrice || 0),
                    composition: [],
                    displayName: `${created.code} - ${created.name}`,
                });
            }
        } catch {
            setCreateError('Neuspješno dodavanje materijala. Provjeri da šifra nije zauzeta.');
        } finally {
            setCreateLoading(false);
        }
    };

    if (!open) return null;

    return (
        <Modal open={open} onClose={onClose} title="Odaberi materijal" subtitle={`${filtered.length} stavki u katalogu`} width={640} zIndex={3500}>
            <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Pretraga: šifra, materijal, kategorija..."
                autoFocus
            />
            <div style={{ marginTop: 12, maxHeight: 360, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                {filtered.map((item) => (
                    <button
                        type="button"
                        key={item.id}
                        className="mp-row"
                        onClick={() => handleSelect(item)}
                    >
                        <span className="mp-code">{item.code}</span>
                        <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                            <span style={{ display: 'block', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                                {item.materialName}{item.name && item.name !== item.materialName ? ` / ${item.name}` : ''}
                            </span>
                            <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
                                {item.categoryName} · {item.subcategoryName}
                            </span>
                        </span>
                        <span className="font-mono" style={{ fontSize: 12, color: 'var(--success-ink)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {fmtNum(item.buyPrice, 2)} KM/{item.unit || 'KG'}
                        </span>
                    </button>
                ))}
                {filtered.length === 0 && (
                    <EmptyState
                        icon={PackageSearch}
                        title={`Nema rezultata za "${search}"`}
                        text="Materijal ne postoji u katalogu. Možeš ga odmah dodati."
                        action={<Button variant="soft" icon={Plus} onClick={handleOpenCreate}>Dodaj novi materijal</Button>}
                    />
                )}
            </div>
            {createOpen && (
                <div style={{ marginTop: 14, border: '1px solid var(--border)', padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--surface-2)' }}>
                    <div className="ui-section-title">Novi materijal</div>
                    <div className="ui-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                        <Field label="Šifra" required>
                            <input className="ui-input" value={newMaterial.code} onChange={(e) => setNewMaterial((prev) => ({ ...prev, code: e.target.value }))} />
                        </Field>
                        <Field label="Naziv" required>
                            <input className="ui-input" value={newMaterial.name} onChange={(e) => setNewMaterial((prev) => ({ ...prev, name: e.target.value }))} />
                        </Field>
                        <Field label="Kategorija" required>
                            <input className="ui-input" value={newMaterial.category} onChange={(e) => setNewMaterial((prev) => ({ ...prev, category: e.target.value }))} placeholder="npr. Obojeni / Bakar" />
                        </Field>
                        <Field label="Jedinica">
                            <select className="ui-input" value={newMaterial.baseUnit} onChange={(e) => setNewMaterial((prev) => ({ ...prev, baseUnit: e.target.value }))}>
                                <option value="KG">KG</option>
                                <option value="KOM">KOM</option>
                            </select>
                        </Field>
                        <Field label="Otkupna cijena (KM/KG)">
                            <input type="number" className="ui-input" value={newMaterial.buyPrice} onChange={(e) => setNewMaterial((prev) => ({ ...prev, buyPrice: e.target.value }))} />
                        </Field>
                    </div>
                    {createError && <Alert tone="danger" style={{ marginTop: 12 }}>{createError}</Alert>}
                    <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
                        <Button variant="secondary" onClick={() => setCreateOpen(false)}>Odustani</Button>
                        <Button onClick={handleCreateMaterial} disabled={createLoading}>
                            {createLoading ? 'Snimam...' : 'Sačuvaj materijal'}
                        </Button>
                    </div>
                </div>
            )}
            <style>{`
                .mp-row {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 11px 14px;
                    border: none;
                    border-bottom: 1px solid var(--border);
                    border-radius: 0;
                    background: var(--surface);
                    text-align: left;
                }
                .mp-row:last-child { border-bottom: none; }
                .mp-row:hover:not(:disabled) { background: var(--primary-50); }
                .mp-code {
                    min-width: 92px;
                    font-family: var(--font-code);
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--primary-ink);
                    background: var(--primary-50);
                    border-radius: 6px;
                    padding: 3px 8px;
                    text-align: center;
                    white-space: nowrap;
                }
            `}</style>
        </Modal>
    );
}
