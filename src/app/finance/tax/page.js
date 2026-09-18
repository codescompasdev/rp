export default function TaxPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Poreski Engine (BiH Specifičan)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="scada-panel" style={{ padding: '12px', borderLeft: '3px solid var(--primary-color)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>ČLAN 25 ZPDV</div>
                    <div style={{ fontSize: '11px', marginTop: '4px' }}>Prenos poreske obaveze (Tuzemni otpad)</div>
                    <div className="font-mono" style={{ fontSize: '18px', fontWeight: 700, marginTop: '8px' }}>14 faktura</div>
                </div>
                <div className="scada-panel" style={{ padding: '12px', borderLeft: '3px solid var(--success-color)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>ČLAN 27 ZPDV</div>
                    <div style={{ fontSize: '11px', marginTop: '4px' }}>Izvoz (Oslobođeno PDV-a)</div>
                    <div className="font-mono" style={{ fontSize: '18px', fontWeight: 700, marginTop: '8px' }}>3 fakture</div>
                </div>
                <div className="scada-panel" style={{ padding: '12px', borderLeft: '3px solid var(--warning-color)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>POREZ PO ODBITKU</div>
                    <div style={{ fontSize: '11px', marginTop: '4px' }}>Fizička lica (Otkupni blokovi)</div>
                    <div className="font-mono" style={{ fontSize: '18px', fontWeight: 700, marginTop: '8px' }}>42 bloka</div>
                </div>
            </div>
            <div className="scada-panel" style={{ flex: 1, overflow: 'auto' }}>
                <div className="scada-header">POSLJEDNJE GENERISANE FAKTURE I PORESKI TRETMAN</div>
                <table>
                    <thead><tr><th>BR. FAKTURE</th><th>DATUM</th><th>PARTNER</th><th>TIP</th><th style={{ textAlign: 'right' }}>OSNOVICA (BAM)</th><th>ZAKONSKI OSNOV</th><th style={{ textAlign: 'right' }}>PDV</th></tr></thead>
                    <tbody>
                        <tr><td className="font-mono">FA-2026-0088</td><td className="font-mono">2026-02-22</td><td>Metalfer Steel Mill</td><td>Domaća Prodaja</td><td className="font-mono" style={{ textAlign: 'right' }}>42,000.00</td><td style={{ color: 'var(--primary-color)', fontWeight: 600 }}>Član 25 (Prenos)</td><td className="font-mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>0.00</td></tr>
                        <tr><td className="font-mono">FA-2026-0087</td><td className="font-mono">2026-02-20</td><td>Aurubis AG</td><td>Izvoz</td><td className="font-mono" style={{ textAlign: 'right' }}>603,500.00</td><td style={{ color: 'var(--success-color)', fontWeight: 600 }}>Član 27 (Izvoz)</td><td className="font-mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>0.00</td></tr>
                        <tr><td className="font-mono">OB-2026-0442</td><td className="font-mono">2026-02-22</td><td>Petar Petrović (FO)</td><td>Otkupni Blok</td><td className="font-mono" style={{ textAlign: 'right' }}>286.00</td><td style={{ color: 'var(--warning-color)', fontWeight: 600 }}>Porez po Odbitku</td><td className="font-mono" style={{ textAlign: 'right' }}>-28.60</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
