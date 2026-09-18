'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import Table from '@/components/UI/Table';
import FilterBar from '@/components/UI/FilterBar';
import styles from '../fleet/vehicles/page.module.css';

export default function RemarksPage() {
    const [remarks, setRemarks] = useState([]);
    const [formVisible, setFormVisible] = useState(false);
    const [newRemark, setNewRemark] = useState({ title: '', content: '' });
    const [files, setFiles] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchRemarks();
    }, []);

    const fetchRemarks = () => {
        api.get('/remarks').then(res => setRemarks(res.data.data || res.data)).catch(console.error);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = new FormData();
            data.append('title', newRemark.title);
            data.append('content', newRemark.content);
            if (files) {
                for (let i = 0; i < files.length; i++) {
                    data.append('images', files[i]);
                }
            }
            await api.post('/remarks', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            setFormVisible(false);
            setNewRemark({ title: '', content: '' });
            setFiles(null);
            fetchRemarks();
        } catch (err) {
            console.error(err);
            alert('Greška pri dodavanju napomene');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { header: 'Naslov', accessor: 'title' },
        { header: 'Sadržaj', accessor: 'content' },
        { header: 'Status', accessor: 'status' },
        { header: 'Datum', accessor: 'createdAt', render: row => new Date(row.createdAt).toLocaleDateString() }
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Napomene</h1>
                <Button onClick={() => setFormVisible(!formVisible)}>+ Nova Napomena</Button>
            </div>

            {formVisible && (
                <div style={{ background: 'white', padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '8px', border: '1px solid #e0e0e0', maxWidth: '600px' }}>
                    <form onSubmit={handleSubmit}>
                        <Input label="Naslov" value={newRemark.title} onChange={e => setNewRemark({ ...newRemark, title: e.target.value })} required />
                        <Input label="Sadržaj" value={newRemark.content} onChange={e => setNewRemark({ ...newRemark, content: e.target.value })} required />
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>Slike</label>
                            <input type="file" multiple onChange={e => setFiles(e.target.files)} style={{ fontSize: '0.9rem' }} />
                        </div>
                        <Button type="submit" disabled={loading}>{loading ? 'Spremanje...' : 'Sačuvaj'}</Button>
                    </form>
                </div>
            )}

            <FilterBar filters={[{ name: 'search', label: 'Pretraga', type: 'text' }]} />
            <Table columns={columns} data={remarks} />
        </div>
    );
}
