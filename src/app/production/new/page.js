'use client';

import { useEffect, useState } from 'react';
import MaterialPicker from '@/components/UI/MaterialPicker';
import api from '@/lib/api';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

export default function NewWorkOrderPage() {
    const [materials, setMaterials] = useState([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [form, setForm] = useState({ lot: '', qtyKg: '', machine: 'Šreder #1 (Heavy)', priority: 'Normalan', note: '' });
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        api.get('/materials').then((res) => setMaterials(normalizeApiList(res))).catch(() => setMaterials([]));
    }, []);

    const handleCreate = async () => {
        const backendMaterial = resolveBackendMaterial(materials, selectedMaterial);
        if (!backendMaterial?.id) {
            setSubmitError('Odaberi validan materijal iz kataloga prije pokretanja naloga.');
            return;
        }
        try {
            await api.post('/production/work-orders', {
                materialId: backendMaterial.id,
                machine: form.machine,
                inputKg: Number(form.qtyKg || 0),
                outputKg: 0,
                yield: 0,
                status: 'Planirano',
            });
            setSubmitError('');
        } catch {
            setSubmitError('Pokretanje naloga nije uspjelo. Pokušaj ponovo.');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Novi Radni Nalog Proizvodnje</h2>
            <div className="scada-panel">
                <div className="scada-header">ULAZNI MATERIJAL</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>LOT (Skeniraj Barkod)</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} placeholder="LOT-26-XXXX" value={form.lot} onChange={(e) => setForm((prev) => ({ ...prev, lot: e.target.value }))} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Materijal *</label><button type="button" onClick={() => setPickerOpen(true)} style={{ width: '100%', padding: '6px', marginTop: '4px', textAlign: 'left' }}>{selectedMaterial ? formatPickedMaterial(selectedMaterial) : 'Odaberi materijal...'}</button></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Težina za Preradu (KG) *</label><input type="number" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={form.qtyKg} onChange={(e) => setForm((prev) => ({ ...prev, qtyKg: e.target.value }))} /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Lokacija</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px', background: '#f8fafc' }} readOnly placeholder="Auto iz LOT-a" /></div>
                </div>
            </div>
            <div className="scada-panel">
                <div className="scada-header" style={{ background: '#475569' }}>RESURSI & MAŠINA</div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Mašina *</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={form.machine} onChange={(e) => setForm((prev) => ({ ...prev, machine: e.target.value }))}><option>Šreder #1 (Heavy)</option><option>Hidraulične Makaze</option><option>Bakar Granulator</option><option>Aligator Makaze</option><option>Presa (Baling)</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Prioritet</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}><option>Normalan</option><option>Hitan</option></select></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: '11px', fontWeight: 700 }}>Napomena</label><textarea style={{ width: '100%', padding: '6px', marginTop: '4px', resize: 'vertical', minHeight: '60px' }} placeholder="npr. Pažnja: materijal sadrži zatvorene posude" value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}></textarea></div>
                </div>
            </div>
            <div style={{ padding: '12px', background: '#fffbeb', border: '1px solid #f59e0b', fontSize: '12px' }}>
                <strong>⚠️ UPOZORENJE:</strong> Nakon pokretanja naloga, sistem će razduži LOT sa stanja. Maseni bilans se automatski prati — razlika ulaz/izlaz mora biti obrazložena.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button style={{ padding: '10px 24px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                <button className="btn-primary" style={{ padding: '10px 24px' }} onClick={handleCreate}>POKRENI NALOG</button>
            </div>
            {submitError && (
                <div style={{ padding: '10px 12px', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: '12px' }}>
                    {submitError}
                </div>
            )}
            <MaterialPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={({ material }) => setSelectedMaterial(material)} />
        </div>
    );
}
