'use client';
import { materials } from '@/lib/demoData';

export default function PricingPage() {
    const today = new Date().toLocaleDateString('bs-BA');
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div className="scada-panel">
                <div style={{ padding: '12px', background: '#1e293b', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><div style={{ fontSize: '10px', color: '#94a3b8' }}>MOTOR CIJENA — MATRICA</div><div style={{ fontSize: '16px', fontWeight: 700 }}>Datum: {today}</div></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></div><span className="font-mono" style={{ fontSize: '12px' }}>LME SYNC OK 08:00</span></div>
                </div>
            </div>
            <div className="scada-panel" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead><tr><th>KOD</th><th>MATERIJAL</th><th>KATEGORIJA</th><th style={{ textAlign: 'right' }}>BAZA LME</th><th style={{ textAlign: 'right' }}>MARŽA (%)</th><th style={{ textAlign: 'right', background: '#e0e7ff' }}>OTKUPNA CIJENA (BAM/KG)</th><th style={{ textAlign: 'center', background: '#fef3c7' }}>RUČNI OVERRIDE</th></tr></thead>
                    <tbody>
                        {materials.filter(m => m.buyPrice > 0).map(m => (
                            <tr key={m.code}>
                                <td className="font-mono" style={{ fontWeight: 600 }}>{m.code}</td>
                                <td>{m.name}</td>
                                <td>{m.category}</td>
                                <td className="font-mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{m.basePrice ? m.basePrice.toFixed(2) : 'N/A (Lok.)'}</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>{m.margin !== null ? <><input type="text" className="font-mono" style={{ width: '50px', padding: '2px', textAlign: 'right', border: '1px solid transparent', background: 'transparent' }} defaultValue={m.margin.toFixed(1)} /> %</> : '-'}</td>
                                <td className="font-mono" style={{ textAlign: 'right', background: '#eef2ff', fontWeight: 700, fontSize: '13px' }}>{m.buyPrice.toFixed(2)}</td>
                                <td style={{ background: '#fffbeb', padding: '4px' }}><input type="text" className="font-mono" placeholder="-" style={{ width: '100%', padding: '4px', textAlign: 'right', border: '1px solid var(--border-color)', background: 'transparent' }} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div style={{ padding: '12px', background: '#f8fafc', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                <button style={{ padding: '12px 32px', background: 'var(--success-color)', color: 'white', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>OBJAVI CIJENE NA KAPIJU & POS</button>
            </div>
        </div>
    );
}
