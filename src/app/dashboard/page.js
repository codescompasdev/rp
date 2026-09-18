'use client';
import { lmePrices, fxRates, financialSummary, trucksOnSite, systemAlerts } from '@/lib/demoData';

export default function DashboardPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                <div className="scada-panel" style={{ padding: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Cashflow (Banka)</div>
                    <div className="font-mono" style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--success-color)', marginTop: '4px' }}>+{financialSummary.bankBalance.toLocaleString()} BAM</div>
                </div>
                <div className="scada-panel" style={{ padding: '12px', borderLeft: '3px solid var(--danger-color)' }}>
                    <div style={{ fontSize: '10px', color: '#b91c1c', textTransform: 'uppercase', fontWeight: 700 }}>Dospjele Obaveze</div>
                    <div className="font-mono" style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--danger-color)', marginTop: '4px' }}>-{financialSummary.overduePayables.toLocaleString()} BAM</div>
                </div>
                <div className="scada-panel" style={{ padding: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Ulaz Danas</div>
                    <div className="font-mono" style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px' }}>{financialSummary.tonnageInToday} T</div>
                </div>
                <div className="scada-panel" style={{ padding: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Izlaz Danas</div>
                    <div className="font-mono" style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px' }}>{financialSummary.tonnageOutToday} T</div>
                </div>
                <div className="scada-panel" style={{ padding: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Prerađeno Danas</div>
                    <div className="font-mono" style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px' }}>{financialSummary.tonnageProcessedToday} T</div>
                </div>
                <div className="scada-panel" style={{ padding: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Blagajna (Pale)</div>
                    <div className="font-mono" style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--success-color)', marginTop: '4px' }}>{financialSummary.cashRegisters[0].balance.toLocaleString()} BAM</div>
                </div>
            </div>

            {/* Main Area */}
            <div style={{ display: 'flex', gap: '12px', flex: 1, overflow: 'hidden', flexWrap: 'wrap' }}>
                {/* Trucks Table */}
                <div className="scada-panel" style={{ flex: '2 1 420px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                    <div className="scada-header">KAMIONI U KRUGU</div>
                    <div className="responsive-table" style={{ overflowY: 'auto', flex: 1 }}>
                        <table>
                            <thead><tr><th>TABLICE</th><th>DOBAVLJAČ</th><th>MATERIJAL</th><th>ULAZ</th><th>STATUS</th></tr></thead>
                            <tbody>
                                {trucksOnSite.map(t => (
                                    <tr key={t.plate}>
                                        <td className="font-mono" style={{ fontWeight: 600 }}>{t.plate}</td>
                                        <td>{t.supplier}</td>
                                        <td>{t.material}</td>
                                        <td className="font-mono">{t.entryTime}</td>
                                        <td><span style={{ padding: '2px 6px', background: t.statusColor + '22', color: t.statusColor, fontSize: '11px', fontWeight: 700 }}>{t.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* LME Prices */}
                <div className="scada-panel" style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', minWidth: 220 }}>
                    <div className="scada-header" style={{ background: '#475569' }}>LME BERZA</div>
                    <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        {lmePrices.map(p => (
                            <div key={p.metal} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#f8fafc', border: '1px solid var(--border-color)' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600 }}>{p.metal}</span>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="font-mono" style={{ fontSize: '12px', fontWeight: 700 }}>${p.price.toLocaleString()}</div>
                                    <div className="font-mono" style={{ fontSize: '10px', color: p.change > 0 ? '#10b981' : p.change < 0 ? '#ef4444' : '#94a3b8' }}>
                                        {p.change > 0 ? '▲' : p.change < 0 ? '▼' : '➖'}{p.change}%
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 'auto', paddingTop: '6px' }}>
                            {fxRates.map(f => (
                                <div key={f.pair} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px', fontSize: '11px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{f.pair}</span>
                                    <span className="font-mono" style={{ fontWeight: 600 }}>{f.rate}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Alert Log */}
                <div className="scada-panel" style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', background: '#0f172a', color: '#e2e8f0', overflow: 'hidden', minWidth: 260 }}>
                    <div className="scada-header" style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>SISTEMSKI DOGAĐAJI</div>
                    <div className="font-mono" style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', fontSize: '11px' }}>
                        {systemAlerts.map((a, i) => (
                            <div key={i} style={{ display: 'flex', gap: '6px', color: a.color }}>
                                <span style={{ color: '#64748b', flexShrink: 0 }}>[{a.time}]</span>
                                <span>{a.level}: {a.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
