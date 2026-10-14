'use client';

import { useEffect, useState } from 'react';
import { Activity, Cable, Gauge, Save, SlidersHorizontal } from 'lucide-react';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import Field from '@/components/UI/Field';
import Alert from '@/components/UI/Alert';
import { Badge } from '@/components/UI/Badge';
import { fmtDateTime } from '@/lib/format';
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
    const [formErrors, setFormErrors] = useState({});
    const [saveState, setSaveState] = useState(null); // { tone, text }
    const [saving, setSaving] = useState(false);
    const [live, setLive] = useState(null);

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

    // stvarni status signala sa vage (isti endpoint koji koristi Vaganje)
    useEffect(() => {
        let cancelled = false;
        const requestedScaleId = String(form.scaleName || '').trim();
        const read = async () => {
            try {
                const res = await api.get('/gate/scale/live', { params: requestedScaleId ? { scaleId: requestedScaleId } : undefined });
                if (!cancelled) setLive(res?.data?.data || null);
            } catch {
                if (!cancelled) setLive({ signalAvailable: false, signalConnected: false, message: 'Server ne odgovara' });
            }
        };
        read();
        const timer = setInterval(read, 3000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [form.scaleName]);

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async (event) => {
        event.preventDefault();
        const validation = validateScaleConfig(form);
        if (!validation.valid) {
            setFormErrors(validation.errors);
            setSaveState({ tone: 'danger', text: 'Provjeri označena polja.' });
            return;
        }
        setSaving(true);
        saveScaleConfig(validation.config);
        setForm(validation.config);
        setFormErrors({});
        try {
            await api.put('/gate/scale/config', validation.config);
            setSaveState({ tone: 'success', text: `Konfiguracija je sačuvana na serveru u ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}.` });
        } catch (error) {
            setSaveState({ tone: 'warning', text: `Sačuvano samo u ovom pregledniku — server nije prihvatio izmjenu (${error?.response?.data?.error || 'greška veze'}).` });
        } finally {
            setSaving(false);
        }
    };

    if (role !== 'owner') {
        return (
            <div className="ui-page">
                <PageHeader title="Configure vage" />
                <Alert tone="warning">Ova stranica je dostupna samo ulozi vlasnika.</Alert>
            </div>
        );
    }

    const err = (field) => formErrors[field];
    const signalTone = live?.signalAvailable ? 'success' : live?.signalConnected ? 'info' : 'warning';

    return (
        <div className="ui-page">
            <PageHeader
                title="Configure vage"
                subtitle="Povezivanje vage, način rada i prikaz očitanja na ekranu Vaganje"
            />

            <div className="grid-main-side">
                <form onSubmit={handleSave} className="stack">
                    <Card title="Osnovno" icon={SlidersHorizontal}>
                        <div className="ui-form-grid">
                            <Field label="Naziv vage" required error={err('scaleName')} span="all">
                                <input className="ui-input" value={form.scaleName} onChange={(e) => updateField('scaleName', e.target.value)} required />
                            </Field>
                            <Field label="Način rada" hint={form.mode === 'manual' ? 'Masa se kuca ručno.' : 'Masa se čita sa uređaja.'}>
                                <select className="ui-input" value={form.mode} onChange={(e) => updateField('mode', e.target.value)}>
                                    <option value="manual">Ručno (kucanje)</option>
                                    <option value="signal">Signal uređaja</option>
                                </select>
                            </Field>
                            <Field label="Jedinica prikaza">
                                <select className="ui-input" value={form.unit} onChange={(e) => updateField('unit', e.target.value)}>
                                    <option value="KG">KG</option>
                                    <option value="T">T</option>
                                </select>
                            </Field>
                            <Field label="Decimala">
                                <input type="number" min={0} max={4} className="ui-input font-mono" value={form.decimals} onChange={(e) => updateField('decimals', Number(e.target.value))} />
                            </Field>
                            <Field label="Početno očitanje (kg)" hint="Vrijednost prije prvog signala.">
                                <input type="number" min={0} className="ui-input font-mono" value={form.defaultLiveWeight} onChange={(e) => updateField('defaultLiveWeight', Number(e.target.value))} />
                            </Field>
                            <label className="row span-all" style={{ gap: 8, cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.allowManualEntry} onChange={(e) => updateField('allowManualEntry', e.target.checked)} />
                                Dozvoli ručni unos mase i kada je izabran signal
                            </label>
                        </div>
                    </Card>

                    <Card title="Veza sa uređajem" icon={Cable}>
                        <div className="ui-form-grid">
                            <Field label="Izvor signala" span="all">
                                <select className="ui-input" value={form.signalSource} onChange={(e) => updateField('signalSource', e.target.value)}>
                                    <option value="RS232">RS232 (serijski port)</option>
                                    <option value="TCP/IP">TCP/IP (mreža)</option>
                                    <option value="USB">USB</option>
                                </select>
                            </Field>
                            {form.signalSource === 'TCP/IP' && (
                                <>
                                    <Field label="TCP/IP host" required error={err('tcpHost')}>
                                        <input className="ui-input font-code" value={form.tcpHost || ''} onChange={(e) => updateField('tcpHost', e.target.value)} placeholder="127.0.0.1" required />
                                    </Field>
                                    <Field label="TCP/IP port" required error={err('tcpPort')}>
                                        <input type="number" min={1} max={65535} className="ui-input font-mono" value={form.tcpPort} onChange={(e) => updateField('tcpPort', Number(e.target.value))} required />
                                    </Field>
                                </>
                            )}
                            {form.signalSource === 'RS232' && (
                                <>
                                    <Field label="RS232 port" required error={err('rs232Path')}>
                                        <input className="ui-input font-code" value={form.rs232Path || ''} onChange={(e) => updateField('rs232Path', e.target.value)} placeholder="/dev/ttyUSB0" required />
                                    </Field>
                                    <Field label="Baud rate" required error={err('rs232BaudRate')}>
                                        <input type="number" min={1200} className="ui-input font-mono" value={form.rs232BaudRate} onChange={(e) => updateField('rs232BaudRate', Number(e.target.value))} required />
                                    </Field>
                                </>
                            )}
                            {form.signalSource === 'USB' && (
                                <div className="span-all ui-hint">USB uređaj se čita preko servisa vage na serveru; nema dodatnih postavki ovdje.</div>
                            )}
                        </div>
                    </Card>

                    {saveState && <Alert tone={saveState.tone} onClose={() => setSaveState(null)}>{saveState.text}</Alert>}
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                        <Button type="submit" size="lg" icon={Save} disabled={saving}>{saving ? 'Čuvanje...' : 'Sačuvaj konfiguraciju'}</Button>
                    </div>
                </form>

                <div className="stack">
                    <Card title="Status signala" icon={Activity} actions={<Badge tone={signalTone} dot>{live ? (live.signalAvailable ? 'Aktivan' : live.signalConnected ? 'Povezano' : 'Nema signala') : 'Provjera...'}</Badge>}>
                        <div className="stack" style={{ gap: 10, fontSize: 12.5 }}>
                            <div className="row-between"><span className="muted">Poruka</span><b style={{ textAlign: 'right' }}>{live?.message || '—'}</b></div>
                            <div className="row-between"><span className="muted">Posljednje očitanje</span><b className="font-mono">{live?.liveWeight !== undefined && live?.signalAvailable ? `${live.liveWeight} kg` : '—'}</b></div>
                            <div className="row-between"><span className="muted">Ažurirano</span><b>{live?.lastUpdatedAt ? fmtDateTime(live.lastUpdatedAt) : '—'}</b></div>
                            <div className="ui-hint">Osvježava se svake 3 sekunde.</div>
                        </div>
                    </Card>
                    <Card title="Pregled prikaza" icon={Gauge}>
                        <div className="muted" style={{ fontSize: 12 }}>
                            {form.scaleName} · {form.signalSource} · {form.mode === 'manual' ? 'ručni unos' : 'signal'}
                            {form.signalSource === 'TCP/IP' && ` · ${form.tcpHost || '-'}:${form.tcpPort || '-'}`}
                            {form.signalSource === 'RS232' && ` · ${form.rs232Path || '-'} @ ${form.rs232BaudRate || '-'}`}
                        </div>
                        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'right', marginTop: 14, fontVariantNumeric: 'tabular-nums' }}>
                            {formatWeight(form.defaultLiveWeight, form)}
                        </div>
                        <div className="ui-hint" style={{ marginTop: 10 }}>Ovako će izgledati očitanje na ekranu Vaganje.</div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
