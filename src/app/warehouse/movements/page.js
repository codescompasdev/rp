export default function MovementsPage() {
    const movements = [
        { time: '08:45', type: 'IN', desc: '+ 3,663 KG CU-MB (Tiket #W-108841)', from: 'Kapija', to: 'Hala 1 - Sektor A' },
        { time: '08:42', type: 'OUT', desc: '- 50,000 KG FE-E1 (WO-2026-041)', from: 'Otvoreni lager C', to: 'Šreder #1' },
        { time: '08:30', type: 'IN', desc: '+ 24,347 KG FE-E3 (Tiket #W-108840)', from: 'Kapija', to: 'Otvoreni lager B' },
        { time: '08:15', type: 'MOVE', desc: '2,000 KG CU-BR zona transfer', from: 'Hala 1 - Sektor A', to: 'Hala 2 - Sektor D' },
        { time: '08:10', type: 'OUT', desc: '- 25,000 KG FE-SHR (SO-2026-018)', from: 'Hala 3 - Gotova roba', to: 'Utovar (Zenica)' },
        { time: '08:05', type: 'IN', desc: '+ 520 KG BAT-PB (POS Walk-in)', from: 'Kapija POS', to: 'Opasni - Boks 1' },
    ];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Kretanje Robe</h2>
            <div className="scada-panel" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead><tr><th>VRIJEME</th><th>TIP</th><th>OPIS</th><th>IZ</th><th>U</th></tr></thead>
                    <tbody>
                        {movements.map((m, i) => (
                            <tr key={i}>
                                <td className="font-mono">{m.time}</td>
                                <td><span style={{ padding: '2px 6px', fontSize: '10px', fontWeight: 700, background: m.type === 'IN' ? '#dcfce7' : m.type === 'OUT' ? '#fee2e2' : '#dbeafe', color: m.type === 'IN' ? '#15803d' : m.type === 'OUT' ? '#b91c1c' : '#1d4ed8' }}>{m.type}</span></td>
                                <td className="font-mono" style={{ fontSize: '11px' }}>{m.desc}</td>
                                <td style={{ fontSize: '11px' }}>{m.from}</td>
                                <td style={{ fontSize: '11px' }}>{m.to}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
