export default function DispatchPage() {
    const targetTonnage = 25000;
    const loadedTonnage = 24850;
    const progressPercent = (loadedTonnage / targetTonnage) * 100;
    const isComplete = loadedTonnage >= targetTonnage;

    return (
        <div style={{ display: 'flex', gap: '16px', height: '100%', alignItems: 'stretch' }}>

            {/* Left Split: Contract & Target */}
            <div className="scada-panel" style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column' }}>
                <div className="scada-header">OUTBOUND SHIPMENT CONFIG</div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>

                    <div style={{ display: 'grid', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Buyer Destination</label>
                        <select style={{ padding: '8px' }}>
                            <option>Zenica Steelworks (Z-1002)</option>
                            <option>Aluminij Mostar</option>
                            <option>Export - Port of Ploce</option>
                        </select>
                    </div>

                    <div style={{ display: 'grid', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Sales Contract #</label>
                        <input type="text" className="font-mono" style={{ padding: '8px' }} defaultValue="CTR-2026-08-44A" />
                    </div>

                    <div style={{ display: 'grid', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Target Tonnage (KG)</label>
                        <div style={{ display: 'flex' }}>
                            <input type="text" className="font-mono" style={{ flex: 1, padding: '12px', fontSize: '18px', textAlign: 'right' }} defaultValue="25,000" />
                            <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderLeft: 'none', padding: '12px', display: 'flex', alignItems: 'center' }}>KG</div>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '8px 0' }}></div>

                    <div style={{ display: 'grid', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Assigned Material</label>
                        <div style={{ padding: '12px', background: '#f8fafc', border: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                            Scrap Iron (E1) - Mixed
                        </div>
                    </div>

                </div>
            </div>

            {/* Middle Split: Loading Progress */}
            <div className="scada-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="scada-header">ACTIVE LOADING PROGRESS</div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                            <span className="font-mono" style={{ color: isComplete ? 'var(--success-color)' : 'var(--warning-color)' }}>{loadedTonnage.toLocaleString()}</span>
                            <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}> / {targetTonnage.toLocaleString()} KG</span>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: isComplete ? 'var(--success-color)' : 'var(--warning-color)' }}>
                            {progressPercent.toFixed(1)}% LOADED
                        </div>
                    </div>

                    {/* Strict Progress Bar */}
                    <div style={{ height: '24px', background: '#e2e8f0', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                            position: 'absolute', top: 0, left: 0, bottom: 0,
                            width: `${progressPercent}%`,
                            background: isComplete ? 'var(--success-color)' : 'var(--warning-color)',
                            transition: 'width 0.5s ease-in-out'
                        }}></div>
                        {/* Target Marker line */}
                        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '100%', width: '2px', background: 'red', zIndex: 10 }}></div>
                    </div>

                    <h4 style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>LINKED OUTBOUND WEIGH TICKETS</h4>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '12px' }}>
                            <thead style={{ position: 'sticky', top: 0 }}>
                                <tr>
                                    <th>TICKET #</th>
                                    <th>TIMESTAMP</th>
                                    <th>TRUCK PLATE</th>
                                    <th style={{ textAlign: 'right' }}>GROSS</th>
                                    <th style={{ textAlign: 'right' }}>TARE</th>
                                    <th style={{ textAlign: 'right' }}>NET WEIGHT</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="font-mono" style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>#W-108842</td>
                                    <td className="font-mono">14:05:22</td>
                                    <td className="font-mono">E99-K-412</td>
                                    <td className="font-mono" style={{ textAlign: 'right' }}>40,200</td>
                                    <td className="font-mono" style={{ textAlign: 'right' }}>15,100</td>
                                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 'bold' }}>+25,100 KG</td>
                                </tr>
                                {/* Simulated rows */}
                                {[...Array(5)].map((_, i) => (
                                    <tr key={i} style={{ color: 'var(--text-muted)' }}>
                                        <td className="font-mono">#W-10884{1 - i}</td>
                                        <td className="font-mono">12:{30 - i * 5}:00</td>
                                        <td className="font-mono">J22-A-{100 + i}</td>
                                        <td className="font-mono" style={{ textAlign: 'right' }}>38,000</td>
                                        <td className="font-mono" style={{ textAlign: 'right' }}>13,500</td>
                                        <td className="font-mono" style={{ textAlign: 'right', fontWeight: 'bold' }}>+24,500 KG</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>

            {/* Right Split: Documentation Actions */}
            <div className="scada-panel" style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                <div className="scada-header" style={{ background: '#475569' }}>SHIPPING LOGISTICS & DOCS</div>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>

                    <button
                        disabled={!isComplete}
                        style={{
                            padding: '24px 16px',
                            background: isComplete ? 'var(--primary-color)' : '#cbd5e1',
                            color: isComplete ? 'white' : '#94a3b8',
                            border: 'none',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            cursor: isComplete ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                        <span>📄 GENERATE BILL OF LADING</span>
                        {!isComplete && <span style={{ fontSize: '11px', fontWeight: 'normal' }}>(TARGET TONNAGE NOT MET)</span>}
                    </button>

                    <button
                        disabled={!isComplete}
                        style={{
                            padding: '24px 16px',
                            background: isComplete ? 'var(--primary-color)' : '#cbd5e1',
                            color: isComplete ? 'white' : '#94a3b8',
                            border: 'none',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            cursor: isComplete ? 'pointer' : 'not-allowed'
                        }}>
                        🌍 GENERATE EUR1 CERTIFICATE
                    </button>

                    <button
                        disabled={!isComplete}
                        style={{
                            padding: '24px 16px',
                            background: isComplete ? '#10b981' : '#cbd5e1',
                            color: isComplete ? 'white' : '#94a3b8',
                            border: 'none',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            cursor: isComplete ? 'pointer' : 'not-allowed',
                            marginTop: '16px'
                        }}>
                        🖨️ PRINT DISPATCH NOTE (OTP)
                    </button>

                </div>
            </div>

        </div>
    );
}
