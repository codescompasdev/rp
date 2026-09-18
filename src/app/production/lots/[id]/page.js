'use client';

export default function LOTDetailPage({ params }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>LOT Genealogija: {params.id || 'LOT-26-0055'}</h2>
                <button className="btn-primary">🖨️ ŠTAMPAJ TRACEABILITY</button>
            </div>
            <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                {/* Left: LOT Info */}
                <div className="scada-panel" style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column' }}>
                    <div className="scada-header">PODACI O LOT-U</div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                        <div><span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>LOT ID</span><div className="font-mono" style={{ fontWeight: 700, fontSize: '18px' }}>LOT-26-0055</div></div>
                        <div><span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>MATERIJAL</span><div style={{ fontWeight: 600 }}>CU-MB (Bakar Millberry)</div></div>
                        <div><span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>TEŽINA</span><div className="font-mono" style={{ fontWeight: 700 }}>3,663 KG</div></div>
                        <div><span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>LOKACIJA</span><div>Hala 1 - Sektor A</div></div>
                        <div><span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>STATUS</span><div><span style={{ padding: '2px 6px', background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '11px' }}>Dostupno</span></div></div>
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}><span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>BARKOD</span><div className="font-mono" style={{ fontWeight: 600, letterSpacing: '2px', background: '#f8fafc', padding: '8px', textAlign: 'center', marginTop: '4px' }}>||||| LOT-26-0055 |||||</div></div>
                    </div>
                </div>

                {/* Right: Genealogy Timeline */}
                <div className="scada-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="scada-header" style={{ background: '#475569' }}>GENEALOGIJA (LANAC PORIJEKLA)</div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
                        {[
                            { step: 1, title: 'DOBAVLJAČ', time: '2026-02-23 07:55', desc: 'EuroMetali d.o.o., Banja Luka', detail: 'Ugovor UGV-2026-002 | Formula: LME -8%', icon: '🏭' },
                            { step: 2, title: 'KAPIJA (CHECK-IN)', time: '2026-02-23 07:55', desc: 'Kamion A12-M-991 registrovan na ulaznoj kapiji', detail: 'Najava PO-2026-555 pronađena automatski', icon: '🚛' },
                            { step: 3, title: 'VAGANJE 1 (BRUTO)', time: '2026-02-23 07:56', desc: 'Bruto masa: 18,200 KG', detail: 'Tiket #W-108841', icon: '⚖️' },
                            { step: 4, title: 'INSPEKCIJA', time: '2026-02-23 08:05', desc: 'Kontrolor: Marko Kovačević', detail: 'Klasa: Millberry (I) — POTVRĐENO | Kalo: 1.0%', icon: '🔍' },
                            { step: 5, title: 'VAGANJE 2 (TARA)', time: '2026-02-23 08:15', desc: 'Tara masa: 14,500 KG | Neto: 3,663 KG', detail: 'Ukupno za isplatu: 45,494.46 BAM', icon: '⚖️' },
                            { step: 6, title: 'SKLADIŠTE (PUT-AWAY)', time: '2026-02-23 08:20', desc: 'Smješteno: Hala 1 - Sektor A', detail: 'LOT-26-0055 kreiran i aktiviran', icon: '📦' },
                        ].map(s => (
                            <div key={s.step} style={{ display: 'flex', gap: '12px', padding: '10px', background: '#f8fafc', border: '1px solid var(--border-color)', borderLeft: '3px solid var(--primary-color)' }}>
                                <div style={{ fontSize: '20px', flexShrink: 0 }}>{s.icon}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '12px' }}>{s.step}. {s.title}</span>
                                        <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{s.time}</span>
                                    </div>
                                    <div style={{ fontSize: '12px' }}>{s.desc}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.detail}</div>
                                </div>
                            </div>
                        ))}
                        <div style={{ padding: '12px', background: '#dcfce7', border: '1px solid #10b981', fontSize: '12px', fontWeight: 600, color: '#15803d' }}>
                            ✓ LOT potpuno SLJEDIV od dobavljača do skladišta. Spreman za preradu ili prodaju.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
