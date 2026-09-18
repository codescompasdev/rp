'use client';

export default function NewMaintenanceOrderPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Novi Nalog za Održavanje</h2>
            <div className="scada-panel">
                <div className="scada-header">DETALJI NALOGA</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Mašina *</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>Šreder #1 (Heavy)</option><option>Hidraulične Makaze</option><option>Bakar Granulator</option><option>Vaga Ulazna</option><option>Vaga Izlazna</option><option>Bager CAT 320</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Tip *</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>Preventivni</option><option>Korektivni (Kvar)</option><option>Kalibracija</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Prioritet *</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>Srednji</option><option>Visok</option><option>Kritičan</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Zakazano Za</label><input type="date" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Zadužen</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>Petar Lukić (Mehaničar)</option><option>Eksterni Servis</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Zadatak</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px' }} placeholder="npr. Zamjena noževa" /></div>
                    <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '11px', fontWeight: 700 }}>Opis Kvara / Zadatka</label><textarea style={{ width: '100%', padding: '6px', marginTop: '4px', resize: 'vertical', minHeight: '80px' }}></textarea></div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button style={{ padding: '10px 24px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                <button className="btn-primary" style={{ padding: '10px 24px' }}>KREIRAJ NALOG</button>
            </div>
        </div>
    );
}
