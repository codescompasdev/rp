'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { t } from '@/lib/translations';
import PageLayout from '@/components/Layout/PageLayout';
import Tabs from '@/components/UI/Tabs';
import Input from '@/components/UI/Input';
import Button from '@/components/UI/Button';
import styles from './page.module.css';

export default function VehicleDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;

    const [activeTab, setActiveTab] = useState('details');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        plateNumber: '',
        make: '',
        model: '',
        productionYear: '',
        status: 'Active',
        driver: '',
        vin: '',
        engineNumber: '',
        chassisType: '',
        fuelType: '',
        euroClass: '',
        mileage: '',
        lastService: '',
        nextInspection: '',
        insuranceExpiry: '',
        purchasePrice: '',
        residualValue: '',
        monthlyLeasing: '',
        taxPerYear: '',
        insurancePerYear: ''
    });

    const tabs = [
        { id: 'details', label: t('Vehicle Details') },
        { id: 'maintenance', label: t('Maintenance') },
        { id: 'fuel', label: t('Fuel') },
        { id: 'documents', label: t('Documents') },
    ];

    useEffect(() => {
        if (id) fetchVehicle();
    }, [id]);

    const fetchVehicle = async () => {
        try {
            const res = await api.get(`/fleet/vehicles/${id}`);
            const vehicle = res.data.data || res.data;
            // Merge fetched data with default state to ensure controlled inputs
            setFormData(prev => ({ ...prev, ...vehicle }));
        } catch (err) {
            console.error(err);
            // alert('Failed to load vehicle'); // suppress for now or use toast
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put(`/fleet/vehicles/${id}`, formData);
            alert(t('Vehicle saved successfully'));
        } catch (err) {
            console.error(err);
            alert(t('Failed to save vehicle'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>{t('Loading...')}</div>;

    // Sidebar Content Component
    const SidebarContent = () => (
        <div className={styles.sidebarContent}>
            <h2 className={styles.sidebarTitle}>{t('Vehicle ID')}</h2>

            <div className={styles.sidebarHighlight}>
                <h3>{formData.plateNumber || 'N/A'}</h3>
            </div>

            <Button variant="primary" className={styles.proceedBtn} onClick={handleSave} disabled={saving}>
                {saving ? t('Saving...') : t('Save Changes')}
            </Button>

            <div className={styles.sidebarForm}>
                <div className={styles.sidebarRow}>
                    <div className={styles.fieldGroup}>
                        <label>{t('Plate No')}</label>
                        <input
                            type="text"
                            name="plateNumber"
                            value={formData.plateNumber}
                            onChange={handleChange}
                            className={styles.darkInput}
                        />
                    </div>
                </div>

                <div className={styles.divider}></div>

                <div className={styles.infoRow}>
                    <span>{t('Make')}</span>
                    <span>{formData.make}</span>
                </div>
                <div className={styles.infoRow}>
                    <span>{t('Model')}</span>
                    <span>{formData.model}</span>
                </div>
                <div className={styles.infoRow}>
                    <span>{t('Year')}</span>
                    <span>{formData.productionYear}</span>
                </div>
                <div className={styles.infoRow}>
                    <span>{t('Status')}</span>
                    <span>{formData.status}</span>
                </div>

                <div className={styles.infoRow}>
                    <span>{t('Mileage')}</span>
                    <span>{formData.mileage}</span>
                </div>

            </div>
        </div>
    );

    return (
        <PageLayout sidebar={<SidebarContent />}>
            <div className={styles.mainContainer}>
                <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

                <div className={styles.contentArea}>
                    {activeTab === 'details' && (
                        <div className={styles.formSection}>
                            <div className={styles.sectionHeader}>
                                <h3>{t('Vehicle Description')}</h3>
                            </div>

                            <div className={styles.formGrid}>
                                {/* Left Column */}
                                <div className={styles.column}>
                                    <Input label={t('Make')} name="make" value={formData.make} onChange={handleChange} required />
                                    <Input label={t('Model')} name="model" value={formData.model} onChange={handleChange} required />
                                    <Input label={t('Production Year')} name="productionYear" type="number" value={formData.productionYear} onChange={handleChange} />
                                    <Input label={t('VIN Number')} name="vin" value={formData.vin} onChange={handleChange} />
                                    <Input label={t('Engine Number')} name="engineNumber" value={formData.engineNumber} onChange={handleChange} />
                                    <Input label={t('Chassis Type')} name="chassisType" value={formData.chassisType} onChange={handleChange} />
                                    <div className={styles.row}>
                                        <Input label={t('Fuel Type')} name="fuelType" value={formData.fuelType} onChange={handleChange} />
                                        <Input label={t('Euro Class')} name="euroClass" value={formData.euroClass} onChange={handleChange} />
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className={styles.column}>
                                    <Input label={t('Status')} name="status" value={formData.status} onChange={handleChange} />
                                    <Input label={t('Current Odometer')} name="mileage" value={formData.mileage} onChange={handleChange} />
                                    <Input label={t('Last Service')} name="lastService" type="date" value={formData.lastService ? formData.lastService.split('T')[0] : ''} onChange={handleChange} />
                                    <Input label={t('Next Inspection')} name="nextInspection" type="date" value={formData.nextInspection ? formData.nextInspection.split('T')[0] : ''} onChange={handleChange} />
                                    <Input label={t('Insurance Expiry')} name="insuranceExpiry" type="date" value={formData.insuranceExpiry ? formData.insuranceExpiry.split('T')[0] : ''} onChange={handleChange} />
                                    <Input label={t('Assigned Driver')} name="driver" value={formData.driver} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.costGrid}>
                                <Input label={t('Purchase Price')} name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} />
                                <Input label={t('Residual Value')} name="residualValue" value={formData.residualValue} onChange={handleChange} />
                                <Input label={t('Monthly Leasing')} name="monthlyLeasing" value={formData.monthlyLeasing} onChange={handleChange} />
                                <Input label={t('Tax/Year')} name="taxPerYear" value={formData.taxPerYear} onChange={handleChange} />
                                <Input label={t('Insurance/Year')} name="insurancePerYear" value={formData.insurancePerYear} onChange={handleChange} />
                            </div>

                        </div>
                    )}

                    {activeTab === 'maintenance' && (
                        <div>{t('Maintenance Logs will appear here.')}</div>
                    )}
                    {activeTab === 'fuel' && (
                        <div>{t('Fuel Logs will appear here.')}</div>
                    )}
                    {activeTab === 'documents' && (
                        <div>{t('Documents will appear here.')}</div>
                    )}
                </div>
            </div>
        </PageLayout>
    );
}
