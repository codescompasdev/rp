# Milkus ERP — Backend Implementation Plan

**Version:** 1.0  
**Date:** March 2026  
**Base URL:** `http://localhost:5500/api/v1`

---

## 1. Executive Summary

This document provides a complete backend implementation plan for the Milkus ERP frontend. The frontend currently uses **demo data** for most modules and **API calls** for a subset (auth, fleet, inventory, documents, remarks, tracking, projects, reports). The plan covers:

- **77 pages** across 15+ modules
- **30+ entities** with full CRUD requirements
- **~80 API endpoints** to implement
- **PostgreSQL** schema with Prisma ORM
- **JWT** authentication with role-based access

---

## 2. System Audit — Data Source by Module

| Module | Pages | Current Data Source | API Used? |
|--------|-------|---------------------|-----------|
| **Auth** | login, register | API | ✅ Yes |
| **Dashboard** | dashboard, dashboard/yard | demoData | ❌ No |
| **Materials** | materials | materialsData + demoData | ❌ No |
| **Sourcing** | suppliers, customers, contracts, pricing | demoData | ❌ No |
| **Gate** | gate, gate/[id], walk-in, announcements | demoData | ❌ No |
| **Logistics** | vehicles, drivers, containers, dispatch | demoData | ❌ No |
| **Fleet** | vehicles, drivers, orders, operations | API | ✅ Yes |
| **Production** | production, lots, oee | demoData | ❌ No |
| **Warehouse** | warehouse, movements, inventory-check | demoData | ❌ No |
| **Sales** | sales, export-docs, loading | demoData | ❌ No |
| **HR** | hr, hr/new, hr/incidents | demoData | ❌ No |
| **Maintenance** | maintenance, parts | demoData | ❌ No |
| **Finance** | finance, payables, receivables, cash, tax, costing | demoData | ❌ No |
| **Inventory** | inventory, materials, suppliers, transactions | API | ✅ Yes |
| **Documents** | documents | API | ✅ Yes |
| **Remarks** | remarks | API | ✅ Yes |
| **Tracking** | tracking | API | ✅ Yes |
| **Projects** | projects | API | ✅ Yes |
| **Reports** | reports | API | ✅ Yes |
| **Admin** | admin/pricing | demoData | ❌ No |
| **Other** | yard, dispatch, dispatch, dispatch | demoData | ❌ No |

---

## 3. Entity Schema (PostgreSQL + Prisma)

### 3.1 Core Entities

```prisma
// User & Auth
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  name          String
  role          String   // admin, manager, operator, viewer
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// Suppliers (Sourcing CRM)
model Supplier {
  id          String   @id @default(cuid())
  code        String   @unique  // S-1001
  name        String
  jib         String?
  pdv         Boolean  @default(false)
  type        String   // Industrija, Sakupljač, Komunalno, Fizičko Lice
  bonitet     String   // A, B, C
  city        String?
  address     String?
  phone       String?
  email       String?
  balance     Decimal  @default(0)
  paymentDays Int      @default(15)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  contracts   Contract[]
  announcements Announcement[]
}

// Customers
model Customer {
  id           String   @id @default(cuid())
  code         String   @unique  // C-001
  name         String
  country      String   @default("BA")
  creditLimit  Decimal  @default(0)
  balance      Decimal  @default(0)
  blocked      Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  salesOrders  SalesOrder[]
}

// Materials (Catalog + Variants)
model Material {
  id           String   @id @default(cuid())
  code         String   @unique  // CU-MB
  name         String
  category     String   // Obojeni, Crni, Opasni, ELV
  baseUnit     String   @default("KG")
  lmeLinked    Boolean  @default(false)
  basePrice    Decimal?
  margin       Decimal?
  buyPrice     Decimal?
  chemicalData Json?    // { cu, al, fe, zn, pb, ni }
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  variants     MaterialVariant[]
}

model MaterialVariant {
  id          String   @id @default(cuid())
  materialId  String
  material    Material @relation(fields: [materialId], references: [id])
  grade       String
  condition   String
  minPurity   Decimal?
  buyPrice    Decimal
  chemicalData Json?
}

// Contracts
model Contract {
  id          String   @id @default(cuid())
  code        String   @unique  // UGV-2026-001
  supplierId  String
  supplier    Supplier @relation(fields: [supplierId], references: [id])
  materialId  String
  material    Material @relation(fields: [materialId], references: [id])
  formula     String   // LME -15%, Fiksno 0.30
  qtyTons     Decimal
  period      String
  status      String   // Aktivan, Završen
  startDate   DateTime?
  endDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Gate Announcements (Purchase Orders)
model Announcement {
  id          String   @id @default(cuid())
  code        String   @unique  // PO-2026-554
  supplierId  String
  supplier    Supplier @relation(fields: [supplierId], references: [id])
  materialId  String
  material    Material @relation(fields: [materialId], references: [id])
  expectedKg  Decimal
  contractId  String?
  contract    Contract? @relation(fields: [contractId], references: [id])
  status      String   // Najavljeno, U Krugu, Završeno
  expectedDate DateTime
  truck       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Weigh Tickets
model WeighTicket {
  id          String   @id @default(cuid())
  code        String   @unique  // W-108842
  date        DateTime
  plate       String
  supplierId  String?
  supplier    Supplier? @relation(fields: [supplierId], references: [id])
  materialId  String
  material    Material @relation(fields: [materialId], references: [id])
  gross       Decimal
  tare        Decimal
  kalo        Decimal  @default(0)
  net         Decimal
  pricePerKg  Decimal
  total       Decimal
  status      String   // Čeka 2. Vaganje, Zatvoren
  type        String   // Ulaz, Izlaz, POS
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lots        Lot[]
}

// Trucks On-Site
model TruckOnSite {
  id          String   @id @default(cuid())
  plate       String
  supplierId  String?
  material    String?
  entryTime   DateTime
  status      String
  statusColor String?
}

// Lots (Traceability)
model Lot {
  id            String   @id @default(cuid())
  code          String   @unique  // LOT-26-0055
  materialId    String
  material      Material @relation(fields: [materialId], references: [id])
  supplierId    String?
  ticketId     String?
  ticket        WeighTicket? @relation(fields: [ticketId], references: [id])
  dateReceived  DateTime
  kg            Decimal
  location      String?
  status        String   // Dostupno, U Preradi, Prerađeno
  contractId    String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// Work Orders (Production)
model WorkOrder {
  id          String   @id @default(cuid())
  code        String   @unique  // WO-2026-041
  materialId  String
  material    Material @relation(fields: [materialId], references: [id])
  machine     String
  inputKg     Decimal
  outputKg    Decimal  @default(0)
  yield       Decimal  @default(0)
  status      String   // Planirano, U Toku, Završen
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Sales Orders
model SalesOrder {
  id          String   @id @default(cuid())
  code        String   @unique  // SO-2026-018
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  materialId  String
  material    Material @relation(fields: [materialId], references: [id])
  qtyKg       Decimal
  pricePerKg  Decimal
  total       Decimal
  status      String
  exportDocs  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Inventory (Stock by Zone)
model InventoryStock {
  id          String   @id @default(cuid())
  materialId  String
  material    Material @relation(fields: [materialId], references: [id])
  zone        String
  stockKg     Decimal
  avgBuyPrice Decimal
  mktPrice    Decimal?
  margin      Decimal?
}

// Warehouse Zones
model WarehouseZone {
  id        String   @id @default(cuid())
  zone      String   @unique
  type      String   // Zatvoreno, Otvoreno, Specijalan
  materials String?
  capacity  String?
}

// Containers
model Container {
  id          String   @id @default(cuid())
  code        String   @unique  // CNT-001
  type        String
  location    String
  status      String   // Prazan, Kod Klijenta, U Tranzitu, Na Servisu
  lastMoved   DateTime?
  daysAtClient Int?
}

// Vehicles (Fleet)
model Vehicle {
  id          String   @id @default(cuid())
  code        String   @unique  // V-001
  plate       String   @unique
  type        String
  brand       String?
  km          Int      @default(0)
  fuelAvg     Decimal?
  regExpiry   DateTime?
  status      String
  images      String[] // URLs
}

// Drivers
model Driver {
  id          String   @id @default(cuid())
  code        String   @unique  // D-001
  name        String
  phone       String?
  vehicleId   String?
  vehicle     Vehicle?  @relation(fields: [vehicleId], references: [id])
  license     String
  hoursToday  Decimal  @default(0)
  status      String
}

// Workers (HR)
model Worker {
  id          String   @id @default(cuid())
  code        String   @unique  // W-001
  name        String
  role        String
  shift       String
  status      String
  htxExpiry   DateTime?
  medicalExpiry DateTime?
}

// Shifts
model Shift {
  id          String   @id @default(cuid())
  date        DateTime
  shift       String
  workers     Int
  supervisor  String?

// HSE Incidents
model Incident {
  id              String   @id @default(cuid())
  code            String   @unique  // INC-005
  date            DateTime
  type            String
  location        String
  description     String
  workerId        String?
  severity        String
  status          String
  correctiveAction String?
}

// Maintenance Orders
model MaintenanceOrder {
  id          String   @id @default(cuid())
  code        String   @unique  // MO-2026-012
  machine     String
  type        String
  task        String
  scheduled   DateTime
  assignedTo  String
  status      String
  priority    String
}

// Spare Parts
model SparePart {
  id          String   @id @default(cuid())
  code        String   @unique  // SP-001
  name        String
  machine     String
  stockQty    Int
  minQty      Int
  price       Decimal
  status      String
}

// Dispatch Orders
model DispatchOrder {
  id          String   @id @default(cuid())
  code        String   @unique  // NV-2026-088
  driverId    String
  vehicleId   String
  route       String
  status      String
  eta         String?
}

// Market Data
model LmePrice {
  id        String   @id @default(cuid())
  metal     String
  price     Decimal
  change    Decimal
  currency  String
  updatedAt DateTime @updatedAt
}

model FxRate {
  id        String   @id @default(cuid())
  pair     String
  rate     Decimal
  updatedAt DateTime @updatedAt
}

// GL Entries
model GlEntry {
  id        String   @id @default(cuid())
  date      DateTime
  account   String
  debit     Decimal
  credit    Decimal
  ref       String?
  desc      String?
}

// Documents & Remarks
model Document {
  id          String   @id @default(cuid())
  filename    String
  url         String
  description String?
  uploadedBy  String?
  createdAt   DateTime @default(now())
}

model Remark {
  id        String   @id @default(cuid())
  title     String
  content   String?
  images    String[]
  createdAt DateTime @default(now())
}

// Projects
model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  status      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 4. Complete API Endpoint Specification

### 4.1 Auth

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/login` | Login (email, password) → { token, user } |
| POST | `/auth/register` | Register (name, email, password, role) → { token, user } |
| GET | `/auth/me` | Get current user (requires token) |
| POST | `/auth/logout` | Invalidate token (optional) |

### 4.2 Sourcing

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/sourcing/suppliers` | List suppliers (filter, search) |
| GET | `/sourcing/suppliers/:id` | Supplier detail + transactions |
| POST | `/sourcing/suppliers` | Create supplier |
| PUT | `/sourcing/suppliers/:id` | Update supplier |
| DELETE | `/sourcing/suppliers/:id` | Deactivate supplier |
| GET | `/sourcing/customers` | List customers |
| GET | `/sourcing/customers/:id` | Customer detail |
| POST | `/sourcing/customers` | Create customer |
| PUT | `/sourcing/customers/:id` | Update customer |
| GET | `/sourcing/contracts` | List contracts |
| GET | `/sourcing/contracts/:id` | Contract detail |
| POST | `/sourcing/contracts` | Create contract |
| PUT | `/sourcing/contracts/:id` | Update contract |
| GET | `/sourcing/pricing` | LME-linked buy prices + overrides |
| PUT | `/sourcing/pricing/:materialCode` | Override buy price |

### 4.3 Gate

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/gate/announcements` | List announcements |
| GET | `/gate/announcements/:id` | Announcement detail |
| POST | `/gate/announcements` | Create announcement |
| PUT | `/gate/announcements/:id` | Update announcement |
| GET | `/gate/tickets` | List weigh tickets |
| GET | `/gate/tickets/:id` | Ticket detail |
| POST | `/gate/tickets` | Create ticket (1st weigh) |
| PUT | `/gate/tickets/:id` | Update ticket (2nd weigh, close) |
| GET | `/gate/trucks` | Trucks on-site |
| POST | `/gate/trucks` | Register truck entry |
| PUT | `/gate/trucks/:plate` | Update truck status |
| POST | `/gate/walk-in` | POS walk-in purchase |

### 4.4 Materials

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/materials` | List materials (with variants, chemicalData) |
| GET | `/materials/:code` | Material detail |
| POST | `/materials` | Create material |
| PUT | `/materials/:code` | Update material |
| POST | `/materials/:code/variants` | Add variant |
| PUT | `/materials/:code/variants/:id` | Update variant |

### 4.5 Logistics

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/logistics/vehicles` | List vehicles |
| GET | `/logistics/vehicles/:id` | Vehicle detail |
| POST | `/logistics/vehicles` | Create vehicle |
| PUT | `/logistics/vehicles/:id` | Update vehicle |
| GET | `/logistics/drivers` | List drivers |
| POST | `/logistics/drivers` | Create driver |
| PUT | `/logistics/drivers/:id` | Update driver |
| GET | `/logistics/containers` | List containers |
| POST | `/logistics/containers` | Register container |
| PUT | `/logistics/containers/:id` | Update container |
| GET | `/logistics/dispatch` | List dispatch orders |
| POST | `/logistics/dispatch` | Create dispatch order |
| PUT | `/logistics/dispatch/:id` | Update dispatch order |

### 4.6 Fleet (existing API)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/fleet/vehicles` | List vehicles |
| GET | `/fleet/vehicles/:id` | Vehicle detail |
| POST | `/fleet/vehicles` | Create vehicle (multipart: images) |
| PUT | `/fleet/vehicles/:id` | Update vehicle |
| GET | `/fleet/drivers` | List drivers |
| GET | `/fleet/drivers/:id/history` | Driver history |
| POST | `/fleet/drivers` | Create driver |
| GET | `/fleet/orders` | List orders |
| POST | `/fleet/orders` | Create order |
| POST | `/fleet/maintenance` | Create maintenance log (multipart) |
| POST | `/fleet/fuel` | Create fuel log (multipart) |
| POST | `/fleet/registrations` | Create registration (multipart) |

### 4.7 Production

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/production/work-orders` | List work orders |
| GET | `/production/work-orders/:id` | Work order detail |
| POST | `/production/work-orders` | Create work order |
| PUT | `/production/work-orders/:id` | Update work order |
| GET | `/production/lots` | List lots |
| GET | `/production/lots/:id` | Lot genealogy |
| POST | `/production/lots` | Create lot |
| GET | `/production/oee` | OEE efficiency data |

### 4.8 Warehouse

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/warehouse/inventory` | Stock by zone |
| GET | `/warehouse/zones` | List zones |
| GET | `/warehouse/movements` | Stock movements |
| POST | `/warehouse/movements` | Record movement |
| GET | `/warehouse/inventory-check` | List inventory checks |
| POST | `/warehouse/inventory-check` | Create inventory check |

### 4.9 Sales

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/sales/orders` | List sales orders |
| GET | `/sales/orders/:id` | Order detail |
| POST | `/sales/orders` | Create order |
| PUT | `/sales/orders/:id` | Update order |
| GET | `/sales/export-docs` | Export documents list |
| POST | `/sales/export-docs` | Generate export document |
| GET | `/sales/loading` | Loading & control data |

### 4.10 HR

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/hr/workers` | List workers |
| POST | `/hr/workers` | Create worker |
| PUT | `/hr/workers/:id` | Update worker |
| GET | `/hr/shifts` | List shifts |
| POST | `/hr/shifts` | Create shift |
| GET | `/hr/incidents` | List incidents |
| POST | `/hr/incidents` | Report incident |
| PUT | `/hr/incidents/:id` | Update incident |

### 4.11 Maintenance

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/maintenance/orders` | List maintenance orders |
| POST | `/maintenance/orders` | Create order |
| PUT | `/maintenance/orders/:id` | Update order |
| GET | `/maintenance/parts` | List spare parts |
| POST | `/maintenance/parts` | Create part |
| PUT | `/maintenance/parts/:id` | Update part |

### 4.12 Finance

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/finance/summary` | Financial summary |
| GET | `/finance/gl` | GL entries |
| GET | `/finance/payables` | AP list |
| GET | `/finance/receivables` | AR list |
| GET | `/finance/cash` | Cash registers |
| GET | `/finance/tax` | Tax engine data |
| GET | `/finance/costing` | COGS & valuation |

### 4.13 Inventory (existing)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/inventory/materials` | List materials |
| POST | `/inventory/materials` | Create material |
| GET | `/inventory/suppliers` | List suppliers |
| POST | `/inventory/suppliers` | Create supplier |
| POST | `/inventory/transactions/purchase` | Purchase transaction |
| POST | `/inventory/transactions/sale` | Sale transaction |

### 4.14 Market Data

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/market/lme` | LME prices |
| GET | `/market/fx` | FX rates |
| PUT | `/market/lme` | Admin override LME |

### 4.15 Documents & Remarks (existing)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/documents` | List documents |
| POST | `/documents` | Upload (multipart) |
| DELETE | `/documents/:id` | Delete document |
| GET | `/remarks` | List remarks |
| POST | `/remarks` | Create remark (multipart) |

### 4.16 Tracking (existing)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/tracking/shift/start` | Start shift |
| POST | `/tracking/shift/end` | End shift |
| POST | `/tracking/location` | Update location (lat, lng) |

### 4.17 Projects & Reports (existing)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/projects` | List projects |
| GET | `/projects/:id` | Project detail |
| POST | `/projects` | Create project |
| GET | `/reports/dashboard` | Dashboard report data |

### 4.18 System

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/alerts` | System alerts |
| GET | `/locations` | Company locations |

---

## 5. Authentication & Middleware

### 5.1 JWT Flow

```
Login → POST /auth/login { email, password }
  → Validate credentials
  → Return { token: "jwt...", user: { id, name, email, role } }
  → Frontend stores token in localStorage
  → All subsequent requests: Authorization: Bearer <token>
```

### 5.2 Middleware

- **Auth middleware:** Validate JWT on all `/api/*` except `/auth/login`, `/auth/register`
- **Role middleware:** Optional RBAC per endpoint (admin, manager, operator, viewer)
- **Rate limiting:** Per IP / per user

### 5.3 Frontend Gaps to Fix

- [ ] Add route protection (redirect to /auth/login if no token)
- [ ] Add logout (clear token, redirect)
- [ ] Implement `/auth/me` on app load
- [ ] Show real user from API in Header

---

## 6. File Upload Handling

| Endpoint | Field | Max Size | Allowed Types |
|----------|-------|----------|---------------|
| POST /documents | file | 10MB | pdf, doc, xlsx, jpg, png |
| POST /remarks | images[] | 5MB each | jpg, png |
| POST /fleet/vehicles | images[] | 5MB each | jpg, png |
| POST /fleet/maintenance | attachments[] | 10MB each | pdf, jpg, png |
| POST /fleet/fuel | receipt | 5MB | jpg, png |
| POST /fleet/registrations | doc | 5MB | pdf, jpg, png |
| POST /hr/incidents | photo | 5MB | jpg, png |

Store files in: `uploads/` (or S3/MinIO for production)

---

## 7. External Integrations

### 7.1 LME & FX

- **Option A:** Cron job to fetch from external API (e.g. LME.com, ECB) every 15 min
- **Option B:** Manual admin override via `/market/lme` PUT
- **Option C:** Webhook or proxy service

### 7.2 Geolocation

- Frontend uses `navigator.geolocation` → POST to `/tracking/location`
- No external API needed

---

## 8. Implementation Phases

### Phase 1: Foundation (Week 1–2)

- [ ] Project setup (Node.js, Express/Fastify, Prisma, PostgreSQL)
- [ ] Auth: login, register, JWT, `/auth/me`
- [ ] Base middleware: auth, error handling, CORS
- [ ] File upload service (multer + storage)

### Phase 2: Core Entities (Week 3–4)

- [ ] Suppliers, Customers, Contracts
- [ ] Materials + Variants (with chemicalData)
- [ ] Announcements
- [ ] Weigh tickets, Trucks on-site

### Phase 3: Gate & Production (Week 5–6)

- [ ] Lots
- [ ] Work orders
- [ ] Sales orders
- [ ] Inventory stock, Warehouse zones

### Phase 4: Logistics & Fleet (Week 7–8)

- [ ] Containers, Vehicles, Drivers
- [ ] Dispatch orders
- [ ] Fleet operations (maintenance, fuel, registration)

### Phase 5: HR, Maintenance, Finance (Week 9–10)

- [ ] Workers, Shifts, Incidents
- [ ] Maintenance orders, Spare parts
- [ ] GL entries, Financial summary
- [ ] Payables, Receivables, Cash registers

### Phase 6: Dashboard & Admin (Week 11–12)

- [ ] LME prices, FX rates
- [ ] System alerts
- [ ] Reports dashboard
- [ ] Admin pricing overrides

### Phase 7: Frontend Migration (Ongoing)

- [ ] Replace demoData imports with API calls
- [ ] Add loading/error states
- [ ] Implement auth guards
- [ ] Test all CRUD flows

---

## 9. Tech Stack Recommendation

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+ |
| Framework | Express.js or Fastify |
| ORM | Prisma |
| Database | PostgreSQL 15+ |
| Auth | JWT (jsonwebtoken) |
| File Storage | Local (dev) / S3 (prod) |
| Validation | Zod or Joi |
| CORS | cors middleware |

---

## 10. Migration Path Summary

| Module | Current | Target | Priority |
|--------|---------|--------|----------|
| Auth | API | ✅ Done | - |
| Sourcing | demoData | API | P1 |
| Gate | demoData | API | P1 |
| Materials | demoData | API | P1 |
| Logistics | demoData | API | P2 |
| Production | demoData | API | P2 |
| Warehouse | demoData | API | P2 |
| Sales | demoData | API | P2 |
| HR | demoData | API | P3 |
| Maintenance | demoData | API | P3 |
| Finance | demoData | API | P3 |
| Dashboard | demoData | API | P3 |
| Fleet | API | ✅ Done | - |
| Documents | API | ✅ Done | - |
| Remarks | API | ✅ Done | - |
| Tracking | API | ✅ Done | - |
| Projects | API | ✅ Done | - |
| Reports | API | ✅ Done | - |

---

## 11. Endpoint Count Summary

| Category | Endpoints |
|----------|-----------|
| Auth | 4 |
| Sourcing | 14 |
| Gate | 12 |
| Materials | 6 |
| Logistics | 12 |
| Fleet | 11 |
| Production | 8 |
| Warehouse | 6 |
| Sales | 7 |
| HR | 8 |
| Maintenance | 6 |
| Finance | 7 |
| Inventory | 4 |
| Market | 3 |
| Documents | 3 |
| Remarks | 2 |
| Tracking | 3 |
| Projects | 3 |
| Reports | 1 |
| System | 2 |
| **Total** | **~122** |

---

*Document generated from full codebase audit. Update as implementation progresses.*
