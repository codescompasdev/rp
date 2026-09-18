'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { t } from '@/lib/translations';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import styles from '../page.module.css'; // Reusing list styles for container/header

export default function NewVehiclePage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        plateNumber: '',
        make: '',
        model: '',
        productionYear: '',
        status: 'Active',
    });
    const [files, setFiles] = useState(null); // For images/docs
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        setFiles(e.target.files);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);
            });

            if (files) {
                for (let i = 0; i < files.length; i++) {
                    data.append('images', files[i]);
                }
            }

            await api.post('/fleet/vehicles', data, {
                headers: { 'Content-Type': 'multipart/form-data' } // Browser sets boundary automatically but good to be explicit about intent
            });

            router.push('/fleet/vehicles');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || t('Failed to create vehicle'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>{t('Add New Vehicle')}</h1>
                <Button variant="secondary" onClick={() => router.back()}>{t('Cancel')}</Button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <form onSubmit={handleSubmit} className={styles.form} style={{ maxWidth: '600px', background: 'white', padding: '2rem', borderRadius: '8px' }}>
                <Input
                    label={t('Plate Number')}
                    name="plateNumber"
                    value={formData.plateNumber}
                    onChange={handleChange}
                    required
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <Input
                        label={t('Make')}
                        name="make"
                        value={formData.make}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        label={t('Model')}
                        name="model"
                        value={formData.model}
                        onChange={handleChange}
                        required
                    />
                </div>
                <Input
                    label={t('Production Year')}
                    name="productionYear"
                    type="number"
                    value={formData.productionYear}
                    onChange={handleChange}
                />

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>{t('Status')}</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="Active">Active</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Retired">Retired</option>
                    </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>{t('Images/Documents')}</label>
                    <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </div>

                <Button type="submit" disabled={loading}>
                    {loading ? t('Creating...') : t('Create Vehicle')}
                </Button>
            </form>
        </div>
    );
}
