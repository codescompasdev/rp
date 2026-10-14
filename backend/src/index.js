import 'dotenv/config';
import express from 'express';
// greške iz async ruta idu u error handler umjesto da obore server
import 'express-async-errors';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { authMiddleware } from './middleware/auth.js';

import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import sourcingRoutes from './routes/sourcing.js';
import gateRoutes from './routes/gate.js';
import materialsRoutes from './routes/materials.js';
import logisticsRoutes from './routes/logistics.js';
import fleetRoutes from './routes/fleet.js';
import productionRoutes from './routes/production.js';
import warehouseRoutes from './routes/warehouse.js';
import salesRoutes from './routes/sales.js';
import hrRoutes from './routes/hr.js';
import maintenanceRoutes from './routes/maintenance.js';
import financeRoutes from './routes/finance.js';
import inventoryRoutes from './routes/inventory.js';
import marketRoutes from './routes/market.js';
import documentsRoutes from './routes/documents.js';
import remarksRoutes from './routes/remarks.js';
import trackingRoutes from './routes/tracking.js';
import projectsRoutes from './routes/projects.js';
import reportsRoutes from './routes/reports.js';
import systemRoutes from './routes/system.js';
import yardRoutes from './routes/yard.js';
import scaleSignalService from './services/scaleSignalService.js';
import { initSocketServer } from './services/socketServer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5500;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/sourcing', authMiddleware, sourcingRoutes);
app.use('/api/v1/gate', gateRoutes);
app.use('/api/v1/materials', authMiddleware, materialsRoutes);
app.use('/api/v1/logistics', authMiddleware, logisticsRoutes);
app.use('/api/v1/fleet', authMiddleware, fleetRoutes);
app.use('/api/v1/production', authMiddleware, productionRoutes);
app.use('/api/v1/warehouse', authMiddleware, warehouseRoutes);
app.use('/api/v1/sales', authMiddleware, salesRoutes);
app.use('/api/v1/hr', authMiddleware, hrRoutes);
app.use('/api/v1/maintenance', authMiddleware, maintenanceRoutes);
app.use('/api/v1/finance', authMiddleware, financeRoutes);
app.use('/api/v1/inventory', authMiddleware, inventoryRoutes);
app.use('/api/v1/market', authMiddleware, marketRoutes);
app.use('/api/v1/documents', authMiddleware, documentsRoutes);
app.use('/api/v1/remarks', authMiddleware, remarksRoutes);
app.use('/api/v1/tracking', authMiddleware, trackingRoutes);
app.use('/api/v1/projects', authMiddleware, projectsRoutes);
app.use('/api/v1/reports', authMiddleware, reportsRoutes);
app.use('/api/v1/yard', authMiddleware, yardRoutes);
app.get('/api/v1/health', (_, res) => res.json({ ok: true }));
app.use('/api/v1', authMiddleware, systemRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

initSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Milkus ERP API running at http://localhost:${PORT}/api/v1`);
});

scaleSignalService.start().catch((error) => {
  console.error('Scale signal service failed to start', error);
});
