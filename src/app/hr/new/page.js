'use client';

export default function NewWorkerPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Novi Radnik</h2>
            <div className="scada-panel">
                <div className="scada-header">LIČNI PODACI</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Ime i Prezime *</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>JMBG</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Pozicija *</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>Vagar</option><option>Kontrolor Kvaliteta</option><option>Šef Smjene</option><option>Bagerista</option><option>Mehaničar</option><option>Radnik u Preradi</option><option>Viljuškarista</option><option>Portir</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Smjena</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>I (06:00-14:00)</option><option>II (14:00-22:00)</option><option>III (22:00-06:00)</option></select></div>
                </div>
            </div>
            <div className="scada-panel">
                <div className="scada-header" style={{ background: '#475569' }}>HTZ OPREMA & CERTIFIKATI</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Istek HTZ Opreme</label><input type="date" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Istek Ljekarskog</label><input type="date" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Obuka ZNR</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>Položeno</option><option>Nije Položeno</option></select></div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button style={{ padding: '10px 24px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                <button className="btn-primary" style={{ padding: '10px 24px' }}>SAČUVAJ RADNIKA</button>
            </div>
        </div>
    );
}
