'use client';

export default function WeighTicketDetailPage({ params }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Vagarski Tiket #{params.id || 'W-108842'}</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-primary">🖨️ ŠTAMPAJ</button>
                    <button className="btn-warning">✎ KOREKCIJA</button>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                {/* Left: Transaction Data */}
                <div className="scada-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="scada-header">PODACI O TRANSAKCIJI</div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div><span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Datum / Vrijeme</span><div className="font-mono" style={{ fontWeight: 600 }}>2026-02-23 08:14:22</div></div>
                            <div><span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Tip</span><div style={{ fontWeight: 600 }}>ULAZ (Prijem)</div></div>
                            <div><span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Tablice</span><div className="font-mono" style={{ fontWeight: 700, fontSize: '16px' }}>K64-T-882</div></div>
                            <div><span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Najava</span><div className="font-mono">PO-2026-556</div></div>
                            <div><span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Dobavljač</span><div style={{ fontWeight: 600 }}>Zenica Steelworks d.o.o.</div></div>
                            <div><span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Materijal</span><div style={{ fontWeight: 600 }}>FE-E1 (Miješano Željezo)</div></div>
                        </div>
                        <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '12px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', textAlign: 'center' }}>
                                <div style={{ background: '#f8fafc', padding: '12px', border: '1px solid var(--border-color)' }}><div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>BRUTO (KG)</div><div className="font-mono" style={{ fontSize: '20px', fontWeight: 700 }}>24,560</div></div>
                                <div style={{ background: '#f8fafc', padding: '12px', border: '1px solid var(--border-color)' }}><div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>TARA (KG)</div><div className="font-mono" style={{ fontSize: '20px', fontWeight: 700 }}>12,100</div></div>
                                <div style={{ background: '#fffbeb', padding: '12px', border: '1px solid #f59e0b' }}><div style={{ fontSize: '10px', color: '#b45309' }}>KALO (%)</div><div className="font-mono" style={{ fontSize: '20px', fontWeight: 700, color: '#b45309' }}>2.5%</div></div>
                                <div style={{ background: '#eef2ff', padding: '12px', border: '2px solid var(--primary-color)' }}><div style={{ fontSize: '10px', color: 'var(--primary-color)' }}>NETO (KG)</div><div className="font-mono" style={{ fontSize: '20px', fontWeight: 700 }}>12,148</div></div>
                            </div>
                        </div>
                        <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '12px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Cijena / KG</span><div className="font-mono" style={{ fontWeight: 700, fontSize: '16px' }}>0.30 BAM</div></div>
                                <div><span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Ukupno za Isplatu</span><div className="font-mono" style={{ fontWeight: 700, fontSize: '20px', color: 'var(--danger-color)' }}>3,644.55 BAM</div></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Status & Actions */}
                <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="scada-panel">
                        <div className="scada-header" style={{ background: '#475569' }}>STATUS</div>
                        <div style={{ padding: '16px', textAlign: 'center' }}>
                            <div style={{ padding: '8px', background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '14px' }}>OTVOREN — Čeka Isplatu</div>
                        </div>
                    </div>
                    <div className="scada-panel">
                        <div className="scada-header" style={{ background: '#475569' }}>LOT & SKLADIŠTE</div>
                        <div style={{ padding: '12px', fontSize: '12px' }}>
                            <div style={{ marginBottom: '8px' }}><span style={{ color: 'var(--text-muted)' }}>LOT:</span> <span className="font-mono" style={{ fontWeight: 700 }}>LOT-26-0054</span></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Lokacija:</span> Otvoreni lager C</div>
                        </div>
                    </div>
                    <div className="scada-panel">
                        <div className="scada-header" style={{ background: '#475569' }}>INSPEKCIJA</div>
                        <div style={{ padding: '12px', fontSize: '12px' }}>
                            <div style={{ marginBottom: '8px' }}><span style={{ color: 'var(--text-muted)' }}>Kontrolor:</span> Marko Kovačević</div>
                            <div style={{ marginBottom: '8px' }}><span style={{ color: 'var(--text-muted)' }}>Reklasifikacija:</span> NE</div>
                            <div><span style={{ color: 'var(--text-muted)' }}>XRF:</span> Nije rađen</div>
                        </div>
                    </div>
                    <div className="scada-panel">
                        <div className="scada-header" style={{ background: '#475569' }}>DOKUMENTI</div>
                        <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <button style={{ padding: '6px 12px', border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer', textAlign: 'left', fontSize: '12px' }}>📄 Prijemni List (PDF)</button>
                            <button style={{ padding: '6px 12px', border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer', textAlign: 'left', fontSize: '12px' }}>📄 Otkupni Blok / Samofaktura</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
