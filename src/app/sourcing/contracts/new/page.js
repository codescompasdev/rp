'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import MaterialPicker from '@/components/UI/MaterialPicker';
import Modal from '@/components/UI/Modal';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import Field from '@/components/UI/Field';
import Alert from '@/components/UI/Alert';
import OrderFormFields from '@/components/Orders/OrderFormFields';
import api from '@/lib/api';
import { buildFormula } from '@/lib/orders';
import { tonsToKg } from '@/lib/format';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

const EMPTY_FORM = {
    direction: 'BUY',
    partnerId: '',
    qtyMode: 'PER_MATERIAL',
    totalQtyT: '',
    tolerance: 5,
    formula: 'LME',
    formulaValue: '',
    paymentTerms: 'DAP',
    startDate: '',
    endDate: '',
};

export default function NewOrderPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [items, setItems] = useState([]); // { materialId, label, qtyT }
    const [partnerQuery, setPartnerQuery] = useState('');
    const [createPartnerOpen, setCreatePartnerOpen] = useState(false);
    const [newPartnerName, setNewPartnerName] = useState('');
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitError, setSubmitError] = useState('');
    const [submitOk, setSubmitOk] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const isBuy = form.direction === 'BUY';
    const partners = isBuy ? suppliers : customers;

    useEffect(() => {
        const load = async () => {
            try {
                const [suppliersRes, customersRes, materialsRes] = await Promise.all([
                    api.get('/sourcing/suppliers'),
                    api.get('/sourcing/customers'),
                    api.get('/materials'),
                ]);
                setSuppliers(normalizeApiList(suppliersRes));
                setCustomers(normalizeApiList(customersRes));
                setMaterials(normalizeApiList(materialsRes));
            } catch {
                setSuppliers([]);
                setCustomers([]);
                setMaterials([]);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const selected = partners.find((p) => p.id === form.partnerId);
        setPartnerQuery(selected?.name || '');
    }, [form.partnerId, suppliers, customers, form.direction]);

    const resolvePartnerId = (value) => {
        const normalized = String(value || '').trim().toLowerCase();
        if (!normalized) return '';
        const byId = partners.find((p) => p.id === value);
        if (byId) return byId.id;
        const byName = partners.find((p) => String(p.name || '').trim().toLowerCase() === normalized);
        return byName?.id || '';
    };

    const handlePartnerQueryChange = (value, opts = {}) => {
        setPartnerQuery(value);
        if (opts.reset) return;
        setForm((prev) => ({ ...prev, partnerId: resolvePartnerId(value) }));
    };

    const createPartner = async () => {
        const name = String(newPartnerName || '').trim();
        if (!name) return;
        try {
            let created;
            if (isBuy) {
                created = await api.post('/sourcing/suppliers', {
                    name, type: 'Partner', pdv: false, bonitet: 'B', balance: 0, active: true,
                });
                setSuppliers(normalizeApiList(await api.get('/sourcing/suppliers')));
            } else {
                created = await api.post('/sourcing/customers', {
                    name, country: 'BA', creditLimit: 0, balance: 0, blocked: false,
                });
                setCustomers(normalizeApiList(await api.get('/sourcing/customers')));
            }
            const partner = created?.data?.data;
            if (partner?.id) {
                setForm((prev) => ({ ...prev, partnerId: partner.id }));
                setPartnerQuery(partner.name || name);
            }
            setCreatePartnerOpen(false);
            setNewPartnerName('');
        } catch {
            setSubmitError('Kreiranje partnera nije uspjelo.');
        }
    };

    const addMaterial = (material) => {
        const backend = resolveBackendMaterial(materials, material);
        if (!backend?.id) {
            setSubmitError('Materijal nije pronađen u katalogu. Uskladi šifru u Materials katalogu.');
            return;
        }
        if (items.some((it) => it.materialId === backend.id)) {
            setSubmitError('Taj materijal je već na narudžbi.');
            return;
        }
        setSubmitError('');
        setItems((prev) => [...prev, { materialId: backend.id, label: formatPickedMaterial(material), qtyT: '' }]);
    };

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setItems([]);
        setPartnerQuery('');
        setSubmitError('');
    };

    const handleCreate = async () => {
        setSubmitOk('');
        if (!form.partnerId) {
            setSubmitError(`${isBuy ? 'Dobavljač' : 'Kupac'} je obavezan.`);
            return;
        }
        if (!items.length) {
            setSubmitError('Dodaj bar jedan materijal.');
            return;
        }
        if (form.qtyMode === 'PER_MATERIAL' && items.some((it) => !(tonsToKg(it.qtyT) > 0))) {
            setSubmitError('Unesi količinu (t) za svaki materijal.');
            return;
        }
        if (form.qtyMode === 'TOTAL' && !(tonsToKg(form.totalQtyT) > 0)) {
            setSubmitError('Unesi ukupnu količinu narudžbe.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await api.post('/sourcing/contracts', {
                direction: form.direction,
                partnerId: form.partnerId,
                items: items.map((it) => ({
                    materialId: it.materialId,
                    qtyKg: form.qtyMode === 'PER_MATERIAL' ? tonsToKg(it.qtyT) : null,
                })),
                qtyMode: form.qtyMode,
                totalQtyKg: form.qtyMode === 'TOTAL' ? tonsToKg(form.totalQtyT) : null,
                tolerance: form.tolerance,
                formula: buildFormula(form.formula, form.formulaValue),
                paymentTerms: form.paymentTerms,
                period: form.startDate && form.endDate ? `${form.startDate} - ${form.endDate}` : 'Spot',
                status: 'Aktivan',
                startDate: form.startDate || null,
                endDate: form.endDate || null,
            });
            const code = res?.data?.data?.code;
            resetForm();
            setSubmitOk(`Narudžba ${code || ''} je kreirana.`);
        } catch (error) {
            setSubmitError(error?.response?.data?.error || 'Kreiranje narudžbe nije uspjelo. Provjeri unesene podatke.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="ui-page" style={{ maxWidth: 960 }}>
            <PageHeader
                title="Nova narudžba"
                subtitle="Nabavka od dobavljača ili prodaja kupcu, sa jednim ili više materijala"
                actions={<Button variant="secondary" icon={ArrowLeft} href="/sourcing/contracts">Sve narudžbe</Button>}
            />

            {submitOk && <Alert tone="success" onClose={() => setSubmitOk('')}>{submitOk}</Alert>}

            <Card>
                <OrderFormFields
                    form={form}
                    setForm={setForm}
                    items={items}
                    setItems={setItems}
                    partners={partners}
                    partnerQuery={partnerQuery}
                    onPartnerQueryChange={handlePartnerQueryChange}
                    onOpenMaterialPicker={() => setPickerOpen(true)}
                    onOpenCreatePartner={() => setCreatePartnerOpen(true)}
                    error={submitError}
                    datalistId="order-partners"
                />
                <div className="ui-modal-footer">
                    <Button variant="secondary" onClick={resetForm}>Očisti formu</Button>
                    <Button onClick={handleCreate} disabled={submitting}>
                        {submitting ? 'Čuvanje...' : 'Kreiraj narudžbu'}
                    </Button>
                </div>
            </Card>

            <MaterialPicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={({ material }) => { addMaterial(material); setPickerOpen(false); }}
            />

            <Modal open={createPartnerOpen} onClose={() => setCreatePartnerOpen(false)} title={isBuy ? 'Novi dobavljač' : 'Novi kupac'} width={480} zIndex={3500}>
                <Field label={isBuy ? 'Naziv dobavljača' : 'Naziv kupca'} required>
                    <input className="ui-input" value={newPartnerName} onChange={(e) => setNewPartnerName(e.target.value)} autoFocus />
                </Field>
                <div className="ui-modal-footer">
                    <Button variant="secondary" onClick={() => setCreatePartnerOpen(false)}>Odustani</Button>
                    <Button onClick={createPartner}>Sačuvaj</Button>
                </div>
            </Modal>
        </div>
    );
}
