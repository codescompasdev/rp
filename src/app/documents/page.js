'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import Table from '@/components/UI/Table';
import FilterBar from '@/components/UI/FilterBar';
import styles from '../fleet/vehicles/page.module.css';

export default function DocumentsPage() {
    const [documents, setDocuments] = useState([]);
    const [formVisible, setFormVisible] = useState(false);
    const [file, setFile] = useState(null);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = () => {
        api.get('/documents').then(res => setDocuments(res.data.data || res.data)).catch(console.error);
    };

    const handleDelete = async (id) => {
        if (!confirm('Da li ste sigurni da želite obrisati dokument?')) return;
        try {
            await api.delete(`/documents/${id}`);
            fetchDocuments();
        } catch (err) {
            console.error(err);
            alert('Greška pri brisanju dokumenta');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return alert('Odaberite fajl');
        setLoading(true);
        try {
            const data = new FormData();
            data.append('file', file);
            data.append('description', description);

            await api.post('/documents', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            setFormVisible(false);
            setFile(null);
            setDescription('');
            fetchDocuments();
        } catch (err) {
            console.error(err);
            alert('Greška pri upload-u');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { header: 'Naziv Fajla', accessor: 'originalName' },
        { header: 'Opis', accessor: 'description' },
        { header: 'Datum', accessor: 'createdAt', render: row => new Date(row.createdAt).toLocaleDateString() },
        {
            header: 'Akcije',
            render: (row) => (
                <Button variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(row._id || row.id); }} style={{ backgroundColor: '#dc3545', color: 'white', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>
                    Obriši
                </Button>
            )
        }
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Dokumenti</h1>
                <Button onClick={() => setFormVisible(!formVisible)}>+ Novi Dokument</Button>
            </div>

            {formVisible && (
                <div style={{ background: 'white', padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '8px', border: '1px solid #e0e0e0', maxWidth: '600px' }}>
                    <form onSubmit={handleSubmit}>
                        <Input label="Opis" value={description} onChange={e => setDescription(e.target.value)} required />
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>Fajl</label>
                            <input type="file" onChange={e => setFile(e.target.files[0])} required style={{ fontSize: '0.9rem' }} />
                        </div>
                        <Button type="submit" disabled={loading}>{loading ? 'Učitavanje...' : 'Upload'}</Button>
                    </form>
                </div>
            )}

            <FilterBar filters={[{ name: 'search', label: 'Pretraga', type: 'text' }]} />
            <Table columns={columns} data={documents} />
        </div>
    );
}
