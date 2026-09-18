'use client';

export default function NewDispatchOrderPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Novi Nalog za Vožnju</h2>
            <div className="scada-panel">
                <div className="scada-header">TURA & RUTA</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Vozač *</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>Dragan Milić (T85-J-441)</option><option>Nenad Savić (T85-J-442)</option><option>Milan Jovanović (Slobodan)</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Vozilo *</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>T85-J-441 (MAN TGS)</option><option>T85-J-442 (Scania R450)</option></select></div>
                    <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '11px', fontWeight: 700 }}>Opis Ture *</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px' }} placeholder="npr. Pale → Sarajevo (Fab. Prozora), pokupi CNT-002" /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Kontejner (Opciono)</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>- Bez kontejnera -</option><option>CNT-002 (Fab. Prozora Sarajevo)</option><option>CNT-004 (Komunalno Pale)</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Datum Polaska</label><input type="date" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button style={{ padding: '10px 24px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                <button className="btn-primary" style={{ padding: '10px 24px' }}>POŠALJI NALOG VOZAČU</button>
            </div>
        </div>
    );
}
