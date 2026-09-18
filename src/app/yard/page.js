export default function YardPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', maxWidth: '800px', margin: '0 auto' }}>
            {/* Header: Truck Info */}
            <div className="scada-panel">
                <div style={{ padding: '16px', background: '#334155', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Active Truck</div>
                        <div className="font-mono" style={{ fontSize: '24px', fontWeight: 'bold' }}>K64-T-882</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Declared Material</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fbbf24' }}>Mixed Iron (E1)</div>
                    </div>
                </div>
            </div>

            {/* Body: Reclassify / XRF */}
            <div className="scada-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ textTransform: 'uppercase', fontSize: '12px', color: 'var(--text-muted)' }}>Reclassify Material</h3>

                {/* Massive toggle grids */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <button style={{ padding: '24px', background: 'var(--primary-color)', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '16px' }}>MIXED IRON (E1)</button>
                    <button style={{ padding: '24px', background: '#e2e8f0', border: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '16px' }}>HEAVY STEEL (E3)</button>
                    <button style={{ padding: '24px', background: '#e2e8f0', border: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '16px' }}>SHEET METAL</button>
                    <button style={{ padding: '24px', background: '#e2e8f0', border: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '16px' }}>COPPER INSULATED</button>
                    <button style={{ padding: '24px', background: '#e2e8f0', border: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '16px' }}>ALUMINUM CAST</button>
                    <button style={{ padding: '24px', background: '#e2e8f0', border: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '16px' }}>BRASS MIX</button>
                </div>

                <button className="btn-warning" style={{ padding: '16px', fontSize: '16px', marginTop: '8px', border: '1px solid #b45309' }}>
                    ENTER XRF GUN COMPOSITION (FE/CU/ZN)
                </button>
            </div>

            {/* Action Area: Impurity & Camera */}
            <div className="scada-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ textTransform: 'uppercase', fontSize: '12px', color: 'var(--text-muted)' }}>Impurity Deduction (Kalo %)</h3>

                {/* NumPad and Input */}
                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input type="text" className="font-mono" style={{ fontSize: '32px', padding: '12px', textAlign: 'center', fontWeight: 'bold', background: '#f8fafc' }} defaultValue="2.5" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'CLR'].map((key) => (
                                <button key={key} style={{ padding: '16px', fontSize: '18px', fontWeight: 'bold', background: '#e2e8f0', border: '1px solid var(--border-color)' }}>{key}</button>
                            ))}
                        </div>
                    </div>
                </div>

                <button style={{
                    padding: '24px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    textTransform: 'uppercase'
                }}>
                    📷 CAPTURE IMPURITY EVIDENCE
                </button>

                <button className="btn-primary" style={{ padding: '24px', fontSize: '20px' }}>
                    SUBMIT INSPECTION TO GATE
                </button>
            </div>
        </div>
    );
}
