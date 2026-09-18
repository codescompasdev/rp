'use client';
import { glEntries } from '@/lib/demoData';

export default function FinancePage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Glavna Knjiga (General Ledger)</h2>
            <div className="scada-panel" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead><tr><th>ID</th><th>DATUM</th><th>KONTO</th><th>OPIS</th><th>REF.</th><th style={{ textAlign: 'right' }}>DUGUJE (BAM)</th><th style={{ textAlign: 'right' }}>POTRAŽUJE (BAM)</th></tr></thead>
                    <tbody>
                        {glEntries.map(e => (
                            <tr key={e.id}>
                                <td className="font-mono" style={{ fontWeight: 600 }}>{e.id}</td>
                                <td className="font-mono">{e.date}</td>
                                <td style={{ fontSize: '11px' }}>{e.account}</td>
                                <td style={{ fontSize: '11px' }}>{e.desc}</td>
                                <td className="font-mono">{e.ref}</td>
                                <td className="font-mono" style={{ textAlign: 'right', color: e.debit > 0 ? 'var(--text-color)' : 'var(--text-muted)' }}>{e.debit > 0 ? e.debit.toLocaleString() : ''}</td>
                                <td className="font-mono" style={{ textAlign: 'right', color: e.credit > 0 ? 'var(--text-color)' : 'var(--text-muted)' }}>{e.credit > 0 ? e.credit.toLocaleString() : ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
