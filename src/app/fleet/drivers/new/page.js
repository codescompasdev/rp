'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { t } from '@/lib/translations';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import styles from '@/app/fleet/vehicles/page.module.css';

export default function NewDriverPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        licenseNumber: '',
        phone: '',
        status: 'Active',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('/fleet/drivers', formData);
            router.push('/fleet/drivers');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || t('Failed to create driver'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>{t('Add New Driver')}</h1>
                <Button variant="secondary" onClick={() => router.back()}>{t('Cancel')}</Button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <form onSubmit={handleSubmit} className={styles.form} style={{ maxWidth: '600px', background: 'white', padding: '2rem', borderRadius: '8px' }}>
                <Input
                    label={t('Full Name')}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />
                <Input
                    label={t('License Number')}
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    required
                />
                <Input
                    label={t('Phone Number')}
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                />
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Status</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="On Leave">On Leave</option>
                    </select>
                </div>

                <Button type="submit" disabled={loading}>
                    {loading ? t('Creating...') : t('Create Driver')}
                </Button>
            </form>
        </div>
    );
}
