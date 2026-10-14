'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Pencil, Plus, ShieldCheck, Trash2, UserCog, Users } from 'lucide-react';
import Modal from '@/components/UI/Modal';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import StatCard from '@/components/UI/StatCard';
import Button from '@/components/UI/Button';
import Field from '@/components/UI/Field';
import Alert from '@/components/UI/Alert';
import SearchInput from '@/components/UI/SearchInput';
import EmptyState from '@/components/UI/EmptyState';
import { Badge } from '@/components/UI/Badge';
import api from '@/lib/api';
import { getAuthUser } from '@/lib/authStorage';
import { fmtNum } from '@/lib/format';
import { normalizeApiList } from '@/lib/materialsAdapter';

const initialForm = {
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'operator',
    companyId: '',
};

const ROLE_META = {
    admin: { label: 'Admin', tone: 'violet', hint: 'Sve lokacije, puna prava' },
    manager: { label: 'Manager', tone: 'info', hint: 'Vlasnički pregled za svoju lokaciju' },
    operator: { label: 'Operator', tone: 'neutral', hint: 'Rad na vagi i skladištu' },
};

function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
}

export default function SystemUsersPage() {
    // uloga iz localStorage → čita se tek u pregledniku
    const [isAdmin, setIsAdmin] = useState(null);
    const [users, setUsers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [form, setForm] = useState(initialForm);
    const [formOpen, setFormOpen] = useState(false);
    const [error, setError] = useState('');
    const [formError, setFormError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(true);
    const [search, setSearch] = useState('');

    const editing = Boolean(form.id);

    const refresh = async () => {
        const [usersRes, locationsRes] = await Promise.all([
            api.get('/auth/users'),
            api.get('/locations'),
        ]);
        setUsers(normalizeApiList(usersRes));
        setLocations(normalizeApiList(locationsRes));
    };

    useEffect(() => {
        const admin = String(getAuthUser()?.role || '').toLowerCase() === 'admin';
        setIsAdmin(admin);
        if (!admin) return;
        refresh().catch(() => setError('Neuspješno učitavanje korisnika.')).finally(() => setListLoading(false));
    }, []);

    const locationLabelById = useMemo(() => {
        const map = new Map();
        locations.forEach((location) => map.set(location.id, location.code ? `${location.code} · ${location.name}` : location.name));
        return map;
    }, [locations]);

    const visibleUsers = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return users;
        return users.filter((u) => [u.name, u.email, u.role, locationLabelById.get(u.companyId)].join(' ').toLowerCase().includes(q));
    }, [users, search, locationLabelById]);

    const openCreate = () => {
        setForm({ ...initialForm, companyId: locations[0]?.id || '' });
        setFormError('');
        setFormOpen(true);
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
        setFormError('');
        setFormOpen(true);
    };

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setFormError('');
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
            setFormOpen(false);
            setForm(initialForm);
        } catch (err) {
            setFormError(err?.response?.data?.error || err?.message || 'Greška pri snimanju korisnika.');
        } finally {
            setLoading(false);
        }
    };

    const removeUser = async (user) => {
        if (!window.confirm(`Obrisati korisnika ${user.email}?`)) return;
        setError('');
        setInfo('');
        try {
            await api.delete(`/auth/users/${user.id}`);
            setInfo('Korisnik je obrisan.');
            await refresh();
        } catch (err) {
            setError(err?.response?.data?.error || 'Brisanje korisnika nije uspjelo.');
        }
    };

    if (isAdmin === null) {
        return <div className="ui-page"><PageHeader title="Korisnici" subtitle="Učitavanje..." /></div>;
    }

    if (!isAdmin) {
        return (
            <div className="ui-page">
                <PageHeader title="Korisnici" />
                <Alert tone="warning">Ova stranica je dostupna samo administratoru.</Alert>
            </div>
        );
    }

    const countRole = (role) => users.filter((u) => (u.role || 'operator') === role).length;

    return (
        <div className="ui-page">
            <PageHeader
                title="Korisnici"
                subtitle="Pristup aplikaciji — uloge i lokacije"
                actions={<Button icon={Plus} onClick={openCreate}>Novi korisnik</Button>}
            />

            {info && <Alert tone="success" onClose={() => setInfo('')}>{info}</Alert>}
            {error && <Alert tone="danger" onClose={() => setError('')}>{error}</Alert>}

            <div className="ui-kpi-grid">
                <StatCard label="Ukupno korisnika" icon={Users} value={fmtNum(users.length)} loading={listLoading} />
                <StatCard label="Administratori" icon={ShieldCheck} tone="success" value={fmtNum(countRole('admin'))} loading={listLoading} />
                <StatCard label="Manageri" icon={UserCog} value={fmtNum(countRole('manager'))} loading={listLoading} />
                <StatCard label="Operateri" icon={MapPin} tone="aqua" value={fmtNum(countRole('operator'))} loading={listLoading} />
            </div>

            <Card flush>
                <div className="ui-toolbar" style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
                    <SearchInput className="grow" value={search} onChange={setSearch} placeholder="Pretraži ime, email, ulogu, lokaciju..." />
                </div>
                {listLoading ? (
                    <div className="stack" style={{ padding: 18, gap: 10 }}>{[0, 1, 2].map((i) => <div key={i} className="ui-skeleton" style={{ height: 44 }} />)}</div>
                ) : visibleUsers.length === 0 ? (
                    <EmptyState icon={Users} title="Nema korisnika" />
                ) : (
                    <div className="ui-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Korisnik</th>
                                    <th>Uloga</th>
                                    <th>Lokacija</th>
                                    <th style={{ width: 90 }} />
                                </tr>
                            </thead>
                            <tbody>
                                {visibleUsers.map((user) => {
                                    const meta = ROLE_META[user.role] || { label: user.role, tone: 'neutral' };
                                    return (
                                        <tr key={user.id}>
                                            <td>
                                                <div className="row" style={{ gap: 10 }}>
                                                    <span className="hd-avatar" aria-hidden="true">{initials(user.name)}</span>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{user.name}</div>
                                                        <div className="muted" style={{ fontSize: 12 }}>{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><Badge tone={meta.tone}>{meta.label}</Badge></td>
                                            <td>{user.companyId ? (locationLabelById.get(user.companyId) || user.companyId) : <span className="muted">Sve lokacije</span>}</td>
                                            <td>
                                                <div className="row" style={{ gap: 2, justifyContent: 'flex-end' }}>
                                                    <Button variant="ghost" size="sm" icon={Pencil} aria-label={`Uredi ${user.email}`} title="Uredi" onClick={() => startEdit(user)} />
                                                    <Button variant="ghost" size="sm" icon={Trash2} aria-label={`Obriši ${user.email}`} title="Obriši" onClick={() => removeUser(user)} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Uredi korisnika' : 'Novi korisnik'} subtitle={editing ? form.email : undefined} width={560}>
                <form onSubmit={submit}>
                    <div className="ui-form-grid">
                        <Field label="Ime i prezime" required span="all">
                            <input className="ui-input" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required autoFocus />
                        </Field>
                        <Field label="Email" required span="all">
                            <input type="email" className="ui-input" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} required />
                        </Field>
                        <Field label={editing ? 'Nova lozinka (opciono)' : 'Lozinka'} required={!editing} span="all" hint={editing ? 'Ostavi prazno da lozinka ostane ista.' : undefined}>
                            <input type="password" className="ui-input" autoComplete="new-password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} required={!editing} />
                        </Field>
                        <Field label="Uloga" hint={ROLE_META[form.role]?.hint}>
                            <select className="ui-input" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>
                                <option value="operator">Operator</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                            </select>
                        </Field>
                        {form.role !== 'admin' ? (
                            <Field label="Lokacija" required>
                                <select className="ui-input" value={form.companyId} onChange={(e) => setForm((prev) => ({ ...prev, companyId: e.target.value }))} required>
                                    {locations.map((location) => (
                                        <option key={location.id} value={location.id}>
                                            {location.code ? `${location.code} · ${location.name}` : location.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        ) : (
                            <Field label="Lokacija"><div className="ui-input" style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-2)' }}>Sve lokacije</div></Field>
                        )}
                    </div>
                    {formError && <Alert tone="danger" style={{ marginTop: 14 }}>{formError}</Alert>}
                    <div className="ui-modal-footer">
                        <Button variant="secondary" onClick={() => setFormOpen(false)}>Otkaži</Button>
                        <Button type="submit" disabled={loading}>{loading ? 'Snimanje...' : editing ? 'Sačuvaj izmjene' : 'Kreiraj korisnika'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
