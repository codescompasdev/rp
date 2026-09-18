'use client';

export default function NewVehiclePage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Novo Vozilo</h2>
            <div className="scada-panel">
                <div className="scada-header">PODACI O VOZILU</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Registracija *</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} placeholder="T85-J-441" /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Tip Vozila *</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>Kamion Kuka</option><option>Tegljač</option><option>Bager</option><option>Grajfer</option><option>Viljuškar</option><option>Prikolica</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Marka & Model</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px' }} placeholder="MAN TGS 26.400" /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Godina Proizvodnje</label><input type="number" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Br. Šasije (VIN)</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Trenutna Kilometraža</label><input type="number" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                </div>
            </div>
            <div className="scada-panel">
                <div className="scada-header" style={{ background: '#475569' }}>REGISTRACIJA & SERVIS</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Datum Registracije</label><input type="date" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Istek Registracije</label><input type="date" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Zadnji Servis</label><input type="date" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                </div>
            </div>
            <div className="scada-panel">
                <div className="scada-header" style={{ background: '#475569' }}>GORIVO & POTROŠNJA</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Tip Goriva</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>Diesel</option><option>Benzin</option><option>Električno</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Kapacitet Rezervoara (L)</label><input type="number" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button style={{ padding: '10px 24px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                <button className="btn-primary" style={{ padding: '10px 24px' }}>SAČUVAJ VOZILO</button>
            </div>
        </div>
    );
}
