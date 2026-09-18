'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { t } from '@/lib/translations';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import styles from '@/app/fleet/vehicles/page.module.css';

export default function NewOrderPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({ client: '', orderNumber: '', date: '', startLocation: '', endLocation: '', vehicleId: '', driverId: '' });
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch vehicles and drivers for dropdowns
        Promise.all([
            api.get('/fleet/vehicles'),
            api.get('/fleet/drivers')
        ]).then(([vRes, dRes]) => {
            setVehicles(vRes.data.data || vRes.data);
            setDrivers(dRes.data.data || dRes.data);
        }).catch(console.error);
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/fleet/orders', formData);
            router.push('/fleet/orders');
        } catch (err) {
            console.error(err);
            alert(t('Failed to create order'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>{t('Create Transport Order')}</h1>
                <Button variant="secondary" onClick={() => router.back()}>{t('Cancel')}</Button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form} style={{ maxWidth: '600px', background: 'white', padding: '2rem', borderRadius: '8px' }}>
                <Input label="Order Number" name="orderNumber" value={formData.orderNumber} onChange={handleChange} required />
                <Input label="Client" name="client" value={formData.client} onChange={handleChange} required />
                <Input label="Date" name="date" type="date" value={formData.date} onChange={handleChange} required />
                <Input label="Start Location" name="startLocation" value={formData.startLocation} onChange={handleChange} required />
                <Input label="End Location" name="endLocation" value={formData.endLocation} onChange={handleChange} required />

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>{t('Vehicle')}</label>
                    <select
                        name="vehicleId"
                        value={formData.vehicleId}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        required
                    >
                        <option value="">{t('Select Vehicle')}</option>
                        {vehicles.map(v => <option key={v._id || v.id} value={v._id || v.id}>{v.plateNumber}</option>)}
                    </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>{t('Driver')}</label>
                    <select
                        name="driverId"
                        value={formData.driverId}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="">{t('Select Driver')}</option>
                        {drivers.map(d => <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>)}
                    </select>
                </div>

                <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Order'}</Button>
            </form>
        </div>
    );
}
