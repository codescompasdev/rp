'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowDownWideNarrow,
    ArrowUpNarrowWide,
    Boxes,
    ChevronRight,
    ChevronsDownUp,
    ChevronsUpDown,
    FilePlus2,
    FolderPlus,
    Layers,
    Package,
    PackageMinus,
    PackagePlus,
    Pencil,
    Plus,
    Trash2,
    Wallet,
} from 'lucide-react';
import api from '@/lib/api';
import Modal from '@/components/UI/Modal';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import StatCard from '@/components/UI/StatCard';
import Button from '@/components/UI/Button';
import Field from '@/components/UI/Field';
import Alert from '@/components/UI/Alert';
import SearchInput from '@/components/UI/SearchInput';
import EmptyState from '@/components/UI/EmptyState';
import { Badge } from '@/components/UI/Badge';
import { fmtNum as fmtNumber } from '@/lib/format';

const NUM_LOCALE = 'de-DE';

function fmtKg(value) {
    return Number(value || 0).toLocaleString(NUM_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtTons(valueKg) {
    return (Number(valueKg || 0) / 1000).toLocaleString(NUM_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMoney(value) {
    return Number(value || 0).toLocaleString(NUM_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

    const totalValue = rows.reduce((sum, row) => sum + toNumber(row.stockKg) * toNumber(row.avgBuyPrice), 0);
    const negativeRows = rows.filter((row) => toNumber(row.stockKg) < -0.009).length;
    const materialCount = new Set(rows.map((row) => row.materialId).filter(Boolean)).size;
    const statusTone = /nije|neusp|greš|error|failed/i.test(status) ? 'danger' : 'success';

    const expandAll = () => {
        const cats = {};
        const subs = {};
        filteredTree.forEach((category) => {
            cats[category.id] = true;
            category.subcategories.forEach((subcategory) => { subs[subcategory.id] = true; });
        });
        setExpandedCategories(cats);
        setExpandedSubcategories(subs);
    };
    const collapseAll = () => {
        setExpandedCategories({});
        setExpandedSubcategories({});
        setExpandedMaterials({});
    };

    const IconAction = ({ icon, label, onClick, disabled, tone }) => (
        <Button variant={tone === 'danger' ? 'ghost' : 'ghost'} size="sm" icon={icon} aria-label={label} title={label} onClick={onClick} disabled={disabled} className={tone === 'danger' ? 'inv-danger' : tone === 'success' ? 'inv-success' : tone === 'warn' ? 'inv-warn' : ''} />
    );

    return (
        <div className="ui-page">
            <PageHeader
                title="Materijali"
                subtitle="Katalog i stanje · Kategorija → Podkategorija → Materijal → Podmaterijal"
                actions={(
                    <>
                        <Button variant="secondary" icon={Plus} onClick={() => openCreateSubcategory()}>Podkategorija</Button>
                        <Button variant="secondary" icon={Plus} onClick={() => openCreateMaterial()}>Materijal</Button>
                        <Button variant="secondary" icon={Plus} onClick={() => openCreateVariant()}>Podmaterijal</Button>
                        <Button icon={Plus} onClick={openCreateCategory}>Kategorija</Button>
                    </>
                )}
            />

            <div className="ui-kpi-grid">
                <StatCard label="Ukupno stanje" icon={Boxes} value={`${fmtTons(totalKg)} t`} hint={`${fmtKg(totalKg)} kg${query ? ' · filtrirano' : ''}`} loading={loading} />
                <StatCard label="Vrijednost zalihe" icon={Wallet} tone="success" value={`${fmtMoney(totalValue)} KM`} hint="stanje × prosječna nabavna" loading={loading} />
                <StatCard label="Materijala" icon={Package} value={fmtNumber(materialCount)} hint={`${fmtNumber(filteredTree.length)} kategorija`} loading={loading} />
                <StatCard label="Negativno stanje" icon={AlertTriangle} tone={negativeRows ? 'danger' : 'success'} value={fmtNumber(negativeRows)} hint={negativeRows ? 'stavki za provjeru' : 'sve u redu'} loading={loading} />
            </div>

            {status && <Alert tone={statusTone} onClose={() => setStatus('')}>{status}</Alert>}

            <Card flush>
                <div className="ui-toolbar" style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
                    <SearchInput className="grow" value={search} onChange={setSearch} placeholder="Pretraži kategoriju, materijal, šifru ili podmaterijal..." />
                    <select className="ui-input" style={{ width: 'auto' }} value={sortKey} onChange={(e) => setSortKey(e.target.value)} aria-label="Sortiranje">
                        <option value="name">Sortiraj: naziv</option>
                        <option value="stockKg">Sortiraj: stanje</option>
                    </select>
                    <Button variant="secondary" icon={sortDir === 'asc' ? ArrowUpNarrowWide : ArrowDownWideNarrow} onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}>
                        {sortDir === 'asc' ? 'Rastuće' : 'Opadajuće'}
                    </Button>
                    <Button variant="ghost" icon={ChevronsUpDown} onClick={expandAll}>Proširi sve</Button>
                    <Button variant="ghost" icon={ChevronsDownUp} onClick={collapseAll}>Skupi sve</Button>
                </div>

                {loading ? (
                    <div className="stack" style={{ padding: 18, gap: 10 }}>
                        {[0, 1, 2, 3].map((i) => <div key={i} className="ui-skeleton" style={{ height: 40 }} />)}
                    </div>
                ) : error ? (
                    <div style={{ padding: 18 }}><Alert tone="danger">{error}</Alert></div>
                ) : filteredTree.length === 0 ? (
                    <EmptyState icon={Boxes} title={query ? 'Nema rezultata pretrage' : 'Katalog je prazan'} />
                ) : (
                    <div className="ui-table-wrap">
                        <table className="inv-table">
                            <thead>
                                <tr>
                                    <th>Naziv</th>
                                    <th>Nivo</th>
                                    <th className="num">Stanje (kg)</th>
                                    <th className="num">Stanje (t)</th>
                                    <th className="num">Nabavna</th>
                                    <th className="num">Market</th>
                                    <th style={{ textAlign: 'right' }}>Akcije</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTree.map((category) => (
                                    <Fragment key={category.id}>
                                        <tr className="inv-row inv-cat">
                                            <td>
                                                <button
                                                    type="button"
                                                    className="inv-toggle"
                                                    aria-expanded={Boolean(expandedCategories[category.id])}
                                                    onClick={() => setExpandedCategories((prev) => ({ ...prev, [category.id]: !prev[category.id] }))}
                                                >
                                                    <ChevronRight size={15} className="inv-chev" />
                                                    <span>{category.name}</span>
                                                    <span className="inv-hint">{category.subcategories.length} podkat.</span>
                                                </button>
                                            </td>
                                            <td><Badge tone="info">Kategorija</Badge></td>
                                            <td className="num" style={{ fontWeight: 700 }}>{fmtKg(category.stockKg)}</td>
                                            <td className="num" style={{ fontWeight: 700 }}>{fmtTons(category.stockKg)}</td>
                                            <td className="num muted">—</td>
                                            <td className="num muted">—</td>
                                            <td>
                                                <div className="inv-actions">
                                                    <IconAction icon={FolderPlus} label="Dodaj podkategoriju" onClick={() => openCreateSubcategory(category.name)} />
                                                    <IconAction icon={Pencil} label="Uredi kategoriju" onClick={() => openEditCategory(category.name)} />
                                                    <IconAction icon={Trash2} label="Obriši kategoriju" tone="danger" onClick={() => deleteCategory(category.name)} />
                                                </div>
                                            </td>
                                        </tr>

                                        {expandedCategories[category.id] && category.subcategories.map((subcategory) => (
                                            <Fragment key={subcategory.id}>
                                                <tr className="inv-row inv-sub">
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="inv-toggle"
                                                            style={{ paddingLeft: 22 }}
                                                            aria-expanded={Boolean(expandedSubcategories[subcategory.id])}
                                                            onClick={() => setExpandedSubcategories((prev) => ({ ...prev, [subcategory.id]: !prev[subcategory.id] }))}
                                                        >
                                                            <ChevronRight size={15} className="inv-chev" />
                                                            <span>{subcategory.name}</span>
                                                            <span className="inv-hint">{subcategory.materials.length} mat.</span>
                                                        </button>
                                                    </td>
                                                    <td><Badge tone="violet">Podkategorija</Badge></td>
                                                    <td className="num" style={{ fontWeight: 600 }}>{fmtKg(subcategory.stockKg)}</td>
                                                    <td className="num">{fmtTons(subcategory.stockKg)}</td>
                                                    <td className="num muted">—</td>
                                                    <td className="num muted">—</td>
                                                    <td>
                                                        <div className="inv-actions">
                                                            <IconAction icon={FilePlus2} label="Dodaj materijal" onClick={() => openCreateMaterial(category.name, subcategory.name)} />
                                                            <IconAction icon={Pencil} label="Uredi podkategoriju" onClick={() => openEditSubcategory(category.name, subcategory.name)} />
                                                            <IconAction icon={Trash2} label="Obriši podkategoriju" tone="danger" onClick={() => deleteSubcategory(category.name, subcategory.name)} />
                                                        </div>
                                                    </td>
                                                </tr>

                                                {expandedSubcategories[subcategory.id] && subcategory.materials.map((material) => (
                                                    <Fragment key={material.id}>
                                                        <tr className="inv-row inv-mat">
                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    className="inv-toggle"
                                                                    style={{ paddingLeft: 44 }}
                                                                    aria-expanded={Boolean(expandedMaterials[material.id])}
                                                                    onClick={() => setExpandedMaterials((prev) => ({ ...prev, [material.id]: !prev[material.id] }))}
                                                                >
                                                                    <ChevronRight size={15} className="inv-chev" />
                                                                    <span className="inv-code">{material.code}</span>
                                                                    <span>{material.name}</span>
                                                                    <span className="inv-hint">{material.variants.length} podmat.</span>
                                                                </button>
                                                            </td>
                                                            <td><Badge tone="success">Materijal</Badge></td>
                                                            <td className="num" style={{ fontWeight: 600, color: toNumber(material.stockKg) < 0 ? 'var(--danger-ink)' : undefined }}>{fmtKg(material.stockKg)}</td>
                                                            <td className="num">{fmtTons(material.stockKg)}</td>
                                                            <td className="num muted">—</td>
                                                            <td className="num muted">—</td>
                                                            <td>
                                                                <div className="inv-actions">
                                                                    <IconAction
                                                                        icon={PackagePlus}
                                                                        label="Dodaj stanje"
                                                                        tone="success"
                                                                        disabled={!material.materialId}
                                                                        onClick={() => openStockModal({
                                                                            mode: 'in',
                                                                            materialId: material.materialId,
                                                                            materialLabel: `${material.code} - ${material.name}`,
                                                                            unitPrice: Number(materialsById.get(material.materialId)?.buyPrice || 0),
                                                                        })}
                                                                    />
                                                                    <IconAction
                                                                        icon={PackageMinus}
                                                                        label="Skini stanje"
                                                                        tone="warn"
                                                                        disabled={!material.materialId}
                                                                        onClick={() => openStockModal({
                                                                            mode: 'out',
                                                                            materialId: material.materialId,
                                                                            materialLabel: `${material.code} - ${material.name}`,
                                                                            unitPrice: Number(materialsById.get(material.materialId)?.buyPrice || 0),
                                                                        })}
                                                                    />
                                                                    <IconAction icon={Layers} label="Dodaj podmaterijal" onClick={() => openCreateVariant(material.materialId)} />
                                                                    <IconAction icon={Pencil} label="Uredi materijal" onClick={() => openEditMaterial(material.materialId)} />
                                                                    <IconAction icon={Trash2} label="Obriši materijal" tone="danger" onClick={() => deleteMaterial(material.materialId)} />
                                                                </div>
                                                            </td>
                                                        </tr>

                                                        {expandedMaterials[material.id] && material.variants.map((variant) => (
                                                            <tr key={variant.id} className="inv-row inv-var">
                                                                <td><span className="inv-var-name">{variant.name}</span></td>
                                                                <td><Badge tone="outline">Podmaterijal</Badge></td>
                                                                <td className="num" style={{ color: toNumber(variant.stockKg) < 0 ? 'var(--danger-ink)' : undefined }}>{fmtKg(variant.stockKg)}</td>
                                                                <td className="num">{fmtTons(variant.stockKg)}</td>
                                                                <td className="num">{fmtMoney(variant.avgBuyPrice)}</td>
                                                                <td className="num">{fmtMoney(variant.mktPrice)}</td>
                                                                <td>
                                                                    <div className="inv-actions">
                                                                        <IconAction
                                                                            icon={PackagePlus}
                                                                            label="Dodaj stanje"
                                                                            tone="success"
                                                                            disabled={!variant.variantId}
                                                                            onClick={() => openStockModal({
                                                                                mode: 'in',
                                                                                materialId: variant.materialId,
                                                                                variantId: variant.variantId,
                                                                                materialLabel: `${variant.materialCode || ''} - ${variant.name}`,
                                                                                unitPrice: variant.avgBuyPrice,
                                                                            })}
                                                                        />
                                                                        <IconAction
                                                                            icon={PackageMinus}
                                                                            label="Skini stanje"
                                                                            tone="warn"
                                                                            disabled={!variant.variantId}
                                                                            onClick={() => openStockModal({
                                                                                mode: 'out',
                                                                                materialId: variant.materialId,
                                                                                variantId: variant.variantId,
                                                                                materialLabel: `${variant.materialCode || ''} - ${variant.name}`,
                                                                                unitPrice: variant.avgBuyPrice,
                                                                            })}
                                                                        />
                                                                        <IconAction icon={Pencil} label="Uredi podmaterijal" disabled={!variant.variantId} onClick={() => openEditVariant(variant.materialId, variant.variantId)} />
                                                                        <IconAction icon={Trash2} label="Obriši podmaterijal" tone="danger" disabled={!variant.variantId} onClick={() => deleteVariant(variant.materialId, variant.variantId)} />
                                                                    </div>
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
            </Card>

            <Modal open={modal.open} onClose={closeModal} title={modalTitle(modal.mode, modal.entity)} width={620}>
                <form onSubmit={submitModal}>
                    <div className="ui-form-grid">
                        {(modal.entity === 'subcategory' || modal.entity === 'material') && (
                            <Field label="Kategorija" span={modal.entity === 'subcategory' ? 'all' : undefined}>
                                <select
                                    className="ui-input"
                                    value={form.categoryId || ''}
                                    onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value, subcategoryId: '' }))}
                                    disabled={modal.entity === 'subcategory' && modal.mode === 'edit'}
                                >
                                    <option value="">Odaberi kategoriju</option>
                                    {(taxonomyTree || []).map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </Field>
                        )}

                        {(modal.entity === 'subcategory' || modal.entity === 'category') && (
                            <Field label="Naziv" required span="all">
                                <input className="ui-input" value={form.name || ''} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Naziv" autoFocus />
                            </Field>
                        )}

                        {modal.entity === 'material' && (
                            <>
                                <Field label="Podkategorija">
                                    <select className="ui-input" value={form.subcategoryId || ''} onChange={(e) => setForm((prev) => ({ ...prev, subcategoryId: e.target.value }))}>
                                        <option value="">Odaberi podkategoriju</option>
                                        {modalSubcategories.map((sub) => (
                                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Šifra" required>
                                    <input className="ui-input font-code" value={form.code || ''} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} placeholder="MAT-001" />
                                </Field>
                                <Field label="Naziv" required>
                                    <input className="ui-input" value={form.name || ''} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Bakar milberry" />
                                </Field>
                                <Field label="Jedinica">
                                    <input className="ui-input" value={form.baseUnit || 'KG'} onChange={(e) => setForm((prev) => ({ ...prev, baseUnit: e.target.value }))} />
                                </Field>
                                <Field label="Nabavna cijena (KM/kg)">
                                    <input type="number" step="0.0001" className="ui-input font-mono" value={form.buyPrice} onChange={(e) => setForm((prev) => ({ ...prev, buyPrice: e.target.value }))} />
                                </Field>
                                <Field label="Market cijena (KM/kg)">
                                    <input type="number" step="0.0001" className="ui-input font-mono" value={form.basePrice} onChange={(e) => setForm((prev) => ({ ...prev, basePrice: e.target.value }))} />
                                </Field>
                            </>
                        )}

                        {modal.entity === 'variant' && (
                            <>
                                <Field label="Materijal" span="all">
                                    <select
                                        className="ui-input"
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
                                </Field>
                                <Field label="Naziv podmaterijala" required>
                                    <input className="ui-input" value={form.grade || ''} onChange={(e) => setForm((prev) => ({ ...prev, grade: e.target.value }))} placeholder="Bakar 2" />
                                </Field>
                                <Field label="Stanje (condition)">
                                    <input className="ui-input" value={form.condition || 'Standard'} onChange={(e) => setForm((prev) => ({ ...prev, condition: e.target.value }))} />
                                </Field>
                                <Field label="Nabavna cijena (KM/kg)">
                                    <input type="number" step="0.0001" className="ui-input font-mono" value={form.buyPrice} onChange={(e) => setForm((prev) => ({ ...prev, buyPrice: e.target.value }))} />
                                </Field>
                                <Field label="Min. čistoća (%)">
                                    <input type="number" step="0.01" className="ui-input font-mono" value={form.minPurity} onChange={(e) => setForm((prev) => ({ ...prev, minPurity: e.target.value }))} />
                                </Field>
                            </>
                        )}
                    </div>
                    <div className="ui-modal-footer">
                        <Button variant="secondary" onClick={closeModal} disabled={saving}>Otkaži</Button>
                        <Button type="submit" disabled={saving}>{saving ? 'Čuvanje...' : 'Sačuvaj'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                open={stockModal.open}
                onClose={closeStockModal}
                title={stockModal.mode === 'in' ? 'Dodaj stanje' : 'Skini stanje'}
                subtitle={stockModal.materialLabel}
                width={560}
            >
                <form onSubmit={submitStockModal}>
                    <Alert tone={stockModal.mode === 'in' ? 'info' : 'warning'}>
                        {stockModal.mode === 'in' ? 'Ručna korekcija: stanje se uvećava i knjiži kao ulaz.' : 'Ručna korekcija: stanje se umanjuje i knjiži kao izlaz.'}
                    </Alert>
                    <div className="ui-form-grid" style={{ marginTop: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                        <Field label="Količina (kg)" required>
                            <input type="number" step="0.01" className="ui-input font-mono" value={stockModal.quantity} onChange={(e) => setStockModal((prev) => ({ ...prev, quantity: e.target.value }))} autoFocus />
                        </Field>
                        <Field label="Cijena po kg">
                            <input type="number" step="0.0001" className="ui-input font-mono" value={stockModal.unitPrice} onChange={(e) => setStockModal((prev) => ({ ...prev, unitPrice: e.target.value }))} />
                        </Field>
                        <Field label="Zona">
                            <input className="ui-input" value={stockModal.zone} onChange={(e) => setStockModal((prev) => ({ ...prev, zone: e.target.value }))} />
                        </Field>
                        <Field label="Napomena" span="all">
                            <input className="ui-input" value={stockModal.note} onChange={(e) => setStockModal((prev) => ({ ...prev, note: e.target.value }))} placeholder="Opciono" />
                        </Field>
                    </div>
                    <div className="ui-modal-footer">
                        <Button variant="secondary" onClick={closeStockModal} disabled={stockSaving}>Otkaži</Button>
                        <Button type="submit" variant={stockModal.mode === 'in' ? 'success' : 'warning'} disabled={stockSaving}>
                            {stockSaving ? 'Čuvanje...' : (stockModal.mode === 'in' ? 'Dodaj stanje' : 'Skini stanje')}
                        </Button>
                    </div>
                </form>
            </Modal>

            <style>{`
                .inv-table td { padding-top: 8px; padding-bottom: 8px; }
                .inv-cat { background: var(--surface-2); }
                .inv-cat:hover { background: var(--surface-3) !important; }
                .inv-toggle {
                    display: inline-flex; align-items: center; gap: 8px; padding: 2px 0; border: none; background: transparent;
                    font-weight: 600; font-size: 13px; color: var(--text); text-align: left; max-width: 520px;
                }
                .inv-toggle:hover:not(:disabled) { background: transparent; color: var(--primary-ink); }
                .inv-chev { color: var(--text-3); transition: transform .15s ease; flex-shrink: 0; }
                .inv-toggle[aria-expanded='true'] .inv-chev { transform: rotate(90deg); color: var(--primary); }
                .inv-cat .inv-toggle { font-weight: 700; }
                .inv-mat .inv-toggle { font-weight: 500; }
                .inv-hint { font-size: 11px; font-weight: 500; color: var(--text-3); white-space: nowrap; }
                .inv-code {
                    font-family: var(--font-code); font-size: 11.5px; font-weight: 600; color: var(--primary-ink);
                    background: var(--primary-50); padding: 1px 6px; border-radius: 5px; white-space: nowrap;
                }
                .inv-var-name { display: inline-block; padding-left: 70px; color: var(--text-2); position: relative; }
                .inv-var-name::before {
                    content: ''; position: absolute; left: 52px; top: 50%; width: 10px; height: 1px; background: var(--border-strong);
                }
                .inv-actions { display: flex; gap: 2px; justify-content: flex-end; }
                .inv-actions .inv-danger:hover:not(:disabled) { color: var(--danger-ink); background: var(--danger-50); }
                .inv-actions .inv-success { color: var(--success-ink); }
                .inv-actions .inv-success:hover:not(:disabled) { background: var(--success-50); }
                .inv-actions .inv-warn { color: var(--warning-ink); }
                .inv-actions .inv-warn:hover:not(:disabled) { background: var(--warning-50); }
            `}</style>
        </div>
    );
}
