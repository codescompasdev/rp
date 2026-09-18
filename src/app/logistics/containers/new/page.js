'use client';

export default function NewContainerPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Registruj Kontejner</h2>
            <div className="scada-panel">
                <div className="scada-header">PODACI O KONTEJNERU</div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>ID Kontejnera *</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} placeholder="CNT-006" /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Tip *</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>Abroll 20m³</option><option>Abroll 30m³</option><option>Abroll 40m³</option><option>Mulda 7m³</option><option>Mulda 10m³</option><option>Skip 4m³</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Početna Lokacija</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>Lager Pale</option><option>Lager Banja Luka</option><option>Lager Bijeljina</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>QR Kod / Barkod</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Napomena</label><textarea style={{ width: '100%', padding: '6px', marginTop: '4px', resize: 'vertical', minHeight: '60px' }}></textarea></div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button style={{ padding: '10px 24px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                <button className="btn-primary" style={{ padding: '10px 24px' }}>REGISTRUJ</button>
            </div>
        </div>
    );
}
