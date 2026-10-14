'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import Alert from '@/components/UI/Alert';
import SupplierFormFields from '@/components/Suppliers/SupplierFormFields';
import api from '@/lib/api';
import { EMPTY_SUPPLIER_FORM, supplierFormToPayload } from '@/lib/suppliers';

export default function NewSupplierPage() {
    const router = useRouter();
    const [form, setForm] = useState(EMPTY_SUPPLIER_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setError('Naziv je obavezan.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const res = await api.post('/sourcing/suppliers', { ...supplierFormToPayload(form), balance: 0, active: true });
            const id = res?.data?.data?.id;
            router.push(id ? `/sourcing/suppliers/${id}` : '/sourcing/suppliers');
        } catch (err) {
            setError(err?.response?.data?.error || 'Dodavanje dobavljača nije uspjelo.');
            setSaving(false);
        }
    };

    return (
        <div className="ui-page" style={{ maxWidth: 900 }}>
            <PageHeader
                title="Novi dobavljač"
                subtitle="Partner od kojeg otkupljujemo materijal"
                actions={<Button variant="secondary" icon={ArrowLeft} href="/sourcing/suppliers">Svi dobavljači</Button>}
            />
            <Card>
                <form onSubmit={handleSubmit}>
                    <SupplierFormFields form={form} setForm={setForm} />
                    {error && <Alert tone="danger" style={{ marginTop: 14 }}>{error}</Alert>}
                    <div className="ui-modal-footer">
                        <Button variant="secondary" href="/sourcing/suppliers">Odustani</Button>
                        <Button type="submit" disabled={saving}>{saving ? 'Čuvanje...' : 'Sačuvaj dobavljača'}</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
