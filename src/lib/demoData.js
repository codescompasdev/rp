// Milkus Core ERP — Centralized Demo Data
// All mock data for the entire system

// ═══════════════════════════════════════════
// LME & BERZA
// ═══════════════════════════════════════════
export const lmePrices = [
    { metal: 'Bakar (Cu)', price: 8450.00, change: -1.2, currency: 'USD/t' },
    { metal: 'Aluminij (Al)', price: 2180.50, change: +0.5, currency: 'USD/t' },
    { metal: 'Cink (Zn)', price: 2420.00, change: 0.0, currency: 'USD/t' },
    { metal: 'Nikal (Ni)', price: 16250.00, change: +1.8, currency: 'USD/t' },
    { metal: 'Čelik (Fe)', price: 380.00, change: -0.3, currency: 'USD/t' },
];

export const fxRates = [
    { pair: 'BAM/EUR', rate: 1.9558 },
    { pair: 'EUR/USD', rate: 1.0842 },
    { pair: 'BAM/USD', rate: 2.1205 },
];

// ═══════════════════════════════════════════
// DOBAVLJAČI (Suppliers CRM)
// ═══════════════════════════════════════════
export const suppliers = [
    { id: 'S-1001', name: 'Zenica Steelworks d.o.o.', jib: '4218109230004', pdv: true, type: 'Industrija', bonitet: 'A', city: 'Zenica', phone: '+387 32 224 100', balance: -85200.00 },
    { id: 'S-1002', name: 'EuroMetali d.o.o.', jib: '4403187120008', pdv: true, type: 'Industrija', bonitet: 'A', city: 'Banja Luka', phone: '+387 51 315 200', balance: -1120.00 },
    { id: 'S-2001', name: 'Sakupljač Marko Kovačević', jib: '1204985170034', pdv: false, type: 'Sakupljač', bonitet: 'B', city: 'Pale', phone: '+387 65 123 456', balance: -450.00 },
    { id: 'S-2002', name: 'Komunalno Pale d.o.o.', jib: '4400565430001', pdv: true, type: 'Komunalno', bonitet: 'B', city: 'Pale', phone: '+387 57 223 100', balance: 0 },
    { id: 'S-3001', name: 'Local Scrap LLC', jib: '4218765430001', pdv: true, type: 'Sakupljač', bonitet: 'C', city: 'Sarajevo', phone: '+387 33 200 300', balance: -12450.50 },
    { id: 'S-3002', name: 'AutoOtpad Bijeljina', jib: '4209876540002', pdv: true, type: 'Industrija', bonitet: 'B', city: 'Bijeljina', phone: '+387 55 210 100', balance: -3200.00 },
];

// ═══════════════════════════════════════════
// KUPCI (Customers)
// ═══════════════════════════════════════════
export const customers = [
    { id: 'C-001', name: 'ArcelorMittal Zenica', country: 'BA', creditLimit: 500000, balance: 125000, blocked: false },
    { id: 'C-002', name: 'Aluminij Mostar', country: 'BA', creditLimit: 300000, balance: 280000, blocked: false },
    { id: 'C-003', name: 'Raffinerie Aurubis AG', country: 'DE', creditLimit: 1000000, balance: 450000, blocked: false },
    { id: 'C-004', name: 'TSR Recycling GmbH', country: 'DE', creditLimit: 750000, balance: 742000, blocked: true },
    { id: 'C-005', name: 'Metalfer Steel Mill', country: 'BA', creditLimit: 200000, balance: 50000, blocked: false },
];

// ═══════════════════════════════════════════
// MATERIJALI (Materials / Articles)
// ═══════════════════════════════════════════
export const materials = [
    { code: 'CU-MB', name: 'Bakar Millberry (I)', category: 'Obojeni', unit: 'KG', lmeLinked: true, basePrice: 13.50, margin: 8.0, buyPrice: 12.42 },
    { code: 'CU-BR', name: 'Bakar Berry (II)', category: 'Obojeni', unit: 'KG', lmeLinked: true, basePrice: 13.50, margin: 12.0, buyPrice: 11.88 },
    { code: 'CU-INS', name: 'Bakar Izolirani', category: 'Obojeni', unit: 'KG', lmeLinked: true, basePrice: 13.50, margin: 40.0, buyPrice: 8.10 },
    { code: 'AL-CST', name: 'Aluminij Liveni', category: 'Obojeni', unit: 'KG', lmeLinked: true, basePrice: 4.20, margin: 50.0, buyPrice: 2.10 },
    { code: 'AL-PRF', name: 'Alu Profil', category: 'Obojeni', unit: 'KG', lmeLinked: true, basePrice: 4.20, margin: 30.0, buyPrice: 2.94 },
    { code: 'FE-E3', name: 'Teški Čelik (E3/HMS)', category: 'Crni', unit: 'KG', lmeLinked: false, basePrice: null, margin: null, buyPrice: 0.40 },
    { code: 'FE-E1', name: 'Miješano Željezo (E1)', category: 'Crni', unit: 'KG', lmeLinked: false, basePrice: null, margin: null, buyPrice: 0.30 },
    { code: 'FE-SHR', name: 'Šredirano Željezo (E40)', category: 'Crni', unit: 'KG', lmeLinked: false, basePrice: null, margin: null, buyPrice: 0.00 },
    { code: 'ZORBA', name: 'Zorba Mix (Obojeni)', category: 'Obojeni', unit: 'KG', lmeLinked: false, basePrice: null, margin: null, buyPrice: 1.50 },
    { code: 'BRASS', name: 'Mesing', category: 'Obojeni', unit: 'KG', lmeLinked: true, basePrice: 6.80, margin: 15.0, buyPrice: 5.78 },
    { code: 'BAT-PB', name: 'Akumulatori (Olovo)', category: 'Opasni', unit: 'KG', lmeLinked: false, basePrice: null, margin: null, buyPrice: 0.55 },
    { code: 'CAT', name: 'Katalizatori', category: 'Plemeniti', unit: 'KOM', lmeLinked: false, basePrice: null, margin: null, buyPrice: 0 },
    { code: 'ELV', name: 'Otpadno Vozilo (Auto)', category: 'ELV', unit: 'KOM', lmeLinked: false, basePrice: null, margin: null, buyPrice: 0 },
];

// ═══════════════════════════════════════════
// UGOVORI (Contracts)
// ═══════════════════════════════════════════
export const contracts = [
    { id: 'UGV-2026-001', supplier: 'Zenica Steelworks d.o.o.', material: 'AL-PRF', formula: 'LME -15%', qtyTons: 10, period: '01.01 - 31.12.2026', status: 'Aktivan' },
    { id: 'UGV-2026-002', supplier: 'EuroMetali d.o.o.', material: 'CU-MB', formula: 'LME -8%', qtyTons: 5, period: '15.01 - 30.06.2026', status: 'Aktivan' },
    { id: 'UGV-2026-003', supplier: 'Local Scrap LLC', material: 'FE-E1', formula: 'Fiksno 0.30', qtyTons: 50, period: '01.02 - 31.12.2026', status: 'Aktivan' },
    { id: 'SPT-2026-044', supplier: 'Sakupljač M. Kovačević', material: 'FE-E3', formula: 'Fiksno 0.45', qtyTons: 12, period: '10.02.2026 (Spot)', status: 'Završen' },
];

// ═══════════════════════════════════════════
// NAJAVE PRIJEMA (Gate Announcements / Purchase Orders)
// ═══════════════════════════════════════════
export const announcements = [
    { id: 'PO-2026-554', supplier: 'S-1001', material: 'AL-PRF', expectedKg: 12000, contract: 'UGV-2026-001', status: 'Najavljeno', expectedDate: '2026-02-23', truck: 'E55-K-991' },
    { id: 'PO-2026-555', supplier: 'S-1002', material: 'CU-MB', expectedKg: 2500, contract: 'UGV-2026-002', status: 'Najavljeno', expectedDate: '2026-02-23', truck: 'A12-M-991' },
    { id: 'PO-2026-556', supplier: 'S-3001', material: 'FE-E1', expectedKg: 18000, contract: 'UGV-2026-003', status: 'U Krugu', expectedDate: '2026-02-23', truck: 'K64-T-882' },
    { id: 'PO-2026-557', supplier: 'S-2001', material: 'FE-E3', expectedKg: 8000, contract: null, status: 'Završeno', expectedDate: '2026-02-22', truck: 'J44-T-110' },
];

// ═══════════════════════════════════════════
// KAMIONI U KRUGU (Trucks On-Site)
// ═══════════════════════════════════════════
export const trucksOnSite = [
    { plate: 'K64-T-882', supplier: 'Zenica Steelworks', material: 'Miješano Željezo (E1)', entryTime: '08:14:22', status: 'Inspekcija', statusColor: '#f59e0b' },
    { plate: 'A12-M-991', supplier: 'EuroMetali d.o.o.', material: 'Bakar Millberry', entryTime: '08:32:05', status: 'Istovar', statusColor: '#3b82f6' },
    { plate: 'J44-T-110', supplier: 'Walk-in (Fizičko lice)', material: 'Aluminij', entryTime: '08:45:12', status: 'Na Kapiji', statusColor: '#64748b' },
    { plate: 'E99-K-412', supplier: 'Local Scrap LLC', material: 'Teški Čelik (E3)', entryTime: '07:22:10', status: 'Utovar', statusColor: '#10b981' },
    { plate: 'E55-K-991', supplier: 'Zenica Steelworks', material: 'Alu Profil', entryTime: '09:10:00', status: 'Najavljeno', statusColor: '#8b5cf6' },
];

// ═══════════════════════════════════════════
// VAGARSKI TIKETI (Weigh Tickets)
// ═══════════════════════════════════════════
export const weighTickets = [
    { id: 'W-108842', date: '2026-02-23 08:14', plate: 'K64-T-882', supplier: 'Zenica Steelworks', material: 'FE-E1', gross: 24560, tare: 12100, kalo: 2.5, net: 12148, pricePerKg: 0.30, total: 3644.55, status: 'Čeka 2. Vaganje', type: 'Ulaz' },
    { id: 'W-108841', date: '2026-02-23 07:55', plate: 'A12-M-991', supplier: 'EuroMetali', material: 'CU-MB', gross: 18200, tare: 14500, kalo: 1.0, net: 3663, pricePerKg: 12.42, total: 45494.46, status: 'Zatvoren', type: 'Ulaz' },
    { id: 'W-108840', date: '2026-02-22 16:30', plate: 'E99-K-412', supplier: 'Local Scrap', material: 'FE-E3', gross: 40200, tare: 15100, kalo: 3.0, net: 24347, pricePerKg: 0.40, total: 9738.80, status: 'Zatvoren', type: 'Ulaz' },
    { id: 'W-108839', date: '2026-02-22 14:00', plate: 'J22-A-100', supplier: 'Walk-in', material: 'BAT-PB', gross: 520, tare: 0, kalo: 0, net: 520, pricePerKg: 0.55, total: 286.00, status: 'Zatvoren', type: 'POS' },
];

// ═══════════════════════════════════════════
// ZALIHE (Inventory / Stock)
// ═══════════════════════════════════════════
export const inventory = [
    { code: 'CU-MB', name: 'Bakar Millberry (I)', zone: 'Hala 1 - Sektor A', stockKg: 42500, avgBuyPrice: 12.40, mktPrice: 13.10, margin: 29750.00 },
    { code: 'CU-BR', name: 'Bakar Berry (II)', zone: 'Hala 1 - Sektor A', stockKg: 14200, avgBuyPrice: 11.80, mktPrice: 12.00, margin: 2840.00 },
    { code: 'FE-E3', name: 'Teški Čelik (HMS)', zone: 'Otvoreni lager B', stockKg: 4250000, avgBuyPrice: 0.42, mktPrice: 0.40, margin: -85000.00 },
    { code: 'FE-E1', name: 'Miješano Željezo', zone: 'Otvoreni lager C', stockKg: 1850500, avgBuyPrice: 0.30, mktPrice: 0.32, margin: 37010.00 },
    { code: 'AL-CST', name: 'Aluminij Liveni', zone: 'Hala 2 - Sektor D', stockKg: 85400, avgBuyPrice: 2.10, mktPrice: 2.10, margin: 0 },
    { code: 'AL-PRF', name: 'Alu Profil', zone: 'Hala 2 - Sektor D', stockKg: 34200, avgBuyPrice: 2.94, mktPrice: 3.20, margin: 8892.00 },
    { code: 'ZORBA', name: 'Zorba Mix', zone: 'Hala 1 - Sektor B', stockKg: 22100, avgBuyPrice: 1.50, mktPrice: 1.80, margin: 6630.00 },
    { code: 'BAT-PB', name: 'Akumulatori', zone: 'Opasni - Boks 1', stockKg: 3200, avgBuyPrice: 0.55, mktPrice: 0.60, margin: 160.00 },
    { code: 'FE-SHR', name: 'Šredirano E40', zone: 'Hala 3 - Gotova roba', stockKg: 180000, avgBuyPrice: 0.28, mktPrice: 0.38, margin: 18000.00 },
    { code: 'CAT', name: 'Katalizatori', zone: 'Sef', stockKg: 145, avgBuyPrice: 0, mktPrice: 0, margin: 0 },
];

// ═══════════════════════════════════════════
// LOT Sljedivost
// ═══════════════════════════════════════════
export const lots = [
    { id: 'LOT-26-0055', material: 'CU-MB', supplier: 'EuroMetali', ticket: 'W-108841', dateReceived: '2026-02-23', kg: 3663, location: 'Hala 1 - Sektor A', status: 'Dostupno', contract: 'UGV-2026-002' },
    { id: 'LOT-26-0054', material: 'FE-E1', supplier: 'Zenica Steelworks', ticket: 'W-108842', dateReceived: '2026-02-22', kg: 24347, location: 'Otvoreni lager C', status: 'U Preradi', contract: 'UGV-2026-003' },
    { id: 'LOT-26-0053', material: 'AL-PRF', supplier: 'Zenica Steelworks', ticket: 'W-108838', dateReceived: '2026-02-21', kg: 11200, location: 'Hala 2 - Sektor D', status: 'Dostupno', contract: 'UGV-2026-001' },
    { id: 'LOT-26-0052', material: 'FE-E3', supplier: 'Local Scrap', ticket: 'W-108840', dateReceived: '2026-02-20', kg: 50000, location: 'Otvoreni lager B', status: 'Prerađeno', contract: null },
];

// ═══════════════════════════════════════════
// RADNI NALOZI (Work Orders / Production)
// ═══════════════════════════════════════════
export const workOrders = [
    { id: 'WO-2026-041', material: 'FE-E1', machine: 'Šreder #1 (Heavy)', inputKg: 50000, outputKg: 49500, yield: 99.0, status: 'Završen' },
    { id: 'WO-2026-042', material: 'FE-E1', machine: 'Makaze Hidraulične', inputKg: 24347, outputKg: 23500, yield: 96.5, status: 'U Toku' },
    { id: 'WO-2026-043', material: 'CU-INS', machine: 'Bakar Granulator', inputKg: 8000, outputKg: 0, yield: 0, status: 'Planirano' },
];

// ═══════════════════════════════════════════
// PRODAJNI NALOZI (Sales Orders)
// ═══════════════════════════════════════════
export const salesOrders = [
    { id: 'SO-2026-018', customer: 'ArcelorMittal Zenica', material: 'FE-SHR', qtyKg: 25000, pricePerKg: 0.38, total: 9500.00, status: 'Utovar', exportDocs: true },
    { id: 'SO-2026-017', customer: 'Raffinerie Aurubis AG', material: 'CU-MB', qtyKg: 42500, pricePerKg: 14.20, total: 603500.00, status: 'Priprema dokumenata', exportDocs: true },
    { id: 'SO-2026-016', customer: 'Metalfer Steel Mill', material: 'FE-E3', qtyKg: 100000, pricePerKg: 0.42, total: 42000.00, status: 'Završen', exportDocs: false },
];

// ═══════════════════════════════════════════
// KONTEJNERI (Containers)
// ═══════════════════════════════════════════
export const containers = [
    { id: 'CNT-001', type: 'Abroll 20m³', location: 'Lager Pale', status: 'Prazan', lastMoved: '2026-02-20' },
    { id: 'CNT-002', type: 'Abroll 30m³', location: 'Fabrika Prozora Sarajevo', status: 'Kod Klijenta', lastMoved: '2026-02-18', daysAtClient: 5 },
    { id: 'CNT-003', type: 'Abroll 20m³', location: 'U Tranzitu (E55-K-991)', status: 'U Tranzitu', lastMoved: '2026-02-23' },
    { id: 'CNT-004', type: 'Abroll 30m³', location: 'Komunalno Pale', status: 'Pun - Čeka Odvoz', lastMoved: '2026-02-15', daysAtClient: 8 },
    { id: 'CNT-005', type: 'Mulda 7m³', location: 'Lager Pale', status: 'Na Servisu', lastMoved: '2026-02-22' },
];

// ═══════════════════════════════════════════
// VOZILA I VOZAČI (Fleet)
// ═══════════════════════════════════════════
export const vehicles = [
    { id: 'V-001', plate: 'T85-J-441', type: 'Kamion Kuka', brand: 'MAN TGS 26.400', km: 245000, fuelAvg: 38.5, regExpiry: '2026-08-15', status: 'Aktivan' },
    { id: 'V-002', plate: 'T85-J-442', type: 'Tegljač', brand: 'Scania R450', km: 312000, fuelAvg: 32.1, regExpiry: '2026-03-10', status: 'Aktivan' },
    { id: 'V-003', plate: 'T85-J-443', type: 'Kamion Kuka', brand: 'Mercedes Actros', km: 180000, fuelAvg: 40.2, regExpiry: '2026-11-22', status: 'Na Servisu' },
];

export const drivers = [
    { id: 'D-001', name: 'Dragan Milić', phone: '+387 65 111 222', vehicle: 'V-001', license: 'CE', hoursToday: 6.5, status: 'Na Turi' },
    { id: 'D-002', name: 'Nenad Savić', phone: '+387 65 333 444', vehicle: 'V-002', license: 'CE', hoursToday: 4.0, status: 'Na Turi' },
    { id: 'D-003', name: 'Milan Jovanović', phone: '+387 65 555 666', vehicle: null, license: 'CE', hoursToday: 0, status: 'Slobodan' },
];

// ═══════════════════════════════════════════
// SMJENE I HR
// ═══════════════════════════════════════════
export const shifts = [
    { date: '2026-02-23', shift: 'I Smjena (06:00-14:00)', workers: 14, supervisor: 'Marko Kovačević' },
    { date: '2026-02-23', shift: 'II Smjena (14:00-22:00)', workers: 12, supervisor: 'Jovo Petrović' },
];

export const workers = [
    { id: 'W-001', name: 'Marko Kovačević', role: 'Kontrolor Kvaliteta', shift: 'I', status: 'Na poslu', htxExpiry: '2026-06-15' },
    { id: 'W-002', name: 'Jovo Petrović', role: 'Šef Smjene', shift: 'II', status: 'Na poslu', htxExpiry: '2026-04-01' },
    { id: 'W-003', name: 'Dejan Ristić', role: 'Vagar', shift: 'I', status: 'Na poslu', htxExpiry: '2026-09-20' },
    { id: 'W-004', name: 'Siniša Đurić', role: 'Bagerista', shift: 'I', status: 'Bolovanje', htxExpiry: '2026-05-10' },
];

// ═══════════════════════════════════════════
// ODRŽAVANJE (Maintenance / CMMS)
// ═══════════════════════════════════════════
export const maintenanceOrders = [
    { id: 'MO-2026-012', machine: 'Šreder #1', type: 'Preventivni', task: 'Zamjena noževa', scheduled: '2026-02-25', assignedTo: 'Petar Lukić', status: 'Planirano', priority: 'Visok' },
    { id: 'MO-2026-011', machine: 'Hidraulične Makaze', type: 'Korektivni', task: 'Popravka cilindra', scheduled: '2026-02-23', assignedTo: 'Petar Lukić', status: 'U Toku', priority: 'Kritičan' },
    { id: 'MO-2026-010', machine: 'Vaga Ulazna', type: 'Kalibracija', task: 'Godišnja kalibracija', scheduled: '2026-03-01', assignedTo: 'Eksterni', status: 'Planirano', priority: 'Srednji' },
];

export const spareParts = [
    { code: 'SP-001', name: 'Noževi Šreder (Set)', machine: 'Šreder #1', stockQty: 2, minQty: 3, price: 4500.00, status: 'Ispod Minimuma' },
    { code: 'SP-002', name: 'Hidraulično Ulje (200L)', machine: 'Sve', stockQty: 8, minQty: 4, price: 350.00, status: 'OK' },
    { code: 'SP-003', name: 'Filteri Vazduha', machine: 'Šreder #1', stockQty: 5, minQty: 2, price: 120.00, status: 'OK' },
    { code: 'SP-004', name: 'Cilindar Hidraulični', machine: 'Makaze', stockQty: 0, minQty: 1, price: 8200.00, status: 'Nema na stanju' },
];

// ═══════════════════════════════════════════
// FINANSIJE
// ═══════════════════════════════════════════
export const financialSummary = {
    cashflow: 145200.00,
    bankBalance: 342500.00,
    cashRegisters: [
        { location: 'Pale', balance: 12500.00, limit: 20000.00 },
        { location: 'Banja Luka', balance: 8200.00, limit: 15000.00 },
        { location: 'Bijeljina', balance: 3100.00, limit: 10000.00 },
    ],
    overduePayables: 34850.20,
    pendingReceivables: 125000.00,
    tonnageInToday: 124.5,
    tonnageOutToday: 80.0,
    tonnageProcessedToday: 50.0,
};

export const glEntries = [
    { id: 'GL-00441', date: '2026-02-23', account: '5200 - Nabavka Sirovina', debit: 45494.46, credit: 0, ref: 'W-108841', desc: 'Prijem CU-MB (EuroMetali)' },
    { id: 'GL-00440', date: '2026-02-23', account: '2200 - Dobavljači', debit: 0, credit: 45494.46, ref: 'W-108841', desc: 'Obaveza prema EuroMetali' },
    { id: 'GL-00439', date: '2026-02-22', account: '6100 - Prihod od prodaje', debit: 0, credit: 42000.00, ref: 'SO-2026-016', desc: 'Prodaja FE-E3 (Metalfer)' },
    { id: 'GL-00438', date: '2026-02-22', account: '1200 - Potraživanja', debit: 42000.00, credit: 0, ref: 'SO-2026-016', desc: 'Potraživanje od Metalfer' },
];

// ═══════════════════════════════════════════
// SYSTEM EVENTS / ALERTS
// ═══════════════════════════════════════════
export const systemAlerts = [
    { time: '08:52:14', level: 'WRN', message: 'Cijena prekoračena ručno: admin.user (Bakar Berry)', color: '#ef4444' },
    { time: '08:50:01', level: 'SYS', message: 'Proizvodni nalog WO-2026-041 završen (Prinos: 99.0%)', color: '#e2e8f0' },
    { time: '08:48:22', level: 'TRK', message: 'Kamion J44-T-110 registrovan na Kapiji 1', color: '#e2e8f0' },
    { time: '08:45:00', level: 'MNT', message: 'KRITIČNO: Hidraulične Makaze - kvar cilindra', color: '#ef4444' },
    { time: '08:14:45', level: 'LME', message: 'FX Data Sync latencija iznad 2000ms', color: '#f59e0b' },
    { time: '08:00:00', level: 'SYS', message: 'Dnevne smjene pokrenute. 42 radnika aktivno.', color: '#10b981' },
    { time: '07:45:12', level: 'FIN', message: 'Virman serija #1002 u redu za izvršenje', color: '#e2e8f0' },
    { time: '07:30:00', level: 'WRN', message: 'Kreditni limit kupca: TSR Recycling GmbH', color: '#ef4444' },
    { time: '07:15:00', level: 'CNT', message: 'Kontejner CNT-004 kod klijenta > 7 dana (Ležarina!)', color: '#f59e0b' },
    { time: '07:00:00', level: 'SP', message: 'Noževi Šreder ispod min. zaliha (2/3 seta)', color: '#f59e0b' },
];

// ═══════════════════════════════════════════
// LOKACIJE  
// ═══════════════════════════════════════════
export const locations = [
    { id: 'LOC-01', name: 'Pale', type: 'Centrala', address: 'Industrijska zona bb, 71420 Pale' },
    { id: 'LOC-02', name: 'Banja Luka', type: 'Filiala', address: 'Ramići bb, 78000 Banja Luka' },
    { id: 'LOC-03', name: 'Bijeljina', type: 'Filiala', address: 'Ugljevik put bb, 76300 Bijeljina' },
];

export const warehouseZones = [
    { zone: 'Hala 1 - Sektor A', type: 'Zatvoreno', materials: 'Obojeni metali (Cu)', capacity: '80%' },
    { zone: 'Hala 1 - Sektor B', type: 'Zatvoreno', materials: 'Zorba / Mix', capacity: '45%' },
    { zone: 'Hala 2 - Sektor D', type: 'Zatvoreno', materials: 'Aluminij', capacity: '60%' },
    { zone: 'Hala 3 - Gotova roba', type: 'Zatvoreno', materials: 'Šredirano / Prešano', capacity: '70%' },
    { zone: 'Otvoreni lager B', type: 'Otvoreno', materials: 'Teški Čelik', capacity: '55%' },
    { zone: 'Otvoreni lager C', type: 'Otvoreno', materials: 'Miješano Fe', capacity: '30%' },
    { zone: 'Opasni - Boks 1', type: 'Specijalan', materials: 'Akumulatori, Ulje', capacity: '20%' },
    { zone: 'Sef', type: 'Osiguran', materials: 'Katalizatori, Plemeniti', capacity: '10%' },
];
