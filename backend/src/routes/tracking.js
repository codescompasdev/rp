import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.post('/shift/start', async (req, res) => {
  res.json({ data: { message: 'Shift started' } });
});

router.post('/shift/end', async (req, res) => {
  res.json({ data: { message: 'Shift ended' } });
});

router.post('/location', async (req, res) => {
  const { latitude, longitude } = req.body;
  res.json({ data: { latitude, longitude, received: true } });
});

export default router;
