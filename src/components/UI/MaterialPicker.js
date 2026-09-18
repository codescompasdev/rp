'use client';

import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/UI/Modal';
import api from '@/lib/api';
import { normalizeApiList } from '@/lib/materialsAdapter';

const INPUT_STYLE = { width: '100%', padding: '8px 10px', marginTop: '4px' };

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
        <Modal open={open} onClose={onClose} title="Odaberi materijal" width={600} zIndex={1500}>
            <div style={{ marginBottom: '12px' }}>
                <input
                    type="text"
                    placeholder="Pretraga: šifra, materijal, podmaterijal..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={INPUT_STYLE}
                    autoFocus
                />
            </div>
            <div style={{ marginBottom: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                Prikazuju se svi proizvodi iz kataloga sa osnovnim podacima.
            </div>
            <div style={{ marginBottom: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>Stavki: {filtered.length}</div>
            <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid var(--border-color)' }}>
                {filtered.map((item) => (
                    <div
                        key={item.id}
                        style={{ borderBottom: '1px solid #f1f5f9', padding: '10px 12px', cursor: 'pointer' }}
                        onClick={() => handleSelect(item)}
                    >
                        <div className="font-mono" style={{ fontWeight: 700, color: 'var(--primary-color)', marginBottom: '2px' }}>{item.code}</div>
                        <div style={{ fontWeight: 600, fontSize: '12px' }}>{item.materialName} / {item.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {item.categoryName} - {item.subcategoryName}
                        </div>
                        <div className="font-mono" style={{ fontSize: '11px', color: '#0f766e', marginTop: '2px' }}>
                            Otkupna cijena: {Number(item.buyPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BAM/{item.unit || 'KG'}
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', display: 'grid', gap: '8px', justifyItems: 'center' }}>
                        <div>Nema rezultata za "{search}".</div>
                        <button type="button" className="btn-primary" style={{ padding: '7px 12px' }} onClick={handleOpenCreate}>
                            + Dodaj novi materijal
                        </button>
                    </div>
                )}
            </div>
            {createOpen && (
                <div style={{ marginTop: '12px', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px', background: '#f8fafc' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>Novi materijal</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600 }}>Šifra *</label>
                            <input value={newMaterial.code} onChange={(e) => setNewMaterial((prev) => ({ ...prev, code: e.target.value }))} style={INPUT_STYLE} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600 }}>Naziv *</label>
                            <input value={newMaterial.name} onChange={(e) => setNewMaterial((prev) => ({ ...prev, name: e.target.value }))} style={INPUT_STYLE} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600 }}>Kategorija *</label>
                            <input value={newMaterial.category} onChange={(e) => setNewMaterial((prev) => ({ ...prev, category: e.target.value }))} placeholder="npr. Obojeni / Bakar" style={INPUT_STYLE} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600 }}>Jedinica</label>
                            <select value={newMaterial.baseUnit} onChange={(e) => setNewMaterial((prev) => ({ ...prev, baseUnit: e.target.value }))} style={INPUT_STYLE}>
                                <option value="KG">KG</option>
                                <option value="KOM">KOM</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600 }}>Otkupna cijena (BAM/KG)</label>
                            <input type="number" value={newMaterial.buyPrice} onChange={(e) => setNewMaterial((prev) => ({ ...prev, buyPrice: e.target.value }))} style={INPUT_STYLE} />
                        </div>
                    </div>
                    {createError && (
                        <div style={{ marginTop: '8px', color: '#b91c1c', fontSize: '11px' }}>{createError}</div>
                    )}
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button type="button" style={{ padding: '6px 12px', border: '1px solid var(--border-color)', background: '#fff' }} onClick={() => setCreateOpen(false)}>Odustani</button>
                        <button type="button" className="btn-primary" style={{ padding: '6px 12px' }} onClick={handleCreateMaterial} disabled={createLoading}>
                            {createLoading ? 'Snimam...' : 'Sačuvaj materijal'}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
