'use client';
import { useEffect, useState } from 'react';
import Modal from '@/components/UI/Modal';
import MaterialPicker from '@/components/UI/MaterialPicker';
import api from '@/lib/api';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

const LABEL = { fontSize: '11px', fontWeight: 700 };
const INPUT = { width: '100%', padding: '6px', marginTop: '4px' };

export default function ProductionPage() {
    const [orders, setOrders] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [showNew, setShowNew] = useState(false);
    const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
    const [outputMaterialPickerOpen, setOutputMaterialPickerOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [selectedOutputMaterial, setSelectedOutputMaterial] = useState(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        lot: '',
        machine: 'Šreder #1 (Heavy)',
        qtyKg: '',
        outputQtyKg: '',
        enableConversion: false,
        priority: 'Normalan',
        supervisor: '',
    });

    useEffect(() => {
        const load = async () => {
            try {
                const [ordersRes, materialsRes] = await Promise.all([
                    api.get('/production/work-orders'),
                    api.get('/materials'),
                ]);
                setOrders(normalizeApiList(ordersRes));
                setMaterials(normalizeApiList(materialsRes));
            } catch {
                setOrders([]);
                setMaterials([]);
            }
        };
        load();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.qtyKg || !selectedMaterial) return;
        const backendMaterial = resolveBackendMaterial(materials, selectedMaterial);
        if (!backendMaterial?.id) {
            return;
        }
        setLoading(true);
        try {
            const inputQty = Number(formData.qtyKg || 0);
            const outputQty = Number(formData.outputQtyKg || 0);
            await api.post('/production/work-orders', {
                materialId: backendMaterial.id,
                machine: formData.machine,
                inputKg: inputQty,
                outputKg: formData.enableConversion ? outputQty : 0,
                yield: formData.enableConversion && inputQty > 0 ? Number(((outputQty / inputQty) * 100).toFixed(2)) : 0,
                status: 'Planirano',
            });
            if (formData.enableConversion) {
                const backendOutputMaterial = resolveBackendMaterial(materials, selectedOutputMaterial);
                if (!backendOutputMaterial?.id || outputQty <= 0) {
                    throw new Error('Odaberi izlazni materijal i količinu izlaza za konverziju.');
                }
                await api.post('/inventory/conversions', {
                    inputMaterialId: backendMaterial.id,
                    outputMaterialId: backendOutputMaterial.id,
                    inputQtyKg: inputQty,
                    outputQtyKg: outputQty,
                    note: `Auto from production work order (${formData.machine})`,
                });
            }
            const refreshed = await api.get('/production/work-orders');
            setOrders(normalizeApiList(refreshed));
            setFormData({
                lot: '',
                machine: 'Šreder #1 (Heavy)',
                qtyKg: '',
                outputQtyKg: '',
                enableConversion: false,
                priority: 'Normalan',
                supervisor: '',
            });
            setSelectedMaterial(null);
            setSelectedOutputMaterial(null);
            setShowNew(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Radni Nalozi Proizvodnje</h2>
                <button className="btn-primary" onClick={() => setShowNew(true)}>+ NOVI NALOG</button>
            </div>
            <div className="scada-panel" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead><tr><th>BR.</th><th>MATERIJAL</th><th>MAŠINA</th><th style={{ textAlign: 'right' }}>INPUT (KG)</th><th style={{ textAlign: 'right' }}>OUTPUT (KG)</th><th style={{ textAlign: 'right' }}>YIELD</th><th>STATUS</th></tr></thead>
                    <tbody>
                        {orders.map(w => (
                            <tr key={w.id}>
                                <td className="font-mono" style={{ fontWeight: 600 }}>{w.code || w.id}</td>
                                <td>{w.material?.code || '-'}</td>
                                <td>{w.machine}</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>{Number(w.inputKg || 0).toLocaleString()}</td>
                                <td className="font-mono" style={{ textAlign: 'right' }}>{Number(w.outputKg || 0).toLocaleString()}</td>
                                <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700, color: Number(w.yield || 0) >= 95 ? 'var(--success-color)' : 'var(--warning-color)' }}>{Number(w.yield || 0)}%</td>
                                <td><span style={{ padding: '2px 6px', fontSize: '11px', fontWeight: 700, background: w.status === 'Završen' ? '#dcfce7' : w.status === 'U Toku' ? '#dbeafe' : '#f1f5f9', color: w.status === 'Završen' ? '#15803d' : w.status === 'U Toku' ? '#1d4ed8' : '#64748b' }}>{w.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal open={showNew} onClose={() => setShowNew(false)} title="Novi Radni Nalog Proizvodnje">
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        <div><label style={LABEL}>LOT (Skeniraj)</label><input type="text" className="font-mono" style={INPUT} placeholder="LOT-26-XXXX" value={formData.lot} onChange={e => setFormData({ ...formData, lot: e.target.value })} /></div>
                        <div><label style={LABEL}>Ulazni materijal *</label><button type="button" style={{ ...INPUT, textAlign: 'left', cursor: 'pointer' }} onClick={() => setMaterialPickerOpen(true)}>{selectedMaterial ? formatPickedMaterial(selectedMaterial) : 'Odaberi materijal...'}</button></div>
                        <div><label style={LABEL}>Mašina *</label><select style={INPUT} value={formData.machine} onChange={e => setFormData({ ...formData, machine: e.target.value })}><option>Šreder #1 (Heavy)</option><option>Hidraulične Makaze</option><option>Bakar Granulator</option><option>Presa (Baling)</option></select></div>
                        <div><label style={LABEL}>Količina za Preradu (KG) *</label><input type="number" className="font-mono" style={INPUT} value={formData.qtyKg} onChange={e => setFormData({ ...formData, qtyKg: e.target.value })} required /></div>
                        <div>
                            <label style={{ ...LABEL, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.enableConversion}
                                    onChange={(e) => setFormData({ ...formData, enableConversion: e.target.checked })}
                                />
                                Konverzija materijala
                            </label>
                        </div>
                        {formData.enableConversion && (
                            <>
                                <div><label style={LABEL}>Izlazni materijal *</label><button type="button" style={{ ...INPUT, textAlign: 'left', cursor: 'pointer' }} onClick={() => setOutputMaterialPickerOpen(true)}>{selectedOutputMaterial ? formatPickedMaterial(selectedOutputMaterial) : 'Odaberi izlazni materijal...'}</button></div>
                                <div><label style={LABEL}>Izlazna količina (KG) *</label><input type="number" className="font-mono" style={INPUT} value={formData.outputQtyKg} onChange={e => setFormData({ ...formData, outputQtyKg: e.target.value })} required /></div>
                            </>
                        )}
                        <div><label style={LABEL}>Prioritet</label><select style={INPUT} value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}><option>Normalan</option><option>Hitan</option></select></div>
                        <div><label style={LABEL}>Šef Smjene</label><select style={INPUT} value={formData.supervisor} onChange={e => setFormData({ ...formData, supervisor: e.target.value })}><option value="">Auto (Trenutna)</option></select></div>
                    </div>
                    <div style={{ marginTop: '12px', padding: '8px', background: '#fffbeb', border: '1px solid #f59e0b', fontSize: '11px' }}>⚠️ LOT će biti razdužen sa stanja. Maseni bilans se automatski prati.</div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button type="button" onClick={() => setShowNew(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                        <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading}>{loading ? 'POKRETANJE...' : 'POKRENI NALOG'}</button>
                    </div>
                </form>
            </Modal>
            <MaterialPicker open={materialPickerOpen} onClose={() => setMaterialPickerOpen(false)} onSelect={({ material }) => setSelectedMaterial(material)} />
            <MaterialPicker open={outputMaterialPickerOpen} onClose={() => setOutputMaterialPickerOpen(false)} onSelect={({ material }) => setSelectedOutputMaterial(material)} />
        </div>
    );
}
