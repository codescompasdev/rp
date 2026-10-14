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

const fmtKg = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

function contractPartnerName(contract) {
    if (!contract) return '';
    return (contract.direction === 'SELL' ? contract.customer?.name : contract.supplier?.name) || '';
}

function contractLabel(contract) {
    const dir = contract.direction === 'SELL' ? 'Prodaja' : 'Nabavka';
    return `${contract.code} — ${contractPartnerName(contract) || '-'} — ${dir}`;
}

/* ---------- Zajednički stilovi (veći font, lakše za čitanje) ---------- */
const FS = {
    label: '14px',
    input: '15px',
    body: '15px',
    small: '13px',
    button: '15px',
    header: '20px',
    bigNumber: '58px',
    neto: '30px',
};

const styles = {
    label: { fontSize: FS.label, fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' },
    input: {
        width: '100%', padding: '10px 12px', fontSize: FS.input,
        border: '1px solid #94a3b8', borderRadius: '6px', background: '#fff',
    },
    btn: {
        padding: '12px 18px', fontSize: FS.button, fontWeight: 700, borderRadius: '6px',
        border: '1px solid #94a3b8', background: '#fff', cursor: 'pointer',
    },
    btnPrimary: {
        padding: '12px 18px', fontSize: FS.button, fontWeight: 700, borderRadius: '6px',
        border: 'none', background: '#1d4ed8', color: '#fff', cursor: 'pointer',
    },
    btnGreen: {
        padding: '14px 20px', fontSize: '17px', fontWeight: 800, borderRadius: '6px',
        border: 'none', background: '#15803d', color: '#fff', cursor: 'pointer',
    },
    btnDanger: {
        padding: '10px 16px', fontSize: FS.button, fontWeight: 700, borderRadius: '6px',
        border: 'none', background: '#b91c1c', color: '#fff', cursor: 'pointer',
    },
    btnAmber: {
        padding: '10px 16px', fontSize: FS.button, fontWeight: 700, borderRadius: '6px',
        border: 'none', background: '#b45309', color: '#fff', cursor: 'pointer',
    },
};

/* ---------- Prikaz stanja narudžbe (koliko je ostalo primiti / isporučiti) ---------- */
function ContractInfo({ contract, materialId, netKg = 0 }) {
    if (!contract) return null;
    const items = contract.items || [];
    const isTotal = contract.qtyMode === 'TOTAL';
    const isSell = contract.direction === 'SELL';
    const tol = Number(contract.tolerance || 0);

    const cur = items.find((i) => i.materialId === materialId);
    const curPlanned = cur && cur.qtyKg !== null && cur.qtyKg !== undefined ? Number(cur.qtyKg) : null;
    const curRemaining = curPlanned !== null ? curPlanned - Number(cur.doneKg || 0) : null;

    const totalPlanned = isTotal ? Number(contract.totalQtyKg || 0) : null;
    const totalRemaining = isTotal ? totalPlanned - Number(contract.doneKg || 0) : null;

    const limitPlanned = isTotal ? totalPlanned : curPlanned;
    const limitRemaining = isTotal ? totalRemaining : curRemaining;
    const allowed = limitPlanned !== null && limitRemaining !== null ? limitRemaining + (limitPlanned * tol) / 100 : null;
    const over = allowed !== null && Number(netKg) > allowed;
    const verb = isSell ? 'za isporučiti' : 'za primiti';

    return (
        <div style={{ background: '#1e293b', border: `1px solid ${over ? '#f59e0b' : '#334155'}`, borderRadius: '8px', padding: '12px 16px', fontSize: FS.small }}>
            <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: FS.body, marginBottom: '6px' }}>
                Narudžba {contract.code} — {isSell ? 'PRODAJA' : 'NABAVKA'} — {contractPartnerName(contract) || '-'}
            </div>
            {isTotal ? (
                <div style={{ color: '#cbd5e1' }}>
                    Ukupno: <b>{fmtKg(totalPlanned)} kg</b> · Ispunjeno: <b>{fmtKg(contract.doneKg)} kg</b> ·{' '}
                    <b style={{ color: '#10b981' }}>Preostalo {verb}: {fmtKg(Math.max(0, totalRemaining))} kg</b>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '2px', color: '#cbd5e1' }}>
                    {items.map((i) => {
                        const rem = i.qtyKg !== null && i.qtyKg !== undefined ? Number(i.qtyKg) - Number(i.doneKg || 0) : null;
                        const active = i.materialId === materialId;
                        return (
                            <div key={i.id} style={{ fontWeight: active ? 800 : 400, color: active ? '#fff' : '#cbd5e1' }}>
                                {active ? '▶ ' : ''}{i.material?.code || '-'} — {i.material?.name || ''}: {fmtKg(i.doneKg)} / {fmtKg(i.qtyKg)} kg
                                {rem !== null && <span style={{ color: '#10b981' }}> (preostalo {fmtKg(Math.max(0, rem))} kg)</span>}
                            </div>
                        );
                    })}
                </div>
            )}
            {tol > 0 && <div style={{ color: '#94a3b8', marginTop: '4px' }}>Tolerancija: {tol}%</div>}
            {over && (
                <div style={{ marginTop: '6px', color: '#fde68a', fontWeight: 700 }}>
                    Upozorenje: neto ({fmtKg(netKg)} kg) prelazi preostalu količinu uz toleranciju ({fmtKg(allowed)} kg).
                </div>
            )}
            {!isTotal && !cur && materialId && (
                <div style={{ marginTop: '6px', color: '#fde68a', fontWeight: 700 }}>
                    Odabrani materijal nije na ovoj narudžbi.
                </div>
            )}
        </div>
    );
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

    // 'ticket' = gledamo/radimo na postojećem vaganju, 'new' = pravimo novo
    const [panelMode, setPanelMode] = useState('ticket');
    const [listModalOpen, setListModalOpen] = useState(false);

    const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
    const [materialPickerTarget, setMaterialPickerTarget] = useState('newTicket');
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [createPartnerOpen, setCreatePartnerOpen] = useState(false);
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
    const [ticketDraft, setTicketDraft] = useState({ plate: '', driver: '', pricePerKg: '', supplierId: '', materialId: '', contractId: '', gross: '', tare: '' });
    const [partnerCreateTarget, setPartnerCreateTarget] = useState('newTicket');
    const [gateError, setGateError] = useState('');
    const [gateInfo, setGateInfo] = useState('');
    const [manualWeightOverride, setManualWeightOverride] = useState(false);
    const [packagingOpen, setPackagingOpen] = useState(false);
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
        return ticketData;
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

    const refreshContracts = async () => {
        const res = await api.get('/sourcing/contracts');
        setContracts(normalizeApiList(res));
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
                contractId: newTicketForm.contractId || undefined,
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
        const orderCode = contracts.find((c) => c.id === ticket.contractId)?.code || '-';
        const transactionType = ticket.type === 'OUT' ? 'PRODAJA / IZLAZ' : 'OTKUP / ULAZ';
        const now = new Date();
        const vagarName = authUser?.name || inspectorName || '-';
        const measureDate = new Date(ticket.updatedAt || ticket.date || now);
        const formatKg = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
        const printWindow = targetWindow || window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;

        const sheet = (copyLabel) => `
                <div class="sheet">
                <div class="company">MILKUS d.o.o.</div>
                <div class="address">Ljubogosta b.b. ${htmlEscape(authUser?.company?.name || 'PALE')}</div>
                <div class="top-row">
                  <div>Vagarski list br: ${htmlEscape(ticket.code || '-')}</div>
                  <div class="copy-chip">${htmlEscape(copyLabel)}</div>
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
                    <div style="font-size: 11px; margin-top: 14px; color:#555;">Tip: ${htmlEscape(transactionType)} | Najava: ${htmlEscape(announcementCode)} | Narudžba: ${htmlEscape(orderCode)}</div>
                  </div>
                </div>
                <div class="notes"><span class="label">Ambalaža/Odbitak:</span> ${htmlEscape(packagingPrintText)}</div>
                <div class="bottom">
                  <div><span class="label">Vagar:</span> <span class="signature">${htmlEscape(vagarName)}</span></div>
                  <div><span class="label">Primio/Predao:</span> <span class="signature">${htmlEscape(inspectorName)}</span></div>
                </div>
                <div class="foot-time">${htmlEscape(now.toLocaleDateString())} ${htmlEscape(now.toLocaleTimeString())}</div>
                </div>`;

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
                ${sheet('PRIMJERAK 1 / KOMITENT')}
                ${sheet('PRIMJERAK 2 / ARHIVA')}
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
        refreshContracts().catch(() => setContracts([]));
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
        refreshTickets().then((data) => {
            if (!data.length) setPanelMode('new');
        }).catch(() => setTickets([]));
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
    const activeTicketIndex = useMemo(
        () => tickets.findIndex((ticket) => ticket.id === (activeTicket?.id || selectedTicketId)),
        [tickets, activeTicket, selectedTicketId]
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
    const isNewMode = panelMode === 'new';
    const isOutboundFlow = useMemo(() => {
        if (panelMode === 'new') return newTicketForm.transactionType === 'OUT';
        return activeTicket?.type === 'OUT';
    }, [panelMode, newTicketForm.transactionType, activeTicket]);
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

    /* ---------- Narudžbe: trenutno odabrana, opcije, materijal ---------- */
    const currentSupplierId = isNewMode ? newTicketForm.supplierId : ticketDraft.supplierId;
    const selectedContractId = isNewMode ? newTicketForm.contractId : ticketDraft.contractId;
    const currentMaterialId = isNewMode
        ? (resolveBackendMaterial(materials, selectedMaterial)?.id || selectedMaterial?.id || '')
        : ticketDraft.materialId;
    const selectedContract = useMemo(
        () => contracts.find((c) => c.id === selectedContractId) || null,
        [contracts, selectedContractId]
    );
    const contractOptions = useMemo(() => {
        const wantedDirection = isOutboundFlow ? 'SELL' : 'BUY';
        const open = contracts.filter((c) => (c.direction || 'BUY') === wantedDirection && c.status === 'Aktivan');
        const supplierName = String(suppliers.find((s) => s.id === currentSupplierId)?.name || '').trim().toLowerCase();
        const matches = supplierName
            ? open.filter((c) => contractPartnerName(c).trim().toLowerCase() === supplierName)
            : [];
        const list = matches.length ? matches : open;
        if (selectedContract && !list.some((c) => c.id === selectedContract.id)) {
            return [selectedContract, ...list];
        }
        return list;
    }, [contracts, isOutboundFlow, suppliers, currentSupplierId, selectedContract]);

    const handleContractChange = (contractId) => {
        const contract = contracts.find((c) => c.id === contractId) || null;
        const items = contract?.items || [];
        const singleMaterial = items.length === 1 ? materials.find((m) => m.id === items[0].materialId) : null;
        const partnerName = contractPartnerName(contract).trim().toLowerCase();
        const partnerSupplier = partnerName
            ? suppliers.find((s) => String(s.name || '').trim().toLowerCase() === partnerName)
            : null;
        if (isNewMode) {
            setNewTicketForm((prev) => ({
                ...prev,
                contractId,
                supplierId: partnerSupplier?.id || prev.supplierId,
            }));
            if (singleMaterial) setSelectedMaterial(singleMaterial);
        } else {
            setTicketDraft((prev) => ({
                ...prev,
                contractId,
                supplierId: partnerSupplier?.id || prev.supplierId,
                materialId: singleMaterial?.id || prev.materialId,
            }));
        }
    };

    const handleContractMaterialChange = (materialId) => {
        if (isNewMode) {
            setSelectedMaterial(materials.find((m) => m.id === materialId) || null);
        } else {
            setTicketDraft((prev) => ({ ...prev, materialId }));
        }
    };

    useEffect(() => {
        if (panelMode !== 'ticket' || !activeTicket) return;
        setTicketDraft({
            plate: activeTicket.plate || '',
            driver: activeTicket.driver || '',
            pricePerKg: String(activeTicket.pricePerKg || 0),
            supplierId: activeTicket.supplierId || activeTicket.supplier?.id || '',
            materialId: activeTicket.materialId || activeTicket.material?.id || '',
            contractId: activeTicket.contractId || '',
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
    }, [activeTicket?.id, panelMode]);
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

    /* ---------- Navigacija: prethodno / novo / sljedeće ---------- */
    const startNewTicket = () => {
        setPanelMode('new');
        setSelectedMaterial(null);
        setSelectedAnnouncementId('');
        setNewTicketForm((prev) => ({ ...prev, plate: '', driver: '', contractId: '', transactionType: 'IN' }));
        setGateError('');
        setGateInfo('');
    };

    const goToTicket = (id) => {
        if (!id) return;
        setSelectedTicketId(id);
        setPanelMode('ticket');
        setGateError('');
        setGateInfo('');
    };

    const goPrevTicket = () => {
        if (activeTicketIndex > 0) {
            goToTicket(tickets[activeTicketIndex - 1].id);
        } else if (panelMode === 'new' && tickets.length) {
            goToTicket(tickets[tickets.length - 1].id);
        }
    };
    const goNextTicket = () => {
        if (activeTicketIndex >= 0 && activeTicketIndex < tickets.length - 1) {
            goToTicket(tickets[activeTicketIndex + 1].id);
        }
    };

    const handleCreateTicket = async () => {
        const backendMaterial = resolveBackendMaterial(materials, selectedMaterial);
        try {
            const payload = {
                date: new Date().toISOString(),
                plate: String(newTicketForm.plate || '').trim() || 'N/A',
                driver: newTicketForm.driver || null,
                supplierId: newTicketForm.supplierId || null,
                materialId: backendMaterial?.id || undefined,
                contractId: newTicketForm.contractId || null,
                gross: 0,
                tare: 0,
                kalo: 0,
                net: 0,
                pricePerKg: 0,
                total: 0,
                status: 'Otvoren',
                type: newTicketForm.transactionType,
            };
            const res = await api.post('/gate/tickets', payload);
            const createdTicket = res?.data?.data;
            await refreshTickets();
            setGateError('');
            setGateInfo(backendMaterial?.id
                ? 'Novo vaganje je kreirano.'
                : 'Novo vaganje je kreirano sa privremenim materijalom. Potvrdi tačan materijal prije zatvaranja.');
            setSelectedMaterial(null);
            setSelectedAnnouncementId('');
            setNewTicketForm((prev) => ({ ...prev, plate: '', driver: '', contractId: '' }));
            if (createdTicket?.id) {
                setSelectedTicketId(createdTicket.id);
            }
            setPanelMode('ticket');
        } catch (error) {
            setGateError(error?.response?.data?.error || 'Kreiranje vaganja nije uspjelo. Provjeri podatke i pokušaj ponovo.');
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
            setGateInfo('Prvo vaganje je sačuvano.');
            setGateError('');
        } catch (error) {
            setGateError(error?.response?.data?.error || 'Neuspješno čuvanje prvog vaganja.');
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
                contractId: ticketDraft.contractId || null,
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
        if (!window.confirm('STORNO: knjiženje vaganja biće poništeno na skladištu i na narudžbi. Nastaviti?')) return;
        try {
            await api.post(`/gate/tickets/${activeTicket.id}/void`, {});
            setGateInfo('Vaganje je stornirano.');
            setGateError('');
            await refreshTickets();
            await refreshContracts().catch(() => null);
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
                contractId: activeTicket?.contractId || undefined,
            });
            const closedTicket = closeRes?.data?.data || activeTicket;
            if (printWeighSlip) {
                printWeighSlipDocument(closedTicket, preOpenedPrintWindow, { driverName: closeDriverName });
            }
            // narudžba je ažurirana na backendu: povuci svježe stanje
            await refreshContracts().catch(() => null);
            if (continueOutbound && activeTicket?.type === 'OUT') {
                const nextRes = await api.post('/gate/tickets', {
                    date: new Date().toISOString(),
                    plate: activeTicket?.plate || '',
                    driver: closeDriverName || activeTicket?.driver || null,
                    supplierId: activeTicket?.supplierId || activeTicket?.supplier?.id || null,
                    materialId: nextMaterialForContinue,
                    contractId: activeTicket?.contractId || null,
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
                setGateInfo('Vaganje je zatvoreno i otvoreno je novo OUT vaganje. Nastavi sa brutom.');
                setGateError('');
                return;
            }
            await refreshTickets();
            setCompleteOpen(false);
            setCloseDriverName('');
            const isOutbound = activeTicket?.type === 'OUT';
            setGateInfo(isOutbound ? 'Vaganje je zatvoreno i stanje je umanjeno.' : 'Vaganje je zatvoreno i lot je kreiran.');
            setGateError('');
        } catch (error) {
            if (preOpenedPrintWindow && !preOpenedPrintWindow.closed) {
                preOpenedPrintWindow.close();
            }
            const message = error?.response?.data?.error;
            setGateError(message || 'Zatvaranje vaganja nije uspjelo.');
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
    const displayType = isNewMode ? newTicketForm.transactionType : (activeTicket?.type || 'IN');
    const now = new Date();
    const contractLocked = !isNewMode && (isTicketClosed || isTicketVoidOrCancelled);
    const contractItems = selectedContract?.items || [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', fontSize: FS.body }}>

            {/* ---------- Gornja traka: lista + navigacija ---------- */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
                <button type="button" style={styles.btn} onClick={() => setListModalOpen(true)}>
                    📋 Lista vaganja
                </button>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        style={{ ...styles.btn, opacity: (isNewMode ? !tickets.length : activeTicketIndex <= 0) ? 0.5 : 1 }}
                        onClick={goPrevTicket}
                        disabled={isNewMode ? !tickets.length : activeTicketIndex <= 0}
                    >
                        ◀ Prethodno
                    </button>
                    <button type="button" style={styles.btnGreen} onClick={startNewTicket}>
                        + Novo vaganje
                    </button>
                    <button
                        type="button"
                        style={{ ...styles.btn, opacity: (isNewMode || activeTicketIndex >= tickets.length - 1) ? 0.5 : 1 }}
                        onClick={goNextTicket}
                        disabled={isNewMode || activeTicketIndex >= tickets.length - 1}
                    >
                        Sljedeće ▶
                    </button>
                </div>
            </div>

            {gateInfo && <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', fontSize: FS.body, borderRadius: '6px' }}>{gateInfo}</div>}
            {gateError && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #ef4444', color: '#991b1b', fontSize: FS.body, borderRadius: '6px' }}>{gateError}</div>}

            {/* ---------- Glavni panel (vagarski list) ---------- */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #334155', borderRadius: '10px', background: '#0f172a', color: '#e2e8f0' }}>
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', background: '#1e293b', borderBottom: '1px solid #334155', borderRadius: '10px 10px 0 0',
                }}>
                    <div style={{ display: 'flex', gap: '22px', flexWrap: 'wrap', fontSize: FS.body }}>
                        <div>R.br: <b>{isNewMode ? 'NOVO' : (activeTicket?.code || '-')}</b></div>
                        <div>Vagar: <b>{authUser?.name || '-'}</b></div>
                        <div>Datum: <b>{now.toLocaleDateString()}</b></div>
                        <div>Vrijeme: <b>{now.toLocaleTimeString()}</b></div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {!isNewMode && activeTicket?.status && (
                            <span style={{
                                padding: '6px 14px', borderRadius: '999px', fontWeight: 700, fontSize: FS.small,
                                background: isTicketClosed ? '#065f46' : isTicketVoidOrCancelled ? '#7f1d1d' : '#1e40af',
                                color: '#fff',
                            }}>
                                {activeTicket.status}
                            </span>
                        )}
                        <button
                            type="button"
                            disabled={!isNewMode}
                            onClick={() => isNewMode && setNewTicketForm((p) => ({
                                ...p,
                                transactionType: p.transactionType === 'IN' ? 'OUT' : 'IN',
                                contractId: '',
                            }))}
                            style={{
                                padding: '10px 22px', borderRadius: '6px', fontWeight: 800, fontSize: '16px', border: 'none',
                                cursor: isNewMode ? 'pointer' : 'default',
                                background: displayType === 'OUT' ? '#b45309' : '#1d4ed8',
                                color: '#fff',
                                opacity: isNewMode ? 1 : 0.85,
                            }}
                            title={isNewMode ? 'Klikni za promjenu ULAZ/IZLAZ' : ''}
                        >
                            {displayType === 'OUT' ? 'IZLAZ' : 'ULAZ'}
                        </button>
                    </div>
                </div>

                <div style={{ padding: '18px', display: 'grid', gap: '18px' }}>

                    {/* Vaga live */}
                    <div style={{ background: '#000', border: '2px solid #334155', borderRadius: '8px', padding: '18px 20px' }}>
                        <div style={{ color: scaleSignal.signalAvailable ? '#10b981' : '#f59e0b', fontSize: FS.small, marginBottom: '8px' }}>
                            {scaleSignal.message}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: '16px', alignItems: 'center' }}>
                            <div className="scada-readout" style={{ color: '#10b981', fontSize: isMobile ? '38px' : FS.bigNumber, fontWeight: 800, lineHeight: 1 }}>
                                {weightText}
                            </div>
                            <div style={{ display: 'grid', gap: '8px', minWidth: isMobile ? 'auto' : '300px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                                    <input
                                        type="number"
                                        value={liveWeight}
                                        onChange={(event) => {
                                            setManualWeightOverride(true);
                                            setLiveWeight(Number(event.target.value || 0));
                                        }}
                                        style={{ padding: '10px', fontSize: FS.input, background: '#0b1220', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '6px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setManualWeightOverride((prev) => !prev)}
                                        style={{
                                            padding: '10px 14px', borderRadius: '6px', border: '1px solid #334155', fontSize: FS.small,
                                            background: manualWeightOverride ? '#b45309' : '#1f2937', color: '#e2e8f0', cursor: 'pointer', whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {manualWeightOverride ? 'RUČNA KOREKCIJA' : 'SIGNAL'}
                                    </button>
                                </div>
                                <div style={{ fontSize: FS.small, color: '#94a3b8' }}>
                                    {manualWeightOverride ? 'Ručna korekcija je aktivna.' : 'Ručni unos je uvijek dostupan za korekcije.'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Osnovna polja */}
                    <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ ...styles.label, color: '#cbd5e1' }}>Artikl</label>
                            <button
                                type="button"
                                onClick={() => {
                                    setMaterialPickerTarget(isNewMode ? 'newTicket' : 'ticketDetails');
                                    setMaterialPickerOpen(true);
                                }}
                                style={{ ...styles.input, textAlign: 'left', cursor: 'pointer' }}
                            >
                                {isNewMode
                                    ? (selectedMaterial ? formatPickedMaterial(selectedMaterial) : 'Odaberi materijal')
                                    : (materials.find((m) => m.id === ticketDraft.materialId)
                                        ? formatPickedMaterial(materials.find((m) => m.id === ticketDraft.materialId))
                                        : 'Odaberi materijal')}
                            </button>
                        </div>
                        <div>
                            <label style={{ ...styles.label, color: '#cbd5e1' }}>Komitent</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                                <input
                                    list="gate-supplier-options"
                                    value={isNewMode ? newSupplierQuery : detailSupplierQuery}
                                    placeholder="- Nije odabrano -"
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const resolved = resolveLookupId(value, supplierLookupOptions);
                                        if (isNewMode) {
                                            setNewSupplierQuery(value);
                                            setNewTicketForm((prev) => ({ ...prev, supplierId: resolved || '' }));
                                        } else {
                                            setDetailSupplierQuery(value);
                                            setTicketDraft((prev) => ({ ...prev, supplierId: resolved || '' }));
                                        }
                                    }}
                                    style={styles.input}
                                />
                                <button type="button" style={styles.btn} onClick={() => openCreatePartnerModal(isNewMode ? 'newTicket' : 'ticketDetails')}>
                                    + Novi
                                </button>
                            </div>
                        </div>

                        <div>
                            <label style={{ ...styles.label, color: '#cbd5e1' }}>Registarski broj</label>
                            <input
                                list="gate-known-plates"
                                value={isNewMode ? newTicketForm.plate : ticketDraft.plate}
                                onChange={(e) => isNewMode
                                    ? setNewTicketForm((p) => ({ ...p, plate: e.target.value }))
                                    : setTicketDraft((p) => ({ ...p, plate: e.target.value }))}
                                style={styles.input}
                            />
                        </div>
                        <div>
                            <label style={{ ...styles.label, color: '#cbd5e1' }}>Vozač</label>
                            <input
                                list="gate-known-drivers"
                                value={isNewMode ? newTicketForm.driver : ticketDraft.driver}
                                onChange={(e) => isNewMode
                                    ? setNewTicketForm((p) => ({ ...p, driver: e.target.value }))
                                    : setTicketDraft((p) => ({ ...p, driver: e.target.value }))}
                                style={styles.input}
                            />
                        </div>

                        {!isNewMode && (
                            <div>
                                <label style={{ ...styles.label, color: '#cbd5e1' }}>Primio/Predao</label>
                                <select
                                    value={inspectionWorkerId}
                                    onChange={(e) => setInspectionWorkerId(e.target.value)}
                                    style={styles.input}
                                >
                                    {inspectionWorkers.length === 0 && <option value="">Nema definisanih kontrolora</option>}
                                    {inspectionWorkers.map((worker) => (
                                        <option key={worker.id} value={worker.id}>{worker.name} ({worker.code})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {isNewMode && (
                            <div>
                                <label style={{ ...styles.label, color: '#cbd5e1' }}>Najava (opciono)</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                                    <input
                                        list="gate-announcement-options"
                                        value={selectedAnnouncementQuery}
                                        placeholder="- Bez najave -"
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setSelectedAnnouncementQuery(value);
                                            setSelectedAnnouncementId(resolveLookupId(value, announcementLookupOptions) || '');
                                        }}
                                        style={styles.input}
                                    />
                                    <button type="button" style={styles.btn} onClick={openCreateAnnouncementModal}>+ Nova</button>
                                </div>
                            </div>
                        )}

                        {/* Narudžba */}
                        <div>
                            <label style={{ ...styles.label, color: '#cbd5e1' }}>
                                Narudžba (opciono) — {isOutboundFlow ? 'prodaja' : 'nabavka'}
                            </label>
                            <select
                                value={selectedContractId || ''}
                                disabled={contractLocked}
                                onChange={(e) => handleContractChange(e.target.value)}
                                style={styles.input}
                            >
                                <option value="">- Bez narudžbe -</option>
                                {contractOptions.map((c) => (
                                    <option key={c.id} value={c.id}>{contractLabel(c)}</option>
                                ))}
                            </select>
                        </div>
                        {selectedContract && contractItems.length > 1 && (
                            <div>
                                <label style={{ ...styles.label, color: '#cbd5e1' }}>Materijal sa narudžbe</label>
                                <select
                                    value={currentMaterialId || ''}
                                    disabled={contractLocked}
                                    onChange={(e) => handleContractMaterialChange(e.target.value)}
                                    style={styles.input}
                                >
                                    <option value="">- Odaberi -</option>
                                    {contractItems.map((i) => {
                                        const rem = i.qtyKg !== null && i.qtyKg !== undefined
                                            ? ` — preostalo ${fmtKg(Math.max(0, Number(i.qtyKg) - Number(i.doneKg || 0)))} kg`
                                            : '';
                                        return <option key={i.id} value={i.materialId}>{i.material?.code} - {i.material?.name}{rem}</option>;
                                    })}
                                </select>
                            </div>
                        )}
                    </div>

                    {selectedContract && (
                        <ContractInfo
                            contract={selectedContract}
                            materialId={currentMaterialId}
                            netKg={!isNewMode && !isTicketClosed && !isTicketVoidOrCancelled ? Number(activeTicket?.net || 0) : 0}
                        />
                    )}

                    {/* Vaganje / neto */}
                    {!isNewMode && activeTicket && (
                        <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr 1fr 1fr', gap: '14px', alignItems: 'stretch' }}>
                            <button
                                type="button"
                                onClick={handleFirstWeigh}
                                disabled={firstStepDone || isTicketVoidOrCancelled}
                                style={{
                                    ...styles.btnPrimary, background: firstStepDone ? '#334155' : '#1d4ed8',
                                    padding: '16px', fontSize: '16px', opacity: (firstStepDone || isTicketVoidOrCancelled) ? 0.75 : 1,
                                    cursor: (firstStepDone || isTicketVoidOrCancelled) ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {isOutboundFlow ? 'Očitaj prazan' : 'Očitaj pun'}
                                <div style={{ fontSize: FS.small, fontWeight: 500, marginTop: '4px' }}>
                                    {isOutboundFlow ? Number(activeTicket?.tare || 0).toLocaleString() : Number(activeTicket?.gross || 0).toLocaleString()} kg
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={handleSecondWeigh}
                                disabled={!firstStepDone || secondStepDone || isTicketVoidOrCancelled}
                                style={{
                                    ...styles.btnPrimary, background: secondStepDone ? '#334155' : '#15803d',
                                    padding: '16px', fontSize: '16px', opacity: (!firstStepDone || secondStepDone || isTicketVoidOrCancelled) ? 0.75 : 1,
                                    cursor: (!firstStepDone || secondStepDone || isTicketVoidOrCancelled) ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {isOutboundFlow ? 'Očitaj pun' : 'Očitaj prazan'}
                                <div style={{ fontSize: FS.small, fontWeight: 500, marginTop: '4px' }}>
                                    {isOutboundFlow ? Number(activeTicket?.gross || 0).toLocaleString() : Number(activeTicket?.tare || 0).toLocaleString()} kg
                                </div>
                            </button>
                            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '14px', textAlign: 'center' }}>
                                <div style={{ fontSize: FS.small, color: '#94a3b8' }}>NETO</div>
                                <div style={{ fontSize: FS.neto, fontWeight: 800, color: '#10b981' }}>
                                    {Number(activeTicket?.net || 0).toLocaleString()} <span style={{ fontSize: '16px' }}>kg</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {isTareFallback && !isNewMode && (
                        <div style={{ padding: '10px', background: '#78350f', color: '#fde68a', fontSize: FS.small, borderRadius: '6px' }}>
                            Live signal nije dostupan — korišten je zadnji poznati tara podatak sa vaganja.
                        </div>
                    )}

                    {/* Ambalaža / napomena - collapsible */}
                    {!isNewMode && (
                        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}>
                            <button
                                type="button"
                                onClick={() => setPackagingOpen((v) => !v)}
                                style={{
                                    width: '100%', textAlign: 'left', padding: '12px 16px', background: 'transparent', border: 'none',
                                    color: '#e2e8f0', fontWeight: 700, fontSize: FS.body, cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                                }}
                            >
                                <span>Ambalaža / napomena {totalPackagingKg > 0 ? `(odbitak: ${Number(totalPackagingKg).toLocaleString()} kg)` : ''}</span>
                                <span>{packagingOpen ? '▲' : '▼'}</span>
                            </button>
                            {packagingOpen && (
                                <div style={{ padding: '0 16px 16px' }}>
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        {packagingRows.map((row) => (
                                            <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 130px auto', gap: '8px' }}>
                                                <input
                                                    placeholder="Vrsta ambalaže"
                                                    value={row.type}
                                                    onChange={(e) => updatePackagingRow(row.id, 'type', e.target.value)}
                                                    style={styles.input}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="KG"
                                                    value={row.kg}
                                                    onChange={(e) => updatePackagingRow(row.id, 'kg', e.target.value)}
                                                    style={{ ...styles.input, textAlign: 'right' }}
                                                />
                                                <button type="button" style={styles.btn} onClick={() => removePackagingRow(row.id)}>Ukloni</button>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                                        <button type="button" style={styles.btn} onClick={addPackagingRow}>+ Ambalaža</button>
                                        <div style={{ fontSize: FS.body, fontWeight: 700 }}>Ukupno odbitak: {Number(totalPackagingKg || 0).toLocaleString()} KG</div>
                                    </div>
                                    <div style={{ marginTop: '10px' }}>
                                        <label style={{ ...styles.label, color: '#cbd5e1' }}>Cijena/KG</label>
                                        <input
                                            type="number"
                                            value={ticketDraft.pricePerKg}
                                            onChange={(e) => setTicketDraft((p) => ({ ...p, pricePerKg: e.target.value }))}
                                            style={{ ...styles.input, maxWidth: '200px' }}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                                        <div>
                                            <label style={{ ...styles.label, color: '#cbd5e1' }}>Bruto (korekcija)</label>
                                            <input type="number" value={ticketDraft.gross} onChange={(e) => setTicketDraft((p) => ({ ...p, gross: e.target.value }))} style={styles.input} />
                                        </div>
                                        <div>
                                            <label style={{ ...styles.label, color: '#cbd5e1' }}>Tara (korekcija)</label>
                                            <input type="number" value={ticketDraft.tare} onChange={(e) => setTicketDraft((p) => ({ ...p, tare: e.target.value }))} style={styles.input} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Akcije dole */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #334155', paddingTop: '16px' }}>
                        {isNewMode ? (
                            <button type="button" style={styles.btnGreen} onClick={handleCreateTicket}>
                                ✓ Kreiraj vaganje
                            </button>
                        ) : (
                            <>
                                {canGateCancel && (
                                    <button type="button" style={styles.btnAmber} onClick={handleGateCancelTicket}>Otkaži vaganje</button>
                                )}
                                {canGateVoid && (
                                    <button type="button" style={styles.btnDanger} onClick={handleGateVoidTicket}>Storno (knjiženje)</button>
                                )}
                                <button
                                    type="button"
                                    style={{ ...styles.btn, background: '#334155', color: '#e2e8f0', borderColor: '#475569' }}
                                    disabled={isTicketClosed || isTicketVoidOrCancelled}
                                    onClick={handleSaveTicketDetails}
                                >
                                    OK — Sačuvaj
                                </button>
                                <button
                                    type="button"
                                    style={{ ...styles.btnGreen, opacity: (!secondStepDone || isTicketVoidOrCancelled || closeSubmitting) ? 0.6 : 1 }}
                                    disabled={!secondStepDone || isTicketVoidOrCancelled || closeSubmitting}
                                    onClick={handleOpenComplete}
                                >
                                    🖨️ Zatvori & Vagarski list
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

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

            {/* ---------- Modal: lista vaganja ---------- */}
            <Modal open={listModalOpen} onClose={() => setListModalOpen(false)} title="Lista vaganja" width={720}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '12px', fontSize: FS.small, fontWeight: 700 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Od
                        <input type="date" value={listDateFrom} onChange={(e) => setListDateFrom(e.target.value)} style={{ padding: '6px 8px', fontSize: FS.small }} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Do
                        <input type="date" value={listDateTo} onChange={(e) => setListDateTo(e.target.value)} style={{ padding: '6px 8px', fontSize: FS.small }} />
                    </label>
                    <button type="button" style={styles.btn} onClick={() => { const t = localYmd(); setListDateFrom(t); setListDateTo(t); }}>
                        Danas
                    </button>
                </div>
                <div style={{ maxHeight: '55vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    {tickets.map((ticket) => {
                        const st = String(ticket.status || '').toLowerCase();
                        const rowBg = selectedTicketId === ticket.id
                            ? '#dcfce7'
                            : st === 'zatvoren' ? '#ecfdf5'
                                : (st === 'otkazan' || st === 'storniran') ? '#fef2f2' : '#fff';
                        const orderCode = contracts.find((c) => c.id === ticket.contractId)?.code;
                        return (
                            <div
                                key={ticket.id}
                                onClick={() => { goToTicket(ticket.id); setListModalOpen(false); }}
                                style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', background: rowBg, fontSize: FS.body }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                    <span>{ticket.code || ticket.id}</span>
                                    <span style={{ fontSize: FS.small, color: '#64748b' }}>{ticket.type} · {ticket.status || '-'}</span>
                                </div>
                                <div style={{ fontSize: FS.small, marginTop: '3px' }}>
                                    {ticket.supplier?.name || '-'} | {ticket.driver || '-'} | {ticket.plate || '-'}
                                    {orderCode ? ` | Narudžba: ${orderCode}` : ''}
                                </div>
                                <div style={{ fontSize: FS.small, color: '#64748b', marginTop: '2px', fontWeight: 700 }}>
                                    {ticket.material?.code || '-'} - {ticket.material?.name || '-'}
                                </div>
                                <div className="font-mono font-bold" style={{ fontSize: FS.small, marginTop: '4px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                                    <span>TARA: {Number(ticket.tare || 0).toLocaleString()}</span>
                                    <span>BRUTO: {Number(ticket.gross || 0).toLocaleString()}</span>
                                    <span>NETO: {Number(ticket.net || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        );
                    })}
                    {!tickets.length && <div style={{ padding: '18px', color: '#64748b', fontSize: FS.body }}>Nema vaganja u izabranom periodu.</div>}
                </div>
            </Modal>

            {/* ---------- Modal: zatvori vaganje ---------- */}
            <Modal open={completeOpen} onClose={() => setCompleteOpen(false)} title="Zatvori vaganje" width={560}>
                <div style={{ display: 'grid', gap: '14px', fontSize: FS.body }}>
                    {activeTicket?.contractId && (
                        <div style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: '6px', fontSize: FS.small }}>
                            Narudžba: <b>{contracts.find((c) => c.id === activeTicket.contractId)?.code || '-'}</b> — količina će biti
                            {activeTicket.type === 'OUT' ? ' skinuta sa isporuke' : ' evidentirana kao primljena'}.
                        </div>
                    )}
                    <div>
                        <label style={styles.label}>Vozač za štampu (opciono)</label>
                        <input list="gate-known-drivers" value={closeDriverName} onChange={(e) => setCloseDriverName(e.target.value)} style={styles.input} />
                    </div>
                    {activeTicket?.type !== 'OUT' && (
                        <div>
                            <label style={styles.label}>LOT dodjela (skladište)</label>
                            <select value={closeLocation} onChange={(e) => setCloseLocation(e.target.value)} style={styles.input}>
                                <option>Otvoreni lager C</option>
                                <option>Hala 1 - Sektor A</option>
                                <option>Hala 2 - Sektor D</option>
                            </select>
                        </div>
                    )}
                    {activeTicket?.type === 'OUT' && (
                        <div>
                            <label style={styles.label}>Materijal za sljedeće OUT vaganje</label>
                            <select value={nextOutboundMaterialId} onChange={(e) => setNextOutboundMaterialId(e.target.value)} style={styles.input}>
                                <option value="">- Materijal -</option>
                                {materials.map((m) => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
                            </select>
                        </div>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" checked={printWeighSlip} onChange={(e) => setPrintWeighSlip(e.target.checked)} />
                        Štampaj vagarski list
                    </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                    <button type="button" style={styles.btn} onClick={() => setCompleteOpen(false)}>Odustani</button>
                    {activeTicket?.type === 'OUT' && (
                        <button type="button" style={{ ...styles.btnPrimary, opacity: closeSubmitting ? 0.7 : 1 }} disabled={closeSubmitting} onClick={() => handleCloseTicket({ continueOutbound: true })}>
                            {closeSubmitting ? 'Obrada...' : 'Zatvori & novo vaganje'}
                        </button>
                    )}
                    <button type="button" style={{ ...styles.btnGreen, opacity: closeSubmitting ? 0.7 : 1 }} disabled={closeSubmitting} onClick={() => handleCloseTicket()}>
                        {closeSubmitting ? 'Obrada...' : 'Zatvori & štampaj'}
                    </button>
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
                <div style={{ display: 'grid', gap: '12px', fontSize: FS.body }}>
                    <div>
                        <label style={styles.label}>Materijal</label>
                        <div style={{ ...styles.input, background: '#f8fafc' }}>
                            {selectedMaterial ? formatPickedMaterial(selectedMaterial) : '-'}
                        </div>
                    </div>
                    <div>
                        <label style={styles.label}>Komitent *</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
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
                                style={styles.input}
                            />
                            <button type="button" style={styles.btn} onClick={() => openCreatePartnerModal('newAnnouncement')}>+ Novi</button>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                            <label style={styles.label}>Planirano KG *</label>
                            <input
                                type="number" min="0" step="0.01"
                                value={newAnnouncementForm.expectedKg}
                                onChange={(event) => setNewAnnouncementForm((prev) => ({ ...prev, expectedKg: event.target.value }))}
                                style={styles.input}
                            />
                        </div>
                        <div>
                            <label style={styles.label}>Tablice (opciono)</label>
                            <input
                                list="gate-known-plates"
                                value={newAnnouncementForm.truck}
                                onChange={(event) => setNewAnnouncementForm((prev) => ({ ...prev, truck: event.target.value }))}
                                style={styles.input}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                            <label style={styles.label}>Datum najave</label>
                            <input
                                type="date"
                                value={newAnnouncementForm.expectedDate}
                                onChange={(event) => setNewAnnouncementForm((prev) => ({ ...prev, expectedDate: event.target.value }))}
                                style={styles.input}
                            />
                        </div>
                        <div>
                            <label style={styles.label}>Status</label>
                            <input
                                type="text"
                                value={newAnnouncementForm.status}
                                onChange={(event) => setNewAnnouncementForm((prev) => ({ ...prev, status: event.target.value }))}
                                style={styles.input}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '18px' }}>
                    <button type="button" style={styles.btn} onClick={() => setCreateAnnouncementOpen(false)}>Odustani</button>
                    <button type="button" style={styles.btnPrimary} onClick={handleCreateAnnouncement}>Sačuvaj najavu</button>
                </div>
            </Modal>

            <Modal open={createPartnerOpen} onClose={() => setCreatePartnerOpen(false)} title="Novi komitent / partner" width={520}>
                <div style={{ display: 'grid', gap: '12px', fontSize: FS.body }}>
                    <div>
                        <label style={styles.label}>Naziv komitenta *</label>
                        <input type="text" style={styles.input} value={newPartnerForm.name} onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, name: event.target.value }))} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                            <label style={styles.label}>Grad</label>
                            <input type="text" style={styles.input} value={newPartnerForm.city} onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, city: event.target.value }))} />
                        </div>
                        <div>
                            <label style={styles.label}>JIB</label>
                            <input type="text" style={styles.input} value={newPartnerForm.jib} onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, jib: event.target.value }))} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                            <label style={styles.label}>Telefon</label>
                            <input type="text" style={styles.input} value={newPartnerForm.phone} onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, phone: event.target.value }))} />
                        </div>
                        <div>
                            <label style={styles.label}>Email</label>
                            <input type="email" style={styles.input} value={newPartnerForm.email} onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, email: event.target.value }))} />
                        </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" checked={newPartnerForm.createCustomerMirror} onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, createCustomerMirror: event.target.checked }))} />
                        Kreiraj i kao kupca (isti partner za ulaz i izlaz)
                    </label>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '18px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                    <button type="button" style={styles.btn} onClick={() => setCreatePartnerOpen(false)}>Odustani</button>
                    <button type="button" style={styles.btnPrimary} onClick={handleCreatePartner}>Sačuvaj komitenta</button>
                </div>
            </Modal>
        </div>
    );
}
