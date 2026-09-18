import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';
import { emitNotificationRealtime } from './socketServer.js';

const prisma = new PrismaClient();

const VAPID_PUBLIC_KEY = String(process.env.VAPID_PUBLIC_KEY || '').trim();
const VAPID_PRIVATE_KEY = String(process.env.VAPID_PRIVATE_KEY || '').trim();
const VAPID_SUBJECT = String(process.env.VAPID_SUBJECT || 'mailto:admin@milkus.local').trim();

const pushReady = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (pushReady) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

function normalizeRole(value) {
  const role = String(value || '').trim().toLowerCase();
  return role || null;
}

async function collectSubscriptions(notification) {
  if (!pushReady) return [];

  const where = {};
  if (notification.userId) {
    where.userId = notification.userId;
  } else {
    if (notification.companyId) {
      where.companyId = notification.companyId;
    }
    const role = normalizeRole(notification.targetRole);
    if (role) {
      where.user = { role };
    }
  }
  return prisma.notificationSubscription.findMany({
    where,
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });
}

async function sendPushToSubscriptions(notification) {
  const subscriptions = await collectSubscriptions(notification);
  if (!subscriptions.length) return;

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.message,
    data: {
      notificationId: notification.id,
      type: notification.type,
      companyId: notification.companyId || null,
      targetRole: notification.targetRole || null,
      createdAt: notification.createdAt,
    },
  });

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      }, payload);
    } catch (error) {
      const statusCode = Number(error?.statusCode || 0);
      if (statusCode === 404 || statusCode === 410) {
        await prisma.notificationSubscription.deleteMany({ where: { id: subscription.id } });
      }
    }
  }));
}

export async function createNotification(input) {
  const notification = await prisma.notification.create({
    data: {
      type: String(input?.type || 'system'),
      title: String(input?.title || 'Notifikacija'),
      message: String(input?.message || ''),
      payload: input?.payload || null,
      companyId: input?.companyId || null,
      userId: input?.userId || null,
      targetRole: normalizeRole(input?.targetRole),
      isRead: false,
    },
  });

  emitNotificationRealtime(notification);
  await sendPushToSubscriptions(notification);
  return notification;
}

export function getPushPublicKey() {
  return VAPID_PUBLIC_KEY || null;
}

export function isPushConfigured() {
  return pushReady;
}
