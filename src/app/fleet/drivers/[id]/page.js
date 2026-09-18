'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { t } from '@/lib/translations';
import Button from '@/components/UI/Button';
import Table from '@/components/UI/Table';
import styles from '@/app/fleet/vehicles/page.module.css';

export default function DriverDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [driver, setDriver] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchDriverData();
        }
    }, [id]);

    const fetchDriverData = async () => {
        try {
            // Assuming we can get driver details. If not specific endpoint, maybe basic get works or filter from list.
            // But usually APIs have GET /:id
            // If not available, we might just display history.
            // Detailed API list didn't explicitly say GET /drivers/:id, but it's standard.
            // It did say GET /api/v1/fleet/drivers/:id/history

            // Let's try getting history first as that's guaranteed
            const historyRes = await api.get(`/fleet/drivers/${id}/history`);
            setHistory(historyRes.data.data || historyRes.data);

            // Try to get driver details too (assuming standard CRUD)
            // If fail, we handled it gracefully
            try {
                // Or we might have to use the history request if it returns driver info wrapper
                // Assuming standard REST
                //  const driverRes = await api.get(`/fleet/drivers/${id}`);
                //  setDriver(driverRes.data.data || driverRes.data);

                // For now, let's just mock driver name from history or show ID if API fails
            } catch (e) {
                console.warn('Could not fetch driver details independently');
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const historyColumns = [
        { header: 'Date', accessor: 'date', render: row => new Date(row.date).toLocaleDateString() },
        { header: 'Action', accessor: 'action' }, // Start shift, End shift, Route
        { header: 'Details', accessor: 'details' },
        { header: t('Vehicle'), accessor: 'vehicleId' }
    ];

    if (loading) return <div>{t('Loading...')}</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>{t('Driver History')} {driver?.name ? `- ${driver.name}` : `(ID: ${id})`}</h1>
                <Button variant="secondary" onClick={() => router.back()}>{t('Back')}</Button>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <h2>{t('Route & Shift History')}</h2>
                {history.length === 0 ? (
                    <p>No history found.</p>
                ) : (
                    <Table
                        columns={historyColumns}
                        data={history}
                    />
                )}
            </div>
        </div>
    );
}
