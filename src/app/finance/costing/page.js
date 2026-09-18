export default function CostingPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>COGS & Valuacija Zaliha</h2>
            <div className="scada-panel">
                <div className="scada-header" style={{ background: '#475569' }}>PROFITABILNOST PO LOT-U</div>
                <div style={{ padding: '16px' }}>
                    <table>
                        <thead><tr><th>LOT</th><th>MATERIJAL</th><th>DOBAVLJAČ</th><th style={{ textAlign: 'right' }}>NABAVKA</th><th style={{ textAlign: 'right' }}>TRANSPORT</th><th style={{ textAlign: 'right' }}>PRERADA</th><th style={{ textAlign: 'right' }}>UKUPNI TROŠAK</th><th style={{ textAlign: 'right' }}>PRODAJNO</th><th style={{ textAlign: 'right' }}>PROFIT</th><th style={{ textAlign: 'right' }}>MARŽA</th></tr></thead>
                        <tbody>
                            <tr>
                                <td className="font-mono" style={{ fontWeight: 600 }}>LOT-26-0052</td><td>FE-E1 → FE-SHR</td><td>Local Scrap</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>15,000.00</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>500.00</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>1,200.00</td>
                                <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>16,700.00</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>19,000.00</td>
                                <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success-color)' }}>+2,300.00</td>
                                <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success-color)' }}>13.8%</td>
                            </tr>
                            <tr>
                                <td className="font-mono" style={{ fontWeight: 600 }}>LOT-26-0055</td><td>CU-MB</td><td>EuroMetali</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>45,494.46</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>0</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>0</td>
                                <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>45,494.46</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>52,014.60</td>
                                <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success-color)' }}>+6,520.14</td>
                                <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success-color)' }}>14.3%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="scada-panel" style={{ flex: 1 }}>
                <div className="scada-header">MASENI BILANS — MJESEČNI</div>
                <div style={{ padding: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '24px', marginBottom: '16px' }}>
                        <div><div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>KUPLJENO</div><div className="font-mono" style={{ fontSize: '18px', fontWeight: 700 }}>1,000.00 T</div></div>
                        <div><div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>PRODATO</div><div className="font-mono" style={{ fontSize: '18px', fontWeight: 700 }}>900.00 T</div></div>
                        <div><div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>NA STANJU</div><div className="font-mono" style={{ fontSize: '18px', fontWeight: 700 }}>80.00 T</div></div>
                        <div><div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>RAZLIKA</div><div className="font-mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--danger-color)' }}>-20.00 T (-2.0%)</div></div>
                    </div>
                    <div style={{ padding: '12px', background: '#fffbeb', border: '1px solid var(--warning-color)', fontSize: '12px' }}>
                        <strong style={{ color: '#b45309' }}>⚠️ ANALIZA GUBITKA:</strong> 12T vlaga (prirodni kal), 5T šreder fluff (zbrinuto), 3T neobjašnjeno — <strong>zahtijeva istragu</strong>
                    </div>
                </div>
            </div>
        </div>
    );
}
