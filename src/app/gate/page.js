'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    Ban,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    ListChecks,
    Package,
    Pencil,
    Plus,
    Printer,
    RotateCcw,
    Save,
    Scale,
    Trash2,
    Wifi,
} from 'lucide-react';
import Modal from '@/components/UI/Modal';
import MaterialPicker from '@/components/UI/MaterialPicker';
import PageHeader from '@/components/UI/PageHeader';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import Field from '@/components/UI/Field';
import Alert from '@/components/UI/Alert';
import EmptyState from '@/components/UI/EmptyState';
import ProgressBar from '@/components/UI/ProgressBar';
import { Badge, StatusBadge } from '@/components/UI/Badge';
import { fmtDate, fmtKg, fmtNum, fmtTime } from '@/lib/format';
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

function contractPartnerName(contract) {
    if (!contract) return '';
    return (contract.direction === 'SELL' ? contract.customer?.name : contract.supplier?.name) || '';
}

function contractLabel(contract) {
    const dir = contract.direction === 'SELL' ? 'Prodaja' : 'Nabavka';
    return `${contract.code} — ${contractPartnerName(contract) || '-'} — ${dir}`;
}

/* ---------- Panel narudžbe: koliko je ispunjeno i koliko je ostalo ---------- */
function ContractInfo({ contract, materialId, netKg = 0 }) {
    if (!contract) return null;
    const items = contract.items || [];
    const isTotal = contract.qtyMode === 'TOTAL';
    const isSell = contract.direction === 'SELL';
    const tol = Number(contract.tolerance || 0);
    const pending = Math.max(0, Number(netKg) || 0);

    const cur = items.find((i) => i.materialId === materialId);
    const curPlanned = cur && cur.qtyKg !== null && cur.qtyKg !== undefined ? Number(cur.qtyKg) : null;
    const curRemaining = curPlanned !== null ? curPlanned - Number(cur.doneKg || 0) : null;

    const totalPlanned = isTotal ? Number(contract.totalQtyKg || 0) : null;
    const totalRemaining = isTotal ? totalPlanned - Number(contract.doneKg || 0) : null;

    const limitPlanned = isTotal ? totalPlanned : curPlanned;
    const limitRemaining = isTotal ? totalRemaining : curRemaining;
    const allowed = limitPlanned !== null && limitRemaining !== null ? limitRemaining + (limitPlanned * tol) / 100 : null;
    const over = allowed !== null && pending > allowed;
    const verb = isSell ? 'za isporučiti' : 'za primiti';

    return (
        <Card
            title={`Narudžba ${contract.code}`}
            subtitle={`${isSell ? 'Prodaja' : 'Nabavka'} · ${contractPartnerName(contract) || '-'}`}
            icon={ClipboardList}
            actions={tol > 0 ? <Badge tone="outline">Tolerancija {fmtNum(tol, 2)}%</Badge> : null}
        >
            <div className="stack" style={{ gap: 16 }}>
                {isTotal ? (
                    <ProgressBar
                        size="lg"
                        label="Ukupno na narudžbi"
                        valueText={`${fmtNum(contract.doneKg)} / ${fmtNum(totalPlanned)} kg`}
                        value={Number(contract.doneKg || 0)}
                        pending={pending}
                        max={totalPlanned}
                        tolerancePct={tol}
                        footLeft={pending > 0 ? `+ ${fmtKg(pending)} ovo vaganje` : `Ispunjeno ${fmtKg(contract.doneKg)}`}
                        footRight={`Preostalo ${verb}: ${fmtKg(Math.max(0, totalRemaining - pending))}`}
                    />
                ) : null}
                {isTotal && items.length > 0 && (
                    <div style={{ display: 'grid', gap: 6 }}>
                        {items.map((i) => {
                            const active = i.materialId === materialId;
                            return (
                                <div key={i.id} className="row-between" style={{ fontSize: 12.5, fontWeight: active ? 700 : 400 }}>
                                    <span className="row" style={{ gap: 6, minWidth: 0 }}>
                                        {active && <Badge tone="info">Na vagi</Badge>}
                                        <span>{i.material?.code || '-'} · {i.material?.name || ''}</span>
                                    </span>
                                    <span className="font-mono">{fmtKg(i.doneKg)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
                {!isTotal && (
                    items.map((i) => {
                        const planned = i.qtyKg !== null && i.qtyKg !== undefined ? Number(i.qtyKg) : null;
                        const done = Number(i.doneKg || 0);
                        const active = i.materialId === materialId;
                        const extra = active ? pending : 0;
                        return (
                            <div key={i.id} className={`gate-order-line ${active ? 'is-active' : ''}`}>
                                <ProgressBar
                                    label={(
                                        <span className="row" style={{ gap: 6 }}>
                                            {active && <Badge tone="info">Na vagi</Badge>}
                                            <span>{i.material?.code || '-'} · {i.material?.name || ''}</span>
                                        </span>
                                    )}
                                    valueText={planned !== null ? `${fmtNum(done)} / ${fmtNum(planned)} kg` : fmtKg(done)}
                                    value={done}
                                    pending={extra}
                                    max={planned || 0}
                                    tolerancePct={tol}
                                    footLeft={extra > 0 ? `+ ${fmtKg(extra)} ovo vaganje` : ''}
                                    footRight={planned !== null ? `Preostalo ${verb}: ${fmtKg(Math.max(0, planned - done - extra))}` : ''}
                                />
                            </div>
                        );
                    })
                )}
                {over && (
                    <Alert tone="warning">
                        Neto ({fmtKg(pending)}) prelazi preostalu količinu uz toleranciju ({fmtKg(allowed)}).
                    </Alert>
                )}
                {!isTotal && !cur && materialId && (
                    <Alert tone="warning">Odabrani materijal nije na ovoj narudžbi.</Alert>
                )}
            </div>
        </Card>
    );
}

/* ---------- Korak vaganja (1. / 2. mjerenje) ---------- */
function WeighStep({ index, title, valueKg, done, disabled, onClick, hint }) {
    return (
        <button
            type="button"
            className="gate-step"
            data-state={done ? 'done' : disabled ? 'locked' : 'ready'}
            onClick={onClick}
            disabled={disabled || done}
        >
            <span className="gate-step-num">{done ? <Check size={16} strokeWidth={3} /> : index}</span>
            <span className="gate-step-body">
                <span className="gate-step-title">{title}</span>
                <span className="gate-step-value">{fmtNum(valueKg)} <small>kg</small></span>
                <span className="gate-step-hint">{done ? 'Sačuvano' : hint}</span>
            </span>
        </button>
    );
}

export default function GatePage() {
    const authUser = getAuthUser();
    // ime vagara i sat samo u pregledniku (server ih ne zna → bez hydration greške)
    const [clockLabel, setClockLabel] = useState('');
    useEffect(() => {
        const tick = () => {
            const d = new Date();
            setClockLabel(`Vagar: ${getAuthUser()?.name || '-'} · ${fmtDate(d)} ${fmtTime(d)}`);
        };
        tick();
        const timer = setInterval(tick, 30000);
        return () => clearInterval(timer);
    }, []);
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
        const ticketData = normalizeApiList(ticketRes).filter((t) => t.type !== 'POS' && t.type !== 'POS_OUT');
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
    const contractLocked = !isNewMode && (isTicketClosed || isTicketVoidOrCancelled);
    const contractItems = selectedContract?.items || [];

    const stepOneTitle = isOutboundFlow ? 'Prazan (tara)' : 'Pun (bruto)';
    const stepTwoTitle = isOutboundFlow ? 'Pun (bruto)' : 'Prazan (tara)';
    const stepOneKg = isOutboundFlow ? Number(activeTicket?.tare || 0) : Number(activeTicket?.gross || 0);
    const stepTwoKg = isOutboundFlow ? Number(activeTicket?.gross || 0) : Number(activeTicket?.tare || 0);
    const pendingNetForOrder = !isNewMode && !isTicketClosed && !isTicketVoidOrCancelled ? Number(activeTicket?.net || 0) : 0;
    const signalTone = scaleSignal.signalAvailable ? 'success' : 'warning';
    const currentMaterialLabel = isNewMode
        ? (selectedMaterial ? formatPickedMaterial(selectedMaterial) : '')
        : (materials.find((m) => m.id === ticketDraft.materialId) ? formatPickedMaterial(materials.find((m) => m.id === ticketDraft.materialId)) : '');

    return (
        <div className="ui-page gate-page">
            <PageHeader
                title={isNewMode ? 'Novo vaganje' : `Vaganje ${activeTicket?.code || ''}`}
                subtitle={clockLabel || '\u00a0'}
                actions={(
                    <>
                        <Button variant="secondary" icon={ListChecks} onClick={() => setListModalOpen(true)}>Lista vaganja</Button>
                        <div className="row" style={{ gap: 4 }}>
                            <Button
                                variant="secondary"
                                icon={ChevronLeft}
                                onClick={goPrevTicket}
                                disabled={isNewMode ? !tickets.length : activeTicketIndex <= 0}
                                aria-label="Prethodno vaganje"
                                title="Prethodno"
                            />
                            <Button
                                variant="secondary"
                                icon={ChevronRight}
                                onClick={goNextTicket}
                                disabled={isNewMode || activeTicketIndex >= tickets.length - 1}
                                aria-label="Sljedeće vaganje"
                                title="Sljedeće"
                            />
                        </div>
                        <Button variant="success" icon={Plus} onClick={startNewTicket}>Novo vaganje</Button>
                    </>
                )}
            />

            <Alert tone="success" onClose={() => setGateInfo('')}>{gateInfo}</Alert>
            <Alert tone="danger" onClose={() => setGateError('')}>{gateError}</Alert>

            <div className="gate-grid">
                {/* ---------- Lijevo: vagarski list ---------- */}
                <div className="stack" style={{ minWidth: 0 }}>
                    <section className="ui-card">
                        <div className="ui-card-header" style={{ flexWrap: 'wrap' }}>
                            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                                <span className="ui-stat-icon" style={{ width: 30, height: 30 }}><Scale size={16} /></span>
                                <div>
                                    <div className="ui-card-title">Vagarski list</div>
                                    <div className="ui-card-subtitle">R.br: <b className="font-code">{isNewMode ? 'NOVO' : (activeTicket?.code || '-')}</b></div>
                                </div>
                                {!isNewMode && activeTicket?.status && <StatusBadge status={activeTicket.status} />}
                            </div>
                            {isNewMode ? (
                                <div className="gate-type-toggle" role="radiogroup" aria-label="Vrsta vaganja">
                                    {[
                                        { value: 'IN', label: 'Ulaz', icon: ArrowDownToLine },
                                        { value: 'OUT', label: 'Izlaz', icon: ArrowUpFromLine },
                                    ].map((opt) => {
                                        const Icon = opt.icon;
                                        const checked = newTicketForm.transactionType === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                role="radio"
                                                aria-checked={checked}
                                                data-type={opt.value}
                                                onClick={() => !checked && setNewTicketForm((p) => ({ ...p, transactionType: opt.value, contractId: '' }))}
                                            >
                                                <Icon size={16} /> {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Badge tone={displayType === 'OUT' ? 'orange' : 'info'}>
                                    {displayType === 'OUT' ? <ArrowUpFromLine size={13} /> : <ArrowDownToLine size={13} />}
                                    {displayType === 'OUT' ? 'IZLAZ' : 'ULAZ'}
                                </Badge>
                            )}
                        </div>

                        <div className="ui-card-body">
                            <div className="ui-form-grid gate-form">
                                <Field label="Artikl">
                                    <button
                                        type="button"
                                        className="ui-input gate-picker-btn"
                                        onClick={() => {
                                            setMaterialPickerTarget(isNewMode ? 'newTicket' : 'ticketDetails');
                                            setMaterialPickerOpen(true);
                                        }}
                                    >
                                        <Package size={16} />
                                        <span className={currentMaterialLabel ? '' : 'muted'}>{currentMaterialLabel || 'Odaberi materijal'}</span>
                                    </button>
                                </Field>
                                <Field label="Komitent">
                                    <div className="ui-input-group">
                                        <input
                                            className="ui-input lg"
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
                                        />
                                        <Button variant="secondary" size="lg" icon={Plus} onClick={() => openCreatePartnerModal(isNewMode ? 'newTicket' : 'ticketDetails')}>Novi</Button>
                                    </div>
                                </Field>

                                <Field label="Registarski broj">
                                    <input
                                        className="ui-input lg font-code"
                                        list="gate-known-plates"
                                        value={isNewMode ? newTicketForm.plate : ticketDraft.plate}
                                        onChange={(e) => isNewMode
                                            ? setNewTicketForm((p) => ({ ...p, plate: e.target.value }))
                                            : setTicketDraft((p) => ({ ...p, plate: e.target.value }))}
                                    />
                                </Field>
                                <Field label="Vozač">
                                    <input
                                        className="ui-input lg"
                                        list="gate-known-drivers"
                                        value={isNewMode ? newTicketForm.driver : ticketDraft.driver}
                                        onChange={(e) => isNewMode
                                            ? setNewTicketForm((p) => ({ ...p, driver: e.target.value }))
                                            : setTicketDraft((p) => ({ ...p, driver: e.target.value }))}
                                    />
                                </Field>

                                {!isNewMode && (
                                    <Field label="Primio / predao">
                                        <select
                                            className="ui-input lg"
                                            value={inspectionWorkerId}
                                            onChange={(e) => setInspectionWorkerId(e.target.value)}
                                        >
                                            {inspectionWorkers.length === 0 && <option value="">Nema definisanih kontrolora</option>}
                                            {inspectionWorkers.map((worker) => (
                                                <option key={worker.id} value={worker.id}>{worker.name} ({worker.code})</option>
                                            ))}
                                        </select>
                                    </Field>
                                )}
                                {isNewMode && (
                                    <Field label="Najava (opciono)">
                                        <div className="ui-input-group">
                                            <input
                                                className="ui-input lg"
                                                list="gate-announcement-options"
                                                value={selectedAnnouncementQuery}
                                                placeholder="- Bez najave -"
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setSelectedAnnouncementQuery(value);
                                                    setSelectedAnnouncementId(resolveLookupId(value, announcementLookupOptions) || '');
                                                }}
                                            />
                                            <Button variant="secondary" size="lg" icon={Plus} onClick={openCreateAnnouncementModal}>Nova</Button>
                                        </div>
                                    </Field>
                                )}

                                <Field label={`Narudžba (opciono) — ${isOutboundFlow ? 'prodaja' : 'nabavka'}`}>
                                    <select
                                        className="ui-input lg"
                                        value={selectedContractId || ''}
                                        disabled={contractLocked}
                                        onChange={(e) => handleContractChange(e.target.value)}
                                    >
                                        <option value="">- Bez narudžbe -</option>
                                        {contractOptions.map((c) => (
                                            <option key={c.id} value={c.id}>{contractLabel(c)}</option>
                                        ))}
                                    </select>
                                </Field>
                                {selectedContract && contractItems.length > 1 && (
                                    <Field label="Materijal sa narudžbe">
                                        <select
                                            className="ui-input lg"
                                            value={currentMaterialId || ''}
                                            disabled={contractLocked}
                                            onChange={(e) => handleContractMaterialChange(e.target.value)}
                                        >
                                            <option value="">- Odaberi -</option>
                                            {contractItems.map((i) => {
                                                const rem = i.qtyKg !== null && i.qtyKg !== undefined
                                                    ? ` — preostalo ${fmtKg(Math.max(0, Number(i.qtyKg) - Number(i.doneKg || 0)))}`
                                                    : '';
                                                return <option key={i.id} value={i.materialId}>{i.material?.code} - {i.material?.name}{rem}</option>;
                                            })}
                                        </select>
                                    </Field>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* ---------- Koraci vaganja ---------- */}
                    {!isNewMode && activeTicket && (
                        <section className="ui-card">
                            <div className="ui-card-header">
                                <div>
                                    <div className="ui-card-title">Mjerenje</div>
                                    <div className="ui-card-subtitle">
                                        {isOutboundFlow ? 'Izlaz: prvo prazno vozilo, zatim puno' : 'Ulaz: prvo puno vozilo, zatim prazno'}
                                    </div>
                                </div>
                            </div>
                            <div className="ui-card-body">
                                <div className="gate-steps">
                                    <WeighStep
                                        index={1}
                                        title={stepOneTitle}
                                        valueKg={stepOneKg}
                                        done={firstStepDone}
                                        disabled={isTicketVoidOrCancelled}
                                        onClick={handleFirstWeigh}
                                        hint="Klikni za očitavanje vage"
                                    />
                                    <WeighStep
                                        index={2}
                                        title={stepTwoTitle}
                                        valueKg={stepTwoKg}
                                        done={secondStepDone}
                                        disabled={!firstStepDone || isTicketVoidOrCancelled}
                                        onClick={handleSecondWeigh}
                                        hint={firstStepDone ? 'Klikni za očitavanje vage' : 'Čeka 1. mjerenje'}
                                    />
                                    <div className="gate-net">
                                        <span className="gate-net-label">Neto</span>
                                        <span className="gate-net-value">{fmtNum(activeTicket?.net)} <small>kg</small></span>
                                        {Number(totalPackagingKg || 0) > 0 && (
                                            <span className="gate-net-hint">odbitak ambalaže {fmtKg(totalPackagingKg)}</span>
                                        )}
                                    </div>
                                </div>
                                {isTareFallback && (
                                    <Alert tone="warning" style={{ marginTop: 14 }}>
                                        Live signal nije dostupan — korišten je zadnji poznati tara podatak sa vaganja.
                                    </Alert>
                                )}
                            </div>
                        </section>
                    )}

                    {/* ---------- Ambalaža / korekcije ---------- */}
                    {!isNewMode && (
                        <section className="ui-card">
                            <button
                                type="button"
                                className="gate-collapse"
                                onClick={() => setPackagingOpen((v) => !v)}
                                aria-expanded={packagingOpen}
                            >
                                <span>
                                    <span className="ui-card-title">Ambalaža, cijena i korekcije</span>
                                    <span className="ui-card-subtitle" style={{ display: 'block' }}>
                                        {totalPackagingKg > 0 ? `Odbitak ambalaže: ${fmtKg(totalPackagingKg)}` : 'Bez odbitka ambalaže'}
                                    </span>
                                </span>
                                <ChevronDown size={18} style={{ transform: packagingOpen ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }} />
                            </button>
                            {packagingOpen && (
                                <div className="ui-card-body" style={{ borderTop: '1px solid var(--border)' }}>
                                    <div className="stack" style={{ gap: 8 }}>
                                        {packagingRows.map((row) => (
                                            <div key={row.id} className="gate-pkg-row">
                                                <input
                                                    className="ui-input"
                                                    placeholder="Vrsta ambalaže"
                                                    value={row.type}
                                                    onChange={(e) => updatePackagingRow(row.id, 'type', e.target.value)}
                                                />
                                                <input
                                                    type="number"
                                                    className="ui-input font-mono"
                                                    placeholder="kg"
                                                    value={row.kg}
                                                    onChange={(e) => updatePackagingRow(row.id, 'kg', e.target.value)}
                                                    style={{ textAlign: 'right' }}
                                                />
                                                <Button variant="ghost" icon={Trash2} aria-label="Ukloni ambalažu" onClick={() => removePackagingRow(row.id)} />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="row-between" style={{ marginTop: 10 }}>
                                        <Button variant="soft" size="sm" icon={Plus} onClick={addPackagingRow}>Ambalaža</Button>
                                        <b>Ukupno odbitak: {fmtKg(totalPackagingKg)}</b>
                                    </div>
                                    <div className="ui-form-grid" style={{ marginTop: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                                        <Field label="Cijena / kg">
                                            <input
                                                type="number"
                                                className="ui-input font-mono"
                                                value={ticketDraft.pricePerKg}
                                                onChange={(e) => setTicketDraft((p) => ({ ...p, pricePerKg: e.target.value }))}
                                            />
                                        </Field>
                                        <Field label="Bruto (korekcija)">
                                            <input type="number" className="ui-input font-mono" value={ticketDraft.gross} onChange={(e) => setTicketDraft((p) => ({ ...p, gross: e.target.value }))} />
                                        </Field>
                                        <Field label="Tara (korekcija)">
                                            <input type="number" className="ui-input font-mono" value={ticketDraft.tare} onChange={(e) => setTicketDraft((p) => ({ ...p, tare: e.target.value }))} />
                                        </Field>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* ---------- Akcije ---------- */}
                    <div className="gate-actions">
                        {isNewMode ? (
                            <Button variant="success" size="xl" icon={Check} onClick={handleCreateTicket}>Kreiraj vaganje</Button>
                        ) : (
                            <>
                                {canGateCancel && (
                                    <Button variant="warning" size="lg" icon={Ban} onClick={handleGateCancelTicket}>Otkaži vaganje</Button>
                                )}
                                {canGateVoid && (
                                    <Button variant="danger-soft" size="lg" icon={RotateCcw} onClick={handleGateVoidTicket}>Storno (knjiženje)</Button>
                                )}
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    icon={Save}
                                    disabled={isTicketClosed || isTicketVoidOrCancelled}
                                    onClick={handleSaveTicketDetails}
                                >
                                    Sačuvaj izmjene
                                </Button>
                                <Button
                                    variant="success"
                                    size="xl"
                                    icon={Printer}
                                    disabled={!secondStepDone || isTicketVoidOrCancelled || closeSubmitting}
                                    onClick={handleOpenComplete}
                                >
                                    Zatvori i vagarski list
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* ---------- Desno: vaga + narudžba ---------- */}
                <div className="stack gate-side">
                    <section className="ui-card gate-scale" data-tone={signalTone}>
                        <div className="row-between" style={{ padding: '14px 18px 0' }}>
                            <span className="ui-card-title">Vaga</span>
                            <Badge tone={signalTone} dot>{scaleSignal.message}</Badge>
                        </div>
                        <div className="gate-scale-readout" aria-live="polite">{weightText}</div>
                        <div style={{ padding: '0 18px 18px' }}>
                            <div className="ui-input-group">
                                <input
                                    type="number"
                                    className="ui-input lg font-mono"
                                    value={liveWeight}
                                    aria-label="Težina (ručni unos)"
                                    onChange={(event) => {
                                        setManualWeightOverride(true);
                                        setLiveWeight(Number(event.target.value || 0));
                                    }}
                                />
                                <Button
                                    variant={manualWeightOverride ? 'warning' : 'secondary'}
                                    size="lg"
                                    icon={manualWeightOverride ? Pencil : Wifi}
                                    onClick={() => setManualWeightOverride((prev) => !prev)}
                                >
                                    {manualWeightOverride ? 'Ručno' : 'Signal'}
                                </Button>
                            </div>
                            <div className="ui-hint" style={{ marginTop: 6 }}>
                                {manualWeightOverride ? 'Ručna korekcija je aktivna — klikni „Ručno” za povratak na signal.' : 'Ručni unos je uvijek dostupan za korekcije.'}
                            </div>
                        </div>
                    </section>

                    {selectedContract ? (
                        <ContractInfo
                            contract={selectedContract}
                            materialId={currentMaterialId}
                            netKg={pendingNetForOrder}
                        />
                    ) : (
                        <section className="ui-card gate-no-order">
                            <EmptyState
                                icon={ClipboardList}
                                title="Bez narudžbe"
                                text={`Odaberi narudžbu (${isOutboundFlow ? 'prodaja' : 'nabavka'}) da pratiš koliko je ostalo ${isOutboundFlow ? 'za isporuku' : 'za prijem'}.`}
                            />
                        </section>
                    )}
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
            <Modal open={listModalOpen} onClose={() => setListModalOpen(false)} title="Lista vaganja" subtitle={`${tickets.length} vaganja u periodu`} width={780}>
                <div className="ui-toolbar" style={{ marginBottom: 12 }}>
                    <Field label="Od">
                        <input type="date" className="ui-input" value={listDateFrom} onChange={(e) => setListDateFrom(e.target.value)} />
                    </Field>
                    <Field label="Do">
                        <input type="date" className="ui-input" value={listDateTo} onChange={(e) => setListDateTo(e.target.value)} />
                    </Field>
                    <Button variant="secondary" style={{ alignSelf: 'flex-end' }} onClick={() => { const t = localYmd(); setListDateFrom(t); setListDateTo(t); }}>
                        Danas
                    </Button>
                </div>
                <div className="gate-list">
                    {tickets.map((ticket) => {
                        const orderCode = contracts.find((c) => c.id === ticket.contractId)?.code;
                        const selected = selectedTicketId === ticket.id;
                        return (
                            <button
                                type="button"
                                key={ticket.id}
                                className="gate-list-row"
                                data-selected={selected}
                                onClick={() => { goToTicket(ticket.id); setListModalOpen(false); }}
                            >
                                <span className="gate-list-main">
                                    <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                                        <b className="font-code">{ticket.code || ticket.id}</b>
                                        <Badge tone={ticket.type === 'OUT' ? 'orange' : 'info'}>{ticket.type === 'OUT' ? 'Izlaz' : 'Ulaz'}</Badge>
                                        <StatusBadge status={ticket.status} />
                                    </span>
                                    <span className="gate-list-meta">
                                        {ticket.supplier?.name || '-'} · {ticket.driver || '-'} · {ticket.plate || '-'}
                                        {orderCode ? ` · Narudžba: ${orderCode}` : ''}
                                    </span>
                                    <span className="gate-list-meta">{ticket.material?.code || '-'} · {ticket.material?.name || '-'}</span>
                                </span>
                                <span className="gate-list-weights">
                                    <span>Tara <b>{fmtNum(ticket.tare)}</b></span>
                                    <span>Bruto <b>{fmtNum(ticket.gross)}</b></span>
                                    <span className="gate-list-net">Neto <b>{fmtNum(ticket.net)} kg</b></span>
                                </span>
                            </button>
                        );
                    })}
                    {!tickets.length && <EmptyState title="Nema vaganja u izabranom periodu" />}
                </div>
            </Modal>

            {/* ---------- Modal: zatvori vaganje ---------- */}
            <Modal open={completeOpen} onClose={() => setCompleteOpen(false)} title="Zatvori vaganje" subtitle={activeTicket?.code} width={560}>
                <div className="stack" style={{ gap: 14 }}>
                    <div className="gate-close-summary">
                        <div><span className="muted">Komitent</span><b>{activeTicket?.supplier?.name || '-'}</b></div>
                        <div><span className="muted">Materijal</span><b>{activeTicket?.material?.code || '-'} · {activeTicket?.material?.name || ''}</b></div>
                        <div><span className="muted">Neto</span><b className="gate-close-net">{fmtKg(activeTicket?.net)}</b></div>
                    </div>
                    {activeTicket?.contractId && (
                        <Alert tone="info">
                            Narudžba <b>{contracts.find((c) => c.id === activeTicket.contractId)?.code || '-'}</b> — količina će biti
                            {activeTicket.type === 'OUT' ? ' skinuta sa isporuke' : ' evidentirana kao primljena'}.
                        </Alert>
                    )}
                    <Field label="Vozač za štampu (opciono)">
                        <input className="ui-input" list="gate-known-drivers" value={closeDriverName} onChange={(e) => setCloseDriverName(e.target.value)} />
                    </Field>
                    {activeTicket?.type !== 'OUT' && (
                        <Field label="LOT dodjela (skladište)">
                            <select className="ui-input" value={closeLocation} onChange={(e) => setCloseLocation(e.target.value)}>
                                <option>Otvoreni lager C</option>
                                <option>Hala 1 - Sektor A</option>
                                <option>Hala 2 - Sektor D</option>
                            </select>
                        </Field>
                    )}
                    {activeTicket?.type === 'OUT' && (
                        <Field label="Materijal za sljedeće OUT vaganje">
                            <select className="ui-input" value={nextOutboundMaterialId} onChange={(e) => setNextOutboundMaterialId(e.target.value)}>
                                <option value="">- Materijal -</option>
                                {materials.map((m) => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
                            </select>
                        </Field>
                    )}
                    <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={printWeighSlip} onChange={(e) => setPrintWeighSlip(e.target.checked)} />
                        Štampaj vagarski list
                    </label>
                </div>
                <div className="ui-modal-footer">
                    <Button variant="secondary" onClick={() => setCompleteOpen(false)}>Odustani</Button>
                    {activeTicket?.type === 'OUT' && (
                        <Button variant="soft" disabled={closeSubmitting} onClick={() => handleCloseTicket({ continueOutbound: true })}>
                            {closeSubmitting ? 'Obrada...' : 'Zatvori i novo vaganje'}
                        </Button>
                    )}
                    <Button variant="success" icon={Printer} disabled={closeSubmitting} onClick={() => handleCloseTicket()}>
                        {closeSubmitting ? 'Obrada...' : 'Zatvori i štampaj'}
                    </Button>
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

            <Modal open={createAnnouncementOpen} onClose={() => setCreateAnnouncementOpen(false)} title="Nova najava prijema" width={560}>
                <div className="ui-form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <Field label="Materijal" span="all">
                        <div className="ui-input" style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-2)' }}>
                            {selectedMaterial ? formatPickedMaterial(selectedMaterial) : <span className="muted">Materijal nije odabran</span>}
                        </div>
                    </Field>
                    <Field label="Komitent" required span="all">
                        <div className="ui-input-group">
                            <input
                                className="ui-input"
                                list="gate-supplier-options"
                                value={newAnnouncementSupplierQuery}
                                placeholder="Odaberi ili upiši komitenta"
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setNewAnnouncementSupplierQuery(value);
                                    const resolved = resolveLookupId(value, supplierLookupOptions);
                                    setNewAnnouncementForm((prev) => ({ ...prev, supplierId: resolved || '' }));
                                }}
                            />
                            <Button variant="secondary" icon={Plus} onClick={() => openCreatePartnerModal('newAnnouncement')}>Novi</Button>
                        </div>
                    </Field>
                    <Field label="Planirano (kg)" required>
                        <input
                            type="number" min="0" step="0.01"
                            className="ui-input font-mono"
                            value={newAnnouncementForm.expectedKg}
                            onChange={(event) => setNewAnnouncementForm((prev) => ({ ...prev, expectedKg: event.target.value }))}
                        />
                    </Field>
                    <Field label="Tablice (opciono)">
                        <input
                            className="ui-input font-code"
                            list="gate-known-plates"
                            value={newAnnouncementForm.truck}
                            onChange={(event) => setNewAnnouncementForm((prev) => ({ ...prev, truck: event.target.value }))}
                        />
                    </Field>
                    <Field label="Datum najave">
                        <input
                            type="date"
                            className="ui-input"
                            value={newAnnouncementForm.expectedDate}
                            onChange={(event) => setNewAnnouncementForm((prev) => ({ ...prev, expectedDate: event.target.value }))}
                        />
                    </Field>
                    <Field label="Status">
                        <input
                            type="text"
                            className="ui-input"
                            value={newAnnouncementForm.status}
                            onChange={(event) => setNewAnnouncementForm((prev) => ({ ...prev, status: event.target.value }))}
                        />
                    </Field>
                </div>
                <div className="ui-modal-footer">
                    <Button variant="secondary" onClick={() => setCreateAnnouncementOpen(false)}>Odustani</Button>
                    <Button onClick={handleCreateAnnouncement}>Sačuvaj najavu</Button>
                </div>
            </Modal>

            <Modal open={createPartnerOpen} onClose={() => setCreatePartnerOpen(false)} title="Novi komitent / partner" width={560}>
                <div className="ui-form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <Field label="Naziv komitenta" required span="all">
                        <input type="text" className="ui-input" value={newPartnerForm.name} onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, name: event.target.value }))} autoFocus />
                    </Field>
                    <Field label="Grad">
                        <input type="text" className="ui-input" value={newPartnerForm.city} onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, city: event.target.value }))} />
                    </Field>
                    <Field label="JIB">
                        <input type="text" className="ui-input" value={newPartnerForm.jib} onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, jib: event.target.value }))} />
                    </Field>
                    <Field label="Telefon">
                        <input type="text" className="ui-input" value={newPartnerForm.phone} onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, phone: event.target.value }))} />
                    </Field>
                    <Field label="Email">
                        <input type="email" className="ui-input" value={newPartnerForm.email} onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, email: event.target.value }))} />
                    </Field>
                    <label className="row span-all" style={{ gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={newPartnerForm.createCustomerMirror} onChange={(event) => setNewPartnerForm((prev) => ({ ...prev, createCustomerMirror: event.target.checked }))} />
                        Kreiraj i kao kupca (isti partner za ulaz i izlaz)
                    </label>
                </div>
                <div className="ui-modal-footer">
                    <Button variant="secondary" onClick={() => setCreatePartnerOpen(false)}>Odustani</Button>
                    <Button onClick={handleCreatePartner}>Sačuvaj komitenta</Button>
                </div>
            </Modal>

            <style>{`
                .gate-grid {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(320px, 400px);
                    gap: 16px;
                    align-items: start;
                }
                .gate-side { position: sticky; top: 0; }
                .gate-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .gate-picker-btn {
                    height: 46px; display: flex; align-items: center; gap: 8px; text-align: left;
                    font-size: 15px; cursor: pointer; overflow: hidden; white-space: nowrap;
                }
                .gate-picker-btn svg { color: var(--primary); flex-shrink: 0; }
                .gate-picker-btn span { overflow: hidden; text-overflow: ellipsis; }
                .gate-type-toggle {
                    display: inline-flex; padding: 3px; gap: 3px; border-radius: 12px; background: var(--surface-3);
                }
                .gate-type-toggle button {
                    display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 18px;
                    border: none; border-radius: 9px; background: transparent; font-weight: 700; font-size: 14px; color: var(--text-2);
                }
                .gate-type-toggle button[aria-checked='true'][data-type='IN'] { background: var(--primary); color: #fff; box-shadow: var(--shadow-sm); }
                .gate-type-toggle button[aria-checked='true'][data-type='OUT'] { background: #e8743b; color: #fff; box-shadow: var(--shadow-sm); }
                .gate-type-toggle button:hover:not(:disabled)[aria-checked='false'] { background: rgba(255,255,255,.7); }

                .gate-scale-readout {
                    padding: 18px 18px 14px;
                    font-size: 56px; font-weight: 700; letter-spacing: -0.03em; line-height: 1;
                    font-variant-numeric: tabular-nums; color: var(--text);
                    text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .gate-scale { border-top: 3px solid var(--success); }
                .gate-scale[data-tone='warning'] { border-top-color: var(--warning); }

                .gate-steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
                .gate-step {
                    display: flex; align-items: flex-start; gap: 12px; text-align: left; padding: 16px;
                    border-radius: var(--radius-lg); border: 1px solid var(--primary-200); background: var(--primary-50);
                    min-height: 108px;
                }
                .gate-step:hover:not(:disabled) { background: var(--primary-100); border-color: var(--primary); }
                .gate-step:disabled { opacity: 1; }
                .gate-step[data-state='done'] { background: var(--success-50); border-color: #bfe9da; cursor: default; }
                .gate-step[data-state='locked'] { background: var(--surface-2); border-color: var(--border); }
                .gate-step-num {
                    width: 30px; height: 30px; border-radius: 999px; flex-shrink: 0; display: grid; place-items: center;
                    background: var(--primary); color: #fff; font-weight: 700; font-size: 14px;
                }
                .gate-step[data-state='done'] .gate-step-num { background: var(--success); }
                .gate-step[data-state='locked'] .gate-step-num { background: var(--border-strong); }
                .gate-step-body { display: grid; gap: 2px; min-width: 0; }
                .gate-step-title { font-weight: 600; font-size: 13px; color: var(--text-2); }
                .gate-step-value { font-size: 24px; font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
                .gate-step-value small, .gate-net-value small { font-size: 13px; font-weight: 500; color: var(--text-3); }
                .gate-step-hint { font-size: 11.5px; color: var(--text-3); }
                .gate-step[data-state='ready'] .gate-step-hint { color: var(--primary-ink); }
                .gate-net {
                    display: grid; align-content: center; gap: 2px; padding: 16px; border-radius: var(--radius-lg);
                    background: var(--surface); border: 2px solid var(--success); text-align: right;
                }
                .gate-net-label { font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--success-ink); }
                .gate-net-value { font-size: 32px; font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
                .gate-net-hint { font-size: 11.5px; color: var(--text-3); }

                .gate-collapse {
                    width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
                    padding: 14px 18px; border: none; background: transparent; text-align: left; border-radius: var(--radius-lg);
                }
                .gate-collapse:hover:not(:disabled) { background: var(--surface-2); }
                .gate-pkg-row { display: grid; grid-template-columns: minmax(0, 1fr) 140px auto; gap: 8px; }
                .gate-actions {
                    display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; align-items: center;
                    padding: 14px; border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border);
                }

                .gate-order-line { padding: 10px 12px; border-radius: var(--radius); margin: 0 -12px; }
                .gate-order-line.is-active { background: var(--primary-50); }

                .gate-list { max-height: 58vh; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-lg); }
                .gate-list-row {
                    width: 100%; display: flex; gap: 12px; justify-content: space-between; align-items: center; text-align: left;
                    padding: 12px 14px; border: none; border-bottom: 1px solid var(--border); border-radius: 0; background: var(--surface);
                }
                .gate-list-row:last-child { border-bottom: none; }
                .gate-list-row:hover:not(:disabled) { background: var(--surface-hover); }
                .gate-list-row[data-selected='true'] { background: var(--primary-50); box-shadow: inset 3px 0 0 var(--primary); }
                .gate-list-main { display: grid; gap: 4px; min-width: 0; }
                .gate-list-meta { font-size: 12px; color: var(--text-3); }
                .gate-list-weights { display: grid; gap: 2px; text-align: right; font-size: 12px; color: var(--text-3); white-space: nowrap; font-variant-numeric: tabular-nums; }
                .gate-list-weights b { color: var(--text-2); }
                .gate-list-net b { color: var(--text); font-size: 13px; }

                .gate-close-summary {
                    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px;
                    padding: 14px; border-radius: var(--radius-lg); background: var(--surface-2); border: 1px solid var(--border);
                }
                .gate-close-summary > div { display: grid; gap: 2px; min-width: 0; font-size: 12px; }
                .gate-close-summary b { font-size: 13px; overflow: hidden; text-overflow: ellipsis; }
                .gate-close-net { font-size: 18px !important; }

                @media (max-width: 1200px) {
                    .gate-grid { grid-template-columns: minmax(0, 1fr); }
                    .gate-side { position: static; order: -1; }
                    .gate-no-order { display: none; }
                }
                @media (max-width: 720px) {
                    .gate-form { grid-template-columns: minmax(0, 1fr); }
                    .gate-steps { grid-template-columns: minmax(0, 1fr); }
                    .gate-scale-readout { font-size: 44px; }
                    .gate-close-summary { grid-template-columns: minmax(0, 1fr); }
                    .gate-actions > * { flex: 1 1 100%; }
                }
            `}</style>
        </div>
    );
}
