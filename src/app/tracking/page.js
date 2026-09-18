'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { t } from '@/lib/translations';
import Button from '@/components/UI/Button';
import styles from '../fleet/vehicles/page.module.css';

export default function TrackingPage() {
    const [status, setStatus] = useState(t('Off Shift'));
    const [loading, setLoading] = useState(false);

    const handleShift = async (action) => {
        setLoading(true);
        try {
            await api.post(`/tracking/shift/${action}`);
            setStatus(action === 'start' ? t('On Shift') : t('Off Shift'));
            alert(action === 'start' ? t('Shift started successfully') : t('Shift ended successfully'));
        } catch (err) {
            console.error(err);
            alert(action === 'start' ? t('Failed to start shift') : t('Failed to end shift'));
        } finally {
            setLoading(false);
        }
    };

    const handleLocation = async () => {
        if (!navigator.geolocation) return alert(t('Geolocation not supported'));

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                await api.post('/tracking/location', {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
                alert(t('Location updated'));
            } catch (err) {
                console.error(err);
                alert(t('Failed to update location'));
            }
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Tracking & Location</h1>
            </div>

            <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '500px' }}>
                <h2>Current Status: {status}</h2>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <Button onClick={() => handleShift('start')} disabled={loading || status === t('On Shift')}>{t('Start Shift')}</Button>
                    <Button variant="danger" onClick={() => handleShift('end')} disabled={loading || status === t('Off Shift')} style={{ backgroundColor: '#dc3545', color: 'white' }}>{t('End Shift')}</Button>
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <Button variant="secondary" onClick={handleLocation}>Log Current Location</Button>
                </div>
            </div>
        </div>
    );
}
