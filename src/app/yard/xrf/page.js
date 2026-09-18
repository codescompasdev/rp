'use client';
import { useEffect, useState } from 'react';
import MaterialPicker from '@/components/UI/MaterialPicker';
import api from '@/lib/api';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

export default function XRFPage() {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [materials, setMaterials] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [sampleRef, setSampleRef] = useState('');
    const [analysisDate, setAnalysisDate] = useState('2026-02-23');
    const [saveError, setSaveError] = useState('');
    const [saveInfo, setSaveInfo] = useState('');
    const [elements, setElements] = useState([
        { element: 'Bakar', symbol: 'Cu', pct: '' },
        { element: 'Željezo', symbol: 'Fe', pct: '' },
        { element: 'Cink', symbol: 'Zn', pct: '' },
        { element: 'Nikl', symbol: 'Ni', pct: '' },
        { element: 'Olovo', symbol: 'Pb', pct: '' },
        { element: 'Kalaj', symbol: 'Sn', pct: '' },
        { element: 'Aluminij', symbol: 'Al', pct: '' },
        { element: 'Silicij', symbol: 'Si', pct: '' },
        { element: 'Mangan', symbol: 'Mn', pct: '' },
        { element: 'Hrom', symbol: 'Cr', pct: '' },
    ]);

    const handleChange = (index, value) => {
        const updated = [...elements];
        updated[index].pct = value;
        setElements(updated);
    };

    useEffect(() => {
        api.get('/materials').then((res) => setMaterials(normalizeApiList(res))).catch(() => setMaterials([]));
        api.get('/gate/tickets').then((res) => {
            const data = normalizeApiList(res);
            setTickets(data);
            if (data[0]) {
                setSampleRef(data[0].code || '');
            }
        }).catch(() => setTickets([]));
    }, []);

    const total = elements.reduce((sum, e) => sum + (parseFloat(e.pct) || 0), 0);
    const remaining = (100 - total).toFixed(1);

    const handleSave = async () => {
        const backendMaterial = resolveBackendMaterial(materials, selectedMaterial);
        if (!sampleRef || !backendMaterial?.id) {
            setSaveError('Tiket/LOT referenca i materijal su obavezni.');
            return;
        }
        const linkedTicket = tickets.find((ticket) => ticket.code === sampleRef || ticket.id === sampleRef);
        try {
            await api.post('/yard/xrf', {
                ticketId: linkedTicket?.id || null,
                materialId: backendMaterial.id,
                sampleRef,
                declaredLabel: backendMaterial.code,
                status: total >= 99 && total <= 101 ? 'Completed' : 'Draft',
                elements: elements.map((row) => ({ element: row.symbol, pct: Number(row.pct || 0) })),
                analysisDate,
            });
            setSaveError('');
            setSaveInfo('XRF analiza je uspješno sačuvana.');
        } catch {
            setSaveError('Čuvanje XRF analize nije uspjelo. Provjeri podatke i pokušaj ponovo.');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>XRF Hemijski Sastav — Ručni Unos</h2>

            <div className="scada-panel">
                <div className="scada-header">PODATCI O UZORKU</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Vagarski Tiket / LOT *</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} placeholder="W-108842 ili LOT-26-XXXX" value={sampleRef} onChange={(event) => setSampleRef(event.target.value)} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Deklarisan Materijal</label><button type="button" onClick={() => setPickerOpen(true)} style={{ width: '100%', padding: '6px', marginTop: '4px', textAlign: 'left' }}>{selectedMaterial ? formatPickedMaterial(selectedMaterial) : 'Odaberi materijal...'}</button></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Datum Analize</label><input type="date" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={analysisDate} onChange={(event) => setAnalysisDate(event.target.value)} /></div>
                </div>
            </div>

            <div className="scada-panel" style={{ flex: 1 }}>
                <div className="scada-header" style={{ background: '#475569' }}>REZULTATI ANALIZE — RUČNI UNOS SA XRF PIŠTOLJA</div>
                <div style={{ padding: '16px' }}>
                    <div style={{ padding: '8px 12px', background: '#eef2ff', border: '1px solid var(--primary-color)', marginBottom: '16px', fontSize: '12px' }}>
                        ℹ️ Korisnik ručno upisuje rezultate koje je pročitao sa XRF pištolja. Sistem ih ne vuče automatski.
                    </div>
                    <table>
                        <thead><tr><th>ELEMENT</th><th>SIMBOL</th><th style={{ textAlign: 'right', width: '150px' }}>UDIO (%)</th><th style={{ width: '40%' }}>GRAFIČKI</th></tr></thead>
                        <tbody>
                            {elements.map((e, i) => (
                                <tr key={e.symbol}>
                                    <td style={{ fontWeight: 600 }}>{e.element}</td>
                                    <td className="font-mono" style={{ fontWeight: 700 }}>{e.symbol}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <input type="number" className="font-mono" style={{ width: '80px', padding: '4px', textAlign: 'right', border: '1px solid var(--border-color)' }} step="0.1" min="0" max="100" placeholder="0.0" value={e.pct} onChange={(ev) => handleChange(i, ev.target.value)} /> %
                                    </td>
                                    <td><div style={{ background: '#f1f5f9', height: '14px', width: '100%', position: 'relative' }}><div style={{ background: '#3b82f6', height: '100%', width: `${parseFloat(e.pct) || 0}%`, transition: 'width 0.2s' }}></div></div></td>
                                </tr>
                            ))}
                            <tr style={{ borderTop: '2px solid var(--border-color)' }}>
                                <td style={{ fontWeight: 700 }}>Ostalo</td>
                                <td className="font-mono">-</td>
                                <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>{remaining > 0 ? remaining : '0.0'} %</td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>

                    {total > 0 && (
                        <div style={{ marginTop: '16px', padding: '12px', background: total >= 99 && total <= 101 ? '#dcfce7' : '#fef3c7', border: `1px solid ${total >= 99 && total <= 101 ? '#10b981' : '#f59e0b'}`, fontWeight: 600, fontSize: '12px', color: total >= 99 && total <= 101 ? '#15803d' : '#b45309' }}>
                            {total >= 99 && total <= 101 ? '✓ Zbir elemenata OK (' + total.toFixed(1) + '%). Rezultat validiran.' : '⚠️ Zbir: ' + total.toFixed(1) + '% — Razlika od 100% mora biti obrazložena.'}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button style={{ padding: '10px 24px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                <button className="btn-primary" style={{ padding: '10px 24px' }} onClick={handleSave}>SAČUVAJ XRF & VEŽI ZA TIKET</button>
            </div>
            {saveError && (
                <div style={{ padding: '10px 12px', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: '12px' }}>
                    {saveError}
                </div>
            )}
            {saveInfo && (
                <div style={{ padding: '10px 12px', border: '1px solid #86efac', background: '#f0fdf4', color: '#166534', fontSize: '12px' }}>
                    {saveInfo}
                </div>
            )}
            <MaterialPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={({ material }) => setSelectedMaterial(material)} />
        </div>
    );
}
