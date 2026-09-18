'use client';
import { useState } from 'react';
import { lots } from '@/lib/demoData';
import Modal from '@/components/UI/Modal';

export default function LotsPage() {
    const [showDetail, setShowDetail] = useState(null);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>LOT Traceability</h2>
                <input type="text" placeholder="Skeniraj LOT barkod..." className="font-mono" style={{ padding: '6px', width: '250px' }} />
            </div>
            <div className="scada-panel" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead><tr><th>LOT ID</th><th>MATERIJAL</th><th>TIKET</th><th>DOBAVLJAČ</th><th style={{ textAlign: 'right' }}>KG</th><th>LOKACIJA</th><th>STATUS</th><th></th></tr></thead>
                    <tbody>
                        {lots.map(l => (
                            <tr key={l.id}>
                                <td className="font-mono" style={{ fontWeight: 700 }}>{l.id}</td>
                                <td>{l.material}</td>
                                <td className="font-mono">{l.ticket}</td>
                                <td>{l.supplier}</td>
                                <td className="font-mono" style={{ textAlign: 'right', fontWeight: 600 }}>{l.kg.toLocaleString()}</td>
                                <td>{l.location}</td>
                                <td><span style={{ padding: '2px 6px', fontSize: '11px', fontWeight: 700, background: l.status === 'Dostupno' ? '#dcfce7' : l.status === 'U Preradi' ? '#dbeafe' : '#fef3c7', color: l.status === 'Dostupno' ? '#15803d' : l.status === 'U Preradi' ? '#1d4ed8' : '#b45309' }}>{l.status}</span></td>
                                <td><button onClick={() => setShowDetail(l)} style={{ padding: '2px 8px', background: 'transparent', border: '1px solid var(--border-color)', fontSize: '11px', cursor: 'pointer' }}>📋 Genealogija</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={`Genealogija: ${showDetail?.id || ''}`} width={650}>
                {showDetail && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px' }}>
                            <div><span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>LOT</span><div className="font-mono" style={{ fontWeight: 700, fontSize: '16px' }}>{showDetail.id}</div></div>
                            <div><span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>MATERIJAL</span><div style={{ fontWeight: 600 }}>{showDetail.material}</div></div>
                            <div><span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>TEŽINA</span><div className="font-mono" style={{ fontWeight: 700 }}>{showDetail.kg.toLocaleString()} KG</div></div>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                            {[
                                { step: '1. DOBAVLJAČ', desc: showDetail.supplier, detail: `Ugovor: ${showDetail.contract || 'Spot'}`, icon: '🏭' },
                                { step: '2. KAPIJA', desc: `Kamion registrovan`, detail: `Najava automatski pronađena`, icon: '🚛' },
                                { step: '3. VAGANJE (BRUTO)', desc: `Bruto masa: očitana na vagi`, detail: `Tiket: ${showDetail.ticket}`, icon: '⚖️' },
                                { step: '4. INSPEKCIJA', desc: `Kontrolor provjerio kvalitet`, detail: `Kalo primjenjen`, icon: '🔍' },
                                { step: '5. VAGANJE (TARA)', desc: `Neto: ${showDetail.kg.toLocaleString()} KG`, detail: `Cijena utvrđena`, icon: '⚖️' },
                                { step: '6. SKLADIŠTE', desc: `Lokacija: ${showDetail.location}`, detail: `LOT kreiran i aktivan`, icon: '📦' },
                            ].map((s, i) => (
                                <div key={i} style={{ display: 'flex', gap: '8px', padding: '6px 8px', borderLeft: '3px solid var(--primary-color)', marginBottom: '4px', background: '#f8fafc' }}>
                                    <span style={{ fontSize: '16px' }}>{s.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '11px' }}>{s.step}</div>
                                        <div style={{ fontSize: '11px' }}>{s.desc}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{s.detail}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '8px', background: '#dcfce7', border: '1px solid #10b981', fontSize: '11px', fontWeight: 600, color: '#15803d' }}>✓ LOT potpuno sljediv. Spreman za preradu ili prodaju.</div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
