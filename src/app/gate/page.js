'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/UI/Modal';
import MaterialPicker from '@/components/UI/MaterialPicker';
import { defaultScaleConfig, formatWeight, loadScaleConfig } from '@/lib/scaleConfig';
import { getCurrentRole } from '@/lib/userRole';
import { getAuthUser } from '@/lib/authStorage';
import api from '@/lib/api';
import { formatPickedMaterial, normalizeApiList, resolveBackendMaterial } from '@/lib/materialsAdapter';

function localYmd(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function isTerminalTicketStatus(status) {
    const value = String(status || '').toLowerCase();
    return value === 'zatvoren' || value === 'otkazan' || value === 'storniran';
}

export default function GatePage() {
    const authUser = getAuthUser();
    const [role, setRole] = useState('worker');
    const [isCompact, setIsCompact] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [scaleConfig, setScaleConfig] = useState(defaultScaleConfig);
    const [liveWeight, setLiveWeight] = useState(defaultScaleConfig.defaultLiveWeight);
    const [scaleSignal, setScaleSignal] = useState({
        signalAvailable: false,
        signalConnected: false,
        message: 'Nema signala',
        lastUpdatedAt: null,
    });
    const [newTicketOpen, setNewTicketOpen] = useState(false);
    const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
    const [materialPickerTarget, setMaterialPickerTarget] = useState('newTicket');
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [createPartnerOpen, setCreatePartnerOpen] = useState(false);
    const [inspectionMaterialPickerOpen, setInspectionMaterialPickerOpen] = useState(false);
    const [inspectionMaterial, setInspectionMaterial] = useState(null);
    const [firstWeighOpen, setFirstWeighOpen] = useState(false);
    const [inspectionOpen, setInspectionOpen] = useState(false);
    const [xrfOpen, setXrfOpen] = useState(false);
    const [secondWeighOpen, setSecondWeighOpen] = useState(false);
    const [completeOpen, setCompleteOpen] = useState(false);
    const [nextOutboundMaterialId, setNextOutboundMaterialId] = useState('');
    const [tickets, setTickets] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [selectedAnnouncementId, setSelectedAnnouncementId] = useState('');
    const [contracts, setContracts] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [inspectionWorkers, setInspectionWorkers] = useState([]);
    const [inspectionWorkerId, setInspectionWorkerId] = useState('');
    const [printWeighSlip, setPrintWeighSlip] = useState(true);
    const [closeSubmitting, setCloseSubmitting] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState('');
    const [listDateFrom, setListDateFrom] = useState(() => localYmd());
    const [listDateTo, setListDateTo] = useState(() => localYmd());
    const [ticketDraft, setTicketDraft] = useState({ plate: '', driver: '', pricePerKg: '', supplierId: '', materialId: '', gross: '', tare: '' });
    const [partnerCreateTarget, setPartnerCreateTarget] = useState('newTicket');
    const [gateError, setGateError] = useState('');
    const [gateInfo, setGateInfo] = useState('');
    const [manualWeightOverride, setManualWeightOverride] = useState(false);
    const [selectedAnnouncementQuery, setSelectedAnnouncementQuery] = useState('');
    const [newSupplierQuery, setNewSupplierQuery] = useState('');
    const [detailSupplierQuery, setDetailSupplierQuery] = useState('');
    const [newAnnouncementSupplierQuery, setNewAnnouncementSupplierQuery] = useState('');
    const [createAnnouncementOpen, setCreateAnnouncementOpen] = useState(false);
    const [newAnnouncementForm, setNewAnnouncementForm] = useState({
        supplierId: '',
        expectedKg: '',
        truck: '',
        expectedDate: '',
        status: 'Najavljeno',
    });
    const [newTicketForm, setNewTicketForm] = useState({
        plate: '',
        supplierId: '',
        transactionType: 'IN',
        contractId: '',
        driver: '',
    });
    const [packagingRows, setPackagingRows] = useState([
        { id: `pkg-${Date.now()}`, type: 'Palete', kg: '' },
    ]);
    const [closeLocation, setCloseLocation] = useState('Otvoreni lager C');
    const [closeDriverName, setCloseDriverName] = useState('');
    const [newPartnerForm, setNewPartnerForm] = useState({
        name: '',
        city: '',
        phone: '',
        email: '',
        jib: '',
        createCustomerMirror: true,
    });

    const refreshTickets = useCallback(async () => {
        const ticketRes = await api.get('/gate/tickets', {
            params: {
                ...(listDateFrom ? { dateFrom: listDateFrom } : {}),
                ...(listDateTo ? { dateTo: listDateTo } : {}),
            },
        });
        const ticketData = normalizeApiList(ticketRes).filter((t) => t.type !== 'POS');
        setTickets(ticketData);
        setSelectedTicketId((prev) => {
            if (prev && ticketData.some((t) => t.id === prev)) return prev;
            const preferred = ticketData.find((ticket) => !isTerminalTicketStatus(ticket?.status));
            return preferred?.id || ticketData[0]?.id || '';
        });
    }, [listDateFrom, listDateTo]);

    const refreshSuppliers = async () => {
        const res = await api.get('/sourcing/suppliers');
        const data = normalizeApiList(res);
        setSuppliers(data);
        if (data[0]) {
            setNewTicketForm((prev) => ({ ...prev, supplierId: prev.supplierId || data[0].id }));
        }
    };
    const refreshAnnouncements = async () => {
        const res = await api.get('/gate/announcements');
        setAnnouncements(normalizeApiList(res));
    };

    const refreshMaterials = async () => {
        const res = await api.get('/materials');
        setMaterials(normalizeApiList(res));
    };

    const handleCreatePartner = async () => {
        const trimmedName = String(newPartnerForm.name || '').trim();
        if (!trimmedName) {
            setGateError('Naziv firme je obavezan.');
            return;
        }
        try {
            const supplierRes = await api.post('/sourcing/suppliers', {
                name: trimmedName,
                city: String(newPartnerForm.city || '').trim() || null,
                phone: String(newPartnerForm.phone || '').trim() || null,
                email: String(newPartnerForm.email || '').trim() || null,
                jib: String(newPartnerForm.jib || '').trim() || null,
                pdv: false,
                type: 'Partner',
                bonitet: 'B',
                balance: 0,
                paymentDays: 15,
                active: true,
            });
            if (newPartnerForm.createCustomerMirror) {
                await api.post('/sourcing/customers', {
                    name: trimmedName,
                    country: 'BA',
                    creditLimit: 0,
                    balance: 0,
                    blocked: false,
                });
            }
            await refreshSuppliers();
            const createdSupplier = supplierRes?.data?.data;
            if (createdSupplier?.id) {
                if (partnerCreateTarget === 'ticketDetails') {
                    setTicketDraft((prev) => ({ ...prev, supplierId: createdSupplier.id }));
                } else if (partnerCreateTarget === 'newAnnouncement') {
                    const label = createdSupplier.city ? `${createdSupplier.name} — ${createdSupplier.city}` : createdSupplier.name;
                    setNewAnnouncementForm((prev) => ({ ...prev, supplierId: createdSupplier.id }));
                    setNewAnnouncementSupplierQuery(label);
                } else {
                    setNewTicketForm((prev) => ({ ...prev, supplierId: createdSupplier.id }));
                }
            }
            setCreatePartnerOpen(false);
            setNewPartnerForm({
                name: '',
                city: '',
                phone: '',
                email: '',
                jib: '',
                createCustomerMirror: true,
            });
            setGateError('');
            setGateInfo('Novi komitent je kreiran i odmah odabran.');
        } catch {
            setGateError('Kreiranje komitenta nije uspjelo. Provjeri unos i pokušaj ponovo.');
        }
    };

    const openCreatePartnerModal = (target = 'newTicket') => {
        setPartnerCreateTarget(target);
        setCreatePartnerOpen(true);
    };
    const openCreateAnnouncementModal = () => {
        setNewAnnouncementForm((prev) => ({
            ...prev,
            supplierId: newTicketForm.supplierId || prev.supplierId || '',
            truck: String(newTicketForm.plate || prev.truck || '').trim(),
            expectedDate: prev.expectedDate || new Date().toISOString().slice(0, 10),
            expectedKg: prev.expectedKg || '',
            status: prev.status || 'Najavljeno',
        }));
        const supplierLabel = supplierLookupOptions.find((item) => item.id === (newTicketForm.supplierId || ''))?.label || '';
        setNewAnnouncementSupplierQuery(supplierLabel);
        setCreateAnnouncementOpen(true);
    };
    const handleCreateAnnouncement = async () => {
        const backendMaterial = resolveBackendMaterial(materials, selectedMaterial);
        if (!newAnnouncementForm.supplierId) {
            setGateError('Komitent je obavezan za kreiranje najave.');
            return;
        }
        const expectedKg = Number(newAnnouncementForm.expectedKg || 0);
        if (!Number.isFinite(expectedKg) || expectedKg <= 0) {
            setGateError('Planirana količina (KG) mora biti veća od 0.');
            return;
        }
        try {
            const payload = {
                supplierId: newAnnouncementForm.supplierId,
                materialId: backendMaterial?.id || undefined,
                expectedKg,
                expectedDate: newAnnouncementForm.expectedDate || new Date().toISOString(),
                truck: String(newAnnouncementForm.truck || '').trim() || null,
                status: String(newAnnouncementForm.status || 'Najavljeno').trim() || 'Najavljeno',
            };
            const response = await api.post('/gate/announcements', payload);
            const createdAnnouncement = response?.data?.data;
            await refreshAnnouncements();
            if (createdAnnouncement?.id) {
                setSelectedAnnouncementId(createdAnnouncement.id);
                const createdLabel = `${createdAnnouncement.code || createdAnnouncement.id} — ${createdAnnouncement.material?.code || '-'} — ${createdAnnouncement.truck || 'bez tablica'}`;
                setSelectedAnnouncementQuery(createdLabel);
            }
            setCreateAnnouncementOpen(false);
            setGateError('');
            setGateInfo('Nova najava je kreirana i odabrana.');
        } catch {
            setGateError('Kreiranje najave nije uspjelo. Provjeri podatke i pokušaj ponovo.');
        }
    };

    const getInspectionWorkerName = () => {
        if (!inspectionWorkerId) return '';
        return inspectionWorkers.find((worker) => worker.id === inspectionWorkerId)?.name || '';
    };

    const htmlEscape = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');

    const printWeighSlipDocument = (ticket, targetWindow = null, overrides = {}) => {
        if (typeof window === 'undefined' || !ticket) return;
        const inspectorName = getInspectionWorkerName() || '-';
        const driverName = String(overrides.driverName || '').trim() || '-';
        const packagingList = Array.isArray(ticket?.packagingDetails) ? ticket.packagingDetails : normalizedPackagingRows;
        const packagingPrintLines = packagingList
            .map((row) => ({ type: String(row?.type || '').trim(), kg: Number(row?.kg || 0) }))
            .filter((row) => row.type || row.kg > 0);
        const packagingPrintText = packagingPrintLines.length
            ? packagingPrintLines.map((row) => `${row.type || 'Ambalaža'}: ${Number(row.kg || 0).toLocaleString()} kg`).join(' | ')
            : '-';
        const announcementCode = announcements.find((item) => item.id === selectedAnnouncementId)?.code || '-';
        const transactionType = ticket.type === 'OUT' ? 'PRODAJA / IZLAZ' : 'OTKUP / ULAZ';
        const now = new Date();
        const vagarName = authUser?.name || inspectorName || '-';
        const measureDate = new Date(ticket.updatedAt || ticket.date || now);
        const formatKg = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
        const printWindow = targetWindow || window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;
        try {
            printWindow.document.open();
            printWindow.document.write(`
            <!doctype html>
            <html>
              <head>
                <meta charset="utf-8" />
                <title>Vagarski list ${htmlEscape(ticket.code || '')}</title>
                <style>
                  @page { size: A4; margin: 10mm; }
                  body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; color: #111827; font-size: 12px; }
                  .page { display: grid; gap: 8mm; }
                  .sheet { border: 1px solid #334155; border-radius: 6px; padding: 10px 12px; min-height: calc((297mm - 20mm - 8mm) / 2); box-sizing: border-box; }
                  .company { text-align: center; font-weight: 800; font-size: 24px; letter-spacing: 1px; margin-bottom: 2px; color: #0f172a; }
                  .address { text-align: center; font-size: 11px; margin-bottom: 8px; color: #334155; }
                  .line { border-top: 1px dashed #64748b; margin: 6px 0 8px; }
                  .top-row { display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: 700; }
                  .copy-chip { border: 1px solid #334155; color: #0f172a; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
                  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; margin-bottom: 6px; }
                  .field { display: grid; grid-template-columns: 118px 1fr; align-items: baseline; gap: 6px; border-bottom: 1px dotted #94a3b8; padding-bottom: 2px; min-height: 20px; }
                  .label { font-weight: 600; color: #334155; }
                  .value { font-weight: 700; letter-spacing: .2px; color: #0f172a; }
                  .blocks { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
                  .block { border: 1px solid #94a3b8; border-radius: 4px; padding: 8px; min-height: 122px; position: relative; }
                  .block-title { position: absolute; top: -9px; left: 8px; background: #fff; padding: 0 6px; font-weight: 700; font-size: 11px; color: #1e293b; }
                  .measure-row { display: grid; grid-template-columns: 56px 1fr 24px; gap: 6px; align-items: center; margin: 7px 0; font-size: 18px; font-weight: 700; }
                  .measure-label { font-size: 15px; font-weight: 700; }
                  .measure-value { text-align: right; font-family: "Consolas", "Courier New", monospace; letter-spacing: .5px; }
                  .measure-unit { font-size: 13px; color: #334155; }
                  .date-row { display: grid; grid-template-columns: 66px 1fr; gap: 8px; margin: 16px 0; font-size: 16px; font-weight: 700; }
                  .notes { margin-top: 8px; border-top: 1px dotted #94a3b8; padding-top: 6px; min-height: 24px; font-size: 11px; }
                  .bottom { margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: end; }
                  .signature { border-bottom: 1px solid #475569; min-height: 18px; font-weight: 700; padding: 0 4px 2px; }
                  .foot-time { text-align: right; margin-top: 10px; font-size: 10px; color: #475569; }
                </style>
              </head>
              <body>
                <div class="page">
                <div class="sheet">
                <div class="company">MILKUS d.o.o.</div>
                <div class="address">Ljubogosta b.b. ${htmlEscape(authUser?.company?.name || 'PALE')}</div>
                <div class="top-row">
                  <div>Vagarski list br: ${htmlEscape(ticket.code || '-')}</div>
                  <div class="copy-chip">PRIMJERAK 1 / KOMITENT</div>
                </div>
                <div class="line"></div>
                <div class="grid2">
                  <div class="field"><span class="label">Artikl:</span><span class="value">${htmlEscape(ticket.material?.name || ticket.material?.code || '-')}</span></div>
                  <div class="field"><span class="label">Vozač:</span><span class="value">${htmlEscape(driverName)}</span></div>
                  <div class="field"><span class="label">Komitent:</span><span class="value">${htmlEscape(ticket.supplier?.name || '-')}</span></div>
                  <div class="field"><span class="label">Registarski broj:</span><span class="value">${htmlEscape(ticket.plate || '-')}</span></div>
                </div>
                <div class="field" style="grid-template-columns: 200px 1fr;">
                  <span class="label">Broj ličnog dokumenta:</span><span class="value">-</span>
                </div>
                <div class="blocks">
                  <div class="block">
                    <div class="block-title">Merenje:</div>
                    <div class="measure-row"><span class="measure-label">Pun:</span><span class="measure-value">${htmlEscape(formatKg(ticket.gross))}</span><span class="measure-unit">kg</span></div>
                    <div class="measure-row"><span class="measure-label">Prazan:</span><span class="measure-value">${htmlEscape(formatKg(ticket.tare))}</span><span class="measure-unit">kg</span></div>
                    <div class="measure-row"><span class="measure-label">Neto:</span><span class="measure-value">${htmlEscape(formatKg(ticket.net))}</span><span class="measure-unit">kg</span></div>
                  </div>
                  <div class="block">
                    <div class="block-title">Merenje je izvršeno:</div>
                    <div class="date-row"><span>Datum:</span><span style="text-align:right;">${htmlEscape(measureDate.toLocaleDateString())}</span></div>
                    <div class="date-row"><span>Vreme:</span><span style="text-align:right;">${htmlEscape(measureDate.toLocaleTimeString())}</span></div>
                    <div style="font-size: 12px; margin-top: 20px; color:#555;">Tip: ${htmlEscape(transactionType)} | Najava: ${htmlEscape(announcementCode)}</div>
                  </div>
                </div>
                <div class="notes"><span class="label">Ambalaža/Odbitak:</span> ${htmlEscape(packagingPrintText)}</div>
                <div class="bottom">
                  <div><span class="label">Vagar:</span> <span class="signature">${htmlEscape(vagarName)}</span></div>
                  <div><span class="label">Primio/Predao:</span> <span class="signature">${htmlEscape(inspectorName)}</span></div>
                </div>
                <div class="foot-time">${htmlEscape(now.toLocaleDateString())} ${htmlEscape(now.toLocaleTimeString())}</div>
                </div>
                <div class="sheet">
                <div class="company">MILKUS d.o.o.</div>
                <div class="address">Ljubogosta b.b. ${htmlEscape(authUser?.company?.name || 'PALE')}</div>
                <div class="top-row">
                  <div>Vagarski list br: ${htmlEscape(ticket.code || '-')}</div>
                  <div class="copy-chip">PRIMJERAK 2 / ARHIVA</div>
                </div>
                <div class="line"></div>
                <div class="grid2">
                  <div class="field"><span class="label">Artikl:</span><span class="value">${htmlEscape(ticket.material?.name || ticket.material?.code || '-')}</span></div>
                  <div class="field"><span class="label">Vozač:</span><span class="value">${htmlEscape(driverName)}</span></div>
                  <div class="field"><span class="label">Komitent:</span><span class="value">${htmlEscape(ticket.supplier?.name || '-')}</span></div>
                  <div class="field"><span class="label">Registarski broj:</span><span class="value">${htmlEscape(ticket.plate || '-')}</span></div>
                </div>
                <div class="field" style="grid-template-columns: 200px 1fr;">
                  <span class="label">Broj ličnog dokumenta:</span><span class="value">-</span>
                </div>
                <div class="blocks">
                  <div class="block">
                    <div class="block-title">Merenje:</div>
                    <div class="measure-row"><span class="measure-label">Pun:</span><span class="measure-value">${htmlEscape(formatKg(ticket.gross))}</span><span class="measure-unit">kg</span></div>
                    <div class="measure-row"><span class="measure-label">Prazan:</span><span class="measure-value">${htmlEscape(formatKg(ticket.tare))}</span><span class="measure-unit">kg</span></div>
                    <div class="measure-row"><span class="measure-label">Neto:</span><span class="measure-value">${htmlEscape(formatKg(ticket.net))}</span><span class="measure-unit">kg</span></div>
                  </div>
                  <div class="block">
                    <div class="block-title">Merenje je izvršeno:</div>
                    <div class="date-row"><span>Datum:</span><span style="text-align:right;">${htmlEscape(measureDate.toLocaleDateString())}</span></div>
                    <div class="date-row"><span>Vreme:</span><span style="text-align:right;">${htmlEscape(measureDate.toLocaleTimeString())}</span></div>
                    <div style="font-size: 10px; margin-top: 12px; color:#475569;">Tip: ${htmlEscape(transactionType)} | Najava: ${htmlEscape(announcementCode)}</div>
                  </div>
                </div>
                <div class="notes"><span class="label">Ambalaža/Odbitak:</span> ${htmlEscape(packagingPrintText)}</div>
                <div class="bottom">
                  <div><span class="label">Vagar:</span> <span class="signature">${htmlEscape(vagarName)}</span></div>
                  <div><span class="label">Primio/Predao:</span> <span class="signature">${htmlEscape(inspectorName)}</span></div>
                </div>
                <div class="foot-time">${htmlEscape(now.toLocaleDateString())} ${htmlEscape(now.toLocaleTimeString())}</div>
                </div>
                </div>
              </body>
            </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                try {
                    printWindow.print();
                } catch {}
            }, 120);
        } catch {
            try {
                printWindow.document.body.innerHTML = '<div style="font-family:Arial;padding:16px">Greška pri pripremi štampe.</div>';
            } catch {}
        }
    };

    useEffect(() => {
        setRole(getCurrentRole());
        const config = loadScaleConfig();
        api.get('/gate/scale/config')
            .then((res) => {
                const backendConfig = res?.data?.data || {};
                const mergedConfig = { ...config, ...backendConfig };
                setScaleConfig(mergedConfig);
                setLiveWeight(Number(mergedConfig.defaultLiveWeight || 0));
            })
            .catch(() => {
                setScaleConfig(config);
                setLiveWeight(Number(config.defaultLiveWeight || 0));
            });
        refreshSuppliers().catch(() => setSuppliers([]));
        refreshAnnouncements().catch(() => setAnnouncements([]));
        api.get('/gate/inspection-workers').then((res) => {
            const data = normalizeApiList(res);
            setInspectionWorkers(data);
            if (data[0]?.id) {
                setInspectionWorkerId(data[0].id);
            }
        }).catch(() => {
            setInspectionWorkers([]);
            setInspectionWorkerId('');
        });
        api.get('/sourcing/contracts').then((res) => setContracts(normalizeApiList(res))).catch(() => setContracts([]));
        refreshMaterials().catch(() => setMaterials([]));
        if (typeof window !== 'undefined') {
            const onResize = () => {
                const width = window.innerWidth;
                setIsCompact(width < 1100);
                setIsMobile(width < 860);
            };
            onResize();
            window.addEventListener('resize', onResize);
            return () => window.removeEventListener('resize', onResize);
        }
    }, []);

    useEffect(() => {
        refreshTickets().catch(() => setTickets([]));
    }, [refreshTickets]);

    useEffect(() => {
        if (!selectedAnnouncementId) return;
        const selectedAnnouncement = announcements.find((item) => item.id === selectedAnnouncementId);
        if (!selectedAnnouncement) return;
        setNewTicketForm((prev) => ({
            ...prev,
            supplierId: selectedAnnouncement.supplierId || selectedAnnouncement.supplier?.id || prev.supplierId,
            contractId: selectedAnnouncement.contractId || prev.contractId,
            plate: selectedAnnouncement.truck || prev.plate,
        }));
        const announcedMaterialId = selectedAnnouncement.materialId || selectedAnnouncement.material?.id;
        const announcedMaterialCode = selectedAnnouncement.material?.code;
        const resolvedMaterial = materials.find((item) =>
            item.id === announcedMaterialId || (announcedMaterialCode && item.code === announcedMaterialCode)
        );
        if (resolvedMaterial) {
            setSelectedMaterial(resolvedMaterial);
        }
    }, [selectedAnnouncementId, announcements, materials]);

    useEffect(() => {
        if (scaleConfig.mode !== 'signal') {
            setScaleSignal((prev) => ({
                ...prev,
                signalAvailable: false,
                signalConnected: false,
                message: 'Signal mode isključen',
            }));
            return;
        }
        let cancelled = false;
        const requestedScaleId = String(scaleConfig.scaleName || '').trim();
        const readSignal = async () => {
            try {
                const res = await api.get('/gate/scale/live', {
                    params: requestedScaleId ? { scaleId: requestedScaleId } : undefined,
                });
                const data = res?.data?.data || {};
                if (cancelled) return;
                setScaleSignal({
                    signalAvailable: Boolean(data.signalAvailable),
                    signalConnected: Boolean(data.signalConnected),
                    message: data.message || (data.signalAvailable ? 'Signal aktivan' : 'Nema signala'),
                    lastUpdatedAt: data.lastUpdatedAt || null,
                });
                if (data.signalAvailable && !manualWeightOverride) {
                    setLiveWeight(Number(data.liveWeight || 0));
                }
            } catch {
                if (!cancelled) {
                    setScaleSignal({
                        signalAvailable: false,
                        signalConnected: false,
                        message: 'Nema signala',
                        lastUpdatedAt: null,
                    });
                }
            }
        };
        readSignal();
        const timer = setInterval(readSignal, 2000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [scaleConfig.mode, scaleConfig.scaleName, manualWeightOverride]);

    const weightText = useMemo(
        () => formatWeight(liveWeight, scaleConfig),
        [liveWeight, scaleConfig]
    );
    const activeTicket = useMemo(
        () => tickets.find((ticket) => ticket.id === selectedTicketId) || tickets[0] || null,
        [tickets, selectedTicketId]
    );
    const tareWeight = useMemo(() => {
        const live = Number(liveWeight);
        if (Number.isFinite(live) && live > 0) {
            return live;
        }
        return Number(activeTicket?.tare || 0);
    }, [liveWeight, activeTicket]);
    const isTareFallback = useMemo(() => {
        const live = Number(liveWeight);
        return !(Number.isFinite(live) && live > 0) && Number(activeTicket?.tare || 0) > 0;
    }, [liveWeight, activeTicket]);
    const tareWeightText = useMemo(
        () => formatWeight(tareWeight, scaleConfig),
        [tareWeight, scaleConfig]
    );
    const knownPlates = useMemo(() => {
        const values = [
            ...tickets.map((ticket) => String(ticket?.plate || '').trim()),
            ...announcements.map((item) => String(item?.truck || '').trim()),
        ].filter(Boolean);
        return [...new Set(values)];
    }, [tickets, announcements]);
    const knownDrivers = useMemo(() => {
        const values = tickets
            .map((ticket) => String(ticket?.driver || '').trim())
            .filter(Boolean);
        return [...new Set(values)];
    }, [tickets]);
    const supplierLookupOptions = useMemo(
        () => suppliers.map((supplier) => ({
            id: supplier.id,
            label: supplier.city ? `${supplier.name} — ${supplier.city}` : supplier.name,
        })),
        [suppliers]
    );
    const announcementLookupOptions = useMemo(
        () => announcements.map((item) => ({
            id: item.id,
            label: `${item.code || item.id} — ${item.material?.code || '-'} — ${item.truck || 'bez tablica'}`,
        })),
        [announcements]
    );
    const resolveLookupId = (value, options) => {
        const normalizedValue = String(value || '').trim();
        if (!normalizedValue) return '';
        const exactById = options.find((option) => option.id === normalizedValue);
        if (exactById) return exactById.id;
        const loweredValue = normalizedValue.toLowerCase();
        const exactByLabel = options.find((option) => option.label.toLowerCase() === loweredValue);
        return exactByLabel?.id || '';
    };
    const canManualEntry = useMemo(() => {
        if (scaleConfig.mode === 'manual') return true;
        return Boolean(scaleConfig.allowManualEntry) && !scaleSignal.signalAvailable;
    }, [scaleConfig, scaleSignal.signalAvailable]);
    const isOutboundFlow = useMemo(() => activeTicket?.type === 'OUT', [activeTicket]);
    const totalPackagingKg = useMemo(
        () => packagingRows.reduce((sum, row) => sum + Number(row.kg || 0), 0),
        [packagingRows]
    );
    const normalizedPackagingRows = useMemo(
        () => packagingRows
            .map((row) => ({
                type: String(row.type || '').trim(),
                kg: Math.max(0, Number(row.kg || 0)),
            }))
            .filter((row) => row.type || row.kg > 0),
        [packagingRows]
    );

    useEffect(() => {
        if (!activeTicket) return;
        setTicketDraft({
            plate: activeTicket.plate || '',
            driver: activeTicket.driver || '',
            pricePerKg: String(activeTicket.pricePerKg || 0),
            supplierId: activeTicket.supplierId || activeTicket.supplier?.id || '',
            materialId: activeTicket.materialId || activeTicket.material?.id || '',
            gross: String(Number(activeTicket.gross || 0)),
            tare: String(Number(activeTicket.tare || 0)),
        });
        const savedPackaging = Array.isArray(activeTicket.packagingDetails) ? activeTicket.packagingDetails : [];
        if (savedPackaging.length > 0) {
            setPackagingRows(savedPackaging.map((row, index) => ({
                id: `pkg-saved-${index}-${Date.now()}`,
                type: String(row?.type || ''),
                kg: String(Number(row?.kg || 0)),
            })));
        } else {
            setPackagingRows([{ id: `pkg-${Date.now()}`, type: 'Palete', kg: '' }]);
        }
    }, [activeTicket?.id]);
    useEffect(() => {
        const selected = supplierLookupOptions.find((item) => item.id === newTicketForm.supplierId);
        setNewSupplierQuery(selected?.label || '');
    }, [newTicketForm.supplierId, supplierLookupOptions]);
    useEffect(() => {
        const selected = supplierLookupOptions.find((item) => item.id === ticketDraft.supplierId);
        setDetailSupplierQuery(selected?.label || '');
    }, [ticketDraft.supplierId, supplierLookupOptions]);
    useEffect(() => {
        const selected = supplierLookupOptions.find((item) => item.id === newAnnouncementForm.supplierId);
        setNewAnnouncementSupplierQuery(selected?.label || '');
    }, [newAnnouncementForm.supplierId, supplierLookupOptions]);
    useEffect(() => {
        const selected = announcementLookupOptions.find((item) => item.id === selectedAnnouncementId);
        setSelectedAnnouncementQuery(selected?.label || '');
    }, [selectedAnnouncementId, announcementLookupOptions]);

    const handleCreateTicket = async () => {
        const backendMaterial = resolveBackendMaterial(materials, selectedMaterial);
        try {
            const payload = {
                date: new Date().toISOString(),
                plate: String(newTicketForm.plate || '').trim() || 'N/A',
                driver: newTicketForm.driver || null,
                supplierId: newTicketForm.supplierId || null,
                materialId: backendMaterial?.id || undefined,
                gross: 0,
                tare: 0,
                kalo: 0,
                net: 0,
                pricePerKg: 0,
                total: 0,
                status: 'Otvoren',
                type: newTicketForm.transactionType,
            };
            await api.post('/gate/tickets', payload);
            await refreshTickets();
            setGateError('');
            setGateInfo('Novi prijem je uspješno kreiran.');
            setNewTicketOpen(false);
            setSelectedMaterial(null);
            setSelectedAnnouncementId('');
            setNewTicketForm((prev) => ({ ...prev, plate: '', driver: '' }));
            if (!backendMaterial?.id) {
                setGateInfo('Novi prijem je kreiran sa privremenim materijalom. Potvrdi tačan materijal prije zatvaranja.');
            }
        } catch {
            setGateError('Kreiranje tiketa nije uspjelo. Provjeri podatke i pokušaj ponovo.');
        }
    };

    const handleFirstWeigh = async () => {
        if (!activeTicket?.id) return;
        const weight = Number(liveWeight || 0);
        if (!Number.isFinite(weight) || weight <= 0) {
            setGateError('Vaganje nije moguće: trenutna težina mora biti veća od 0 kg.');
            return;
        }
        try {
            if (isOutboundFlow) {
                await api.post(`/gate/tickets/${activeTicket.id}/first-weigh`, { tare: weight });
            } else {
                await api.post(`/gate/tickets/${activeTicket.id}/first-weigh`, { gross: weight });
            }
            await refreshTickets();
            setFirstWeighOpen(false);
            setGateInfo('Prvo vaganje je sačuvano.');
            setGateError('');
        } catch (error) {
            setGateError(error?.response?.data?.error || 'Neuspješno čuvanje prvog vaganja.');
        }
    };

    const handleInspection = async () => {
        if (!activeTicket?.id) return;
        const backendMaterial = inspectionMaterial ? resolveBackendMaterial(materials, inspectionMaterial) : null;
        try {
            await api.post(`/gate/tickets/${activeTicket.id}/inspection`, {
                materialId: backendMaterial?.id || undefined,
                inspectorId: inspectionWorkerId || undefined,
                inspectorName: getInspectionWorkerName() || undefined,
            });
            await refreshTickets();
            setInspectionOpen(false);
            setGateInfo('Inspekcija je sačuvana.');
            setGateError('');
        } catch {
            setGateError('Neuspješno čuvanje inspekcije.');
        }
    };

    const updatePackagingRow = (id, field, value) => {
        setPackagingRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
    };

    const addPackagingRow = () => {
        setPackagingRows((prev) => [...prev, { id: `pkg-${Date.now()}-${Math.random()}`, type: '', kg: '' }]);
    };

    const removePackagingRow = (id) => {
        setPackagingRows((prev) => prev.filter((row) => row.id !== id));
    };

    const handleSaveTicketDetails = async () => {
        if (!activeTicket?.id) return;
        const grossRaw = String(ticketDraft.gross ?? '').trim();
        const tareRaw = String(ticketDraft.tare ?? '').trim();
        const priceRaw = String(ticketDraft.pricePerKg ?? '').trim();
        const gross = grossRaw === '' ? Number(activeTicket?.gross || 0) : Number(grossRaw);
        const tare = tareRaw === '' ? Number(activeTicket?.tare || 0) : Number(tareRaw);
        if (!Number.isFinite(gross) || gross < 0 || !Number.isFinite(tare) || tare < 0) {
            setGateError('Bruto i tara moraju biti validni brojevi (>= 0).');
            return;
        }
        const net = Math.max(0, gross - tare - Number(totalPackagingKg || 0));
        const pricePerKg = priceRaw === '' ? Number(activeTicket?.pricePerKg || 0) : Number(priceRaw);
        if (!Number.isFinite(pricePerKg) || pricePerKg < 0) {
            setGateError('Cijena/KG mora biti validan broj (>= 0).');
            return;
        }
        try {
            await api.put(`/gate/tickets/${activeTicket.id}`, {
                plate: String(ticketDraft.plate || '').trim() || 'N/A',
                driver: String(ticketDraft.driver || '').trim() || null,
                pricePerKg,
                supplierId: ticketDraft.supplierId || null,
                materialId: ticketDraft.materialId || undefined,
                gross,
                tare,
                net,
                total: net * pricePerKg,
            });
            await refreshTickets();
            setGateInfo('Detalji vaganja su sačuvani.');
            setGateError('');
        } catch (error) {
            setGateError(error?.response?.data?.error || 'Neuspješno čuvanje detalja.');
        }
    };

    const handleGateCancelTicket = async () => {
        if (!activeTicket?.id) return;
        if (!window.confirm('Otkazati ovo vaganje? Moguće samo dok nije zatvoreno.')) return;
        try {
            await api.post(`/gate/tickets/${activeTicket.id}/cancel`);
            setGateInfo('Vaganje je otkazano.');
            setGateError('');
            await refreshTickets();
        } catch (error) {
            setGateError(error?.response?.data?.error || 'Otkazivanje nije uspjelo.');
        }
    };

    const handleGateVoidTicket = async () => {
        if (!activeTicket?.id) return;
        if (!window.confirm('STORNO: knjiženje vaganja biće poništeno na skladištu. Nastaviti?')) return;
        try {
            await api.post(`/gate/tickets/${activeTicket.id}/void`, {});
            setGateInfo('Vaganje je stornirano.');
            setGateError('');
            await refreshTickets();
        } catch (error) {
            setGateError(error?.response?.data?.error || 'Storno nije uspjelo.');
        }
    };

    const handleSecondWeigh = async () => {
        if (!activeTicket?.id) return;
        const secondWeight = Number(isOutboundFlow ? liveWeight : tareWeight);
        if (!Number.isFinite(secondWeight) || secondWeight <= 0) {
            setGateError(`2. vaganje nije moguće: ${isOutboundFlow ? 'bruto' : 'tara'} mora biti veća od 0 kg.`);
            return;
        }
        if (Number(totalPackagingKg || 0) <= 0) {
            const proceedWithoutPackaging = window.confirm(
                'Nije unijeta ambalaža (odbitak 0 kg). Da li sigurno želiš nastaviti sa 2. vaganjem?'
            );
            if (!proceedWithoutPackaging) {
                setGateError('Dodaj ambalažu prije završetka 2. vaganja ili potvrdi da odbitak ostaje 0 kg.');
                return;
            }
        }
        try {
            const payload = {
                packagingKg: Number(totalPackagingKg || 0),
                packagingLines: normalizedPackagingRows,
                pricePerKg: Number(activeTicket.pricePerKg || 0.3),
            };
            if (isOutboundFlow) {
                payload.gross = Number(liveWeight || 0);
            } else {
                payload.tare = Number(tareWeight || 0);
            }
            await api.post(`/gate/tickets/${activeTicket.id}/second-weigh`, payload);
            await refreshTickets();
            setSecondWeighOpen(false);
            setPackagingRows([{ id: `pkg-${Date.now()}`, type: 'Palete', kg: '' }]);
            setGateInfo('Drugo vaganje je sačuvano.');
            setGateError('');
        } catch (error) {
            setGateError(error?.response?.data?.error || 'Neuspješno čuvanje drugog vaganja.');
        }
    };

    const handleOpenComplete = () => {
        if (!activeTicket?.id) return;
        setCloseDriverName(activeTicket?.driver || '');
        if (activeTicket?.type === 'OUT') {
            setNextOutboundMaterialId(activeTicket?.material?.id || activeTicket?.materialId || '');
        } else {
            setNextOutboundMaterialId('');
        }
        setCompleteOpen(true);
    };

    const handleCloseTicket = async ({ continueOutbound = false } = {}) => {
        if (closeSubmitting) return;
        if (!activeTicket?.id) return;
        const nextMaterialForContinue = nextOutboundMaterialId || activeTicket?.material?.id || activeTicket?.materialId || '';
        if (continueOutbound && activeTicket?.type === 'OUT' && !nextMaterialForContinue) {
            setGateError('Odaberi materijal za sljedeće vaganje.');
            return;
        }
        let preOpenedPrintWindow = null;
        if (printWeighSlip && typeof window !== 'undefined') {
            preOpenedPrintWindow = window.open('', '_blank', 'width=900,height=700');
            if (preOpenedPrintWindow?.document) {
                preOpenedPrintWindow.document.write('<div style="font-family:Arial;padding:16px">Priprema vagarskog lista...</div>');
            }
        }
        try {
            setCloseSubmitting(true);
            const closeRes = await api.post(`/gate/tickets/${activeTicket.id}/close`, {
                location: closeLocation,
                inspectorId: inspectionWorkerId || undefined,
                inspectorName: getInspectionWorkerName() || undefined,
                announcementId: selectedAnnouncementId || undefined,
            });
            const closedTicket = closeRes?.data?.data || activeTicket;
            if (printWeighSlip) {
                printWeighSlipDocument(closedTicket, preOpenedPrintWindow, { driverName: closeDriverName });
            }
            if (continueOutbound && activeTicket?.type === 'OUT') {
                const nextRes = await api.post('/gate/tickets', {
                    date: new Date().toISOString(),
                    plate: activeTicket?.plate || '',
                    driver: closeDriverName || activeTicket?.driver || null,
                    supplierId: activeTicket?.supplierId || activeTicket?.supplier?.id || null,
                    materialId: nextMaterialForContinue,
                    gross: 0,
                    tare: Number(closedTicket?.gross || activeTicket?.gross || 0),
                    kalo: 0,
                    net: 0,
                    pricePerKg: Number(activeTicket?.pricePerKg || 0),
                    total: 0,
                    status: 'Tara završena',
                    type: 'OUT',
                });
                const nextTicket = nextRes?.data?.data;
            await refreshTickets();
                if (nextTicket?.id) {
                    setSelectedTicketId(nextTicket.id);
                }
            setCompleteOpen(false);
                setCloseDriverName('');
                setGateInfo('Tiket je zatvoren i otvoreno je novo OUT vaganje. Nastavi sa brutom.');
                setGateError('');
                return;
            }
            await refreshTickets();
            setCompleteOpen(false);
            setCloseDriverName('');
            const isOutbound = activeTicket?.type === 'OUT';
            setGateInfo(isOutbound ? 'Tiket je zatvoren i stanje je umanjeno.' : 'Tiket je zatvoren i lot je kreiran.');
            setGateError('');
        } catch (error) {
            if (preOpenedPrintWindow && !preOpenedPrintWindow.closed) {
                preOpenedPrintWindow.close();
            }
            const message = error?.response?.data?.error;
            setGateError(message || 'Zatvaranje tiketa nije uspjelo.');
        } finally {
            setCloseSubmitting(false);
        }
    };

    const firstStepDone = isOutboundFlow ? Number(activeTicket?.tare || 0) > 0 : Number(activeTicket?.gross || 0) > 0;
    const secondStepDone = isOutboundFlow ? Number(activeTicket?.gross || 0) > 0 : Number(activeTicket?.tare || 0) > 0;
    const isTicketClosed = String(activeTicket?.status || '').toLowerCase() === 'zatvoren';
    const isTicketVoidOrCancelled = ['otkazan', 'storniran'].includes(String(activeTicket?.status || '').toLowerCase());
    const canGateCancel = activeTicket?.id && !isTicketClosed && !isTicketVoidOrCancelled;
    const canGateVoid = activeTicket?.id && isTicketClosed && !isTicketVoidOrCancelled && (activeTicket.type === 'IN' || activeTicket.type === 'OUT');

    if (true) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
                <div className="scada-panel" style={{ width: '100%', background: '#0f172a', color: '#e2e8f0', minHeight: 210 }}>
                    <div className="scada-header" style={{ background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between' }}>
                        <span>VAGA - LIVE</span>
                        <button onClick={() => setNewTicketOpen(true)} style={{ padding: '8px 16px', background: '#10b981', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>+ NOVI PRIJEM</button>
                    </div>
                    <div style={{ padding: '18px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: '12px', alignItems: 'center' }}>
                        <div>
                            <div style={{ color: scaleSignal.signalAvailable ? '#10b981' : '#f59e0b', fontSize: '11px', marginBottom: '6px' }}>{scaleSignal.message}</div>
                            <div className="scada-readout" style={{ color: '#10b981', fontSize: isMobile ? '42px' : '72px', fontWeight: 800 }}>{weightText}</div>
                            <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center', maxWidth: 540 }}>
                                <input
                                    type="number"
                                    value={liveWeight}
                                    onChange={(event) => {
                                        setManualWeightOverride(true);
                                        setLiveWeight(Number(event.target.value || 0));
                                    }}
                                    style={{ padding: '8px', background: '#0b1220', color: '#e2e8f0', border: '1px solid #334155' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setManualWeightOverride((prev) => !prev)}
                                    style={{
                                        padding: '8px 10px',
                                        border: '1px solid #334155',
                                        background: manualWeightOverride ? '#b45309' : '#1f2937',
                                        color: '#e2e8f0',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {manualWeightOverride ? 'RUČNA KOREKCIJA ON' : 'SIGNAL MODE'}
                                </button>
                            </div>
                            <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8' }}>
                                {manualWeightOverride
                                    ? 'Ručna korekcija je aktivna. Isključi da opet prati signal sa vage.'
                                    : (canManualEntry ? 'Ručni unos je dostupan kao fallback.' : 'Ručni unos je uvijek dostupan za korekcije.')}
                            </div>
                        </div>
                        <div style={{ display: 'grid', gap: '8px', minWidth: 260 }}>
                            <button onClick={handleFirstWeigh} disabled={!activeTicket?.id || firstStepDone || isTicketVoidOrCancelled} style={{ padding: '12px', background: firstStepDone ? '#64748b' : '#1e40af', border: '1px solid #3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                                1. VAGANJE {isOutboundFlow ? 'PRAZAN' : 'PUN'}
                            </button>
                            <button onClick={handleSecondWeigh} disabled={!activeTicket?.id || !firstStepDone || secondStepDone || isTicketVoidOrCancelled} style={{ padding: '12px', background: secondStepDone ? '#64748b' : '#15803d', border: '1px solid #10b981', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                                2. VAGANJE {isOutboundFlow ? 'PUN' : 'PRAZAN'}
                            </button>
                            <button onClick={handleOpenComplete} disabled={!activeTicket?.id || !secondStepDone || closeSubmitting || isTicketVoidOrCancelled} style={{ padding: '12px', background: '#1e293b', border: '1px solid #475569', color: '#e2e8f0', fontWeight: 700, cursor: 'pointer', opacity: closeSubmitting ? 0.7 : 1 }}>
                                ZATVORI I ŠTAMPAJ
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr 1fr', gap: '12px', minHeight: 0, flex: 1 }}>
                    <div className="scada-panel" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <div className="scada-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                            <span>VAGANJA</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Od
                                    <input type="date" value={listDateFrom} onChange={(e) => setListDateFrom(e.target.value)} style={{ padding: '4px 6px', fontSize: '11px' }} />
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Do
                                    <input type="date" value={listDateTo} onChange={(e) => setListDateTo(e.target.value)} style={{ padding: '4px 6px', fontSize: '11px' }} />
                                </label>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    style={{ padding: '4px 8px', fontSize: '10px' }}
                                    onClick={() => {
                                        const t = localYmd();
                                        setListDateFrom(t);
                                        setListDateTo(t);
                                    }}
                                >
                                    Danas
                                </button>
                            </div>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {tickets.map((ticket) => {
                                const st = String(ticket.status || '').toLowerCase();
                                const rowBg = selectedTicketId === ticket.id
                                    ? '#dcfce7'
                                    : st === 'zatvoren'
                                        ? '#ecfdf5'
                                        : st === 'otkazan' || st === 'storniran'
                                            ? '#fef2f2'
                                            : '#fff';
                                return (
                                <div
                                    key={ticket.id}
                                    onClick={() => setSelectedTicketId(ticket.id)}
                                    style={{
                                        padding: '10px 12px',
                                        borderBottom: '1px solid var(--border-color)',
                                        cursor: 'pointer',
                                        background: rowBg,
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>{ticket.type}</span>
                                    </div>
                                    <div style={{ fontSize: '12px', marginTop: '3px' }}>
                                        {ticket.supplier?.name || '-'} | {ticket.driver || '-'} | {ticket.plate || '-'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 'bold' }}>
                                        {ticket.material?.code || '-'} - {ticket.material?.name || '-'}
                                    </div>
                                    <div className="font-mono font-bold" style={{ fontSize: '11px', marginTop: '4px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                                        <span>TARA: {Number(ticket.tare || 0).toLocaleString()}</span>
                                        <span>BRUTO: {Number(ticket.gross || 0).toLocaleString()}</span>
                                        <span>NETO: {Number(ticket.net || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            );})}
                            {!tickets.length && <div style={{ padding: '16px', color: '#64748b' }}>Nema vaganja u izabranom periodu.</div>}
                        </div>
                    </div>

                    <div className="scada-panel" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <div className="scada-header">DETALJI VAGANJA</div>
                        {!activeTicket ? (
                            <div style={{ padding: '16px', color: '#64748b' }}>Odaberi vaganje iz liste.</div>
                        ) : (
                            <div style={{ padding: '12px', display: 'grid', gap: '10px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Tablice (opciono)</label><input list="gate-known-plates" value={ticketDraft.plate} onChange={(e) => setTicketDraft((p) => ({ ...p, plate: e.target.value }))} style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Vozač (opciono)</label><input list="gate-known-drivers" value={ticketDraft.driver} onChange={(e) => setTicketDraft((p) => ({ ...p, driver: e.target.value }))} style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 700 }}>Komitent (opciono)</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px', marginTop: '4px' }}>
                                        <input
                                            list="gate-supplier-options"
                                            value={detailSupplierQuery}
                                            placeholder="- Nije odabrano -"
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setDetailSupplierQuery(value);
                                                const resolved = resolveLookupId(value, supplierLookupOptions);
                                                setTicketDraft((prev) => ({ ...prev, supplierId: resolved || '' }));
                                            }}
                                            style={{ width: '100%', padding: '6px' }}
                                        />
                                        <button type="button" className="btn-primary" style={{ padding: '6px 10px', fontSize: '11px' }} onClick={() => openCreatePartnerModal('ticketDetails')}>
                                            + Novi komitent
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 700 }}>Materijal (može naknadno)</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px', marginTop: '4px' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMaterialPickerTarget('ticketDetails');
                                                setMaterialPickerOpen(true);
                                            }}
                                            style={{ width: '100%', padding: '8px', textAlign: 'left', border: '1px solid var(--border-color)', background: '#fff' }}
                                        >
                                            {materials.find((m) => m.id === ticketDraft.materialId)
                                                ? formatPickedMaterial(materials.find((m) => m.id === ticketDraft.materialId))
                                                : 'Odaberi materijal'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTicketDraft((p) => ({ ...p, materialId: '' }))}
                                            style={{ padding: '8px 10px', border: '1px solid var(--border-color)', background: '#fff' }}
                                        >
                                            Očisti
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Bruto (korekcija)</label><input type="number" value={ticketDraft.gross} onChange={(e) => setTicketDraft((p) => ({ ...p, gross: e.target.value }))} style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Tara (korekcija)</label><input type="number" value={ticketDraft.tare} onChange={(e) => setTicketDraft((p) => ({ ...p, tare: e.target.value }))} style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                    Korekcije važe dok tiket nije zatvoren. Neto i ukupno će se preračunati pri čuvanju.
                                    Ako polje bruto/tara ostane prazno, zadržava se postojeća vrijednost tiketa.
                                </div>
                                <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Cijena/KG (opciono)</label><input type="number" value={ticketDraft.pricePerKg} onChange={(e) => setTicketDraft((p) => ({ ...p, pricePerKg: e.target.value }))} style={{ width: '100%', padding: '6px', marginTop: '4px' }} /></div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                    <button className="btn-primary" disabled={isTicketClosed || isTicketVoidOrCancelled} style={{ width: 'fit-content', padding: '6px 12px', opacity: isTicketClosed || isTicketVoidOrCancelled ? 0.6 : 1 }} onClick={handleSaveTicketDetails}>Sačuvaj detalje</button>
                                    {canGateCancel && (
                                        <button type="button" style={{ padding: '6px 12px', background: '#f59e0b', color: '#fff', border: 'none', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }} onClick={handleGateCancelTicket}>
                                            Otkaži vaganje
                                        </button>
                                    )}
                                    {canGateVoid && (
                                        <button type="button" style={{ padding: '6px 12px', background: '#7f1d1d', color: '#fff', border: 'none', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }} onClick={handleGateVoidTicket}>
                                            Storno (knjiženje)
                                        </button>
                                    )}
                                </div>

                                <div style={{ border: '1px solid var(--border-color)', background: '#f8fafc', padding: '10px', display: 'grid', gap: '6px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700 }}>Skidanje ambalaže (opciono)</div>
                                    {packagingRows.map((row) => (
                                        <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: '6px' }}>
                                            <input placeholder="Vrsta ambalaže" value={row.type} onChange={(e) => updatePackagingRow(row.id, 'type', e.target.value)} style={{ padding: '6px' }} />
                                            <input type="number" placeholder="KG" value={row.kg} onChange={(e) => updatePackagingRow(row.id, 'kg', e.target.value)} style={{ padding: '6px', textAlign: 'right' }} />
                                            <button type="button" onClick={() => removePackagingRow(row.id)} style={{ padding: '6px 10px', border: '1px solid var(--border-color)', background: '#fff' }}>Ukloni</button>
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <button type="button" className="btn-primary" style={{ padding: '6px 10px', fontSize: '11px' }} onClick={addPackagingRow}>+ Ambalaža</button>
                                        <div className="font-mono" style={{ fontSize: '12px' }}>Ukupno odbitak: {Number(totalPackagingKg || 0).toLocaleString()} KG</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {gateInfo && <div style={{ padding: '8px', background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', fontSize: '11px' }}>{gateInfo}</div>}
                {gateError && <div style={{ padding: '8px', background: '#fef2f2', border: '1px solid #ef4444', color: '#991b1b', fontSize: '11px' }}>{gateError}</div>}
                <datalist id="gate-known-plates">
                    {knownPlates.map((plate) => <option key={plate} value={plate} />)}
                </datalist>
                <datalist id="gate-known-drivers">
                    {knownDrivers.map((driver) => <option key={driver} value={driver} />)}
                </datalist>
                <datalist id="gate-supplier-options">
                    {supplierLookupOptions.map((option) => <option key={option.id} value={option.label} />)}
                </datalist>
                <datalist id="gate-announcement-options">
                    {announcementLookupOptions.map((option) => <option key={option.id} value={option.label} />)}
                </datalist>

                <Modal open={newTicketOpen} onClose={() => setNewTicketOpen(false)} title="Novi prijem" width={560}>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button type="button" onClick={() => setNewTicketForm((p) => ({ ...p, transactionType: 'IN' }))} style={{ padding: '14px', border: '1px solid #94a3b8', background: newTicketForm.transactionType === 'IN' ? '#dbeafe' : '#fff', fontWeight: 800 }}>ULAZ</button>
                            <button type="button" onClick={() => setNewTicketForm((p) => ({ ...p, transactionType: 'OUT' }))} style={{ padding: '14px', border: '1px solid #94a3b8', background: newTicketForm.transactionType === 'OUT' ? '#dbeafe' : '#fff', fontWeight: 800 }}>IZLAZ</button>
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700 }}>Materijal *</label>
                            <button type="button" onClick={() => { setMaterialPickerTarget('newTicket'); setMaterialPickerOpen(true); }} style={{ width: '100%', marginTop: '4px', padding: '10px', textAlign: 'left', border: '1px solid var(--border-color)', background: '#fff' }}>
                                {selectedMaterial ? formatPickedMaterial(selectedMaterial) : 'Odaberi materijal'}
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Tablice (opciono)</label><input list="gate-known-plates" value={newTicketForm.plate} onChange={(e) => setNewTicketForm((p) => ({ ...p, plate: e.target.value }))} style={{ width: '100%', marginTop: '4px', padding: '8px' }} /></div>
                            <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Vozač (opciono)</label><input list="gate-known-drivers" value={newTicketForm.driver} onChange={(e) => setNewTicketForm((p) => ({ ...p, driver: e.target.value }))} style={{ width: '100%', marginTop: '4px', padding: '8px' }} /></div>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'grid', gap: '8px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Dodatno (opciono)</div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700 }}>Najava</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px', marginTop: '4px' }}>
                                    <input
                                        list="gate-announcement-options"
                                        value={selectedAnnouncementQuery}
                                        placeholder="- Bez najave -"
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setSelectedAnnouncementQuery(value);
                                            setSelectedAnnouncementId(resolveLookupId(value, announcementLookupOptions) || '');
                                        }}
                                        style={{ width: '100%', padding: '8px' }}
                                    />
                                    <button type="button" className="btn-primary" style={{ padding: '8px 10px', fontSize: '11px' }} onClick={openCreateAnnouncementModal}>
                                        + Nova najava
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700 }}>Komitent</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px', marginTop: '4px' }}>
                                    <input
                                        list="gate-supplier-options"
                                        value={newSupplierQuery}
                                        placeholder="- Nije odabrano -"
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setNewSupplierQuery(value);
                                            const resolved = resolveLookupId(value, supplierLookupOptions);
                                            setNewTicketForm((prev) => ({ ...prev, supplierId: resolved || '' }));
                                        }}
                                        style={{ width: '100%', padding: '8px' }}
                                    />
                                    <button type="button" className="btn-primary" style={{ padding: '8px 10px', fontSize: '11px' }} onClick={() => openCreatePartnerModal('newTicket')}>
                                        + Novi komitent
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                        <button onClick={() => setNewTicketOpen(false)} style={{ padding: '8px 16px', border: '1px solid var(--border-color)', background: '#fff' }}>Odustani</button>
                        <button className="btn-primary" style={{ padding: '8px 16px' }} onClick={handleCreateTicket}>Kreiraj prijem</button>
                    </div>
                </Modal>

                <Modal open={completeOpen} onClose={() => setCompleteOpen(false)} title="Zatvori vaganje" width={560}>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Vozač za štampu (opciono)</label><input list="gate-known-drivers" value={closeDriverName} onChange={(e) => setCloseDriverName(e.target.value)} style={{ width: '100%', marginTop: '4px', padding: '8px' }} /></div>
                        {activeTicket?.type === 'OUT' && (
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700 }}>Materijal za sljedeće OUT vaganje</label>
                                <select value={nextOutboundMaterialId} onChange={(e) => setNextOutboundMaterialId(e.target.value)} style={{ width: '100%', marginTop: '4px', padding: '8px' }}>
                                    <option value="">- Materijal -</option>
                                    {materials.map((m) => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                        <button onClick={() => setCompleteOpen(false)} style={{ padding: '8px 16px', border: '1px solid var(--border-color)', background: '#fff' }}>Odustani</button>
                        {activeTicket?.type === 'OUT' && (
                            <button className="btn-primary" disabled={closeSubmitting} style={{ padding: '8px 16px', background: '#1d4ed8', opacity: closeSubmitting ? 0.7 : 1, cursor: closeSubmitting ? 'not-allowed' : 'pointer' }} onClick={() => handleCloseTicket({ continueOutbound: true })}>
                                {closeSubmitting ? 'Obrada...' : 'Zatvori & novo vaganje'}
                            </button>
                        )}
                        <button className="btn-primary" disabled={closeSubmitting} style={{ padding: '8px 16px', opacity: closeSubmitting ? 0.7 : 1, cursor: closeSubmitting ? 'not-allowed' : 'pointer' }} onClick={() => handleCloseTicket()}>{closeSubmitting ? 'Obrada...' : 'Zatvori & štampaj'}</button>
                    </div>
                </Modal>

                <MaterialPicker
                    open={materialPickerOpen}
                    onClose={() => setMaterialPickerOpen(false)}
                    onSelect={({ material }) => {
                        if (materialPickerTarget === 'ticketDetails') {
                            const backendMaterial = resolveBackendMaterial(materials, material);
                            setTicketDraft((prev) => ({ ...prev, materialId: backendMaterial?.id || material?.id || '' }));
                        } else {
                            setSelectedMaterial(material);
                        }
                    }}
                    onMaterialCreated={() => refreshMaterials().catch(() => null)}
                />
                <Modal open={createAnnouncementOpen} onClose={() => setCreateAnnouncementOpen(false)} title="Nova najava / narudžba" width={560}>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700 }}>Materijal</label>
                            <div style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--border-color)', background: '#f8fafc' }}>
                                {selectedMaterial ? formatPickedMaterial(selectedMaterial) : '-'}
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700 }}>Komitent *</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px', marginTop: '4px' }}>
                                <input
                                    list="gate-supplier-options"
                                    value={newAnnouncementSupplierQuery}
                                    placeholder="Odaberi ili upiši komitenta"
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        setNewAnnouncementSupplierQuery(value);
                                        const resolved = resolveLookupId(value, supplierLookupOptions);
                                        setNewAnnouncementForm((prev) => ({ ...prev, supplierId: resolved || '' }));
                                    }}
                                    style={{ width: '100%', padding: '8px' }}
                                />
                                <button type="button" className="btn-primary" style={{ padding: '8px 10px', fontSize: '11px' }} onClick={() => openCreatePartnerModal('newAnnouncement')}>
                                    + Novi komitent
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700 }}>Planirano KG *</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={newAnnouncementForm.expectedKg}
                                    onChange={(event) => setNewAnnouncementForm((prev) => ({ ...prev, expectedKg: event.target.value }))}
                                    style={{ width: '100%', marginTop: '4px', padding: '8px' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700 }}>Tablice (opciono)</label>
                                <input
                                    list="gate-known-plates"
                                    value={newAnnouncementForm.truck}
                                    onChange={(event) => setNewAnnouncementForm((prev) => ({ ...prev, truck: event.target.value }))}
                                    style={{ width: '100%', marginTop: '4px', padding: '8px' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700 }}>Datum najave</label>
                                <input
                                    type="date"
                                    value={newAnnouncementForm.expectedDate}
                                    onChange={(event) => setNewAnnouncementForm((prev) => ({ ...prev, expectedDate: event.target.value }))}
                                    style={{ width: '100%', marginTop: '4px', padding: '8px' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700 }}>Status</label>
                                <input
                                    type="text"
                                    value={newAnnouncementForm.status}
                                    onChange={(event) => setNewAnnouncementForm((prev) => ({ ...prev, status: event.target.value }))}
                                    style={{ width: '100%', marginTop: '4px', padding: '8px' }}
                                />
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button onClick={() => setCreateAnnouncementOpen(false)} style={{ padding: '8px 16px', border: '1px solid var(--border-color)', background: '#fff' }}>Odustani</button>
                        <button className="btn-primary" style={{ padding: '8px 16px' }} onClick={handleCreateAnnouncement}>Sačuvaj najavu</button>
                    </div>
                </Modal>
                <Modal open={createPartnerOpen} onClose={() => setCreatePartnerOpen(false)} title="Novi komitent / partner" width={520}>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700 }}>Naziv komitenta *</label>
                            <input
                                type="text"
                                style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                                value={newPartnerForm.name}
                                onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, name: event.target.value }))}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700 }}>Grad</label>
                                <input
                                    type="text"
                                    style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                                    value={newPartnerForm.city}
                                    onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, city: event.target.value }))}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700 }}>JIB</label>
                                <input
                                    type="text"
                                    style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                                    value={newPartnerForm.jib}
                                    onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, jib: event.target.value }))}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700 }}>Telefon</label>
                                <input
                                    type="text"
                                    style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                                    value={newPartnerForm.phone}
                                    onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, phone: event.target.value }))}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700 }}>Email</label>
                                <input
                                    type="email"
                                    style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                                    value={newPartnerForm.email}
                                    onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, email: event.target.value }))}
                                />
                            </div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                            <input
                                type="checkbox"
                                checked={newPartnerForm.createCustomerMirror}
                                onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, createCustomerMirror: event.target.checked }))}
                            />
                            Kreiraj i kao kupca (isti partner za ulaz i izlaz)
                        </label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button onClick={() => setCreatePartnerOpen(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                        <button className="btn-primary" style={{ padding: '8px 20px' }} onClick={handleCreatePartner}>SAČUVAJ KOMITENTA</button>
                    </div>
                </Modal>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', gap: '12px', height: '100%', flexDirection: isCompact ? 'column' : 'row' }}>
            {/* Left: Active Tickets List */}
            <div className="scada-panel" style={{ flex: isCompact ? '0 0 auto' : '0 0 400px', display: 'flex', flexDirection: 'column', minHeight: isCompact ? 220 : 'auto' }}>
                <div className="scada-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>AKTIVNI TIKETI</span>
                    <button onClick={() => setNewTicketOpen(true)} style={{ background: '#10b981', border: 'none', color: 'white', padding: '2px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>+ NOVI TIKET</button>
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {tickets.map(t => (
                        <div key={t.id} onClick={() => setSelectedTicketId(t.id)} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '12px', background: selectedTicketId === t.id ? '#eff6ff' : 'transparent' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span className="font-mono" style={{ fontWeight: 700 }}>{t.code || t.id}</span>
                                <span style={{ padding: '2px 6px', fontSize: '10px', fontWeight: 700, background: t.status === 'Zatvoren' ? '#dcfce7' : t.status === 'Čeka 2. Vaganje' ? '#fef3c7' : '#dbeafe', color: t.status === 'Zatvoren' ? '#15803d' : t.status === 'Čeka 2. Vaganje' ? '#b45309' : '#1d4ed8' }}>{t.status || '-'}</span>
                            </div>
                            <div>{t.supplier?.name || '-'} — {t.material?.code || '-'}</div>
                            <div className="font-mono" style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{t.plate} | Bruto: {Number(t.gross || 0).toLocaleString()} KG{t.net ? ` | Neto: ${Number(t.net || 0).toLocaleString()} KG` : ''}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Live Scale + CCTV */}
            <div className="scada-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a', color: '#e2e8f0', minHeight: 0 }}>
                <div className="scada-header" style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>VAGA — LIVE OČITANJE</div>
                <div style={{ padding: isMobile ? '12px' : '24px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                    {/* Scale Readout */}
                    <div style={{ background: '#000', border: '2px solid #334155', padding: '24px', textAlign: 'center' }}>
                        <div style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', textAlign: 'left', marginBottom: '8px' }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', marginRight: '8px' }}></span>
                            {scaleConfig.scaleName} — {scaleConfig.signalSource} {scaleConfig.mode === 'manual' ? 'MANUAL MODE' : 'SIGNAL MODE'}
                        </div>
                        {scaleConfig.signalSource === 'TCP/IP' && (
                            <div style={{ color: '#94a3b8', fontSize: '10px', textAlign: 'left', marginBottom: '6px' }}>
                                TCP: {scaleConfig.tcpHost || '-'}:{scaleConfig.tcpPort || '-'}
                            </div>
                        )}
                        {scaleConfig.signalSource === 'RS232' && (
                            <div style={{ color: '#94a3b8', fontSize: '10px', textAlign: 'left', marginBottom: '6px' }}>
                                RS232: {scaleConfig.rs232Path || '-'} @ {scaleConfig.rs232BaudRate || '-'}
                            </div>
                        )}
                        <div style={{ color: scaleSignal.signalAvailable ? '#10b981' : '#f59e0b', fontSize: '10px', textAlign: 'left', marginBottom: '6px' }}>
                            {scaleSignal.message}
                        </div>
                        <div className="scada-readout" style={{ color: '#10b981', fontSize: isMobile ? '36px' : '64px', fontWeight: 'bold', textShadow: '0 0 10px rgba(16,185,129,0.5)' }}>
                            {weightText}
                        </div>
                    </div>
                    {canManualEntry && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'end' }}>
                            <div>
                                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                                    Ručni unos očitanja vage ({scaleConfig.unit}){scaleConfig.mode === 'signal' ? ' — fallback bez signala' : ''}
                                </label>
                                <input
                                    type="number"
                                    value={liveWeight}
                                    onChange={(event) => setLiveWeight(Number(event.target.value || 0))}
                                    className="font-mono"
                                    style={{ width: '100%', padding: '8px', background: '#0b1220', color: '#e2e8f0', border: '1px solid #334155' }}
                                />
                            </div>
                            {role === 'owner' && (
                                <Link
                                    href="/gate/configure"
                                    style={{ padding: '8px 12px', fontSize: '11px', textDecoration: 'none', background: '#1e40af', border: '1px solid #3b82f6', color: 'white', fontWeight: 700 }}
                                >
                                    CONFIGURE
                                </Link>
                            )}
                        </div>
                    )}
                    <div style={{ padding: '8px', background: '#fffbeb', border: '1px solid #f59e0b', color: '#92400e', fontSize: '11px' }}>
                        Fleksibilni tok je aktivan: tiket može ostati otvoren bez drugog vaganja. Sistem prikazuje upozorenje dok se ne kompletira.
                    </div>
                    {gateInfo && (
                        <div style={{ padding: '8px', background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', fontSize: '11px' }}>
                            {gateInfo}
                        </div>
                    )}
                    {gateError && (
                        <div style={{ padding: '8px', background: '#fef2f2', border: '1px solid #ef4444', color: '#991b1b', fontSize: '11px' }}>
                            {gateError}
                        </div>
                    )}

                    {/* Process Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr 1fr 1fr', gap: '8px' }}>
                        <button
                            onClick={() => setFirstWeighOpen(true)}
                            disabled={!activeTicket?.id || firstStepDone || isTicketVoidOrCancelled}
                            title={!activeTicket?.id ? 'Odaberi otvoreni tiket' : (firstStepDone ? '1. vaganje je već upisano' : '')}
                            style={{
                                padding: isMobile ? '10px' : '12px',
                                background: firstStepDone ? '#64748b' : '#1e40af',
                                border: '1px solid #3b82f6',
                                color: 'white',
                                fontWeight: 700,
                                cursor: (!activeTicket?.id || firstStepDone || isTicketVoidOrCancelled) ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                                opacity: (!activeTicket?.id || firstStepDone || isTicketVoidOrCancelled) ? 0.7 : 1,
                            }}
                        >
                            ⚖️ 1. VAGANJE ({isOutboundFlow ? 'TARA' : 'BRUTO'})
                        </button>
                        <button onClick={() => setInspectionOpen(true)} style={{ padding: isMobile ? '10px' : '12px', background: '#b45309', border: '1px solid #f59e0b', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}>🔍 INSPEKCIJA</button>
                        <button
                            onClick={() => setSecondWeighOpen(true)}
                            disabled={!activeTicket?.id || !firstStepDone || secondStepDone || isTicketVoidOrCancelled}
                            title={!activeTicket?.id ? 'Odaberi otvoreni tiket' : (!firstStepDone ? 'Prvo uradi 1. vaganje' : (secondStepDone ? '2. vaganje je već upisano' : ''))}
                            style={{
                                padding: isMobile ? '10px' : '12px',
                                background: secondStepDone ? '#64748b' : '#15803d',
                                border: '1px solid #10b981',
                                color: 'white',
                                fontWeight: 700,
                                cursor: (!activeTicket?.id || !firstStepDone || secondStepDone || isTicketVoidOrCancelled) ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                                opacity: (!activeTicket?.id || !firstStepDone || secondStepDone || isTicketVoidOrCancelled) ? 0.7 : 1,
                            }}
                        >
                            ⚖️ 2. VAGANJE ({isOutboundFlow ? 'BRUTO' : 'TARA'})
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr 1fr', gap: '8px' }}>
                        <button onClick={() => setXrfOpen(true)} style={{ padding: '10px', background: '#1e293b', border: '1px solid #475569', color: '#e2e8f0', fontWeight: 600, cursor: 'pointer', fontSize: '11px' }}>📡 ZAHTJEV ZA XRF</button>
                        <button onClick={handleOpenComplete} disabled={closeSubmitting} style={{ padding: '10px', background: '#1e293b', border: '1px solid #475569', color: '#e2e8f0', fontWeight: 600, cursor: 'pointer', fontSize: '11px', opacity: closeSubmitting ? 0.7 : 1 }}>✅ ZATVORI TIKET I ŠTAMPAJ</button>
                    </div>

                    {/* CCTV */}
                    <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr 1fr', gridTemplateRows: isCompact ? 'none' : '1fr 1fr', gap: '8px', flex: 1 }}>
                        {['CAM_FRONT', 'CAM_BACK', 'CAM_LOAD', 'CAM_SCALE'].map(cam => (
                            <div key={cam} style={{ background: '#1e293b', border: '1px solid #334155', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80px' }}>
                                <span style={{ position: 'absolute', top: '4px', left: '4px', background: 'rgba(0,0,0,0.7)', padding: '2px 6px', fontSize: '9px', fontFamily: 'monospace' }}>{cam}</span>
                                <span style={{ color: '#475569', fontSize: '11px' }}>BEZ SIGNALA</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* MODAL: Novi Tiket */}
            <Modal open={newTicketOpen} onClose={() => setNewTicketOpen(false)} title="Novi Vagarski Tiket — Registracija Ulaza">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Registarske Tablice *</label>
                        <div style={{ display: 'flex', marginTop: '4px' }}>
                            <input type="text" className="font-mono" style={{ flex: 1, padding: '6px' }} placeholder="K64-T-882" value={newTicketForm.plate} onChange={(event) => setNewTicketForm((prev) => ({ ...prev, plate: event.target.value }))} />
                            <button style={{ padding: '6px 10px', background: '#64748b', color: 'white', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>ANPR</button>
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>Najava / Narudžba (Opciono)</label>
                        <select
                            style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                            value={selectedAnnouncementId}
                            onChange={(event) => setSelectedAnnouncementId(event.target.value)}
                        >
                            <option value="">- Bez najave -</option>
                            {announcements.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.code || a.id} — {a.material?.code || '-'} — {a.truck || 'bez tablica'}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>
                            {newTicketForm.transactionType === 'OUT' ? 'Kupac / Partner *' : 'Dobavljač / Partner *'}
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px', marginTop: '4px' }}>
                            <select
                                style={{ width: '100%', padding: '6px' }}
                                value={newTicketForm.supplierId}
                                onChange={(event) => setNewTicketForm((prev) => ({ ...prev, supplierId: event.target.value }))}
                            >
                                <option value="">- Odaberi firmu -</option>
                                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <button
                                type="button"
                                className="btn-primary"
                                style={{ padding: '6px 10px', fontSize: '11px' }}
                                onClick={() => setCreatePartnerOpen(true)}
                            >
                                + Nova firma
                            </button>
                        </div>
                    </div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Tip Transakcije *</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={newTicketForm.transactionType} onChange={(event) => setNewTicketForm((prev) => ({ ...prev, transactionType: event.target.value }))}><option value="IN">ULAZ (Prijem Materijala)</option><option value="OUT">IZLAZ (Prodaja)</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Materijal *</label>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                            <button type="button" onClick={() => setMaterialPickerOpen(true)} style={{ flex: 1, padding: '6px', textAlign: 'left', border: '1px solid var(--border-color)', background: selectedMaterial ? '#f8fafc' : '#fff', cursor: 'pointer' }}>
                                {selectedMaterial ? formatPickedMaterial(selectedMaterial) : 'Odaberi materijal...'}
                            </button>
                            <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setMaterialPickerOpen(true)}>Pretraži</button>
                        </div>
                    </div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Varijanta / Kvalitet</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>Auto prema inspekciji</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Ugovor</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={newTicketForm.contractId} onChange={(event) => setNewTicketForm((prev) => ({ ...prev, contractId: event.target.value }))}><option value="">- Spot (Bez Ugovora) -</option>{contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.code || contract.id}</option>)}</select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Vozač / Kontakt</label><input type="text" style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={newTicketForm.driver} onChange={(event) => setNewTicketForm((prev) => ({ ...prev, driver: event.target.value }))} /></div>
                </div>
                <div style={{ marginTop: '12px', padding: '8px', background: '#eef2ff', border: '1px solid var(--primary-color)', fontSize: '11px' }}>
                    ℹ️ Kamion će biti upućen na vagu za PRVO VAGANJE ({newTicketForm.transactionType === 'OUT' ? 'Tara' : 'Bruto'}).
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <button onClick={() => setNewTicketOpen(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                    <button className="btn-primary" style={{ padding: '8px 20px' }} onClick={handleCreateTicket}>REGISTRUJ & POŠALJI NA VAGU →</button>
                </div>
            </Modal>

            <MaterialPicker open={materialPickerOpen} onClose={() => setMaterialPickerOpen(false)} onSelect={({ material }) => setSelectedMaterial(material)} />
            <MaterialPicker open={inspectionMaterialPickerOpen} onClose={() => setInspectionMaterialPickerOpen(false)} onSelect={({ material }) => setInspectionMaterial(material)} />
            <Modal open={createPartnerOpen} onClose={() => setCreatePartnerOpen(false)} title="Nova firma / partner" width={520}>
                <div style={{ display: 'grid', gap: '10px' }}>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>Naziv firme *</label>
                        <input
                            type="text"
                            style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                            value={newPartnerForm.name}
                            onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, name: event.target.value }))}
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700 }}>Grad</label>
                            <input
                                type="text"
                                style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                                value={newPartnerForm.city}
                                onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, city: event.target.value }))}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700 }}>JIB</label>
                            <input
                                type="text"
                                style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                                value={newPartnerForm.jib}
                                onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, jib: event.target.value }))}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700 }}>Telefon</label>
                            <input
                                type="text"
                                style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                                value={newPartnerForm.phone}
                                onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, phone: event.target.value }))}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700 }}>Email</label>
                            <input
                                type="email"
                                style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                                value={newPartnerForm.email}
                                onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, email: event.target.value }))}
                            />
                        </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                        <input
                            type="checkbox"
                            checked={newPartnerForm.createCustomerMirror}
                            onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, createCustomerMirror: event.target.checked }))}
                        />
                        Kreiraj i kao kupca (isti partner za ulaz i izlaz)
                    </label>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <button onClick={() => setCreatePartnerOpen(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                    <button className="btn-primary" style={{ padding: '8px 20px' }} onClick={handleCreatePartner}>SAČUVAJ FIRMU</button>
                </div>
            </Modal>

            {/* MODAL: 1. Vaganje */}
            <Modal open={firstWeighOpen} onClose={() => setFirstWeighOpen(false)} title={`1. Vaganje — ${isOutboundFlow ? 'Tara Masa' : 'Bruto Masa'}`} width={550}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>Tiket:</span> <span className="font-mono" style={{ fontWeight: 700 }}>{activeTicket?.code || '-'}</span></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Tablice:</span> <span className="font-mono" style={{ fontWeight: 700 }}>{activeTicket?.plate || '-'}</span></div>
                    </div>
                    <div style={{ background: '#000', padding: '20px', textAlign: 'center', border: '2px solid #334155' }}>
                        <div style={{ color: '#10b981', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', marginBottom: '8px' }}>VAGA LIVE — STABILNO</div>
                        <div className="scada-readout" style={{ color: '#10b981', fontSize: '48px', fontWeight: 'bold' }}>{weightText}</div>
                    </div>
                    <div style={{ padding: '8px', background: '#fffbeb', border: '1px solid #f59e0b', fontSize: '12px' }}>⚠️ Provjerite da je kamion potpuno na platformi vage i da je vaga STABILNA prije odobravanja.</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <button onClick={() => setFirstWeighOpen(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                    <button className="btn-primary" style={{ padding: '8px 20px', background: '#1e40af' }} onClick={handleFirstWeigh}>
                        {isOutboundFlow ? `ODOBRI TARU: ${weightText} ✓` : `ODOBRI BRUTO: ${weightText} ✓`}
                    </button>
                </div>
            </Modal>

            {/* MODAL: Inspekcija */}
            <Modal open={inspectionOpen} onClose={() => setInspectionOpen(false)} title="Inspekcija Materijala" width={600}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '12px' }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>Tiket:</span> <span className="font-mono" style={{ fontWeight: 700 }}>{activeTicket?.code || '-'}</span></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Deklarirano:</span> <span style={{ fontWeight: 600 }}>{activeTicket?.material?.code || '-'}</span></div>
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>Kontrolor *</label>
                        <select
                            style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                            value={inspectionWorkerId}
                            onChange={(event) => setInspectionWorkerId(event.target.value)}
                        >
                            {inspectionWorkers.length === 0 && <option value="">Nema definisanih kontrolora</option>}
                            {inspectionWorkers.map((worker) => (
                                <option key={worker.id} value={worker.id}>
                                    {worker.name} ({worker.code})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Stvarni Materijal (Reklasifikacija)</label>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                            <button type="button" onClick={() => setInspectionMaterialPickerOpen(true)} style={{ flex: 1, padding: '6px', textAlign: 'left', border: '1px solid var(--border-color)', background: inspectionMaterial ? '#f8fafc' : '#fff', cursor: 'pointer' }}>
                                {inspectionMaterial ? formatPickedMaterial(inspectionMaterial) : 'FE-E1 — BEZ PROMJENE'}
                            </button>
                            <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setInspectionMaterialPickerOpen(true)}>Pretraži</button>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Potreban XRF?</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>Ne</option><option>Da — Zakaži Analizu</option></select></div>
                        <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Fotografije Materijala</label><button style={{ display: 'block', width: '100%', padding: '6px', marginTop: '4px', border: '1px dashed var(--border-color)', background: '#f8fafc', cursor: 'pointer' }}>📷 Dodaj Sliku</button></div>
                    </div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Napomena Kontrolora</label><textarea style={{ width: '100%', padding: '6px', marginTop: '4px', resize: 'vertical', minHeight: '50px' }} placeholder="Slobodan tekst..."></textarea></div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <button onClick={() => setInspectionOpen(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                    <button className="btn-primary" style={{ padding: '8px 20px', background: '#b45309' }} onClick={handleInspection}>POTVRDI INSPEKCIJU</button>
                </div>
            </Modal>

            {/* MODAL: XRF Zahtjev */}
            <Modal open={xrfOpen} onClose={() => setXrfOpen(false)} title="Zahtjev za XRF Hemijsku Analizu" width={500}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Tiket *</label><select className="font-mono" style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={activeTicket?.id || ''} disabled><option value={activeTicket?.id || ''}>{activeTicket?.code || '-'}</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Razlog XRF Analize</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>Rutinska provjera</option><option>Sumnja na reklasifikaciju</option><option>Zahtjev kupca</option><option>Obojeni metal — obavezno</option></select></div>
                    <div><label style={{ fontSize: '11px', fontWeight: 700 }}>Prioritet</label><select style={{ width: '100%', padding: '6px', marginTop: '4px' }}><option>Normalan</option><option>Hitno (Kamion čeka)</option></select></div>
                    <div style={{ padding: '8px', background: '#eef2ff', border: '1px solid var(--primary-color)', fontSize: '11px' }}>
                        📡 Zahtjev će biti poslan kontroloru sa XRF pištoljem. Rezultate ručno unosi u /yard/xrf ekran.
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <button onClick={() => setXrfOpen(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                    <button className="btn-primary" style={{ padding: '8px 20px' }}>POŠALJI ZAHTJEV</button>
                </div>
            </Modal>

            {/* MODAL: 2. Vaganje */}
            <Modal open={secondWeighOpen} onClose={() => setSecondWeighOpen(false)} title={`2. Vaganje — ${isOutboundFlow ? 'Bruto Masa' : 'Tara Masa'}`} width={620}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>Tiket:</span> <span className="font-mono" style={{ fontWeight: 700 }}>{activeTicket?.code || '-'}</span></div>
                        <div>
                            <span style={{ color: 'var(--text-muted)' }}>{isOutboundFlow ? 'Tara (1. vag.):' : 'Bruto (1. vag.):'}</span>{' '}
                            <span className="font-mono" style={{ fontWeight: 700 }}>
                                {Math.round((isOutboundFlow ? activeTicket?.tare : activeTicket?.gross) || 0).toLocaleString()} {scaleConfig.unit}
                            </span>
                        </div>
                    </div>
                    <div style={{ background: '#000', padding: '20px', textAlign: 'center', border: '2px solid #334155' }}>
                        <div style={{ color: '#10b981', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', marginBottom: '8px' }}>VAGA LIVE — STABILNO</div>
                        <div className="scada-readout" style={{ color: '#10b981', fontSize: '48px', fontWeight: 'bold' }}>{tareWeightText}</div>
                    </div>
                    {isTareFallback && (
                        <div style={{ padding: '8px', background: '#fffbeb', border: '1px solid #f59e0b', fontSize: '11px', color: '#92400e' }}>
                            Live signal nije dostupan, korišten je zadnji poznati tare podatak sa tiketa.
                        </div>
                    )}
                    <div style={{ background: '#f8fafc', padding: '12px', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                        <div><div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>BRUTO</div><div className="font-mono" style={{ fontWeight: 700 }}>{Math.round((isOutboundFlow ? Number(liveWeight || 0) : Number(activeTicket?.gross || 0))).toLocaleString()}</div></div>
                        <div><div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>TARA</div><div className="font-mono" style={{ fontWeight: 700 }}>{Math.round((isOutboundFlow ? Number(activeTicket?.tare || 0) : Number(tareWeight || 0))).toLocaleString()}</div></div>
                        <div><div style={{ fontSize: '10px', color: '#b45309' }}>AMBALAŽA ODBITAK</div><div className="font-mono" style={{ fontWeight: 700, color: '#b45309' }}>{Number(totalPackagingKg || 0).toLocaleString()} KG</div></div>
                        <div style={{ background: '#eef2ff', padding: '4px' }}><div style={{ fontSize: '10px', color: 'var(--primary-color)' }}>NETO (PREVIEW)</div><div className="font-mono" style={{ fontWeight: 700, fontSize: '16px', color: 'var(--primary-color)' }}>{Math.max(0, (isOutboundFlow ? Number(liveWeight || 0) : Number(activeTicket?.gross || 0)) - (isOutboundFlow ? Number(activeTicket?.tare || 0) : Number(tareWeight || 0)) - Number(totalPackagingKg || 0)).toLocaleString()}</div></div>
                    </div>
                    <div style={{ background: '#fff', padding: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '8px' }}>Skidanje ambalaže (ručno)</div>
                        <div style={{ display: 'grid', gap: '6px' }}>
                            {packagingRows.map((row) => (
                                <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: '6px' }}>
                                    <input
                                        type="text"
                                        placeholder="Vrsta ambalaže (npr. 3x palete)"
                                        value={row.type}
                                        onChange={(event) => updatePackagingRow(row.id, 'type', event.target.value)}
                                        style={{ padding: '6px' }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="KG"
                                        value={row.kg}
                                        onChange={(event) => updatePackagingRow(row.id, 'kg', event.target.value)}
                                        style={{ padding: '6px', textAlign: 'right' }}
                                    />
                                    <button type="button" onClick={() => removePackagingRow(row.id)} style={{ padding: '6px 10px', border: '1px solid var(--border-color)', background: '#f8fafc' }}>Ukloni</button>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                            <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={addPackagingRow}>+ Dodaj ambalažu</button>
                            <div className="font-mono" style={{ fontSize: '12px', fontWeight: 700 }}>Ukupno odbitak: {Number(totalPackagingKg || 0).toLocaleString()} KG</div>
                        </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                        <div><div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CIJENA/KG</div><div className="font-mono" style={{ fontWeight: 700 }}>0.30 BAM</div></div>
                        <div style={{ textAlign: 'right' }}><div style={{ fontSize: '10px', color: 'var(--danger-color)' }}>ZA ISPLATU</div><div className="font-mono" style={{ fontWeight: 700, fontSize: '20px', color: 'var(--danger-color)' }}>3,644.55 BAM</div></div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <button onClick={() => setSecondWeighOpen(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                    <button className="btn-primary" style={{ padding: '8px 20px', background: '#15803d' }} onClick={handleSecondWeigh}>
                        {isOutboundFlow ? 'POTVRDI BRUTO & ZAVRŠI VAGANJE ✓' : 'POTVRDI TARU & ZAVRŠI VAGANJE ✓'}
                    </button>
                </div>
            </Modal>

            {/* MODAL: Zatvori Tiket */}
            <Modal open={completeOpen} onClose={() => setCompleteOpen(false)} title="Zatvori Tiket & Štampaj" width={500}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activeTicket?.type === 'OUT' && (
                        <div style={{ padding: '8px', background: '#fff7ed', border: '1px solid #fdba74', fontSize: '12px', color: '#9a3412' }}>
                            IZLAZ tiket: zatvaranje će umanjiti stanje robe za neto količinu.
                        </div>
                    )}
                    {activeTicket?.type === 'OUT' && (
                        <div style={{ padding: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', display: 'grid', gap: '8px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700 }}>Nakon zatvaranja otvori novo vaganje</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600 }}>Materijal za sljedeće vaganje</label>
                                <select
                                    value={nextOutboundMaterialId}
                                    onChange={(event) => setNextOutboundMaterialId(event.target.value)}
                                    style={{ padding: '6px' }}
                                >
                                    <option value="">- Materijal -</option>
                                    {materials.map((material) => (
                                        <option key={material.id} value={material.id}>
                                            {material.code} - {material.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="font-mono" style={{ fontSize: '12px', color: '#475569' }}>
                                Nova OUT stavka će početi sa TAROM = trenutni BRUTO ovog tiketa.
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>Tiket:</span> <span className="font-mono" style={{ fontWeight: 700 }}>{activeTicket?.code || '-'}</span></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Dobavljač:</span> <span style={{ fontWeight: 600 }}>{activeTicket?.supplier?.name || '-'}</span></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Materijal:</span> <span style={{ fontWeight: 600 }}>{activeTicket?.material?.code || '-'}</span></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Neto:</span> <span className="font-mono" style={{ fontWeight: 700 }}>{Number(activeTicket?.net || 0).toLocaleString()} KG</span></div>
                    </div>
                <div style={{ fontSize: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700 }}>Vozač (za štampu)</label>
                    <input
                        type="text"
                        style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                        value={closeDriverName}
                        onChange={(event) => setCloseDriverName(event.target.value)}
                        placeholder="Unesi ime vozača"
                    />
                    </div>
                    {activeTicket?.type !== 'OUT' && (
                        <div style={{ fontSize: '12px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 700 }}>LOT Dodjela (Skladište)</label>
                            <select style={{ width: '100%', padding: '6px', marginTop: '4px' }} value={closeLocation} onChange={(event) => setCloseLocation(event.target.value)}><option>Otvoreni lager C</option><option>Hala 1 - Sektor A</option><option>Hala 2 - Sektor D</option></select>
                        </div>
                    )}
                    <div style={{ fontSize: '12px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>Inspektor</label>
                        <select
                            style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                            value={inspectionWorkerId}
                            onChange={(event) => setInspectionWorkerId(event.target.value)}
                        >
                            {inspectionWorkers.length === 0 && <option value="">Nema definisanih kontrolora</option>}
                            {inspectionWorkers.map((worker) => (
                                <option key={worker.id} value={worker.id}>
                                    {worker.name} ({worker.code})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>Štampaj Dokument</label>
                        <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={printWeighSlip}
                                    onChange={(event) => setPrintWeighSlip(event.target.checked)}
                                /> Prijemni List (Vagarski Tiket)
                            </label>
                            <label><input type="checkbox" defaultChecked /> Otkupni Blok / Samofaktura</label>
                            <label><input type="checkbox" /> Potvrda o Preuzimanju Otpada</label>
                        </div>
                    </div>
                    <div style={{ padding: '8px', background: '#dcfce7', border: '1px solid #10b981', fontSize: '12px', fontWeight: 600, color: '#15803d' }}>
                        {activeTicket?.type === 'OUT'
                            ? '✓ Sve provjere OK. Stanje robe će biti automatski umanjeno. Kamion se može pustiti.'
                            : '✓ Sve provjere OK. LOT će biti automatski kreiran. Kamion se može pustiti.'}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <button onClick={() => setCompleteOpen(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ODUSTANI</button>
                    {activeTicket?.type === 'OUT' && (
                        <button className="btn-primary" disabled={closeSubmitting} style={{ padding: '8px 20px', background: '#1d4ed8', opacity: closeSubmitting ? 0.7 : 1, cursor: closeSubmitting ? 'not-allowed' : 'pointer' }} onClick={() => handleCloseTicket({ continueOutbound: true })}>
                            {closeSubmitting ? 'OBRADA...' : '✅ ZATVORI & NOVO VAGANJE'}
                        </button>
                    )}
                    <button className="btn-primary" disabled={closeSubmitting} style={{ padding: '8px 20px', opacity: closeSubmitting ? 0.7 : 1, cursor: closeSubmitting ? 'not-allowed' : 'pointer' }} onClick={() => handleCloseTicket()}>{closeSubmitting ? 'OBRADA...' : '🖨️ ZATVORI & ODKUCAJ'}</button>
                </div>
            </Modal>
        </div>
    );
}
