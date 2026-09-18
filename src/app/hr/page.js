'use client';
import { useState } from 'react';
import { workers as initialWorkers, shifts } from '@/lib/demoData';
import Modal from '@/components/UI/Modal';

const LABEL = { fontSize: '11px', fontWeight: 700 };
const INPUT = { width: '100%', padding: '6px', marginTop: '4px' };

export default function HRPage() {
    const [workersList, setWorkersList] = useState(initialWorkers);
    const [showNew, setShowNew] = useState(false);
    const [showIncident, setShowIncident] = useState(false);
    const [loading, setLoading] = useState(false);
    const [workerForm, setWorkerForm] = useState({ name: '', jmbg: '', role: 'Vagar', shift: 'I (06:00-14:00)', htxExpiry: '', medicalExpiry: '' });
    const [incidentForm, setIncidentForm] = useState({ type: 'Povreda', severity: 'Lakša', location: 'Šreder #1', worker: '', desc: '', correctiveAction: '' });

    const handleSaveWorker = (e) => {
        e.preventDefault();
        if (!workerForm.name?.trim()) return;
        setLoading(true);
        const newId = `W-${String(workersList.length + 1).padStart(3, '0')}`;
        setWorkersList(prev => [...prev, { id: newId, name: workerForm.name.trim(), role: workerForm.role, shift: workerForm.shift, status: 'Slobodan', htxExpiry: workerForm.htxExpiry || new Date().toISOString().slice(0, 10) }]);
        setWorkerForm({ name: '', jmbg: '', role: 'Vagar', shift: 'I (06:00-14:00)', htxExpiry: '', medicalExpiry: '' });
        setShowNew(false);
        setLoading(false);
    };

    const handleReportIncident = (e) => {
        e.preventDefault();
        if (!incidentForm.desc?.trim()) return;
        setLoading(true);
        setIncidentForm({ type: 'Povreda', severity: 'Lakša', location: 'Šreder #1', worker: '', desc: '', correctiveAction: '' });
        setShowIncident(false);
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Smjene & Evidencija Rada</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setShowIncident(true)} style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}>🚨 PRIJAVI INCIDENT</button>
                    <button className="btn-primary" onClick={() => setShowNew(true)}>+ NOVI RADNIK</button>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {shifts.map((s, i) => (
                    <div key={i} className="scada-panel" style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700 }}>{s.shift}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Supervizor: {s.supervisor} | Radnika: <span className="font-mono" style={{ fontWeight: 700 }}>{s.workers}</span></div>
                    </div>
                ))}
            </div>
            <div className="scada-panel" style={{ flex: 1, overflow: 'auto' }}>
                <div className="scada-header">RADNICI — DANAŠNJI STATUS</div>
                <table>
                    <thead><tr><th>ID</th><th>IME</th><th>POZICIJA</th><th>SMJENA</th><th>STATUS</th><th>HTZ ISTIČE</th></tr></thead>
                    <tbody>
                        {workersList.map(w => {
                            const htxDate = new Date(w.htxExpiry);
                            const daysLeft = Math.floor((htxDate - new Date()) / (1000 * 60 * 60 * 24));
                            return (
                                <tr key={w.id}>
                                    <td className="font-mono">{w.id}</td>
                                    <td style={{ fontWeight: 600 }}>{w.name}</td>
                                    <td>{w.role}</td>
                                    <td>{w.shift}</td>
                                    <td><span style={{ padding: '2px 6px', fontSize: '11px', fontWeight: 700, background: w.status === 'Na poslu' ? '#dcfce7' : '#fef3c7', color: w.status === 'Na poslu' ? '#15803d' : '#b45309' }}>{w.status}</span></td>
                                    <td className="font-mono" style={{ color: daysLeft < 30 ? 'var(--danger-color)' : 'var(--text-color)', fontWeight: daysLeft < 30 ? 700 : 400 }}>{w.htxExpiry}{daysLeft < 30 ? ' ⚠️' : ''}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Novi Radnik">
                <form onSubmit={handleSaveWorker}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={LABEL}>Ime i Prezime *</label><input type="text" style={INPUT} value={workerForm.name} onChange={e => setWorkerForm({ ...workerForm, name: e.target.value })} required /></div>
                        <div><label style={LABEL}>JMBG</label><input type="text" className="font-mono" style={INPUT} value={workerForm.jmbg} onChange={e => setWorkerForm({ ...workerForm, jmbg: e.target.value })} /></div>
                        <div><label style={LABEL}>Pozicija *</label><select style={INPUT} value={workerForm.role} onChange={e => setWorkerForm({ ...workerForm, role: e.target.value })}><option>Vagar</option><option>Kontrolor Kvaliteta</option><option>Šef Smjene</option><option>Bagerista</option><option>Mehaničar</option><option>Radnik u Preradi</option><option>Portir</option></select></div>
                        <div><label style={LABEL}>Smjena</label><select style={INPUT} value={workerForm.shift} onChange={e => setWorkerForm({ ...workerForm, shift: e.target.value })}><option>I (06:00-14:00)</option><option>II (14:00-22:00)</option><option>III (22:00-06:00)</option></select></div>
                        <div><label style={LABEL}>Istek HTZ Opreme</label><input type="date" className="font-mono" style={INPUT} value={workerForm.htxExpiry} onChange={e => setWorkerForm({ ...workerForm, htxExpiry: e.target.value })} /></div>
                        <div><label style={LABEL}>Istek Ljekarskog</label><input type="date" className="font-mono" style={INPUT} value={workerForm.medicalExpiry} onChange={e => setWorkerForm({ ...workerForm, medicalExpiry: e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button type="button" onClick={() => setShowNew(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                        <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'ČUVANJE...' : 'SAČUVAJ RADNIKA'}</button>
                    </div>
                </form>
            </Modal>

            <Modal open={showIncident} onClose={() => setShowIncident(false)} title="🚨 Prijava HSE Incidenta" width={600}>
                <form onSubmit={handleReportIncident}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={LABEL}>Tip Incidenta *</label><select style={INPUT} value={incidentForm.type} onChange={e => setIncidentForm({ ...incidentForm, type: e.target.value })}><option>Povreda</option><option>Near-miss</option><option>Kvar Opreme</option><option>Požar</option><option>Ekološki</option></select></div>
                        <div><label style={LABEL}>Ozbiljnost *</label><select style={INPUT} value={incidentForm.severity} onChange={e => setIncidentForm({ ...incidentForm, severity: e.target.value })}><option>Lakša</option><option>Srednja</option><option>Teška</option></select></div>
                        <div><label style={LABEL}>Lokacija *</label><select style={INPUT} value={incidentForm.location} onChange={e => setIncidentForm({ ...incidentForm, location: e.target.value })}><option>Šreder #1</option><option>Kapija</option><option>Hala 1</option><option>Hala 2</option><option>Dvorište</option></select></div>
                        <div><label style={LABEL}>Radnik (Ako Povrijeđen)</label><select style={INPUT} value={incidentForm.worker} onChange={e => setIncidentForm({ ...incidentForm, worker: e.target.value })}><option value="">- Nije primjenjivo -</option>{workersList.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}</select></div>
                        <div style={{ gridColumn: 'span 2' }}><label style={LABEL}>Opis Incidenta *</label><textarea style={{ ...INPUT, resize: 'vertical', minHeight: '80px' }} value={incidentForm.desc} onChange={e => setIncidentForm({ ...incidentForm, desc: e.target.value })} required /></div>
                        <div><label style={LABEL}>Foto Dokaz</label><button type="button" style={{ display: 'block', width: '100%', padding: '6px', marginTop: '4px', border: '1px dashed var(--border-color)', background: '#f8fafc', cursor: 'pointer' }}>📷 Dodaj Sliku</button></div>
                        <div><label style={LABEL}>Korektivna Mjera</label><input type="text" style={INPUT} placeholder="Šta je preduzeto?" value={incidentForm.correctiveAction} onChange={e => setIncidentForm({ ...incidentForm, correctiveAction: e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button type="button" onClick={() => setShowIncident(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                        <button type="submit" style={{ padding: '8px 20px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }} disabled={loading}>{loading ? 'PRIJAVLJUJEM...' : 'PRIJAVI INCIDENT'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
