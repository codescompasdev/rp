'use client';
import { trucksOnSite, containers } from '@/lib/demoData';

export default function YardManagerPage() {
    const freeContainers = containers.filter(c => c.status === 'Prazan').length;
    const atClient = containers.filter(c => c.status === 'Kod Klijenta' || c.status === 'Pun - Čeka Odvoz').length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                <div className="scada-panel" style={{ padding: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Kamioni u Najavi</div>
                    <div className="font-mono" style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>2</div>
                </div>
                <div className="scada-panel" style={{ padding: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Kamioni u Krugu</div>
                    <div className="font-mono" style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning-color)', marginTop: '4px' }}>{trucksOnSite.length}</div>
                </div>
                <div className="scada-panel" style={{ padding: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Slobodni Kontejneri</div>
                    <div className="font-mono" style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>{freeContainers}</div>
                </div>
                <div className="scada-panel" style={{ padding: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Kontejneri kod Klijenata</div>
                    <div className="font-mono" style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning-color)', marginTop: '4px' }}>{atClient}</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flex: 1, overflow: 'hidden' }}>
                <div className="scada-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="scada-header">PROMET KAPIJE — DANAS</div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        <table>
                            <thead><tr><th>TABLICE</th><th>DOBAVLJAČ</th><th>MATERIJAL</th><th>ULAZ</th><th>STATUS</th></tr></thead>
                            <tbody>
                                {trucksOnSite.map(t => (
                                    <tr key={t.plate}><td className="font-mono">{t.plate}</td><td>{t.supplier}</td><td>{t.material}</td><td className="font-mono">{t.entryTime}</td><td><span style={{ padding: '2px 6px', background: t.statusColor + '22', color: t.statusColor, fontSize: '11px', fontWeight: 700 }}>{t.status}</span></td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="scada-panel" style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column' }}>
                    <div className="scada-header" style={{ background: '#475569' }}>GPS FLOTA (LIVE)</div>
                    <div style={{ flex: 1, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '16px', textAlign: 'center' }}>
                        <div>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
                            <div style={{ fontWeight: 600 }}>Google Maps API</div>
                            <div>Integracija u pripremi</div>
                            <div style={{ marginTop: '12px', fontSize: '11px' }}>
                                <div>🟢 T85-J-441 — Na turi (Sarajevo)</div>
                                <div>🟢 T85-J-442 — Na turi (Banja Luka)</div>
                                <div>🔴 T85-J-443 — Na servisu (Pale)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
