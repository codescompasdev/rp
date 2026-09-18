export default function OEEPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>OEE Efikasnost Mašina</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {[
                    { name: 'Šreder #1 (Heavy)', oee: 82, availability: 90, performance: 95, quality: 96, status: 'Aktivan', hours: 1240 },
                    { name: 'Hidraulične Makaze', oee: 45, availability: 50, performance: 90, quality: 100, status: 'Kvar', hours: 980 },
                    { name: 'Bakar Granulator', oee: 91, availability: 95, performance: 98, quality: 98, status: 'Aktivan', hours: 650 },
                ].map(m => (
                    <div key={m.name} className="scada-panel">
                        <div className="scada-header" style={{ background: m.status === 'Kvar' ? '#ef4444' : '#334155' }}>{m.name}</div>
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div className="font-mono" style={{ fontSize: '48px', fontWeight: 'bold', color: m.oee > 80 ? 'var(--success-color)' : m.oee > 60 ? 'var(--warning-color)' : 'var(--danger-color)' }}>{m.oee}%</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>OEE Score</div>
                            </div>
                            {[
                                { label: 'Dostupnost', val: m.availability },
                                { label: 'Performans', val: m.performance },
                                { label: 'Kvalitet', val: m.quality },
                            ].map(met => (
                                <div key={met.label}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                                        <span>{met.label}</span><span className="font-mono" style={{ fontWeight: 600 }}>{met.val}%</span>
                                    </div>
                                    <div style={{ height: '6px', background: '#e2e8f0' }}><div style={{ height: '100%', width: `${met.val}%`, background: met.val > 90 ? '#10b981' : met.val > 70 ? '#f59e0b' : '#ef4444' }}></div></div>
                                </div>
                            ))}
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                Radni sati: <span className="font-mono" style={{ fontWeight: 600 }}>{m.hours.toLocaleString()}h</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
