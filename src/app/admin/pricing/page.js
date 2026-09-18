export default function PricingPage() {
    const currentDate = new Date().toLocaleDateString('bs-BA', { year: 'numeric', month: '2-digit', day: '2-digit' });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', maxWidth: '1000px', margin: '0 auto' }}>

            {/* Header */}
            <div className="scada-panel">
                <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', color: 'white' }}>
                    <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>GLOBAL PRICING MATRIX</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Effective Date: {currentDate}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>LME SYNC STATUS</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></div>
                            <span className="font-mono" style={{ fontWeight: 'bold' }}>SYNCED 08:00 AM</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid Data Table */}
            <div className="scada-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ overflowY: 'auto', flex: 1, padding: '16px' }}>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '25%' }}>MATERIAL TIER</th>
                                <th style={{ width: '15%', textAlign: 'right' }}>BASE LME PRICE</th>
                                <th style={{ width: '15%', textAlign: 'right' }}>MARGIN DEDUCT (%)</th>
                                <th style={{ width: '20%', textAlign: 'right', background: '#e0e7ff', borderBottom: '2px solid var(--primary-color)' }}>CALC. BUY PRICE (BAM)</th>
                                <th style={{ width: '25%', textAlign: 'center', background: '#fef3c7', borderBottom: '2px solid var(--warning-color)' }}>MANUAL OVERRIDE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Copper Millberry */}
                            <tr>
                                <td style={{ fontWeight: 'bold' }}>Copper Millberry (A)</td>
                                <td className="font-mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>13.50</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>
                                    <input type="text" className="font-mono" style={{ width: '60px', padding: '2px 4px', textAlign: 'right', border: '1px solid transparent', background: 'transparent' }} defaultValue="8.0" /> %
                                </td>
                                <td className="font-mono" style={{ textAlign: 'right', background: '#eef2ff', fontWeight: 'bold', fontSize: '14px' }}>12.42</td>
                                <td style={{ background: '#fffbeb', padding: '4px' }}>
                                    <input type="text" className="font-mono" style={{ width: '100%', padding: '6px', textAlign: 'right', border: '2px solid var(--warning-color)', background: '#fff', fontWeight: 'bold', outline: 'none' }} defaultValue="12.50" />
                                </td>
                            </tr>
                            {/* Copper Berry */}
                            <tr>
                                <td style={{ fontWeight: 'bold' }}>Copper Berry (B)</td>
                                <td className="font-mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>13.50</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>
                                    <input type="text" className="font-mono" style={{ width: '60px', padding: '2px 4px', textAlign: 'right', border: '1px solid transparent', background: 'transparent' }} defaultValue="12.0" /> %
                                </td>
                                <td className="font-mono" style={{ textAlign: 'right', background: '#eef2ff', fontWeight: 'bold', fontSize: '14px' }}>11.88</td>
                                <td style={{ background: '#fffbeb', padding: '4px' }}>
                                    <input type="text" className="font-mono" placeholder="-" style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid var(--border-color)', background: 'transparent' }} />
                                </td>
                            </tr>
                            {/* Alu Cast */}
                            <tr>
                                <td style={{ fontWeight: 'bold' }}>Alu Cast</td>
                                <td className="font-mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>4.20</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>
                                    <input type="text" className="font-mono" style={{ width: '60px', padding: '2px 4px', textAlign: 'right', border: '1px solid transparent', background: 'transparent' }} defaultValue="50.0" /> %
                                </td>
                                <td className="font-mono" style={{ textAlign: 'right', background: '#eef2ff', fontWeight: 'bold', fontSize: '14px' }}>2.10</td>
                                <td style={{ background: '#fffbeb', padding: '4px' }}>
                                    <input type="text" className="font-mono" placeholder="-" style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid var(--border-color)', background: 'transparent' }} />
                                </td>
                            </tr>
                            {/* Iron E3 */}
                            <tr>
                                <td style={{ fontWeight: 'bold' }}>Iron E3 (Heavy Steel)</td>
                                <td className="font-mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>N/A (Local)</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>
                                    -
                                </td>
                                <td className="font-mono" style={{ textAlign: 'right', background: '#eef2ff', fontWeight: 'bold', fontSize: '14px' }}>0.40</td>
                                <td style={{ background: '#fffbeb', padding: '4px' }}>
                                    <input type="text" className="font-mono" style={{ width: '100%', padding: '6px', textAlign: 'right', border: '2px solid var(--warning-color)', background: '#fff', fontWeight: 'bold', outline: 'none' }} defaultValue="0.45" />
                                </td>
                            </tr>
                            {/* Iron E1 */}
                            <tr>
                                <td style={{ fontWeight: 'bold' }}>Iron E1 (Mixed Scrap)</td>
                                <td className="font-mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>N/A (Local)</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>
                                    -
                                </td>
                                <td className="font-mono" style={{ textAlign: 'right', background: '#eef2ff', fontWeight: 'bold', fontSize: '14px' }}>0.30</td>
                                <td style={{ background: '#fffbeb', padding: '4px' }}>
                                    <input type="text" className="font-mono" placeholder="-" style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid var(--border-color)', background: 'transparent' }} />
                                </td>
                            </tr>
                        </tbody>
                    </table>

                </div>

                {/* Floating Action / Bottom Bar */}
                <div style={{ padding: '16px', background: '#f8fafc', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        <strong>Note:</strong> Overrides highlighted in <span style={{ color: 'var(--warning-color)', fontWeight: 'bold' }}>Amber</span> bypass automated LME margin deductions.
                    </div>

                    <button style={{
                        padding: '16px 32px',
                        background: 'var(--success-color)',
                        color: 'white',
                        border: 'none',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        textTransform: 'uppercase',
                        cursor: 'pointer'
                    }}>
                        PUBLISH NEW PRICES TO GATE & POS
                    </button>
                </div>
            </div>

        </div>
    );
}
