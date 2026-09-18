'use client';

import { useState } from 'react';
import api from '@/lib/api';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';

export default function FuelForm({ vehicles, onSuccess }) {
    const [formData, setFormData] = useState({ vehicleId: '', liters: '', cost: '', odometer: '', date: '' });
    const [files, setFiles] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => data.append(key, formData[key]));
            if (files) data.append('receipt', files[0]);

            await api.post('/fleet/fuel', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            setFormData({ vehicleId: '', liters: '', cost: '', odometer: '', date: '' });
            setFiles(null);
            onSuccess();
        } catch (err) {
            alert('Greška pri evidentiranju goriva');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#333' }}>Evidencija Goriva</h3>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>Vozilo</label>
                <select
                    value={formData.vehicleId}
                    onChange={e => setFormData({ ...formData, vehicleId: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    required
                >
                    <option value="">Odaberi Vozilo</option>
                    {vehicles.map(v => <option key={v._id || v.id} value={v._id || v.id}>{v.plateNumber} - {v.make}</option>)}
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input label="Litraža (L)" type="number" value={formData.liters} onChange={e => setFormData({ ...formData, liters: e.target.value })} required />
                <Input label="Trošak (KM)" type="number" value={formData.cost} onChange={e => setFormData({ ...formData, cost: e.target.value })} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input label="Kilometraža (km)" type="number" value={formData.odometer} onChange={e => setFormData({ ...formData, odometer: e.target.value })} required />
                <Input label="Datum" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>Slika Računa</label>
                <input type="file" onChange={e => setFiles(e.target.files)} style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }} />
            </div>

            <Button type="submit" disabled={loading}>{loading ? 'Spremanje...' : 'Sačuvaj Unos'}</Button>
        </form>
    );
}
