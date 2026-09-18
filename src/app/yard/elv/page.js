export default function ELVPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Depolucija Vozila (ELV)</h2>
            <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                <div className="scada-panel" style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column' }}>
                    <div className="scada-header">VOZILO ZA DEPOLUCIJU</div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Br. Šasije (VIN)</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} defaultValue="WVWZZZ3CZWE123456" /></div>
                        <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Reg. Tablice</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} defaultValue="E55-K-112" /></div>
                        <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Vlasnik</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px' }} defaultValue="Petar Petrović" /></div>
                        <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Br. Lične Karte</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} defaultValue="04GTA1234" /></div>
                        <div style={{ padding: '8px', background: '#dcfce7', border: '1px solid #10b981', fontSize: '12px', fontWeight: 600, color: '#15803d' }}>✓ BLACKLIST: ČIST</div>
                    </div>
                </div>
                <div className="scada-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="scada-header">CHECK-LISTA KOMPLETNOSTI</div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                            { part: 'Motor', present: true, value: 'Kompletan' },
                            { part: 'Mjenjač', present: true, value: 'Kompletan' },
                            { part: 'Katalizator', present: false, value: 'NEDOSTAJE' },
                            { part: 'Akumulator', present: true, value: 'Prisutan' },
                            { part: 'Ulje / Antifriz', present: true, value: 'Za drenažu' },
                            { part: 'Gume (4x)', present: true, value: '3/4 prisutne' },
                            { part: 'Sjedišta / Enterijer', present: false, value: 'Skinuto' },
                        ].map(item => (
                            <div key={item.part} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: item.present ? '#f8fafc' : '#fef2f2', border: `1px solid ${item.present ? 'var(--border-color)' : '#fca5a5'}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input type="checkbox" defaultChecked={item.present} />
                                    <span style={{ fontWeight: 600 }}>{item.part}</span>
                                </div>
                                <span style={{ fontSize: '12px', color: item.present ? 'var(--text-muted)' : 'var(--danger-color)', fontWeight: item.present ? 400 : 700 }}>{item.value}</span>
                            </div>
                        ))}
                        <div style={{ marginTop: '16px', padding: '12px', background: '#fffbeb', border: '1px solid #f59e0b' }}>
                            <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 700, marginBottom: '4px' }}>DINAMIČKA CIJENA:</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Bez katalizatora → Niža cijena</span>
                                <span className="font-mono" style={{ fontWeight: 700 }}>0.30 BAM/KG</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
                        <button className="btn-primary" style={{ flex: 1, padding: '12px' }}>ZAVRŠI DEPOLUCIJU</button>
                        <button className="btn-warning" style={{ flex: 1, padding: '12px' }}>RAZDUŽI NA ARTIKLE</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
