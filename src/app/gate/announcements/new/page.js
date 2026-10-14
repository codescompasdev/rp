'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Package, Plus } from 'lucide-react';
import MaterialPicker from '@/components/UI/MaterialPicker';
import Modal from '@/components/UI/Modal';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import Field from '@/components/UI/Field';
import Alert from '@/components/UI/Alert';
import api from '@/lib/api';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

export default function NewAnnouncementPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [supplierQuery, setSupplierQuery] = useState('');
    const [createSupplierOpen, setCreateSupplierOpen] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [form, setForm] = useState({ supplierId: '', contractId: '', expectedKg: '', truck: '', expectedDate: '' });
    const [submitError, setSubmitError] = useState('');
    const [submitOk, setSubmitOk] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [suppliersRes, contractsRes, materialsRes] = await Promise.all([
                    api.get('/sourcing/suppliers'),
                    api.get('/sourcing/contracts'),
                    api.get('/materials'),
                ]);
                const nextSuppliers = normalizeApiList(suppliersRes);
                setSuppliers(nextSuppliers);
                setContracts(normalizeApiList(contractsRes));
                setMaterials(normalizeApiList(materialsRes));
                if (nextSuppliers[0]) {
                    setForm((prev) => ({ ...prev, supplierId: nextSuppliers[0].id }));
                }
            } catch {
                setSuppliers([]);
                setContracts([]);
                setMaterials([]);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const selected = suppliers.find((s) => s.id === form.supplierId);
        setSupplierQuery(selected?.name || '');
    }, [form.supplierId, suppliers]);

    const resolveSupplierId = (value) => {
        const normalized = String(value || '').trim().toLowerCase();
        if (!normalized) return '';
        const byId = suppliers.find((s) => s.id === value);
        if (byId) return byId.id;
        const byName = suppliers.find((s) => String(s.name || '').trim().toLowerCase() === normalized);
        return byName?.id || '';
    };

    const createSupplier = async () => {
        const name = String(newSupplierName || '').trim();
        if (!name) return;
        const created = await api.post('/sourcing/suppliers', {
            name,
            type: 'Partner',
            pdv: false,
            bonitet: 'B',
            balance: 0,
            active: true,
        });
        const supplier = created?.data?.data;
        const refreshed = await api.get('/sourcing/suppliers');
        const nextSuppliers = normalizeApiList(refreshed);
        setSuppliers(nextSuppliers);
        if (supplier?.id) {
            setForm((prev) => ({ ...prev, supplierId: supplier.id }));
            setSupplierQuery(supplier.name || name);
        }
        setCreateSupplierOpen(false);
        setNewSupplierName('');
    };

    const handleCreate = async () => {
        const backendMaterial = resolveBackendMaterial(materials, selectedMaterial);
        if (!form.supplierId || !backendMaterial?.id) {
            setSubmitError('Dobavljač i materijal su obavezni. Materijal mora postojati u backend katalogu.');
            return;
        }
        setSubmitting(true);
        setSubmitOk('');
        try {
            const res = await api.post('/gate/announcements', {
                supplierId: form.supplierId,
                contractId: form.contractId || null,
                materialId: backendMaterial.id,
                expectedKg: Number(form.expectedKg || 0),
                truck: form.truck || '',
                expectedDate: form.expectedDate || new Date().toISOString(),
                status: 'Najavljeno',
            });
            setSubmitError('');
            setSubmitOk(`Najava ${res?.data?.data?.code || ''} je kreirana.`);
            setSelectedMaterial(null);
            setForm((prev) => ({ ...prev, contractId: '', expectedKg: '', truck: '', expectedDate: '' }));
        } catch {
            setSubmitError('Kreiranje najave nije uspjelo. Provjeri podatke i pokušaj ponovo.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="ui-page" style={{ maxWidth: 900 }}>
            <PageHeader
                title="Nova najava prijema"
                subtitle="Kada kamion stigne, najava se bira pri vaganju i povezuje tablice, dobavljača i materijal"
                actions={<Button variant="secondary" icon={ArrowLeft} href="/gate/announcements">Sve najave</Button>}
            />
            <Alert tone="success" onClose={() => setSubmitOk('')}>{submitOk}</Alert>
            <Card>
                <div className="ui-form-grid">
                    <Field label="Dobavljač" required>
                        <div className="ui-input-group">
                            <input
                                className="ui-input"
                                list="announcement-suppliers"
                                value={supplierQuery}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSupplierQuery(value);
                                    setForm((prev) => ({ ...prev, supplierId: resolveSupplierId(value) }));
                                }}
                            />
                            <Button variant="secondary" icon={Plus} onClick={() => setCreateSupplierOpen(true)}>Novi</Button>
                        </div>
                        <datalist id="announcement-suppliers">
                            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.name} />)}
                        </datalist>
                    </Field>
                    <Field label="Narudžba (opciono)">
                        <select className="ui-input" value={form.contractId} onChange={(e) => setForm((prev) => ({ ...prev, contractId: e.target.value }))}>
                            <option value="">- Bez narudžbe (Spot) -</option>
                            {contracts.filter((c) => (c.direction || 'BUY') === 'BUY' || c.id === form.contractId).map((contract) => (
                                <option key={contract.id} value={contract.id}>{contract.code || contract.id} — {contract.supplier?.name || '-'}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Materijal" required span="all">
                        <button type="button" className="ui-input" style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', cursor: 'pointer', background: selectedMaterial ? 'var(--primary-50)' : undefined }} onClick={() => setPickerOpen(true)}>
                            <Package size={16} style={{ color: 'var(--primary)' }} />
                            <span className={selectedMaterial ? '' : 'muted'}>{selectedMaterial ? formatPickedMaterial(selectedMaterial) : 'Odaberi materijal...'}</span>
                        </button>
                    </Field>
                    <Field label="Očekivana količina (kg)">
                        <input type="number" min="0" className="ui-input font-mono" value={form.expectedKg} onChange={(e) => setForm((prev) => ({ ...prev, expectedKg: e.target.value }))} />
                    </Field>
                    <Field label="Tablice kamiona">
                        <input type="text" className="ui-input font-code" placeholder="E55-K-991" value={form.truck} onChange={(e) => setForm((prev) => ({ ...prev, truck: e.target.value }))} />
                    </Field>
                    <Field label="Očekivani datum">
                        <input type="date" className="ui-input" value={form.expectedDate} onChange={(e) => setForm((prev) => ({ ...prev, expectedDate: e.target.value }))} />
                    </Field>
                </div>
                {submitError && <Alert tone="danger" style={{ marginTop: 14 }}>{submitError}</Alert>}
                <div className="ui-modal-footer">
                    <Button variant="secondary" href="/gate/announcements">Odustani</Button>
                    <Button onClick={handleCreate} disabled={submitting}>{submitting ? 'Čuvanje...' : 'Kreiraj najavu'}</Button>
                </div>
            </Card>
            <MaterialPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={({ material }) => setSelectedMaterial(material)} />
            <Modal open={createSupplierOpen} onClose={() => setCreateSupplierOpen(false)} title="Novi dobavljač" width={480} zIndex={3500}>
                <Field label="Naziv dobavljača" required>
                    <input className="ui-input" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} autoFocus />
                </Field>
                <div className="ui-modal-footer">
                    <Button variant="secondary" onClick={() => setCreateSupplierOpen(false)}>Odustani</Button>
                    <Button onClick={createSupplier}>Sačuvaj</Button>
                </div>
            </Modal>
        </div>
    );
}
