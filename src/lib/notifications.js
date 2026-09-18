import { io } from 'socket.io-client';
import api from './api';
import { getAccessToken, getActiveCompanyId } from './authStorage';

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function parseApiBase() {
  const configured = trimTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1');
  if (configured.startsWith('http://') || configured.startsWith('https://')) {
    const withoutApi = configured.replace(/\/api\/v1$/i, '');
    return { url: withoutApi, path: '/api/v1/realtime' };
  }
  return { url: undefined, path: '/api/v1/realtime' };
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getNotifications(limit = 30, onlyUnread = false) {
  const response = await api.get('/notifications', {
    params: { limit, onlyUnread: onlyUnread ? '1' : undefined },
  });
  return response?.data?.data || [];
}

export async function markNotificationRead(notificationId) {
  const response = await api.patch(`/notifications/${notificationId}/read`);
  return response?.data?.data || null;
}

export async function markAllNotificationsRead() {
  const response = await api.patch('/notifications/read-all');
  return response?.data?.data || null;
}

export function createRealtimeSocket() {
  const token = getAccessToken();
  if (!token) return null;
  const activeCompanyId = getActiveCompanyId() || null;
  const base = parseApiBase();
  return io(base.url, {
    path: base.path,
    // Start with HTTP long-polling so connection works even behind proxies
    // that don't properly support websocket upgrades.
    transports: ['polling', 'websocket'],
    timeout: 12000,
    reconnection: true,
    reconnectionAttempts: 20,
    auth: {
      token,
      companyId: activeCompanyId,
    },
  });
}

export async function ensurePushSubscription({ askPermission = false } = {}) {
  if (typeof window === 'undefined') {
    return { subscribed: false, reason: 'server' };
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { subscribed: false, reason: 'unsupported' };
  }

  let permission = Notification.permission;
  if (permission === 'default' && askPermission) {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    return { subscribed: false, reason: 'permission' };
  }

  const publicKeyResponse = await api.get('/notifications/push/public-key');
  const pushConfig = publicKeyResponse?.data?.data || {};
  if (!pushConfig.configured || !pushConfig.publicKey) {
    return { subscribed: false, reason: 'not-configured' };
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(pushConfig.publicKey),
    });
  }

  await api.post('/notifications/subscriptions', subscription.toJSON());
  return { subscribed: true, subscription };
}
