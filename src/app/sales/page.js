'use client';
import { useEffect, useMemo, useState } from 'react';
import { Globe2, PackageCheck, Pencil, Plus, Truck, Wallet } from 'lucide-react';
import Modal from '@/components/UI/Modal';
import MaterialPicker from '@/components/UI/MaterialPicker';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import StatCard from '@/components/UI/StatCard';
import Button from '@/components/UI/Button';
import Field from '@/components/UI/Field';
import Alert from '@/components/UI/Alert';
import SearchInput from '@/components/UI/SearchInput';
import EmptyState from '@/components/UI/EmptyState';
import { Badge, StatusBadge } from '@/components/UI/Badge';
import SalesLineItems from '@/components/Sales/SalesLineItems';
import api from '@/lib/api';
import { fmtDate, fmtKg, fmtMoney, fmtNum, fmtWeight } from '@/lib/format';
import { loadStockByMaterial } from '@/lib/stock';
import { normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

const SALES_STATUSES = ['Priprema dokumenata', 'Utovar', 'Završen'];
let lineSeq = 0;
const newLine = () => ({ id: `line-${Date.now()}-${lineSeq += 1}`, material: null, qtyKg: '', pricePerKg: '' });

function orderKg(order) {
    const items = order.items || [];
    return items.length ? items.reduce((sum, row) => sum + Number(row.qtyKg || 0), 0) : Number(order.qtyKg || 0);
}

export default function SalesPage() {
    const [ordersList, setOrdersList] = useState([]);
    const [listLoading, setListLoading] = useState(true);
    const [customers, setCustomers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [stockByMaterialId, setStockByMaterialId] = useState(new Map());
    const [showNew, setShowNew] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [materialPickerOpenFor, setMaterialPickerOpenFor] = useState(null);
    const [lineItems, setLineItems] = useState(() => [newLine()]);
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [pageInfo, setPageInfo] = useState('');
    const [search, setSearch] = useState('');
    const [formData, setFormData] = useState({ customerId: '', delivery: 'Domaća Prodaja', status: 'Priprema dokumenata', qtyKg: '', pricePerKg: '' });

    const refreshOrders = async () => {
        const res = await api.get('/sales/orders');
        setOrdersList(normalizeApiList(res));
    };

    useEffect(() => {
        refreshOrders().catch(() => setOrdersList([])).finally(() => setListLoading(false));
        api.get('/sourcing/customers').then((res) => {
            const data = normalizeApiList(res);
            setCustomers(data);
            if (data[0]) {
                setFormData((prev) => ({ ...prev, customerId: prev.customerId || data[0].id }));
            }
        }).catch(() => setCustomers([]));
        api.get('/materials').then((res) => setMaterials(normalizeApiList(res))).catch(() => setMaterials([]));
        loadStockByMaterial().then(setStockByMaterialId).catch(() => setStockByMaterialId(new Map()));
    }, []);

    const visibleOrders = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return ordersList;
        return ordersList.filter((o) => [o.code, o.customer?.name, o.status, ...(o.items || []).map((i) => i.material?.code)].join(' ').toLowerCase().includes(q));
    }, [ordersList, search]);

    const stats = useMemo(() => ({
        count: ordersList.length,
        kg: ordersList.reduce((sum, o) => sum + orderKg(o), 0),
        value: ordersList.reduce((sum, o) => sum + Number(o.total || 0), 0),
        exports: ordersList.filter((o) => o.exportDocs).length,
    }), [ordersList]);

    const updateLineItem = (id, updates) => {
        setLineItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    };
    const addLineItem = () => setLineItems((prev) => [...prev, newLine()]);
    const removeLineItem = (id) => setLineItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

    const openNew = () => {
        setLineItems([newLine()]);
        setFormData((prev) => ({ ...prev, delivery: 'Domaća Prodaja' }));
        setFormError('');
        setShowNew(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const items = lineItems.map((item) => {
            const backendMaterial = resolveBackendMaterial(materials, item.material);
            return {
                materialId: backendMaterial?.id,
                qtyKg: parseFloat(item.qtyKg) || 0,
                pricePerKg: parseFloat(item.pricePerKg) || 0,
            };
        }).filter((row) => row.materialId && row.qtyKg > 0);
        if (!formData.customerId) {
            setFormError('Odaberi kupca.');
            return;
        }
        if (!items.length || items.length !== lineItems.length) {
            setFormError('Svaka stavka mora imati materijal i količinu veću od 0.');
            return;
        }

        setLoading(true);
        setFormError('');
        try {
            const res = await api.post('/sales/orders', {
                customerId: formData.customerId,
                items,
                status: 'Priprema dokumenata',
                exportDocs: formData.delivery?.includes('Izvoz') || false,
            });
            await refreshOrders();
            loadStockByMaterial().then(setStockByMaterialId).catch(() => null);
            setLineItems([newLine()]);
            setShowNew(false);
            setPageInfo(`Prodajni nalog ${res?.data?.data?.code || ''} je kreiran i roba je skinuta sa stanja.`);
        } catch (error) {
            const message = error?.response?.data?.error || '';
            setFormError(message.startsWith('Insufficient stock') ? 'Nedovoljno stanja na skladištu za jednu od stavki.' : (message || 'Kreiranje naloga nije uspjelo.'));
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEdit = (o) => {
        setEditingOrder(o);
        const items = o.items || [];
        const single = items.length <= 1 ? (items[0] || { qtyKg: o.qtyKg, pricePerKg: o.pricePerKg }) : null;
        setFormData({
            customerId: o.customerId || o.customer?.id || '',
            delivery: o.exportDocs ? 'Izvoz (EU)' : 'Domaća Prodaja',
            status: o.status || 'Priprema dokumenata',
            qtyKg: single ? String(Number(single.qtyKg || 0)) : '',
            pricePerKg: single ? String(Number(single.pricePerKg || 0)) : '',
        });
        setFormError('');
        setShowEdit(true);
    };

    const editingItems = editingOrder?.items || [];
    const editingIsSingle = editingItems.length <= 1;

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingOrder) return;
        setLoading(true);
        setFormError('');
        const payload = {
            customerId: formData.customerId,
            exportDocs: formData.delivery?.includes('Izvoz'),
            status: formData.status,
        };
        if (editingIsSingle) {
            const materialId = editingItems[0]?.materialId || editingOrder.materialId;
            const qty = parseFloat(formData.qtyKg) || 0;
            const price = parseFloat(formData.pricePerKg) || 0;
            if (materialId && qty > 0) {
                // šalje i stavku, da zaglavlje i stavka ostanu usklađeni
                payload.items = [{ materialId, qtyKg: qty, pricePerKg: price }];
            }
        }
        try {
            await api.put(`/sales/orders/${editingOrder.id}`, payload);
            await refreshOrders();
            setShowEdit(false);
            setPageInfo(`Nalog ${editingOrder.code} je sačuvan.`);
            setEditingOrder(null);
        } catch (error) {
            setFormError(error?.response?.data?.error || 'Čuvanje nije uspjelo.');
        } finally {
            setLoading(false);
        }
    };

    const customerSelect = (
        <select className="ui-input" value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })} required>
            {!customers.length && <option value="">Nema kupaca</option>}
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
    );
    const deliverySelect = (
        <select className="ui-input" value={formData.delivery} onChange={(e) => setFormData({ ...formData, delivery: e.target.value })}>
            <option value="Domaća Prodaja">Domaća prodaja</option>
            <option value="Izvoz (EU)">Izvoz (EU)</option>
        </select>
    );

    return (
        <div className="ui-page">
            <PageHeader
                title="Prodaja i izdavanje"
                subtitle="Prodajni nalozi — kreiranjem naloga roba se odmah skida sa stanja aktivne lokacije"
                actions={<Button icon={Plus} onClick={openNew}>Novi prodajni nalog</Button>}
            />

            {pageInfo && <Alert tone="success" onClose={() => setPageInfo('')}>{pageInfo}</Alert>}

            <div className="ui-kpi-grid">
                <StatCard label="Prodajni nalozi" icon={PackageCheck} value={fmtNum(stats.count)} loading={listLoading} />
                <StatCard label="Ukupno izdano" icon={Truck} tone="orange" value={fmtWeight(stats.kg)} loading={listLoading} />
                <StatCard label="Vrijednost" icon={Wallet} tone="success" value={fmtMoney(stats.value, 0)} loading={listLoading} />
                <StatCard label="Izvozni nalozi" icon={Globe2} value={fmtNum(stats.exports)} loading={listLoading} />
            </div>

            <Card flush>
                <div className="ui-toolbar" style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
                    <SearchInput className="grow" value={search} onChange={setSearch} placeholder="Pretraži broj, kupca, materijal, status..." />
                </div>
                {listLoading ? (
                    <div className="stack" style={{ padding: 18, gap: 10 }}>{[0, 1].map((i) => <div key={i} className="ui-skeleton" style={{ height: 40 }} />)}</div>
                ) : visibleOrders.length === 0 ? (
                    <EmptyState
                        icon={PackageCheck}
                        title={ordersList.length ? 'Nema naloga za pretragu' : 'Još nema prodajnih naloga'}
                        text={ordersList.length ? undefined : 'Kreiraj prvi nalog — stanje skladišta se provjerava pri kreiranju.'}
                        action={!ordersList.length && <Button icon={Plus} onClick={openNew}>Novi prodajni nalog</Button>}
                    />
                ) : (
                    <div className="ui-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Broj</th>
                                    <th>Datum</th>
                                    <th>Kupac</th>
                                    <th>Materijali</th>
                                    <th className="num">Količina</th>
                                    <th className="num">Ukupno</th>
                                    <th>Isporuka</th>
                                    <th>Status</th>
                                    <th style={{ width: 52 }} />
                                </tr>
                            </thead>
                            <tbody>
                                {visibleOrders.map((s) => (
                                    <tr key={s.id}>
                                        <td className="font-code" style={{ fontWeight: 600 }}>{s.code || s.id}</td>
                                        <td>{fmtDate(s.createdAt)}</td>
                                        <td style={{ fontWeight: 500 }}>{s.customer?.name || '-'}</td>
                                        <td className="font-code" style={{ fontSize: 12 }}>{(s.items || []).length ? s.items.map((i) => i.material?.code || '-').join(', ') : (s.material?.code || '-')}</td>
                                        <td className="num">{fmtKg(orderKg(s))}</td>
                                        <td className="num" style={{ fontWeight: 700 }}>{fmtMoney(s.total)}</td>
                                        <td>{s.exportDocs ? <Badge tone="violet">Izvoz</Badge> : <Badge tone="outline">Domaće</Badge>}</td>
                                        <td><StatusBadge status={s.status} /></td>
                                        <td><Button variant="ghost" size="sm" icon={Pencil} aria-label={`Uredi ${s.code}`} title="Uredi" onClick={() => handleOpenEdit(s)} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Novi prodajni nalog" subtitle="Roba se skida sa stanja odmah pri kreiranju" width={900}>
                <form onSubmit={handleSubmit} className="stack" style={{ gap: 18 }}>
                    <div className="ui-form-grid">
                        <Field label="Kupac" required>{customerSelect}</Field>
                        <Field label="Isporuka">{deliverySelect}</Field>
                    </div>
                    <div>
                        <div className="ui-section-title">Stavke naloga</div>
                        <SalesLineItems
                            lineItems={lineItems}
                            materials={materials}
                            stockByMaterialId={stockByMaterialId}
                            onUpdate={updateLineItem}
                            onAdd={addLineItem}
                            onRemove={removeLineItem}
                            onPickMaterial={setMaterialPickerOpenFor}
                        />
                    </div>
                    {formError && <Alert tone="danger">{formError}</Alert>}
                    <div className="ui-modal-footer" style={{ marginTop: 0 }}>
                        <Button variant="secondary" onClick={() => setShowNew(false)}>Odustani</Button>
                        <Button type="submit" disabled={loading}>{loading ? 'Čuvanje...' : 'Kreiraj nalog'}</Button>
                    </div>
                </form>
            </Modal>

            <MaterialPicker
                open={Boolean(materialPickerOpenFor)}
                onClose={() => setMaterialPickerOpenFor(null)}
                onSelect={({ material }) => {
                    if (!materialPickerOpenFor) return;
                    updateLineItem(materialPickerOpenFor, { material });
                    setMaterialPickerOpenFor(null);
                }}
            />

            <Modal open={showEdit} onClose={() => { setShowEdit(false); setEditingOrder(null); }} title={`Uredi nalog ${editingOrder?.code || ''}`} width={600}>
                {editingOrder && (
                    <form onSubmit={handleSaveEdit}>
                        <div className="ui-form-grid">
                            <Field label="Kupac">{customerSelect}</Field>
                            <Field label="Isporuka">{deliverySelect}</Field>
                            <Field label="Status">
                                <select className="ui-input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                                    {[...new Set([...SALES_STATUSES, formData.status].filter(Boolean))].map((st) => <option key={st} value={st}>{st}</option>)}
                                </select>
                            </Field>
                            {editingIsSingle && (
                                <>
                                    <Field label="Količina (kg)">
                                        <input type="number" className="ui-input font-mono" value={formData.qtyKg} onChange={(e) => setFormData({ ...formData, qtyKg: e.target.value })} />
                                    </Field>
                                    <Field label="Cijena (KM/kg)">
                                        <input type="number" step={0.01} className="ui-input font-mono" value={formData.pricePerKg} onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })} />
                                    </Field>
                                </>
                            )}
                        </div>
                        <Alert tone="info" style={{ marginTop: 14 }}>
                            {editingIsSingle
                                ? 'Izmjena količine mijenja nalog, ali ne koriguje stanje skladišta.'
                                : 'Nalog ima više stavki — ovdje se mijenjaju kupac, isporuka i status.'}
                        </Alert>
                        {formError && <Alert tone="danger" style={{ marginTop: 10 }}>{formError}</Alert>}
                        <div className="ui-modal-footer">
                            <Button variant="secondary" onClick={() => { setShowEdit(false); setEditingOrder(null); }}>Odustani</Button>
                            <Button type="submit" disabled={loading}>{loading ? 'Čuvanje...' : 'Sačuvaj'}</Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
