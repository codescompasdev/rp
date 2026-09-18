'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { getAuthUser } from '@/lib/authStorage';

const STATUS_OPTIONS = [
    { value: 'all', label: 'Sve' },
    { value: 'new', label: 'Novo' },
    { value: 'in_progress', label: 'U obradi' },
    { value: 'resolved', label: 'Rijeseno' },
    { value: 'archived', label: 'Arhivirano' },
];

export default function SystemMessagesPage() {
    const authUser = getAuthUser();
    const role = String(authUser?.role || '').toLowerCase();
    const allowed = ['admin', 'manager', 'owner'].includes(role);

    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = async () => {
        if (!allowed) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/inbound-messages', {
                params: {
                    status,
                    search: search || undefined,
                    limit: 300,
                },
            });
            setRows(res?.data?.data || []);
        } catch (err) {
            setError(err?.response?.data?.error || 'Neuspjelo ucitavanje poruka.');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, nextStatus) => {
        try {
            await api.patch(`/inbound-messages/${id}/status`, { status: nextStatus });
            setRows((current) => current.map((row) => (row.id === id ? { ...row, status: nextStatus } : row)));
        } catch (err) {
            setError(err?.response?.data?.error || 'Neuspjela promjena statusa.');
        }
    };

    useEffect(() => {
        load();
    }, []);

    if (!allowed) {
        return (
            <div className="scada-panel" style={{ maxWidth: '760px', margin: '24px auto', padding: '24px' }}>
                <h2 style={{ marginTop: 0 }}>Kontakt poruke</h2>
                <div style={{ padding: '12px', border: '1px solid #f59e0b', background: '#fffbeb', color: '#92400e' }}>
                    Ova stranica je dostupna samo vlasniku, adminu i manageru.
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gap: '12px' }}>
            <div className="scada-panel" style={{ padding: '14px' }}>
                <h2 style={{ marginTop: 0, fontSize: '14px', textTransform: 'uppercase' }}>Kontakt poruke klijenata</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: '8px' }}>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: '8px' }}>
                        {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Pretraga (ime, email, telefon, poruka)"
                        style={{ padding: '8px' }}
                    />
                    <button type="button" className="btn-primary" onClick={load}>Primijeni</button>
                </div>
                {error ? (
                    <div style={{ marginTop: '8px', padding: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: '12px' }}>
                        {error}
                    </div>
                ) : null}
            </div>

            <div className="scada-panel responsive-table" style={{ overflow: 'auto' }}>
                <table>
                    <thead>
                        <tr>
                            <th>Datum</th>
                            <th>Ime i prezime</th>
                            <th>Email</th>
                            <th>Telefon</th>
                            <th>Poruka</th>
                            <th>Izvor</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id}>
                                <td>{new Date(row.createdAt).toLocaleString('sr-RS')}</td>
                                <td>{row.firstName} {row.lastName}</td>
                                <td className="font-mono">{row.email}</td>
                                <td>{row.phone || '-'}</td>
                                <td style={{ maxWidth: '380px', whiteSpace: 'normal' }}>{row.message}</td>
                                <td>{row.source || '-'}</td>
                                <td>
                                    <select value={row.status} onChange={(e) => updateStatus(row.id, e.target.value)} style={{ padding: '4px' }}>
                                        {STATUS_OPTIONS.filter((item) => item.value !== 'all').map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                        ))}
                        {!loading && !rows.length && (
                            <tr>
                                <td colSpan={7} style={{ padding: '16px', color: '#64748b' }}>
                                    Nema poruka za odabrane filtere.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {loading ? <div style={{ padding: '12px' }}>Ucitam poruke...</div> : null}
            </div>
        </div>
    );
}
