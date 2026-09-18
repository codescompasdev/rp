'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Table from '@/components/UI/Table';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import FilterBar from '@/components/UI/FilterBar';
import styles from '../../fleet/vehicles/page.module.css';

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [formVisible, setFormVisible] = useState(false);
    const [formData, setFormData] = useState({ name: '', contact: '', email: '', address: '' });

    useEffect(() => { fetchSuppliers(); }, []);
    const fetchSuppliers = () => api.get('/inventory/suppliers').then(r => setSuppliers(r.data.data || r.data)).catch(console.error);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/inventory/suppliers', formData);
            setFormData({ name: '', contact: '', email: '', address: '' });
            setFormVisible(false);
            fetchSuppliers();
        } catch (err) { console.error(err); alert('Greška pri dodavanju dobavljača'); }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Dobavljači</h1>
                <Button onClick={() => setFormVisible(!formVisible)}>+ Novi Dobavljač</Button>
            </div>

            {formVisible && (
                <div style={{ background: 'white', padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
                        <Input label="Naziv" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        <Input label="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        <Input label="Kontakt" value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} />
                        <Input label="Adresa" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                        <Button type="submit">Sačuvaj</Button>
                    </form>
                </div>
            )}

            <FilterBar filters={[{ name: 'name', label: 'Naziv', type: 'text' }]} />
            <Table
                columns={[
                    { header: 'Naziv', accessor: 'name' },
                    { header: 'Email', accessor: 'email' },
                    { header: 'Kontakt', accessor: 'contact' },
                    { header: 'Adresa', accessor: 'address' }
                ]}
                data={suppliers}
            />
        </div>
    );
}
