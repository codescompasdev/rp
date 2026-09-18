'use client';

export default function NewDriverPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Novi Vozač</h2>
            <div className="scada-panel">
                <div className="scada-header">LIČNI PODACI</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Ime i Prezime *</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>JMBG</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Telefon *</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} placeholder="+387 65 xxx xxx" /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Adresa</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                </div>
            </div>
            <div className="scada-panel">
                <div className="scada-header" style={{ background: '#475569' }}>VOZAČKA DOZVOLA & KVALIFIKACIJE</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Kategorija *</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>B</option><option>C</option><option>CE</option><option>D</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Br. Vozačke</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Istek Dozvole</label><input type="date" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>ADR Dozvola</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>NE</option><option>DA - Klasa 1-9</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Ljekarski (Istek)</label><input type="date" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Dodjeljeno Vozilo</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>- Nije dodjeljen -</option><option>T85-J-441 (MAN)</option><option>T85-J-442 (Scania)</option></select></div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button style={{ padding: '10px 24px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                <button className="btn-primary" style={{ padding: '10px 24px' }}>SAČUVAJ VOZAČA</button>
            </div>
        </div>
    );
}
