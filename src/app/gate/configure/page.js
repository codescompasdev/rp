'use client';

import { useEffect, useState } from 'react';
import {
    defaultScaleConfig,
    formatWeight,
    loadScaleConfig,
    saveScaleConfig,
    validateScaleConfig,
} from '@/lib/scaleConfig';
import { getCurrentRole } from '@/lib/userRole';
import api from '@/lib/api';

export default function GateConfigurePage() {
    const [role, setRole] = useState('worker');
    const [form, setForm] = useState(defaultScaleConfig);
    const [savedAt, setSavedAt] = useState('');
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        setRole(getCurrentRole());
        const local = loadScaleConfig();
        setForm(local);
        api.get('/gate/scale/config')
            .then((res) => {
                const backendConfig = res?.data?.data || {};
                setForm((prev) => ({ ...prev, ...backendConfig }));
            })
            .catch(() => null);
    }, []);

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = (event) => {
        event.preventDefault();
        const validation = validateScaleConfig(form);
        if (!validation.valid) {
            setFormErrors(validation.errors);
            return;
        }
        saveScaleConfig(validation.config);
        api.put('/gate/scale/config', validation.config).catch(() => null);
        setForm(validation.config);
        setFormErrors({});
        setSavedAt(new Date().toLocaleTimeString());
    };

    if (role !== 'owner') {
        return (
            <div className="scada-panel" style={{ maxWidth: '720px', margin: '24px auto', padding: '24px' }}>
                <h2 style={{ margin: 0, marginBottom: '12px' }}>Configure vage</h2>
                <div style={{ padding: '12px', border: '1px solid #f59e0b', background: '#fffbeb', color: '#92400e' }}>
                    Ova stranica je dostupna samo ulozi vlasnika.
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', height: '100%' }}>
            <div className="scada-panel" style={{ padding: '16px' }}>
                <h2 style={{ marginTop: 0, fontSize: '14px', textTransform: 'uppercase' }}>Configure vage</h2>
                <p style={{ marginTop: 0, color: 'var(--text-muted)', fontSize: '12px' }}>
                    Podešavanje za trenutni frontend rad bez automatskog signala sa uređaja.
                </p>
                <form onSubmit={handleSave} style={{ display: 'grid', gap: '12px' }}>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>Naziv vage</label>
                        <input
                            value={form.scaleName}
                            onChange={(e) => updateField('scaleName', e.target.value)}
                            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                            required
                        />
                        {formErrors.scaleName && (
                            <div style={{ marginTop: '4px', fontSize: '11px', color: '#991b1b' }}>{formErrors.scaleName}</div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700 }}>Način rada</label>
                            <select
                                value={form.mode}
                                onChange={(e) => updateField('mode', e.target.value)}
                                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                            >
                                <option value="manual">Manual (kucanje)</option>
                                <option value="signal">Signal uređaja</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700 }}>Signal source</label>
                            <select
                                value={form.signalSource}
                                onChange={(e) => updateField('signalSource', e.target.value)}
                                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                            >
                                <option value="RS232">RS232</option>
                                <option value="TCP/IP">TCP/IP</option>
                                <option value="USB">USB</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700 }}>Jedinica</label>
                            <select
                                value={form.unit}
                                onChange={(e) => updateField('unit', e.target.value)}
                                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                            >
                                <option value="KG">KG</option>
                                <option value="T">T</option>
                            </select>
                        </div>
                    </div>

                    {form.signalSource === 'TCP/IP' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '8px' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700 }}>TCP/IP Host</label>
                                <input
                                    value={form.tcpHost || ''}
                                    onChange={(e) => updateField('tcpHost', e.target.value)}
                                    placeholder="127.0.0.1"
                                    style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                                    required
                                />
                                {formErrors.tcpHost && (
                                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#991b1b' }}>{formErrors.tcpHost}</div>
                                )}
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700 }}>TCP/IP Port</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={65535}
                                    value={form.tcpPort}
                                    onChange={(e) => updateField('tcpPort', Number(e.target.value))}
                                    style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                                    required
                                />
                                {formErrors.tcpPort && (
                                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#991b1b' }}>{formErrors.tcpPort}</div>
                                )}
                            </div>
                        </div>
                    )}
                    {form.signalSource === 'RS232' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '8px' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700 }}>RS232 Port</label>
                                <input
                                    value={form.rs232Path || ''}
                                    onChange={(e) => updateField('rs232Path', e.target.value)}
                                    placeholder="/dev/ttyUSB0"
                                    style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                                    required
                                />
                                {formErrors.rs232Path && (
                                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#991b1b' }}>{formErrors.rs232Path}</div>
                                )}
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700 }}>RS232 Baud</label>
                                <input
                                    type="number"
                                    min={1200}
                                    value={form.rs232BaudRate}
                                    onChange={(e) => updateField('rs232BaudRate', Number(e.target.value))}
                                    style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                                    required
                                />
                                {formErrors.rs232BaudRate && (
                                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#991b1b' }}>{formErrors.rs232BaudRate}</div>
                                )}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700 }}>Decimala</label>
                            <input
                                type="number"
                                min={0}
                                max={4}
                                value={form.decimals}
                                onChange={(e) => updateField('decimals', Number(e.target.value))}
                                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700 }}>Default live očitanje</label>
                            <input
                                type="number"
                                min={0}
                                value={form.defaultLiveWeight}
                                onChange={(e) => updateField('defaultLiveWeight', Number(e.target.value))}
                                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                            />
                        </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                        <input
                            type="checkbox"
                            checked={form.allowManualEntry}
                            onChange={(e) => updateField('allowManualEntry', e.target.checked)}
                        />
                        Dozvoli ručni unos mase i kada je izabran signal mode
                    </label>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {savedAt ? `Sačuvano u ${savedAt}` : 'Nema sačuvanih izmjena u ovoj sesiji'}
                        </span>
                        <button type="submit" className="btn-primary">Sačuvaj konfiguraciju</button>
                    </div>
                </form>
            </div>

            <div className="scada-panel" style={{ padding: '16px', background: '#0f172a', color: '#e2e8f0' }}>
                <h3 style={{ marginTop: 0, fontSize: '12px', textTransform: 'uppercase' }}>Preview očitanja</h3>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
                    {form.scaleName} - {form.signalSource} - {form.mode === 'manual' ? 'manual mode' : 'signal mode'}
                </div>
                {form.signalSource === 'TCP/IP' && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
                        Endpoint: {form.tcpHost || '-'}:{form.tcpPort || '-'}
                    </div>
                )}
                {form.signalSource === 'RS232' && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
                        Port: {form.rs232Path || '-'} @ {form.rs232BaudRate || '-'} baud
                    </div>
                )}
                <div
                    className="scada-readout"
                    style={{ fontSize: '32px', color: '#10b981', textShadow: '0 0 10px rgba(16,185,129,0.5)' }}
                >
                    {formatWeight(form.defaultLiveWeight, form)}
                </div>
                <div style={{ marginTop: '12px', fontSize: '11px', color: '#94a3b8' }}>
                    Ova konfiguracija se koristi na ekranu `Vaganje` dok se ne spoji automatsko čitanje signala.
                </div>
            </div>
        </div>
    );
}
