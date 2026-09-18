import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

function normalize(value) {
  return String(value || '').trim();
}

router.post('/contact', async (req, res) => {
  const firstName = normalize(req.body?.firstName);
  const lastName = normalize(req.body?.lastName);
  const email = normalize(req.body?.email).toLowerCase();
  const phone = normalize(req.body?.phone) || null;
  const message = normalize(req.body?.message);
  const source = normalize(req.body?.source) || 'website';

  if (!firstName || !lastName || !email || !message) {
    return res.status(400).json({ error: 'firstName, lastName, email and message are required' });
  }
  if (!email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const data = await prisma.inboundMessage.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      message,
      source,
      status: 'new',
    },
  });
  return res.status(201).json({ data });
});

export default router;
