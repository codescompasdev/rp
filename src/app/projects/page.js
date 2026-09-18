'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { t } from '@/lib/translations';
import Table from '@/components/UI/Table';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import styles from '@/app/fleet/vehicles/page.module.css';

export default function ProjectsPage() {
    const router = useRouter();
    const [projects, setProjects] = useState([]);
    const [formVisible, setFormVisible] = useState(false);
    const [formData, setFormData] = useState({ name: '', budget: '', startDate: '', endDate: '' });

    useEffect(() => { fetchProjects(); }, []);
    const fetchProjects = () => api.get('/projects').then(r => setProjects(r.data.data || r.data)).catch(console.error);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/projects', formData);
            setFormData({ name: '', budget: '', startDate: '', endDate: '' });
            setFormVisible(false);
            fetchProjects();
        } catch (err) { console.error(err); alert(t('Failed to add project')); }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}><h1>{t('Projects')}</h1><Button onClick={() => setFormVisible(!formVisible)}>{t('Create Project')}</Button></div>
            {formVisible && <form onSubmit={handleSubmit} style={{ background: 'white', padding: '1rem', marginBottom: '1rem' }}><Input label={t('Name')} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /><Input label={t('Budget')} value={formData.budget} onChange={e => setFormData({ ...formData, budget: e.target.value })} /><Input label={t('Start')} type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} /><Input label="End Date" value={formData.endDate} type="date" onChange={e => setFormData({ ...formData, endDate: e.target.value })} /><Button type="submit">Sačuvaj</Button></form>}
            <Table columns={[{ header: t('Name'), accessor: 'name' }, { header: t('Budget'), accessor: 'budget' }, { header: t('Start'), accessor: 'startDate', render: r => r.startDate ? new Date(r.startDate).toLocaleDateString() : '' }, { header: t('Status'), accessor: 'status' }, { header: t('Action'), render: r => <Button onClick={e => { e.stopPropagation(); router.push(`/projects/${r._id || r.id}`) }}>{t('View')}</Button> }]} data={projects} />
        </div>
    );
}
