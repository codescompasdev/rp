'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Boxes, ClipboardList, Lock, Mail, Scale } from 'lucide-react';
import api from '@/lib/api';
import { saveAuthSession } from '@/lib/authStorage';
import Button from '@/components/UI/Button';
import Field from '@/components/UI/Field';
import Alert from '@/components/UI/Alert';
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
            setError(err.response?.data?.error || 'Neuspješna prijava. Provjerite podatke.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.authContainer}>
            <aside className={styles.brandPanel}>
                <div className={styles.brandTop}>
                    <div className={styles.logo}>M</div>
                    <div>
                        <div className={styles.brandName}>MILKUS ERP</div>
                        <div className={styles.brandSub}>Compas Codes</div>
                    </div>
                </div>
                <div>
                    <h2 className={styles.brandTitle}>Vaga, otkup, skladište i narudžbe na jednom mjestu.</h2>
                    <ul className={styles.brandList}>
                        <li><Scale size={18} /> Vaganje ulaza i izlaza sa signalom vage</li>
                        <li><ClipboardList size={18} /> Narudžbe sa praćenjem ispunjenosti</li>
                        <li><Boxes size={18} /> Stanje skladišta po lokacijama</li>
                    </ul>
                </div>
                <div className={styles.brandFoot}>Pale · Banja Luka · Bijeljina</div>
            </aside>

            <main className={styles.formPanel}>
                <div className={styles.authCard}>
                    <h1 className={styles.title}>Prijava</h1>
                    <p className={styles.subtitle}>Dobrodošli nazad. Unesite svoje podatke.</p>

                    {error && <Alert tone="danger" style={{ marginBottom: 16 }}>{error}</Alert>}

                    <form onSubmit={handleSubmit} className="stack" style={{ gap: 16 }}>
                        <Field label="Email adresa" required htmlFor="login-email">
                            <div className="ui-input-icon">
                                <Mail size={15} />
                                <input id="login-email" className="ui-input lg" name="email" type="email" autoComplete="username" value={formData.email} onChange={handleChange} required autoFocus />
                            </div>
                        </Field>
                        <Field label="Lozinka" required htmlFor="login-password">
                            <div className="ui-input-icon">
                                <Lock size={15} />
                                <input id="login-password" className="ui-input lg" name="password" type="password" autoComplete="current-password" value={formData.password} onChange={handleChange} required />
                            </div>
                        </Field>
                        <Button type="submit" size="lg" block iconRight={ArrowRight} disabled={loading} style={{ marginTop: 6 }}>
                            {loading ? 'Prijava...' : 'Prijavi se'}
                        </Button>
                    </form>
                </div>
            </main>
        </div>
    );
}
