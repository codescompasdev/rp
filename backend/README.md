# Milkus ERP Backend

Express + Prisma + PostgreSQL API for the Milkus ERP frontend.

**Multi-tenant:** 3 companies (Pale, Banja Luka, Bijeljina). One admin has access to all; workers/vehicles/drivers are scoped per company.

## Setup

1. **Install dependencies**
   ```bash
   cd backend && npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL URL (example below)
   ```
   Primarni lokalni primjer:
   ```env
   DATABASE_URL="postgresql://davidobradovic:NovaLozinka123!@localhost:5432/milkus_erp"
   PORT=5500
   JWT_SECRET="dev-secret"
   ```

3. **Start PostgreSQL** (choose one)
   - Docker: `docker compose up -d` (from backend folder; default user/pass `postgres/postgres`)
   - Or: `docker run -d --name milkus-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=milkus_erp -p 5432:5432 postgres:15`
   - Or use your local PostgreSQL and create database `milkus_erp`

### pgAdmin quick setup (localhost)

If you use pgAdmin with your local user:
- Host: `localhost`
- Port: `5432`
- Maintenance DB: `postgres` (or `milkus_erp`)
- Username: `davidobradovic`
- Password: `NovaLozinka123!`

If password authentication fails, verify that your local Postgres role/database exist:
```sql
CREATE ROLE davidobradovic WITH LOGIN PASSWORD 'NovaLozinka123!';
CREATE DATABASE milkus_erp OWNER davidobradovic;
GRANT ALL PRIVILEGES ON DATABASE milkus_erp TO davidobradovic;
```

4. **Initialize database**
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. **Run the server**
   ```bash
   npm run dev
   ```

API runs at `http://localhost:5500/api/v1`

## Default Login

- **Email:** admin@milkus.ba
- **Password:** admin123

## Endpoints

See `BACKEND_IMPLEMENTATION_PLAN.md` in the project root for the full API specification.
