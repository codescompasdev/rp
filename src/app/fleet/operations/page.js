'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Tabs from '@/components/UI/Tabs';
import styles from '../vehicles/page.module.css';
import MaintenanceForm from './components/MaintenanceForm';
import FuelForm from './components/FuelForm';
import RegistrationForm from './components/RegistrationForm';

export default function OperationsPage() {
    const [activeTab, setActiveTab] = useState('maintenance');
    const [vehicles, setVehicles] = useState([]);
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Fetch vehicles for dropdowns
        api.get('/fleet/vehicles').then(res => {
            setVehicles(res.data.data || res.data);
        }).catch(console.error);
    }, []);

    const tabs = [
        { id: 'maintenance', label: 'Održavanje' }, // Maintenance
        { id: 'fuel', label: 'Gorivo' }, // Fuel
        { id: 'registrations', label: 'Registracije' }, // Registrations
    ];

    const handleSuccess = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Operacije Voznog Parka</h1> {/* Fleet Operations */}
            </div>

            {message && <div style={{ padding: '1rem', background: '#d4edda', color: '#155724', marginBottom: '1rem', borderRadius: '4px' }}>{message}</div>}

            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            <div style={{ marginTop: '2rem', background: 'white', padding: '2rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                {activeTab === 'maintenance' && <MaintenanceForm vehicles={vehicles} onSuccess={() => handleSuccess('Održavanje uspješno evidentirano')} />}
                {activeTab === 'fuel' && <FuelForm vehicles={vehicles} onSuccess={() => handleSuccess('Gorivo uspješno evidentirano')} />}
                {activeTab === 'registrations' && <RegistrationForm vehicles={vehicles} onSuccess={() => handleSuccess('Registracija uspješno evidentirana')} />}
            </div>
        </div>
    );
}
