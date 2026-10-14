'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import MaterialPicker from '@/components/UI/MaterialPicker';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import Field from '@/components/UI/Field';
import Alert from '@/components/UI/Alert';
import SalesLineItems from '@/components/Sales/SalesLineItems';
import api from '@/lib/api';
import { loadStockByMaterial } from '@/lib/stock';
import { normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

let lineSeq = 0;
const newLine = () => ({ id: `line-${Date.now()}-${lineSeq += 1}`, material: null, qtyKg: '', pricePerKg: '' });

export default function NewSalesOrderPage() {
    const router = useRouter();
    const [customers, setCustomers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [stockByMaterialId, setStockByMaterialId] = useState(new Map());
    const [pickerOpenFor, setPickerOpenFor] = useState(null);
    const [submitError, setSubmitError] = useState('');
    const [saving, setSaving] = useState(false);
    const [lineItems, setLineItems] = useState(() => [newLine()]);
    const [form, setForm] = useState({ customerId: '', delivery: 'Domaća Prodaja' });

    useEffect(() => {
        api.get('/sourcing/customers').then((res) => {
            const data = normalizeApiList(res);
            setCustomers(data);
            if (data[0]) {
                setForm((prev) => ({ ...prev, customerId: data[0].id }));
            }
        }).catch(() => setCustomers([]));
        api.get('/materials').then((res) => setMaterials(normalizeApiList(res))).catch(() => setMaterials([]));
        loadStockByMaterial().then(setStockByMaterialId).catch(() => setStockByMaterialId(new Map()));
    }, []);

    const updateLineItem = (id, updates) => {
        setLineItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    };

    const handleCreate = async () => {
        if (!form.customerId || !lineItems.length) {
            setSubmitError('Odaberi kupca i dodaj bar jednu stavku prije kreiranja naloga.');
            return;
        }
        const items = lineItems.map((item) => {
            const backendMaterial = resolveBackendMaterial(materials, item.material);
            return {
                materialId: backendMaterial?.id,
                qtyKg: Number(item.qtyKg || 0),
                pricePerKg: Number(item.pricePerKg || 0),
            };
        }).filter((row) => row.materialId && row.qtyKg > 0);

        if (!items.length || items.length !== lineItems.length) {
            setSubmitError('Svaka stavka mora imati materijal i količinu veću od 0.');
            return;
        }

        setSaving(true);
        try {
            await api.post('/sales/orders', {
                customerId: form.customerId,
                items,
                status: 'Priprema dokumenata',
                exportDocs: form.delivery.includes('Izvoz'),
            });
            router.push('/sales');
        } catch (error) {
            const message = error?.response?.data?.error || '';
            setSubmitError(message.startsWith('Insufficient stock') ? 'Nedovoljno stanja na skladištu za jednu od stavki.' : 'Kreiranje naloga nije uspjelo. Provjeri podatke i pokušaj ponovo.');
            setSaving(false);
        }
    };

    return (
        <div className="ui-page" style={{ maxWidth: 1000 }}>
            <PageHeader
                title="Novi prodajni nalog"
                subtitle="Roba se skida sa stanja odmah pri kreiranju naloga"
                actions={<Button variant="secondary" icon={ArrowLeft} href="/sales">Svi nalozi</Button>}
            />
            <Card>
                <div className="stack" style={{ gap: 18 }}>
                    <div className="ui-form-grid">
                        <Field label="Kupac" required>
                            <select className="ui-input" value={form.customerId} onChange={(e) => setForm((prev) => ({ ...prev, customerId: e.target.value }))}>
                                {!customers.length && <option value="">Nema kupaca</option>}
                                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Način isporuke">
                            <select className="ui-input" value={form.delivery} onChange={(e) => setForm((prev) => ({ ...prev, delivery: e.target.value }))}>
                                <option value="Domaća Prodaja">Domaća prodaja</option>
                                <option value="Izvoz (EU)">Izvoz (EU)</option>
                                <option value="Izvoz (Non-EU)">Izvoz (Non-EU)</option>
                            </select>
                        </Field>
                    </div>
                    <div>
                        <div className="ui-section-title">Stavke naloga</div>
                        <SalesLineItems
                            lineItems={lineItems}
                            materials={materials}
                            stockByMaterialId={stockByMaterialId}
                            onUpdate={updateLineItem}
                            onAdd={() => setLineItems((prev) => [...prev, newLine()])}
                            onRemove={(id) => setLineItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev))}
                            onPickMaterial={setPickerOpenFor}
                        />
                    </div>
                    {submitError && <Alert tone="danger">{submitError}</Alert>}
                </div>
                <div className="ui-modal-footer">
                    <Button variant="secondary" href="/sales">Odustani</Button>
                    <Button onClick={handleCreate} disabled={saving}>{saving ? 'Čuvanje...' : 'Kreiraj nalog'}</Button>
                </div>
            </Card>
            <MaterialPicker
                open={Boolean(pickerOpenFor)}
                onClose={() => setPickerOpenFor(null)}
                onSelect={({ material }) => {
                    if (!pickerOpenFor) return;
                    updateLineItem(pickerOpenFor, { material });
                    setPickerOpenFor(null);
                }}
            />
        </div>
    );
}
