'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Button from '@/components/UI/Button';
import Table from '@/components/UI/Table';
import FilterBar from '@/components/UI/FilterBar';
import styles from '../vehicles/page.module.css'; // Shared styles are fine

export default function DriversPage() {
    const router = useRouter();
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/fleet/drivers')
            .then(res => setDrivers(res.data.data || res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const columns = [
        { header: 'Ime i Prezime', accessor: 'name' }, // Name
        { header: 'Broj Vozačke', accessor: 'licenseNumber' }, // License Number
        { header: 'Status', accessor: 'status' },
        { header: 'Telefon', accessor: 'phone' },
        {
            header: 'Akcije',
            render: (row) => <Button variant="secondary" onClick={(e) => { e.stopPropagation(); router.push(`/fleet/drivers/${row._id || row.id}`) }}>Detalji</Button> // Details
        }
    ];

    const filters = [
        { name: 'status', label: 'Status', type: 'select', options: [{ value: 'Active', label: 'Aktivan' }, { value: 'Inactive', label: 'Neaktivan' }] }
    ];

    if (loading) return <div style={{ padding: '2rem' }}>Učitavanje...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Vozači</h1>
                <Button onClick={() => router.push('/fleet/drivers/new')}>+ Novi Vozač</Button>
            </div>

            <FilterBar filters={filters} />
            <Table columns={columns} data={drivers} onRowClick={(row) => router.push(`/fleet/drivers/${row._id || row.id}`)} />
        </div>
    );
}
