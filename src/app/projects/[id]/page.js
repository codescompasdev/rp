'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Button from '@/components/UI/Button';
import styles from '../../fleet/vehicles/page.module.css';

export default function ProjectDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [project, setProject] = useState(null);

    useEffect(() => {
        if (id) api.get(`/projects/${id}`).then(r => setProject(r.data.data || r.data)).catch(console.error);
    }, [id]);

    if (!project) return <div>Loading...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Project: {project.name}</h1>
                <Button variant="secondary" onClick={() => router.back()}>Back</Button>
            </div>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', marginTop: '1rem' }}>
                <p><strong>Budget:</strong> {project.budget}</p>
                <p><strong>Status:</strong> {project.status}</p>
                <p><strong>Start Date:</strong> {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}</p>
                <p><strong>End Date:</strong> {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}</p>
            </div>
        </div>
    );
}
