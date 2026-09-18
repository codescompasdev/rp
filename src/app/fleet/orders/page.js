'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Button from '@/components/UI/Button';
import Table from '@/components/UI/Table';
import FilterBar from '@/components/UI/FilterBar';
import styles from '../vehicles/page.module.css';

export default function OrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/fleet/orders')
            .then(res => setOrders(res.data.data || res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const columns = [
        { header: 'Broj Nalog', accessor: 'orderNumber' }, // Order #
        { header: 'Klijent', accessor: 'client' }, // Client
        { header: 'Datum', accessor: 'date', render: row => new Date(row.date).toLocaleDateString() },
        { header: 'Status', accessor: 'status' },
        {
            header: 'Akcije',
            render: (row) => (
                <Button variant="secondary" onClick={() => { }}>Pregled</Button> // View
            )
        }
    ];

    if (loading) return <div style={{ padding: '2rem' }}>Učitavanje...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Putni Nalozi</h1> {/* Transport Orders */}
                <Button onClick={() => router.push('/fleet/orders/new')}>+ Novi Nalog</Button>
            </div>

            <FilterBar filters={[{ name: 'status', label: 'Status', type: 'text' }]} />
            <Table columns={columns} data={orders} />
        </div>
    );
}
