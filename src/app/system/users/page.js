'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { getAuthUser } from '@/lib/authStorage';
import { normalizeApiList } from '@/lib/materialsAdapter';

const initialForm = {
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'operator',
    companyId: '',
};

export default function SystemUsersPage() {
    const authUser = getAuthUser();
    const isAdmin = String(authUser?.role || '').toLowerCase() === 'admin';
    const [users, setUsers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [form, setForm] = useState(initialForm);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);

    const editing = Boolean(form.id);

    const refresh = async () => {
        const [usersRes, locationsRes] = await Promise.all([
            api.get('/auth/users'),
            api.get('/locations'),
        ]);
        const userRows = normalizeApiList(usersRes);
        const locationRows = normalizeApiList(locationsRes);
        setUsers(userRows);
        setLocations(locationRows);
        if (!form.companyId && locationRows[0]?.id) {
            setForm((prev) => ({ ...prev, companyId: locationRows[0].id }));
        }
    };

    useEffect(() => {
        if (!isAdmin) return;
        refresh().catch(() => setError('Neuspješno učitavanje korisnika.'));
    }, [isAdmin]);

    const locationLabelById = useMemo(() => {
        const map = new Map();
        locations.forEach((location) => map.set(location.id, location.code ? `${location.code} - ${location.name}` : location.name));
        return map;
    }, [locations]);

    const resetForm = () => {
        setForm({
            ...initialForm,
            companyId: locations[0]?.id || '',
        });
    };

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setInfo('');
        try {
            const payload = {
                name: form.name,
                email: form.email,
                role: form.role,
                companyId: form.role === 'admin' ? null : (form.companyId || null),
            };
            if (!editing || form.password.trim()) {
                payload.password = form.password;
            }

            if (editing) {
                await api.put(`/auth/users/${form.id}`, payload);
                setInfo('Korisnik je ažuriran.');
            } else {
                if (!form.password.trim()) {
                    throw new Error('Lozinka je obavezna za novog korisnika.');
                }
                await api.post('/auth/users', payload);
                setInfo('Korisnik je kreiran.');
            }
            await refresh();
            resetForm();
        } catch (err) {
            setError(err?.response?.data?.error || err?.message || 'Greška pri snimanju korisnika.');
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (user) => {
        setForm({
            id: user.id,
            name: user.name || '',
            email: user.email || '',
            password: '',
            role: user.role || 'operator',
            companyId: user.companyId || locations[0]?.id || '',
        });
        setError('');
        setInfo('');
    };

    const removeUser = async (user) => {
        if (!window.confirm(`Obrisati korisnika ${user.email}?`)) return;
        setError('');
        setInfo('');
        try {
            await api.delete(`/auth/users/${user.id}`);
            setInfo('Korisnik je obrisan.');
            if (form.id === user.id) resetForm();
            await refresh();
        } catch (err) {
            setError(err?.response?.data?.error || 'Brisanje korisnika nije uspjelo.');
        }
    };

    if (!isAdmin) {
        return (
            <div className="scada-panel" style={{ maxWidth: '760px', margin: '24px auto', padding: '24px' }}>
                <h2 style={{ marginTop: 0 }}>Upravljanje korisnicima</h2>
                <div style={{ padding: '12px', border: '1px solid #f59e0b', background: '#fffbeb', color: '#92400e' }}>
                    Ova stranica je dostupna samo administratoru.
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'minmax(320px, 430px) 1fr', height: '100%' }}>
            <div className="scada-panel" style={{ padding: '14px' }}>
                <h2 style={{ marginTop: 0, fontSize: '14px', textTransform: 'uppercase' }}>
                    {editing ? 'Uredi korisnika' : 'Novi korisnik'}
                </h2>
                <form onSubmit={submit} style={{ display: 'grid', gap: '10px' }}>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>Ime i prezime</label>
                        <input style={{ width: '100%', padding: '8px', marginTop: '4px' }} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>Email</label>
                        <input type="email" style={{ width: '100%', padding: '8px', marginTop: '4px' }} value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} required />
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>{editing ? 'Nova lozinka (opciono)' : 'Lozinka'}</label>
                        <input type="password" style={{ width: '100%', padding: '8px', marginTop: '4px' }} value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} required={!editing} />
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>Uloga</label>
                        <select style={{ width: '100%', padding: '8px', marginTop: '4px' }} value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>
                            <option value="operator">Operator</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    {form.role !== 'admin' && (
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700 }}>Lokacija</label>
                            <select style={{ width: '100%', padding: '8px', marginTop: '4px' }} value={form.companyId} onChange={(e) => setForm((prev) => ({ ...prev, companyId: e.target.value }))} required>
                                {locations.map((location) => (
                                    <option key={location.id} value={location.id}>
                                        {location.code ? `${location.code} - ${location.name}` : location.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {error && <div style={{ padding: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: '12px' }}>{error}</div>}
                    {info && <div style={{ padding: '8px', border: '1px solid #86efac', background: '#f0fdf4', color: '#166534', fontSize: '12px' }}>{info}</div>}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {editing && <button type="button" onClick={resetForm}>Otkaži</button>}
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Snimanje...' : editing ? 'Sačuvaj izmjene' : 'Kreiraj korisnika'}
                        </button>
                    </div>
                </form>
            </div>
            <div className="scada-panel responsive-table" style={{ overflow: 'auto' }}>
                <table>
                    <thead>
                        <tr>
                            <th>Ime</th>
                            <th>Email</th>
                            <th>Uloga</th>
                            <th>Lokacija</th>
                            <th>Akcije</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td>{user.name}</td>
                                <td className="font-mono">{user.email}</td>
                                <td>{user.role}</td>
                                <td>{user.companyId ? (locationLabelById.get(user.companyId) || user.companyId) : 'Sve lokacije'}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button type="button" onClick={() => startEdit(user)}>Uredi</button>
                                        <button type="button" onClick={() => removeUser(user)} style={{ color: '#b91c1c' }}>Obriši</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!users.length && <div style={{ padding: '20px', color: '#64748b' }}>Nema korisnika.</div>}
            </div>
        </div>
    );
}
