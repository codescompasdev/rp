'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { saveAuthSession } from '@/lib/authStorage';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import styles from '../auth.module.css';

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({ email: '', password: '' });
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
            const res = await api.post('/auth/login', formData);
            saveAuthSession(res.data);
            router.push('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Neuspješna prijava. Provjerite podatke.'); // "Login failed. Check credentials."
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <h1 className={styles.title}>Prijava</h1> {/* Login */}
                <p className={styles.subtitle}>Dobrodošli nazad. Unesite svoje podatke.</p>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <Input
                        label="Email adresa"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        label="Lozinka"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    <div className={styles.actions}>
                        <Button type="submit" disabled={loading} style={{ width: '100%' }}>
                            {loading ? 'Prijava...' : 'Prijavi se'}
                        </Button>
                    </div>
                </form>

            </div>
        </div>
    );
}
