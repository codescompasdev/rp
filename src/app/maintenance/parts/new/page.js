'use client';

export default function NewSparePartPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Novi Rezervni Dio</h2>
            <div className="scada-panel">
                <div className="scada-header">PODACI O DIJELU</div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Naziv *</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px' }} placeholder="npr. Noževi Šreder (Set)" /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Mašina</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>Šreder #1</option><option>Hidraulične Makaze</option><option>Vaga</option><option>Sve</option></select></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Trenutno na Stanju *</label><input type="number" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                        <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Minimalna Zaliha *</label><input type="number" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    </div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Nabavna Cijena (BAM)</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Dobavljač Dijela</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button style={{ padding: '10px 24px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                <button className="btn-primary" style={{ padding: '10px 24px' }}>SAČUVAJ</button>
            </div>
        </div>
    );
}
