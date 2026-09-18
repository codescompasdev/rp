export default function PayablesPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>

            {/* Top Bar: KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="scada-panel" style={{ padding: '16px', borderLeft: '4px solid var(--danger-color)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>TOTAL UNPAID BALANCE (AP)</div>
                    <div className="font-mono" style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--danger-color)' }}>- 345,850.20 BAM</div>
                </div>
                <div className="scada-panel" style={{ padding: '16px', background: '#fffbeb' }}>
                    <div style={{ fontSize: '11px', color: '#b45309', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>PENDING WIRE TRANSFERS</div>
                    <div className="font-mono" style={{ fontSize: '24px', fontWeight: 'bold', color: '#b45309' }}>12 (85,400.00 BAM)</div>
                </div>
                <div className="scada-panel" style={{ padding: '16px', borderLeft: '4px solid var(--success-color)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>CASH REGISTER BALANCE</div>
                    <div className="font-mono" style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success-color)' }}>12,500.00 BAM</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', flex: 1, overflow: 'hidden' }}>

                {/* Left: Pending Settlements List */}
                <div className="scada-panel" style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="scada-header">PENDING SETTLEMENTS</div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>

                        {/* Active Selected Supplier */}
                        <div style={{ padding: '12px 16px', background: '#eef2ff', borderLeft: '4px solid var(--primary-color)', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 'bold' }}>Zenica Steelworks d.o.o.</span>
                                <span style={{ color: 'var(--danger-color)', fontWeight: 'bold' }} className="font-mono">85,200.00</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                                <span>ID: S-1002</span>
                                <span className="font-mono">142.50t Pending</span>
                            </div>
                        </div>

                        {/* Other Suppliers */}
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 'bold' }}>Local Scrap LLC</span>
                                <span style={{ color: 'var(--danger-color)', fontWeight: 'bold' }} className="font-mono">12,450.50</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                                <span>ID: S-2114</span>
                                <span className="font-mono">12.10t Pending</span>
                            </div>
                        </div>

                        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 'bold' }}>EuroMetali d.o.o.</span>
                                <span style={{ color: 'var(--danger-color)', fontWeight: 'bold' }} className="font-mono">1,120.00</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                                <span>ID: S-0442</span>
                                <span className="font-mono">0.80t Pending</span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Right: Settlement Execution */}
                <div className="scada-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="scada-header" style={{ background: '#475569' }}>ACCOUNT LEDGER: ZENICA STEELWORKS D.O.O.</div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflow: 'hidden' }}>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <table style={{ width: '100%', fontSize: '12px' }}>
                                <thead style={{ position: 'sticky', top: 0 }}>
                                    <tr>
                                        <th><input type="checkbox" defaultChecked /></th>
                                        <th>DATE / TIME</th>
                                        <th>WEIGH TICKET</th>
                                        <th>MATERIAL</th>
                                        <th style={{ textAlign: 'right' }}>NET WT (KG)</th>
                                        <th style={{ textAlign: 'right' }}>PRICE / KG</th>
                                        <th style={{ textAlign: 'right' }}>CREDIT (BAM)</th>
                                        <th style={{ textAlign: 'right' }}>DEBIT (BAM)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><input type="checkbox" defaultChecked /></td>
                                        <td className="font-mono">2026-02-23 08:14</td>
                                        <td className="font-mono" style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>#W-108842</td>
                                        <td>Heavy Steel (E3)</td>
                                        <td className="font-mono" style={{ textAlign: 'right' }}>25,000</td>
                                        <td className="font-mono" style={{ textAlign: 'right' }}>0.40</td>
                                        <td className="font-mono" style={{ textAlign: 'right', color: 'var(--danger-color)' }}>- 10,000.00</td>
                                        <td className="font-mono" style={{ textAlign: 'right' }}></td>
                                    </tr>
                                    <tr>
                                        <td><input type="checkbox" defaultChecked /></td>
                                        <td className="font-mono">2026-02-22 14:30</td>
                                        <td className="font-mono" style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>#W-108711</td>
                                        <td>Mixed Iron (E1)</td>
                                        <td className="font-mono" style={{ textAlign: 'right' }}>12,100</td>
                                        <td className="font-mono" style={{ textAlign: 'right' }}>0.30</td>
                                        <td className="font-mono" style={{ textAlign: 'right', color: 'var(--danger-color)' }}>- 3,630.00</td>
                                        <td className="font-mono" style={{ textAlign: 'right' }}></td>
                                    </tr>
                                    <tr>
                                        <td><input type="checkbox" defaultChecked /></td>
                                        <td className="font-mono">2026-02-21 09:15</td>
                                        <td className="font-mono" style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>#W-108422</td>
                                        <td>Copper Berry</td>
                                        <td className="font-mono" style={{ textAlign: 'right' }}>1,400</td>
                                        <td className="font-mono" style={{ textAlign: 'right' }}>12.00</td>
                                        <td className="font-mono" style={{ textAlign: 'right', color: 'var(--danger-color)' }}>- 16,800.00</td>
                                        <td className="font-mono" style={{ textAlign: 'right' }}></td>
                                    </tr>
                                    {/* Previous Payment (Unchecked = Historical) */}
                                    <tr style={{ background: '#f8fafc', color: 'var(--text-muted)' }}>
                                        <td></td>
                                        <td className="font-mono">2026-02-15 10:00</td>
                                        <td className="font-mono">BANK TRANSFER</td>
                                        <td>Settlement Batch #992</td>
                                        <td className="font-mono" style={{ textAlign: 'right' }}></td>
                                        <td className="font-mono" style={{ textAlign: 'right' }}></td>
                                        <td className="font-mono" style={{ textAlign: 'right' }}></td>
                                        <td className="font-mono" style={{ textAlign: 'right', color: 'var(--success-color)', fontWeight: 'bold' }}>+ 45,000.00</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Calculator Block */}
                        <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SELECTED TICKETS</div>
                                    <div className="font-mono" style={{ fontSize: '18px', fontWeight: 'bold' }}>3</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL WEIGHT SELECTED</div>
                                    <div className="font-mono" style={{ fontSize: '18px', fontWeight: 'bold' }}>38,500 KG</div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '12px', color: 'var(--danger-color)', fontWeight: 'bold', marginBottom: '4px' }}>SETTLEMENT TOTAL</div>
                                <div className="scada-readout" style={{ fontSize: '32px', color: 'var(--danger-color)' }}>
                                    30,430.00 <span style={{ fontSize: '16px' }}>BAM</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <button style={{ flex: 1, padding: '24px', background: 'var(--primary-color)', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                                🏦 EXECUTE BANK TRANSFER
                            </button>
                            <button style={{ flex: 1, padding: '24px', background: 'var(--success-color)', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                                💵 MARK AS PAID IN CASH (REDUCE REGISTER)
                            </button>
                        </div>

                    </div>
                </div>

            </div>

        </div>
    );
}
