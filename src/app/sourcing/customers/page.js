'use client';

import { useState } from 'react';
import { customers as initialCustomers } from '@/lib/demoData';
import Modal from '@/components/UI/Modal';

const LABEL_STYLE = { fontSize: '11px', fontWeight: 700 };
const INPUT_STYLE = { width: '100%', padding: '6px', marginTop: '4px' };

export default function CustomersPage() {
    const [customersList, setCustomersList] = useState(initialCustomers);
    const [showNew, setShowNew] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ name: '', country: 'BA', creditLimit: '', blocked: false });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name?.trim()) return;
        setLoading(true);
        try {
            const newId = `C-${String(customersList.length + 1).padStart(3, '0')}`;
            const newCustomer = {
                id: newId,
                name: formData.name.trim(),
                country: formData.country || 'BA',
                creditLimit: parseFloat(formData.creditLimit) || 100000,
                balance: 0,
                blocked: formData.blocked || false,
            };
            setCustomersList(prev => [...prev, newCustomer]);
            setFormData({ name: '', country: 'BA', creditLimit: '', blocked: false });
            setShowNew(false);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEdit = (c) => {
        setEditingCustomer(c);
        setFormData({ name: c.name, country: c.country, creditLimit: String(c.creditLimit), blocked: c.blocked });
        setShowEdit(true);
    };

    const handleSaveEdit = (e) => {
        e.preventDefault();
        if (!editingCustomer) return;
        setLoading(true);
        setCustomersList(prev => prev.map(c => c.id === editingCustomer.id ? { ...c, ...formData, creditLimit: parseFloat(formData.creditLimit) || c.creditLimit } : c));
        setShowEdit(false);
        setEditingCustomer(null);
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Kupci</h2>
                <button className="btn-primary" onClick={() => setShowNew(true)}>+ NOVI KUPAC</button>
            </div>
            <div className="scada-panel" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead><tr><th>ID</th><th>NAZIV</th><th>ZEMLJA</th><th style={{ textAlign: 'right' }}>KREDIT. LIMIT</th><th style={{ textAlign: 'right' }}>BILANS</th><th style={{ textAlign: 'right' }}>ISKORIŠTENOST</th><th>STATUS</th></tr></thead>
                    <tbody>
                        {customersList.map(c => {
                            const usage = c.creditLimit > 0 ? Math.round((c.balance / c.creditLimit) * 100) : 0;
                            return (
                                <tr key={c.id} style={{ background: c.blocked ? '#fef2f2' : 'transparent' }}>
                                    <td className="font-mono" style={{ fontWeight: 600 }}>{c.id}</td>
                                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                                    <td>{c.country}</td>
                                    <td className="font-mono" style={{ textAlign: 'right' }}>{c.creditLimit.toLocaleString()}</td>
                                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>{c.balance.toLocaleString()}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                            <div style={{ width: '60px', height: '6px', background: '#e2e8f0' }}><div style={{ height: '100%', width: `${Math.min(usage, 100)}%`, background: usage > 90 ? '#ef4444' : usage > 70 ? '#f59e0b' : '#10b981' }}></div></div>
                                            <span className="font-mono" style={{ fontSize: '11px', fontWeight: 600 }}>{usage}%</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            {c.blocked ? <span style={{ padding: '2px 6px', background: '#fee2e2', color: '#b91c1c', fontSize: '11px', fontWeight: 700 }}>BLOKIRAN</span> : <span style={{ padding: '2px 6px', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700 }}>Aktivan</span>}
                                            <button type="button" onClick={(ev) => { ev.stopPropagation(); handleOpenEdit(c); }} style={{ padding: '2px 8px', fontSize: '10px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>✎</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Novi Kupac" width={550}>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={LABEL_STYLE}>Naziv Firme / Kupca *</label><input type="text" style={INPUT_STYLE} placeholder="npr. ArcelorMittal Zenica" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
                        <div><label style={LABEL_STYLE}>Zemlja</label><select style={INPUT_STYLE} value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })}>
                            <option value="BA">Bosna i Hercegovina</option>
                            <option value="RS">Srbija</option>
                            <option value="HR">Hrvatska</option>
                            <option value="DE">Njemačka</option>
                            <option value="AT">Austrija</option>
                        </select></div>
                        <div><label style={LABEL_STYLE}>Kreditni Limit (BAM) *</label><input type="number" className="font-mono" style={INPUT_STYLE} placeholder="100000" value={formData.creditLimit} onChange={e => setFormData({ ...formData, creditLimit: e.target.value })} /></div>
                        <div><label style={LABEL_STYLE}>Blokiran</label><select style={INPUT_STYLE} value={formData.blocked ? 'DA' : 'NE'} onChange={e => setFormData({ ...formData, blocked: e.target.value === 'DA' })}>
                            <option value="NE">Ne</option>
                            <option value="DA">Da</option>
                        </select></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button type="button" onClick={() => setShowNew(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                        <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'ČUVANJE...' : 'KREIRAJ KUPCA'}</button>
                    </div>
                </form>
            </Modal>

            <Modal open={showEdit} onClose={() => { setShowEdit(false); setEditingCustomer(null); }} title="Uredi Kupca" width={550}>
                {editingCustomer && (
                    <form onSubmit={handleSaveEdit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div><label style={LABEL_STYLE}>Naziv Firme / Kupca *</label><input type="text" style={INPUT_STYLE} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
                            <div><label style={LABEL_STYLE}>Zemlja</label><select style={INPUT_STYLE} value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })}>
                                <option value="BA">Bosna i Hercegovina</option>
                                <option value="RS">Srbija</option>
                                <option value="HR">Hrvatska</option>
                                <option value="DE">Njemačka</option>
                                <option value="AT">Austrija</option>
                            </select></div>
                            <div><label style={LABEL_STYLE}>Kreditni Limit (BAM) *</label><input type="number" className="font-mono" style={INPUT_STYLE} value={formData.creditLimit} onChange={e => setFormData({ ...formData, creditLimit: e.target.value })} /></div>
                            <div><label style={LABEL_STYLE}>Blokiran</label><select style={INPUT_STYLE} value={formData.blocked ? 'DA' : 'NE'} onChange={e => setFormData({ ...formData, blocked: e.target.value === 'DA' })}>
                                <option value="NE">Ne</option>
                                <option value="DA">Da</option>
                            </select></div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            <button type="button" onClick={() => { setShowEdit(false); setEditingCustomer(null); }} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                            <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'ČUVANJE...' : 'SAČUVAJ'}</button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
