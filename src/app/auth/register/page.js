'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { saveAuthSession } from '@/lib/authStorage';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import { normalizeApiList } from '@/lib/materialsAdapter';
import styles from '../auth.module.css';

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'operator', companyId: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [locations, setLocations] = useState([]);

    useEffect(() => {
        api.get('/locations')
            .then((res) => {
                const rows = normalizeApiList(res);
                setLocations(rows);
                if (rows[0]?.id) {
                    setFormData((prev) => ({ ...prev, companyId: prev.companyId || rows[0].id }));
                }
            })
            .catch(() => setLocations([]));
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload = {
                ...formData,
                companyId: formData.role === 'admin' ? null : (formData.companyId || null),
            };
            const res = await api.post('/auth/register', payload);
            saveAuthSession(res.data);
            router.push('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Registracija neuspješna.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.authSimple}>
            <div className={styles.authCard}>
                <h1 className={styles.title}>Registracija</h1>
                <p className={styles.subtitle}>Kreirajte novi račun.</p>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <Input label="Ime i Prezime" name="name" value={formData.name} onChange={handleChange} required />
                    <Input label="Email adresa" name="email" type="email" value={formData.email} onChange={handleChange} required />
                    <Input label="Lozinka" name="password" type="password" value={formData.password} onChange={handleChange} required />

                    <div className={styles.formGroup}>
                        <label>Uloga</label>
                        <select name="role" value={formData.role} onChange={handleChange} className={styles.select}>
                            <option value="operator">Radnik (operator)</option>
                            <option value="manager">Vlasnik (manager)</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>
                    {formData.role !== 'admin' && (
                        <div className={styles.formGroup}>
                            <label>Lokacija</label>
                            <select name="companyId" value={formData.companyId} onChange={handleChange} className={styles.select} required>
                                {locations.length ? locations.map((location) => (
                                    <option key={location.id} value={location.id}>
                                        {location.code ? `${location.code} - ${location.name}` : location.name}
                                    </option>
                                )) : (
                                    <option value="">Nema dostupnih lokacija</option>
                                )}
                            </select>
                        </div>
                    )}

                    <div className={styles.actions}>
                        <Button type="submit" disabled={loading} style={{ width: '100%' }}>
                            {loading ? 'Registracija...' : 'Registruj se'}
                        </Button>
                    </div>
                </form>

                <p className={styles.footerText}>
                    Već imate račun? <Link href="/auth/login">Prijavite se</Link>
                </p>
            </div>
        </div>
    );
}
