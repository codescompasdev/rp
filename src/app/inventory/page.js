'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

function fmtKg(value) {
    return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtTons(valueKg) {
    return (Number(valueKg || 0) / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMoney(value) {
    return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function sortByKey(items, sortKey, sortDir) {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
        if (sortKey === 'stockKg') return (toNumber(a.stockKg) - toNumber(b.stockKg)) * dir;
        return String(a.name || '').localeCompare(String(b.name || '')) * dir;
    });
}

function buildTree(rows, taxonomyTree, sortKey, sortDir) {
    const categories = new Map();

    for (const cat of taxonomyTree || []) {
        const categoryName = String(cat?.name || '').trim();
        if (!categoryName) continue;
        if (!categories.has(categoryName)) {
            categories.set(categoryName, {
                id: `cat:${categoryName}`,
                name: categoryName,
                stockKg: 0,
                subcategories: new Map(),
            });
        }
        const category = categories.get(categoryName);
        for (const sub of cat?.subcategories || []) {
            const subcategoryName = String(sub?.name || '').trim();
            if (!subcategoryName) continue;
            if (!category.subcategories.has(subcategoryName)) {
                category.subcategories.set(subcategoryName, {
                    id: `sub:${categoryName}:${subcategoryName}`,
                    name: subcategoryName,
                    categoryName,
                    stockKg: 0,
                    materials: new Map(),
                });
            }
        }
    }

    for (const row of rows || []) {
        const categoryName = String(row.category || 'Nedefinisano').trim() || 'Nedefinisano';
        const subcategoryName = String(row.subcategory || 'Opste').trim() || 'Opste';
        const materialId = String(row.materialId || `${row.code || ''}:${row.materialName || ''}`);
        const variantId = String(row.variantId || `${materialId}:${row.variantName || 'Osnovni kvalitet'}`);
        const stockKg = toNumber(row.stockKg, 0);

        if (!categories.has(categoryName)) {
            categories.set(categoryName, {
                id: `cat:${categoryName}`,
                name: categoryName,
                stockKg: 0,
                subcategories: new Map(),
            });
        }
        const category = categories.get(categoryName);
        category.stockKg += stockKg;

        if (!category.subcategories.has(subcategoryName)) {
            category.subcategories.set(subcategoryName, {
                id: `sub:${categoryName}:${subcategoryName}`,
                name: subcategoryName,
                categoryName,
                stockKg: 0,
                materials: new Map(),
            });
        }
        const subcategory = category.subcategories.get(subcategoryName);
        subcategory.stockKg += stockKg;

        if (!subcategory.materials.has(materialId)) {
            subcategory.materials.set(materialId, {
                id: materialId,
                code: String(row.code || ''),
                name: String(row.materialName || 'Materijal'),
                stockKg: 0,
                materialId: String(row.materialId || ''),
                categoryName,
                subcategoryName,
                variants: [],
            });
        }
        const material = subcategory.materials.get(materialId);
        material.stockKg += stockKg;
        material.variants.push({
            id: variantId,
            variantId: row.variantId || null,
            materialId: String(row.materialId || ''),
            materialCode: String(row.code || ''),
            name: String(row.variantName || 'Osnovni kvalitet'),
            stockKg,
            avgBuyPrice: toNumber(row.avgBuyPrice, 0),
            mktPrice: toNumber(row.mktPrice, 0),
        });
    }

    const categoryRows = Array.from(categories.values()).map((category) => {
        const subcategoryRows = Array.from(category.subcategories.values()).map((subcategory) => {
            const materialRows = Array.from(subcategory.materials.values()).map((material) => ({
                ...material,
                variants: sortByKey(material.variants, sortKey, sortDir),
            }));
            return {
                ...subcategory,
                materials: sortByKey(materialRows, sortKey, sortDir),
            };
        });
        return {
            ...category,
            subcategories: sortByKey(subcategoryRows, sortKey, sortDir),
        };
    });

    return sortByKey(categoryRows, sortKey, sortDir);
}

function filterTree(tree, query) {
    if (!query) return tree;

    return tree
        .map((category) => {
            const categoryMatch = category.name.toLowerCase().includes(query);
            if (categoryMatch) return category;

            const subcategories = category.subcategories
                .map((subcategory) => {
                    const subcategoryMatch = subcategory.name.toLowerCase().includes(query);
                    if (subcategoryMatch) return subcategory;

                    const materials = subcategory.materials
                        .map((material) => {
                            const materialMatch = material.name.toLowerCase().includes(query) || material.code.toLowerCase().includes(query);
                            if (materialMatch) return material;

                            const variants = material.variants.filter((variant) => variant.name.toLowerCase().includes(query));
                            if (variants.length) return { ...material, variants };
                            return null;
                        })
                        .filter(Boolean);

                    if (!materials.length) return null;
                    return { ...subcategory, materials };
                })
                .filter(Boolean);

            if (!subcategories.length) return null;
            return { ...category, subcategories };
        })
        .filter(Boolean);
}

function modalTitle(mode, entity) {
    const action = mode === 'create' ? 'Dodaj' : 'Uredi';
    if (entity === 'category') return `${action} kategoriju`;
    if (entity === 'subcategory') return `${action} podkategoriju`;
    if (entity === 'material') return `${action} materijal`;
    return `${action} podmaterijal`;
}

export default function InventoryPage() {
    const [rows, setRows] = useState([]);
    const [taxonomyTree, setTaxonomyTree] = useState([]);
    const [materialsMeta, setMaterialsMeta] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [expandedCategories, setExpandedCategories] = useState({});
    const [expandedSubcategories, setExpandedSubcategories] = useState({});
    const [expandedMaterials, setExpandedMaterials] = useState({});
    const [modal, setModal] = useState({ open: false, entity: 'category', mode: 'create', context: null });
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [stockModal, setStockModal] = useState({
        open: false,
        mode: 'in',
        materialId: '',
        materialLabel: '',
        variantId: null,
        quantity: '',
        unitPrice: '',
        note: '',
        zone: 'DEFAULT',
    });
    const [stockSaving, setStockSaving] = useState(false);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const [gridRes, taxonomyRes, materialsRes] = await Promise.all([
                api.get('/inventory/grid'),
                api.get('/materials/taxonomy/tree'),
                api.get('/materials'),
            ]);
            setRows(gridRes?.data?.data || []);
            setTaxonomyTree(taxonomyRes?.data?.data || []);
            setMaterialsMeta(materialsRes?.data?.data || []);
        } catch {
            setError('Neuspješno učitavanje inventory podataka.');
            setRows([]);
            setTaxonomyTree([]);
            setMaterialsMeta([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const taxonomyIndex = useMemo(() => {
        const byCategoryName = new Map();
        const byCategoryId = new Map();
        for (const cat of taxonomyTree || []) {
            byCategoryName.set(cat.name, cat);
            byCategoryId.set(cat.id, cat);
        }
        return { byCategoryName, byCategoryId };
    }, [taxonomyTree]);

    const materialsById = useMemo(() => {
        const map = new Map();
        for (const material of materialsMeta || []) {
            map.set(material.id, material);
        }
        return map;
    }, [materialsMeta]);

    const query = search.trim().toLowerCase();
    const tree = useMemo(() => buildTree(rows, taxonomyTree, sortKey, sortDir), [rows, taxonomyTree, sortKey, sortDir]);
    const filteredTree = useMemo(() => filterTree(tree, query), [tree, query]);

    useEffect(() => {
        if (!filteredTree.length) return;
        const firstCategory = filteredTree[0];
        setExpandedCategories((prev) => ({ ...prev, [firstCategory.id]: true }));
    }, [filteredTree]);

    const totalKg = useMemo(() => filteredTree.reduce((sum, category) => sum + toNumber(category.stockKg, 0), 0), [filteredTree]);

    const allSubcategoryOptions = useMemo(() => {
        const list = [];
        for (const cat of taxonomyTree || []) {
            for (const sub of cat.subcategories || []) {
                list.push({
                    id: sub.id,
                    name: sub.name,
                    categoryId: cat.id,
                    categoryName: cat.name,
                });
            }
        }
        return list;
    }, [taxonomyTree]);

    const modalSubcategories = useMemo(() => {
        if (!form.categoryId) return allSubcategoryOptions;
        return allSubcategoryOptions.filter((row) => row.categoryId === form.categoryId);
    }, [allSubcategoryOptions, form.categoryId]);

    const openModal = (nextModal, initialForm) => {
        setStatus('');
        setModal(nextModal);
        setForm(initialForm || {});
    };

    const closeModal = () => {
        if (saving) return;
        setModal({ open: false, entity: 'category', mode: 'create', context: null });
        setForm({});
    };

    const openCreateCategory = () => openModal(
        { open: true, entity: 'category', mode: 'create', context: null },
        { name: '' },
    );

    const openEditCategory = (categoryName) => {
        const category = taxonomyIndex.byCategoryName.get(categoryName);
        if (!category) {
            setStatus('Kategorija nije pronađena u taxonomy stablu.');
            return;
        }
        openModal(
            { open: true, entity: 'category', mode: 'edit', context: { id: category.id } },
            { name: category.name },
        );
    };

    const openCreateSubcategory = (categoryName = '') => {
        const category = taxonomyIndex.byCategoryName.get(categoryName);
        openModal(
            { open: true, entity: 'subcategory', mode: 'create', context: null },
            {
                categoryId: category?.id || (taxonomyTree[0]?.id || ''),
                name: '',
            },
        );
    };

    const openEditSubcategory = (categoryName, subcategoryName) => {
        const category = taxonomyIndex.byCategoryName.get(categoryName);
        const subcategory = (category?.subcategories || []).find((row) => row.name === subcategoryName);
        if (!subcategory) {
            setStatus('Podkategorija nije pronađena u taxonomy stablu.');
            return;
        }
        openModal(
            { open: true, entity: 'subcategory', mode: 'edit', context: { id: subcategory.id } },
            {
                categoryId: category.id,
                categoryName: category.name,
                name: subcategory.name,
            },
        );
    };

    const openCreateMaterial = (categoryName = '', subcategoryName = '') => {
        const category = taxonomyIndex.byCategoryName.get(categoryName) || taxonomyTree[0];
        const subcategory = (category?.subcategories || []).find((s) => s.name === subcategoryName) || category?.subcategories?.[0];
        openModal(
            { open: true, entity: 'material', mode: 'create', context: null },
            {
                code: '',
                name: '',
                categoryId: category?.id || '',
                subcategoryId: subcategory?.id || '',
                baseUnit: 'KG',
                buyPrice: '',
                basePrice: '',
            },
        );
    };

    const openEditMaterial = (materialId) => {
        const material = materialsById.get(materialId);
        if (!material) {
            setStatus('Materijal nije pronađen.');
            return;
        }
        openModal(
            { open: true, entity: 'material', mode: 'edit', context: { code: material.code } },
            {
                code: material.code || '',
                name: material.name || '',
                categoryId: material.categoryId || '',
                subcategoryId: material.subcategoryId || '',
                baseUnit: material.baseUnit || 'KG',
                buyPrice: material.buyPrice ?? '',
                basePrice: material.basePrice ?? '',
            },
        );
    };

    const openCreateVariant = (materialId = '') => {
        const material = materialsById.get(materialId) || materialsMeta[0];
        if (!material) {
            setStatus('Prvo dodaj materijal, pa podmaterijal.');
            return;
        }
        openModal(
            { open: true, entity: 'variant', mode: 'create', context: { code: material.code } },
            {
                materialId: material.id,
                grade: '',
                condition: 'Standard',
                buyPrice: material.buyPrice ?? '',
                minPurity: '',
            },
        );
    };

    const openEditVariant = (materialId, variantId) => {
        const material = materialsById.get(materialId);
        const variant = (material?.variants || []).find((v) => v.id === variantId);
        if (!material || !variant) {
            setStatus('Podmaterijal nije pronađen.');
            return;
        }
        openModal(
            { open: true, entity: 'variant', mode: 'edit', context: { code: material.code, variantId: variant.id } },
            {
                materialId: material.id,
                grade: variant.grade || '',
                condition: variant.condition || 'Standard',
                buyPrice: variant.buyPrice ?? '',
                minPurity: variant.minPurity ?? '',
            },
        );
    };

    const deleteCategory = async (categoryName) => {
        const category = taxonomyIndex.byCategoryName.get(categoryName);
        if (!category) return;
        if (!window.confirm(`Obrisati kategoriju "${category.name}"?`)) return;
        try {
            await api.delete(`/materials/taxonomy/categories/${category.id}`);
            setStatus('Kategorija obrisana.');
            await loadData();
        } catch (e) {
            setStatus(e?.response?.data?.error || 'Brisanje kategorije nije uspjelo.');
        }
    };

    const deleteSubcategory = async (categoryName, subcategoryName) => {
        const category = taxonomyIndex.byCategoryName.get(categoryName);
        const subcategory = (category?.subcategories || []).find((row) => row.name === subcategoryName);
        if (!subcategory) return;
        if (!window.confirm(`Obrisati podkategoriju "${subcategory.name}"?`)) return;
        try {
            await api.delete(`/materials/taxonomy/subcategories/${subcategory.id}`);
            setStatus('Podkategorija obrisana.');
            await loadData();
        } catch (e) {
            setStatus(e?.response?.data?.error || 'Brisanje podkategorije nije uspjelo.');
        }
    };

    const deleteMaterial = async (materialId) => {
        const material = materialsById.get(materialId);
        if (!material) return;
        if (!window.confirm(`Obrisati materijal "${material.name}"?`)) return;
        try {
            await api.delete(`/materials/${material.code}`);
            setStatus('Materijal obrisan.');
            await loadData();
        } catch (e) {
            setStatus(e?.response?.data?.error || 'Brisanje materijala nije uspjelo.');
        }
    };

    const deleteVariant = async (materialId, variantId) => {
        const material = materialsById.get(materialId);
        const variant = (material?.variants || []).find((row) => row.id === variantId);
        if (!material || !variant) return;
        if (!window.confirm(`Obrisati podmaterijal "${variant.grade}"?`)) return;
        try {
            await api.delete(`/materials/${material.code}/variants/${variant.id}`);
            setStatus('Podmaterijal obrisan.');
            await loadData();
        } catch (e) {
            setStatus(e?.response?.data?.error || 'Brisanje podmaterijala nije uspjelo.');
        }
    };

    const openStockModal = ({ mode, materialId, variantId = null, materialLabel, unitPrice = 0 }) => {
        if (!materialId) {
            setStatus('Nije moguće ažurirati stanje za ovu stavku.');
            return;
        }
        setStockModal({
            open: true,
            mode,
            materialId,
            materialLabel: materialLabel || 'Materijal',
            variantId,
            quantity: '',
            unitPrice: String(toNumber(unitPrice, 0)),
            note: '',
            zone: 'DEFAULT',
        });
    };

    const closeStockModal = () => {
        if (stockSaving) return;
        setStockModal((prev) => ({ ...prev, open: false }));
    };

    const submitStockModal = async (e) => {
        e.preventDefault();
        const quantity = toNumber(stockModal.quantity, 0);
        const unitPrice = toNumber(stockModal.unitPrice, 0);
        if (quantity <= 0) {
            setStatus('Količina mora biti veća od 0.');
            return;
        }
        setStockSaving(true);
        setStatus('');
        try {
            const endpoint = stockModal.mode === 'in' ? '/inventory/transactions/purchase' : '/inventory/transactions/sale';
            await api.post(endpoint, {
                materialId: stockModal.materialId,
                materialVariantId: stockModal.variantId || null,
                quantity,
                unitPrice,
                zone: stockModal.zone || 'DEFAULT',
                note: String(stockModal.note || '').trim() || null,
            });
            await loadData();
            setStatus(stockModal.mode === 'in' ? 'Stanje uspješno dodano.' : 'Stanje uspješno skinuto.');
            closeStockModal();
        } catch (err) {
            setStatus(err?.response?.data?.error || 'Promjena stanja nije uspjela.');
        } finally {
            setStockSaving(false);
        }
    };

    const submitModal = async (e) => {
        e.preventDefault();
        setSaving(true);
        setStatus('');
        try {
            if (modal.entity === 'category') {
                const payload = { name: String(form.name || '').trim() };
                if (!payload.name) throw new Error('Naziv kategorije je obavezan.');
                if (modal.mode === 'create') {
                    await api.post('/materials/taxonomy/categories', payload);
                } else {
                    await api.put(`/materials/taxonomy/categories/${modal.context.id}`, payload);
                }
            } else if (modal.entity === 'subcategory') {
                const payload = {
                    categoryId: String(form.categoryId || '').trim(),
                    name: String(form.name || '').trim(),
                };
                if (!payload.categoryId || !payload.name) throw new Error('Kategorija i naziv podkategorije su obavezni.');
                if (modal.mode === 'create') {
                    await api.post('/materials/taxonomy/subcategories', payload);
                } else {
                    await api.put(`/materials/taxonomy/subcategories/${modal.context.id}`, { name: payload.name });
                }
            } else if (modal.entity === 'material') {
                const selectedCategory = taxonomyIndex.byCategoryId.get(String(form.categoryId || ''));
                const selectedSubcategory = modalSubcategories.find((row) => row.id === form.subcategoryId);
                const payload = {
                    code: String(form.code || '').trim(),
                    name: String(form.name || '').trim(),
                    categoryId: String(form.categoryId || '').trim(),
                    subcategoryId: String(form.subcategoryId || '').trim(),
                    categoryName: selectedCategory?.name || '',
                    subcategoryName: selectedSubcategory?.name || '',
                    baseUnit: String(form.baseUnit || 'KG').trim() || 'KG',
                    buyPrice: toNumber(form.buyPrice, 0),
                    basePrice: toNumber(form.basePrice, 0),
                };
                if (!payload.code || !payload.name) throw new Error('Kod i naziv materijala su obavezni.');
                if (!payload.categoryId || !payload.subcategoryId) throw new Error('Kategorija i podkategorija su obavezne.');
                const legacyPayload = {
                    code: payload.code,
                    name: payload.name,
                    category: `${payload.categoryName || 'Nedefinisano'} / ${payload.subcategoryName || 'Opste'}`,
                    baseUnit: payload.baseUnit,
                    buyPrice: payload.buyPrice,
                    basePrice: payload.basePrice,
                };
                try {
                    if (modal.mode === 'create') {
                        await api.post('/materials', payload);
                    } else {
                        await api.put(`/materials/${modal.context.code}`, payload);
                    }
                } catch (materialErr) {
                    const msg = String(materialErr?.response?.data?.error || materialErr?.message || '');
                    const needsLegacyFallback = msg.toLowerCase().includes('unknown argument `categoryid`')
                        || msg.toLowerCase().includes('unknown argument categoryid');
                    if (!needsLegacyFallback) throw materialErr;
                    if (modal.mode === 'create') {
                        await api.post('/materials', legacyPayload);
                    } else {
                        await api.put(`/materials/${modal.context.code}`, legacyPayload);
                    }
                }
            } else if (modal.entity === 'variant') {
                const material = materialsById.get(form.materialId) || materialsMeta.find((row) => row.code === modal.context?.code);
                if (!material) throw new Error('Materijal za podmaterijal nije pronađen.');
                const payload = {
                    grade: String(form.grade || '').trim(),
                    condition: String(form.condition || 'Standard').trim() || 'Standard',
                    buyPrice: toNumber(form.buyPrice, 0),
                    minPurity: form.minPurity === '' ? null : toNumber(form.minPurity, 0),
                    chemicalData: {},
                };
                if (!payload.grade) throw new Error('Naziv podmaterijala je obavezan.');
                if (modal.mode === 'create') {
                    await api.post(`/materials/${material.code}/variants`, payload);
                } else {
                    await api.put(`/materials/${modal.context.code}/variants/${modal.context.variantId}`, payload);
                }
            }

            await loadData();
            closeModal();
            setStatus('Sačuvano.');
        } catch (err) {
            setStatus(err?.response?.data?.error || err?.message || 'Operacija nije uspjela.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ display: 'grid', gap: 12, height: '100%', alignContent: 'start' }}>
            <div style={{ background: '#fff', border: '1px solid #dbe3ee', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 800 }}>Inventory</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
                            Kategorija {'->'} Podkategorija {'->'} Materijal {'->'} Podmaterijal
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-primary" onClick={openCreateCategory}>+ Kategorija</button>
                        <button type="button" className="btn" onClick={() => openCreateSubcategory()}>+ Podkategorija</button>
                        <button type="button" className="btn" onClick={() => openCreateMaterial()}>+ Materijal</button>
                        <button type="button" className="btn" onClick={() => openCreateVariant()}>+ Podmaterijal</button>
                    </div>
                </div>

                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 160px 120px', gap: 8 }} className="controls-grid">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search..."
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }}
                    />
                    <select
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value)}
                        style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }}
                    >
                        <option value="name">Sort: Naziv</option>
                        <option value="stockKg">Sort: Stanje</option>
                    </select>
                    <select
                        value={sortDir}
                        onChange={(e) => setSortDir(e.target.value)}
                        style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }}
                    >
                        <option value="asc">ASC</option>
                        <option value="desc">DESC</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="pill">Ukupno: {fmtTons(totalKg)} t</span>
                <span className="pill alt">Kategorije: {filteredTree.length}</span>
                {status ? <span className="pill ok">{status}</span> : null}
            </div>

            <div style={{ background: '#fff', border: '1px solid #dbe3ee', borderRadius: 12, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 24, color: '#64748b' }}>Učitavanje...</div>
                ) : error ? (
                    <div style={{ padding: 24, color: '#b91c1c' }}>{error}</div>
                ) : (
                    <div className="responsive-table">
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th className="th-left">Naziv</th>
                                    <th className="th-left col-level">Nivo</th>
                                    <th className="th-right col-kg">Stanje (kg)</th>
                                    <th className="th-right col-tons">Stanje (t)</th>
                                    <th className="th-right col-buy">Nabavna</th>
                                    <th className="th-right col-market">Market</th>
                                    <th className="th-left col-actions">Akcije</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTree.map((category) => (
                                    <Fragment key={category.id}>
                                        <tr className="row-category">
                                            <td className="td-name">
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedCategories((prev) => ({ ...prev, [category.id]: !prev[category.id] }))}
                                                    className="toggle-btn"
                                                >
                                                    {expandedCategories[category.id] ? '▾' : '▸'} {category.name}
                                                    <span className="children-hint">{category.subcategories.length} podkat</span>
                                                </button>
                                            </td>
                                            <td className="td-subtle col-level"><span className="level-badge level-cat">Kategorija</span></td>
                                            <td className="td-right strong col-kg">{fmtKg(category.stockKg)}</td>
                                            <td className="td-right strong col-tons">{fmtTons(category.stockKg)}</td>
                                            <td className="td-right col-buy">-</td>
                                            <td className="td-right col-market">-</td>
                                            <td className="td-actions col-actions">
                                                <button type="button" className="mini" onClick={() => openEditCategory(category.name)}>Uredi</button>
                                                <button type="button" className="mini danger" onClick={() => deleteCategory(category.name)}>Obriši</button>
                                                <button type="button" className="mini" onClick={() => openCreateSubcategory(category.name)}>+ Podkat</button>
                                            </td>
                                        </tr>

                                        {expandedCategories[category.id] && category.subcategories.map((subcategory) => (
                                            <Fragment key={subcategory.id}>
                                                <tr className="row-subcategory">
                                                    <td className="td-name sub">
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpandedSubcategories((prev) => ({ ...prev, [subcategory.id]: !prev[subcategory.id] }))}
                                                            className="toggle-btn"
                                                        >
                                                            {expandedSubcategories[subcategory.id] ? '▾' : '▸'} {subcategory.name}
                                                            <span className="children-hint">{subcategory.materials.length} mat</span>
                                                        </button>
                                                    </td>
                                                    <td className="td-subtle col-level"><span className="level-badge level-sub">Podkategorija</span></td>
                                                    <td className="td-right col-kg">{fmtKg(subcategory.stockKg)}</td>
                                                    <td className="td-right col-tons">{fmtTons(subcategory.stockKg)}</td>
                                                    <td className="td-right col-buy">-</td>
                                                    <td className="td-right col-market">-</td>
                                                    <td className="td-actions col-actions">
                                                        <button type="button" className="mini" onClick={() => openEditSubcategory(category.name, subcategory.name)}>Uredi</button>
                                                        <button type="button" className="mini danger" onClick={() => deleteSubcategory(category.name, subcategory.name)}>Obriši</button>
                                                        <button type="button" className="mini" onClick={() => openCreateMaterial(category.name, subcategory.name)}>+ Mat</button>
                                                    </td>
                                                </tr>

                                                {expandedSubcategories[subcategory.id] && subcategory.materials.map((material) => (
                                                    <Fragment key={material.id}>
                                                        <tr className="row-material">
                                                            <td className="td-name mat">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setExpandedMaterials((prev) => ({ ...prev, [material.id]: !prev[material.id] }))}
                                                                    className="toggle-btn"
                                                                >
                                                                    {expandedMaterials[material.id] ? '▾' : '▸'} {material.name}
                                                                    <span className="children-hint">{material.variants.length} podmat</span>
                                                                </button>
                                                                <span className="code-chip">{material.code}</span>
                                                            </td>
                                                            <td className="td-subtle col-level"><span className="level-badge level-mat">Materijal</span></td>
                                                            <td className="td-right col-kg">{fmtKg(material.stockKg)}</td>
                                                            <td className="td-right col-tons">{fmtTons(material.stockKg)}</td>
                                                            <td className="td-right col-buy">-</td>
                                                            <td className="td-right col-market">-</td>
                                                            <td className="td-actions col-actions">
                                                                <button
                                                                    type="button"
                                                                    className="mini success"
                                                                    onClick={() => openStockModal({
                                                                        mode: 'in',
                                                                        materialId: material.materialId,
                                                                        materialLabel: `${material.code} - ${material.name}`,
                                                                        unitPrice: Number(materialsById.get(material.materialId)?.buyPrice || 0),
                                                                    })}
                                                                    disabled={!material.materialId}
                                                                >
                                                                    + Stanje
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="mini warn"
                                                                    onClick={() => openStockModal({
                                                                        mode: 'out',
                                                                        materialId: material.materialId,
                                                                        materialLabel: `${material.code} - ${material.name}`,
                                                                        unitPrice: Number(materialsById.get(material.materialId)?.buyPrice || 0),
                                                                    })}
                                                                    disabled={!material.materialId}
                                                                >
                                                                    - Stanje
                                                                </button>
                                                                <button type="button" className="mini" onClick={() => openEditMaterial(material.materialId)}>Uredi</button>
                                                                <button type="button" className="mini danger" onClick={() => deleteMaterial(material.materialId)}>Obriši</button>
                                                                <button type="button" className="mini" onClick={() => openCreateVariant(material.materialId)}>+ Podmat</button>
                                                            </td>
                                                        </tr>

                                                        {expandedMaterials[material.id] && material.variants.map((variant) => (
                                                            <tr key={variant.id} className="row-variant">
                                                                <td className="td-name var">- {variant.name}</td>
                                                                <td className="td-subtle col-level"><span className="level-badge level-var">Podmaterijal</span></td>
                                                                <td className="td-right col-kg">{fmtKg(variant.stockKg)}</td>
                                                                <td className="td-right col-tons">{fmtTons(variant.stockKg)}</td>
                                                                <td className="td-right col-buy">{fmtMoney(variant.avgBuyPrice)}</td>
                                                                <td className="td-right col-market">{fmtMoney(variant.mktPrice)}</td>
                                                                <td className="td-actions col-actions">
                                                                    <button
                                                                        type="button"
                                                                        className="mini success"
                                                                        onClick={() => openStockModal({
                                                                            mode: 'in',
                                                                            materialId: variant.materialId,
                                                                            variantId: variant.variantId,
                                                                            materialLabel: `${variant.materialCode || ''} - ${variant.name}`,
                                                                            unitPrice: variant.avgBuyPrice,
                                                                        })}
                                                                        disabled={!variant.variantId}
                                                                    >
                                                                        + Stanje
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="mini warn"
                                                                        onClick={() => openStockModal({
                                                                            mode: 'out',
                                                                            materialId: variant.materialId,
                                                                            variantId: variant.variantId,
                                                                            materialLabel: `${variant.materialCode || ''} - ${variant.name}`,
                                                                            unitPrice: variant.avgBuyPrice,
                                                                        })}
                                                                        disabled={!variant.variantId}
                                                                    >
                                                                        - Stanje
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="mini"
                                                                        onClick={() => openEditVariant(variant.materialId, variant.variantId)}
                                                                        disabled={!variant.variantId}
                                                                    >
                                                                        Uredi
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="mini danger"
                                                                        onClick={() => deleteVariant(variant.materialId, variant.variantId)}
                                                                        disabled={!variant.variantId}
                                                                    >
                                                                        Obriši
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </Fragment>
                                                ))}
                                            </Fragment>
                                        ))}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {modal.open && (
                <div className="modal-backdrop" onClick={closeModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: 0 }}>{modalTitle(modal.mode, modal.entity)}</h3>
                        <form onSubmit={submitModal} style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                            {(modal.entity === 'category' || modal.entity === 'subcategory' || modal.entity === 'material' || modal.entity === 'variant') && (
                                <>
                                    {(modal.entity === 'subcategory' || modal.entity === 'material') ? (
                                        <label className="field">
                                            <span>Kategorija</span>
                                            <select
                                                value={form.categoryId || ''}
                                                onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value, subcategoryId: '' }))}
                                                disabled={modal.entity === 'subcategory' && modal.mode === 'edit'}
                                            >
                                                <option value="">Odaberi kategoriju</option>
                                                {(taxonomyTree || []).map((cat) => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </label>
                                    ) : null}

                                    {(modal.entity === 'subcategory' || modal.entity === 'category') ? (
                                        <label className="field">
                                            <span>Naziv</span>
                                            <input
                                                value={form.name || ''}
                                                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                                placeholder="Naziv"
                                            />
                                        </label>
                                    ) : null}

                                    {modal.entity === 'material' ? (
                                        <>
                                            <label className="field">
                                                <span>Podkategorija</span>
                                                <select
                                                    value={form.subcategoryId || ''}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, subcategoryId: e.target.value }))}
                                                >
                                                    <option value="">Odaberi podkategoriju</option>
                                                    {modalSubcategories.map((sub) => (
                                                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="field">
                                                <span>Kod</span>
                                                <input
                                                    value={form.code || ''}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                                    placeholder="MAT-001"
                                                />
                                            </label>
                                            <label className="field">
                                                <span>Naziv</span>
                                                <input
                                                    value={form.name || ''}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                                    placeholder="Bakar milberry"
                                                />
                                            </label>
                                            <div className="split">
                                                <label className="field">
                                                    <span>Jedinica</span>
                                                    <input
                                                        value={form.baseUnit || 'KG'}
                                                        onChange={(e) => setForm((prev) => ({ ...prev, baseUnit: e.target.value }))}
                                                    />
                                                </label>
                                                <label className="field">
                                                    <span>Nabavna cijena</span>
                                                    <input
                                                        type="number"
                                                        step="0.0001"
                                                        value={form.buyPrice}
                                                        onChange={(e) => setForm((prev) => ({ ...prev, buyPrice: e.target.value }))}
                                                    />
                                                </label>
                                                <label className="field">
                                                    <span>Market cijena</span>
                                                    <input
                                                        type="number"
                                                        step="0.0001"
                                                        value={form.basePrice}
                                                        onChange={(e) => setForm((prev) => ({ ...prev, basePrice: e.target.value }))}
                                                    />
                                                </label>
                                            </div>
                                        </>
                                    ) : null}

                                    {modal.entity === 'variant' ? (
                                        <>
                                            <label className="field">
                                                <span>Materijal</span>
                                                <select
                                                    value={form.materialId || ''}
                                                    onChange={(e) => {
                                                        const m = materialsById.get(e.target.value);
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            materialId: e.target.value,
                                                            buyPrice: prev.buyPrice === '' ? (m?.buyPrice ?? '') : prev.buyPrice,
                                                        }));
                                                    }}
                                                    disabled={modal.mode === 'edit'}
                                                >
                                                    <option value="">Odaberi materijal</option>
                                                    {(materialsMeta || []).map((m) => (
                                                        <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <div className="split">
                                                <label className="field">
                                                    <span>Naziv podmaterijala</span>
                                                    <input
                                                        value={form.grade || ''}
                                                        onChange={(e) => setForm((prev) => ({ ...prev, grade: e.target.value }))}
                                                        placeholder="Bakar 2"
                                                    />
                                                </label>
                                                <label className="field">
                                                    <span>Condition</span>
                                                    <input
                                                        value={form.condition || 'Standard'}
                                                        onChange={(e) => setForm((prev) => ({ ...prev, condition: e.target.value }))}
                                                    />
                                                </label>
                                            </div>
                                            <div className="split">
                                                <label className="field">
                                                    <span>Nabavna cijena</span>
                                                    <input
                                                        type="number"
                                                        step="0.0001"
                                                        value={form.buyPrice}
                                                        onChange={(e) => setForm((prev) => ({ ...prev, buyPrice: e.target.value }))}
                                                    />
                                                </label>
                                                <label className="field">
                                                    <span>Min. čistoća (%)</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={form.minPurity}
                                                        onChange={(e) => setForm((prev) => ({ ...prev, minPurity: e.target.value }))}
                                                    />
                                                </label>
                                            </div>
                                        </>
                                    ) : null}
                                </>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                                <button type="button" className="btn" onClick={closeModal} disabled={saving}>Otkaži</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Čuvanje...' : 'Sačuvaj'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {stockModal.open && (
                <div className="modal-backdrop" onClick={closeStockModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: 0 }}>{stockModal.mode === 'in' ? 'Dodaj stanje' : 'Skini stanje'}</h3>
                        <div style={{ marginTop: 6, fontSize: 12, color: '#475569' }}>{stockModal.materialLabel}</div>
                        <form onSubmit={submitStockModal} style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                            <div className="split">
                                <label className="field">
                                    <span>Količina (kg)</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={stockModal.quantity}
                                        onChange={(e) => setStockModal((prev) => ({ ...prev, quantity: e.target.value }))}
                                    />
                                </label>
                                <label className="field">
                                    <span>Cijena po kg</span>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        value={stockModal.unitPrice}
                                        onChange={(e) => setStockModal((prev) => ({ ...prev, unitPrice: e.target.value }))}
                                    />
                                </label>
                                <label className="field">
                                    <span>Zona</span>
                                    <input
                                        value={stockModal.zone}
                                        onChange={(e) => setStockModal((prev) => ({ ...prev, zone: e.target.value }))}
                                    />
                                </label>
                            </div>
                            <label className="field">
                                <span>Napomena</span>
                                <input
                                    value={stockModal.note}
                                    onChange={(e) => setStockModal((prev) => ({ ...prev, note: e.target.value }))}
                                    placeholder="Opcionalno"
                                />
                            </label>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                                <button type="button" className="btn" onClick={closeStockModal} disabled={stockSaving}>Otkaži</button>
                                <button type="submit" className="btn btn-primary" disabled={stockSaving}>
                                    {stockSaving ? 'Čuvanje...' : (stockModal.mode === 'in' ? 'Dodaj stanje' : 'Skini stanje')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .controls-grid {
                    grid-template-columns: 1fr 160px 120px;
                }
                .responsive-table {
                    width: 100%;
                    overflow-x: auto;
                }
                .responsive-table table {
                    min-width: 1120px;
                }
                .th-left {
                    padding: 10px 12px;
                    border-bottom: 1px solid #e2e8f0;
                    text-align: left;
                    font-size: 12px;
                    color: #334155;
                }
                .th-left:first-child {
                    position: sticky;
                    left: 0;
                    z-index: 3;
                    background: #f8fafc;
                }
                .th-right {
                    padding: 10px 12px;
                    border-bottom: 1px solid #e2e8f0;
                    text-align: right;
                    font-size: 12px;
                    color: #334155;
                }
                .td-name {
                    padding: 10px 12px;
                    border-bottom: 1px solid #eef2f7;
                    position: sticky;
                    left: 0;
                    z-index: 2;
                    background: #fff;
                }
                .td-name.sub {
                    padding-left: 28px;
                }
                .td-name.mat {
                    padding-left: 46px;
                }
                .td-name.var {
                    padding-left: 66px;
                }
                .td-subtle {
                    padding: 10px 12px;
                    border-bottom: 1px solid #eef2f7;
                    color: #64748b;
                }
                .td-right {
                    padding: 10px 12px;
                    border-bottom: 1px solid #eef2f7;
                    text-align: right;
                }
                .td-right.strong {
                    font-weight: 700;
                }
                .td-actions {
                    padding: 8px 10px;
                    border-bottom: 1px solid #eef2f7;
                    min-width: 220px;
                    white-space: nowrap;
                }
                .row-category {
                    background: #eef4ff;
                }
                .row-category .td-name {
                    background: #eef4ff;
                    box-shadow: inset 4px 0 0 #2563eb;
                }
                .row-subcategory {
                    background: #f5f8ff;
                }
                .row-subcategory .td-name {
                    background: #f5f8ff;
                    box-shadow: inset 4px 0 0 #4f46e5;
                }
                .row-material {
                    background: #f8fbff;
                }
                .row-material .td-name {
                    background: #f8fbff;
                    box-shadow: inset 4px 0 0 #0891b2;
                }
                .row-variant {
                    background: #fafcff;
                }
                .row-variant .td-name {
                    background: #fafcff;
                    box-shadow: inset 4px 0 0 #64748b;
                }
                .toggle-btn {
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    font-weight: 700;
                    padding: 0;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }
                .children-hint {
                    display: inline-block;
                    font-size: 10px;
                    font-weight: 700;
                    color: #1e40af;
                    background: #dbeafe;
                    border: 1px solid #bfdbfe;
                    border-radius: 999px;
                    padding: 1px 6px;
                }
                .level-badge {
                    display: inline-block;
                    font-size: 10px;
                    font-weight: 800;
                    border-radius: 999px;
                    padding: 2px 8px;
                }
                .level-cat {
                    background: #dbeafe;
                    color: #1e3a8a;
                }
                .level-sub {
                    background: #e0e7ff;
                    color: #3730a3;
                }
                .level-mat {
                    background: #cffafe;
                    color: #155e75;
                }
                .level-var {
                    background: #e2e8f0;
                    color: #334155;
                }
                .code-chip {
                    margin-left: 8px;
                    font-size: 11px;
                    color: #475569;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    border-radius: 999px;
                    padding: 2px 6px;
                }
                .btn {
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    background: #fff;
                    color: #0f172a;
                    padding: 8px 10px;
                    cursor: pointer;
                    font-weight: 600;
                }
                .btn:hover {
                    border-color: #94a3b8;
                }
                .btn-primary {
                    background: #1d4ed8;
                    border-color: #1d4ed8;
                    color: #fff;
                }
                .btn-primary:hover {
                    background: #1e40af;
                    border-color: #1e40af;
                }
                .mini {
                    border: 1px solid #dbe3ee;
                    background: #fff;
                    color: #0f172a;
                    border-radius: 7px;
                    font-size: 11px;
                    padding: 5px 7px;
                    cursor: pointer;
                    margin-right: 6px;
                }
                .mini:last-child {
                    margin-right: 0;
                }
                .mini.danger {
                    color: #b91c1c;
                    border-color: #fecaca;
                    background: #fff5f5;
                }
                .mini.success {
                    color: #166534;
                    border-color: #bbf7d0;
                    background: #f0fdf4;
                }
                .mini.warn {
                    color: #92400e;
                    border-color: #fde68a;
                    background: #fffbeb;
                }
                .mini:disabled {
                    opacity: 0.45;
                    cursor: not-allowed;
                }
                .pill {
                    padding: 6px 10px;
                    border-radius: 999px;
                    background: #eef2ff;
                    color: #3730a3;
                    font-size: 12px;
                    font-weight: 700;
                }
                .pill.alt {
                    background: #ecfeff;
                    color: #155e75;
                }
                .pill.ok {
                    background: #ecfdf5;
                    color: #166534;
                }
                .modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.35);
                    display: grid;
                    place-items: center;
                    z-index: 40;
                    padding: 16px;
                }
                .modal {
                    width: min(760px, 100%);
                    background: #fff;
                    border: 1px solid #dbe3ee;
                    border-radius: 12px;
                    padding: 14px;
                    box-shadow: 0 22px 45px rgba(15, 23, 42, 0.2);
                }
                .field {
                    display: grid;
                    gap: 6px;
                }
                .field span {
                    font-size: 12px;
                    font-weight: 700;
                    color: #475569;
                }
                .field input,
                .field select {
                    width: 100%;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    padding: 9px 10px;
                    outline: none;
                }
                .field input:focus,
                .field select:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
                }
                .split {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                }
                @media (max-width: 900px) {
                    .controls-grid {
                        grid-template-columns: 1fr;
                    }
                    .col-level,
                    .col-tons,
                    .col-buy,
                    .col-market {
                        display: none;
                    }
                    .responsive-table table {
                        min-width: 760px;
                    }
                    .th-left,
                    .th-right,
                    .td-name,
                    .td-subtle,
                    .td-right {
                        font-size: 11px;
                    }
                    .td-actions {
                        min-width: 180px;
                        white-space: normal;
                    }
                    .mini {
                        padding: 4px 6px;
                        font-size: 10px;
                        margin-bottom: 4px;
                    }
                    .split {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}
