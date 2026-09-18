'use client';
import { customers } from '@/lib/demoData';

export default function ReceivablesPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Potraživanja od Kupaca (AR)</h2>
                <select style={{ padding: '6px' }}><option>Svi Kupci</option><option>Blokirani</option></select>
            </div>
            <div className="scada-panel" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead><tr><th>ID</th><th>KUPAC</th><th>ZEMLJA</th><th style={{ textAlign: 'right' }}>KREDITNI LIMIT</th><th style={{ textAlign: 'right' }}>BILANS</th><th style={{ textAlign: 'right' }}>ISKORIŠTENOST</th><th>STATUS</th></tr></thead>
                    <tbody>
                        {customers.map(c => {
                            const usage = Math.round((c.balance / c.creditLimit) * 100);
                            return (
                                <tr key={c.id} style={{ background: c.blocked ? '#fef2f2' : 'transparent' }}>
                                    <td className="font-mono" style={{ fontWeight: 600 }}>{c.id}</td>
                                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                                    <td>{c.country}</td>
                                    <td className="font-mono" style={{ textAlign: 'right' }}>{c.creditLimit.toLocaleString()}</td>
                                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>{c.balance.toLocaleString()}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                            <div style={{ width: '60px', height: '6px', background: '#e2e8f0' }}><div style={{ height: '100%', width: `${Math.min(usage, 100)}%`, background: usage > 90 ? '#ef4444' : usage > 70 ? '#f59e0b' : '#10b981' }}></div></div>
                                            <span className="font-mono" style={{ fontSize: '11px', fontWeight: 600 }}>{usage}%</span>
                                        </div>
                                    </td>
                                    <td>{c.blocked ? <span style={{ padding: '2px 6px', background: '#fee2e2', color: '#b91c1c', fontSize: '11px', fontWeight: 700 }}>BLOKIRAN</span> : <span style={{ padding: '2px 6px', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700 }}>Aktivan</span>}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
