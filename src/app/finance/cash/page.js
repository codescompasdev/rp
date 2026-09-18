'use client';
import { financialSummary } from '@/lib/demoData';

export default function CashPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Blagajna & Treasury</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {financialSummary.cashRegisters.map(cr => (
                    <div key={cr.location} className="scada-panel" style={{ padding: '16px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>BLAGAJNA: {cr.location}</div>
                        <div className="font-mono" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success-color)', marginTop: '4px' }}>{cr.balance.toLocaleString()} BAM</div>
                        <div style={{ marginTop: '8px', height: '6px', background: '#e2e8f0' }}><div style={{ height: '100%', width: `${(cr.balance / cr.limit) * 100}%`, background: cr.balance / cr.limit > 0.8 ? '#f59e0b' : '#10b981' }}></div></div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Limit: <span className="font-mono">{cr.limit.toLocaleString()} BAM</span></div>
                    </div>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="scada-panel" style={{ padding: '16px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>BILANS BANKE</div>
                    <div className="font-mono" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success-color)', marginTop: '4px' }}>{financialSummary.bankBalance.toLocaleString()} BAM</div>
                </div>
                <div className="scada-panel" style={{ padding: '16px', borderLeft: '3px solid var(--warning-color)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>CASH FORECAST (30 DANA)</div>
                    <div className="font-mono" style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>~285,000 BAM</div>
                    <div style={{ fontSize: '10px', color: 'var(--warning-color)', marginTop: '4px' }}>⚠️ Očekivani deficit u sedmici 3</div>
                </div>
            </div>
            <div className="scada-panel" style={{ flex: 1, overflow: 'auto' }}>
                <div className="scada-header">POSLJEDNJE TRANSAKCIJE BLAGAJNE (PALE)</div>
                <table>
                    <thead><tr><th>DATUM</th><th>OPIS</th><th>TIP</th><th style={{ textAlign: 'right' }}>IZNOS (BAM)</th><th style={{ textAlign: 'right' }}>BILANS</th></tr></thead>
                    <tbody>
                        <tr><td className="font-mono">2026-02-23 08:50</td><td>Isplata - Otkupni blok OB-0442</td><td>Izlaz (Keš)</td><td className="font-mono" style={{ textAlign: 'right', color: 'var(--danger-color)' }}>-257.40</td><td className="font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>12,500.00</td></tr>
                        <tr><td className="font-mono">2026-02-23 08:00</td><td>Dnevni polog banci</td><td>Transfer</td><td className="font-mono" style={{ textAlign: 'right', color: 'var(--danger-color)' }}>-5,000.00</td><td className="font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>12,757.40</td></tr>
                        <tr><td className="font-mono">2026-02-22 16:00</td><td>Isplata - Walk-in POS (5 transakcija)</td><td>Izlaz (Keš)</td><td className="font-mono" style={{ textAlign: 'right', color: 'var(--danger-color)' }}>-2,400.00</td><td className="font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>17,757.40</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
