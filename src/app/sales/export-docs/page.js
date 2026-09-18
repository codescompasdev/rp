 'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

export default function ExportDocsPage() {
    const [orders, setOrders] = useState([]);
    const [selectedId, setSelectedId] = useState('');

    useEffect(() => {
        api.get('/sales/orders').then((res) => {
            const data = res.data?.data || [];
            setOrders(data);
            if (data[0]) {
                setSelectedId(data[0].id);
            }
        }).catch(() => setOrders([]));
    }, []);

    const selectedOrder = useMemo(
        () => orders.find((order) => order.id === selectedId) || orders[0],
        [orders, selectedId]
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Export Dokumenti — Generator</h2>
            <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
                <div className="scada-panel" style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column' }}>
                    <div className="scada-header">IZBOR NALOGA</div>
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Prodajni Nalog</label><select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px' }}>{orders.map((order) => <option key={order.id} value={order.id}>{order.code} ({order.customer?.name || '-'})</option>)}</select></div>
                        <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Kupac</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px', background: '#f8fafc' }} readOnly value={selectedOrder?.customer?.name || ''} /></div>
                        <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Materijal</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px', background: '#f8fafc' }} readOnly value={`${selectedOrder?.material?.code || '-'} / ${selectedOrder?.material?.name || '-'}`} /></div>
                        <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Količina</label><input type="text" className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px', background: '#f8fafc' }} readOnly value={`${Number(selectedOrder?.qtyKg || 0).toLocaleString('bs-BA')} KG`} /></div>
                    </div>
                </div>
                <div className="scada-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="scada-header" style={{ background: '#475569' }}>GENERIŠI DOKUMENTE (ONE-CLICK PDF)</div>
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                            { name: 'FAKTURA (Invoice)', icon: '📄', status: 'Generiši' },
                            { name: 'PACKING LIST', icon: '📦', status: 'Generiši' },
                            { name: 'CMR (Tovarni List)', icon: '🚛', status: 'Generiši' },
                            { name: 'EUR1 (Dokaz Porijekla)', icon: '🌍', status: 'Generiši' },
                            { name: 'ANNEX VII (Prekogranično Kretanje)', icon: '♻️', status: 'Generiši' },
                            { name: 'LOADING REPORT (Sa Slikama)', icon: '📷', status: 'Generiši' },
                        ].map(doc => (
                            <div key={doc.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--border-color)', background: '#f8fafc' }}>
                                <span style={{ fontWeight: 600 }}>{doc.icon} {doc.name}</span>
                                <button className="btn-primary" style={{ padding: '6px 16px' }}>{doc.status}</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
