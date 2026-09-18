'use client';
import { useState } from 'react';

export default function NewSupplierPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Novi Dobavljač</h2>
            <div className="scada-panel">
                <div className="scada-header">OSNOVNI PODACI</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Naziv Firme / Ime *</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px' }} placeholder="npr. Zenica Steelworks d.o.o." /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>JIB (Jedinstveni ID) *</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} placeholder="4218109230004" /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Tip Partnera *</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>Industrija (Firma)</option><option>Sakupljač</option><option>Komunalno</option><option>Fizičko Lice</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>PDV Obveznik</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>DA</option><option>NE</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Grad</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Adresa</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Telefon</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} placeholder="+387 xx xxx xxx" /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Email</label><input type="email" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                </div>
            </div>
            <div className="scada-panel">
                <div className="scada-header" style={{ background: '#475569' }}>KONTAKT OSOBE</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Ime i Prezime</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Pozicija</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px' }} placeholder="npr. Direktor" /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Mobitel</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                </div>
            </div>
            <div className="scada-panel">
                <div className="scada-header" style={{ background: '#475569' }}>BONITET & USLOVI</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Bonitet</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>A — Odličan</option><option>B — Prosječan</option><option>C — Rizičan</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Rok Plaćanja (dana)</label><input type="number" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} defaultValue={15} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Napomena</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button style={{ padding: '10px 24px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                <button className="btn-primary" style={{ padding: '10px 24px' }}>SAČUVAJ DOBAVLJAČA</button>
            </div>
        </div>
    );
}
