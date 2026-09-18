 'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

export default function LoadingPage() {
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
    const targetKg = Number(selectedOrder?.qtyKg || 0);
    const loadedKg = targetKg;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase' }}>Utovar & Kontrola Izlaza</h2>
            <div className="scada-panel">
                <div style={{ padding: '12px', background: '#1e293b', color: 'white', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: '180px' }}><span style={{ fontSize: '10px', color: '#94a3b8' }}>NALOG</span><div><select className="font-mono" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ marginTop: '4px', padding: '4px', minWidth: '180px' }}>{orders.map((order) => <option key={order.id} value={order.id}>{order.code}</option>)}</select></div></div>
                    <div><span style={{ fontSize: '10px', color: '#94a3b8' }}>KUPAC</span><div>{selectedOrder?.customer?.name || '-'}</div></div>
                    <div><span style={{ fontSize: '10px', color: '#94a3b8' }}>MATERIJAL</span><div>{selectedOrder?.material?.code || '-'} / {selectedOrder?.material?.name || '-'}</div></div>
                    <div><span style={{ fontSize: '10px', color: '#94a3b8' }}>TARGET</span><div className="font-mono" style={{ fontWeight: 700 }}>{targetKg.toLocaleString('bs-BA')} KG</div></div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                <div className="scada-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="scada-header">PROGRES UTOVARA</div>
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span className="font-mono" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success-color)' }}>{loadedKg.toLocaleString('bs-BA')} KG</span>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--success-color)' }}>{targetKg ? `${((loadedKg / targetKg) * 100).toFixed(1)}%` : '0%'} ✓</span>
                        </div>
                        <div style={{ height: '20px', background: '#e2e8f0', border: '1px solid var(--border-color)' }}>
                            <div style={{ height: '100%', width: `${Math.min(100, targetKg ? (loadedKg / targetKg) * 100 : 0)}%`, background: 'var(--success-color)' }}></div>
                        </div>
                        <table style={{ marginTop: '16px' }}>
                            <thead><tr><th>TIKET</th><th>KAMION</th><th style={{ textAlign: 'right' }}>NETO (KG)</th><th>VRIJEME</th></tr></thead>
                            <tbody>
                                <tr><td className="font-mono">{selectedOrder?.code || '-'}</td><td className="font-mono">-</td><td className="font-mono" style={{ textAlign: 'right' }}>{loadedKg.toLocaleString('bs-BA')}</td><td className="font-mono">{new Date().toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="scada-panel" style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column' }}>
                    <div className="scada-header" style={{ background: '#475569' }}>SLIKE UTOVARA</div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        {['Početak utovara', 'Napunjen kamion', 'Zapečaćen kamion'].map((label, i) => (
                            <div key={i} style={{ padding: '24px', background: '#f1f5f9', border: '1px dashed var(--border-color)', textAlign: 'center', cursor: 'pointer' }}>
                                <div style={{ fontSize: '24px' }}>📷</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
                            </div>
                        ))}
                        <div style={{ padding: '8px', fontSize: '11px', color: 'var(--text-muted)', background: '#f8fafc', border: '1px solid var(--border-color)' }}>
                            ⚠️ Arbitražni uzorak: Čuvati 30 dana
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
