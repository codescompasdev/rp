'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Button from '@/components/UI/Button';
import Table from '@/components/UI/Table';
import FilterBar from '@/components/UI/FilterBar';
import styles from './page.module.css';

export default function VehiclesPage() {
    const router = useRouter();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/fleet/vehicles')
            .then(res => setVehicles(res.data.data || res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const columns = [
        { header: 'Registracija', accessor: 'plateNumber' }, // Plate Number
        { header: 'Marka', accessor: 'make' }, // Make
        { header: 'Model', accessor: 'model' },
        { header: 'Status', accessor: 'status' },
        {
            header: 'Vozač', // Driver
            accessor: 'driver',
            render: row => row.driver?.name || 'Nedodeljeno' // Unassigned
        },
        {
            header: 'Akcije', // Actions
            render: (row) => (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button variant="secondary" onClick={(e) => { e.stopPropagation(); router.push(`/fleet/vehicles/${row._id || row.id}`); }} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>
                        Izmjeni
                    </Button>
                </div>
            )
        }
    ];

    const filters = [
        { name: 'status', label: 'Status', type: 'select', options: [{ value: 'Active', label: 'Aktivan' }, { value: 'Maintenance', label: 'Održavanje' }] },
        { name: 'make', label: 'Marka', type: 'text' }
    ];

    if (loading) return <div style={{ padding: '2rem' }}>Učitavanje...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Vozila</h1>
                <Button onClick={() => router.push('/fleet/vehicles/new')}>+ Novo Vozilo</Button>
            </div>

            <FilterBar filters={filters} onSearch={(q, f) => console.log('Search:', q, f)} />

            <Table
                columns={columns}
                data={vehicles}
                onRowClick={(row) => router.push(`/fleet/vehicles/${row._id || row.id}`)}
            />
        </div>
    );
}
