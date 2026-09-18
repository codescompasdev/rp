'use client';

import { useEffect, useRef, useState } from 'react';
import { getCurrentRole, getRoleLabel, setRoleOverride } from '@/lib/userRole';
import api from '@/lib/api';
import { clearAuthSession, getActiveCompanyId, getAuthUser, setActiveCompanyId } from '@/lib/authStorage';
import {
    createRealtimeSocket,
    ensurePushSubscription,
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead
} from '@/lib/notifications';

function mergeNotifications(primary, secondary) {
    const map = new Map();
    [...primary, ...secondary].forEach((item) => {
        if (!item) return;
        const id = String(item.id || '');
        if (!id) return;
        const existing = map.get(id) || {};
        map.set(id, { ...existing, ...item });
    });
    return Array.from(map.values())
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 40);
}

function formatNotificationTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
}

const Header = () => {
    const [showAlerts, setShowAlerts] = useState(false);
    const [role, setRole] = useState('worker');
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isCompact, setIsCompact] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isTiny, setIsTiny] = useState(false);
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [pushState, setPushState] = useState({ subscribed: false, reason: null });
    const [socketConnected, setSocketConnected] = useState(false);
    const [socketError, setSocketError] = useState('');
    const audioContextRef = useRef(null);
    const authUser = getAuthUser();
    const isAdminUser = String(authUser?.role || '').toLowerCase() === 'admin';
    const isOwnerRole = role === 'owner';

    useEffect(() => {
        setRole(getCurrentRole());
        if (typeof window !== 'undefined') {
            const onResize = () => {
                const width = window.innerWidth;
                setIsCompact(width < 980);
                setIsMobile(width <= 880);
                setIsTiny(width <= 520);
            };
            onResize();
            window.addEventListener('resize', onResize);
            return () => window.removeEventListener('resize', onResize);
        }
    }, []);

    useEffect(() => {
        const unlockAudio = () => {
            if (audioContextRef.current) return;
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            try {
                audioContextRef.current = new AudioCtx();
            } catch {}
        };
        window.addEventListener('pointerdown', unlockAudio, { once: true });
        window.addEventListener('keydown', unlockAudio, { once: true });
        return () => {
            window.removeEventListener('pointerdown', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const loadLocations = async () => {
            try {
                const res = await api.get('/locations');
                const rows = res?.data?.data || [];
                if (cancelled) return;
                setLocations(rows);

                const stored = getActiveCompanyId();
                const preferred = [stored, authUser?.activeCompanyId, authUser?.companyId].filter(Boolean);
                const validPreferred = preferred.find((id) => rows.some((row) => row.id === id));
                const fallback = (authUser?.companyId && rows.some((row) => row.id === authUser.companyId))
                    ? authUser.companyId
                    : (validPreferred || rows[0]?.id || '');
                if (fallback) {
                    setSelectedLocation(fallback);
                    setActiveCompanyId(fallback);
                } else {
                    setSelectedLocation('');
                    setActiveCompanyId('');
                }
            } catch {
                if (!cancelled) setLocations([]);
            }
        };
        loadLocations();
        return () => { cancelled = true; };
    }, []);

    const playNotificationSound = () => {
        const audioContext = audioContextRef.current;
        if (!audioContext || audioContext.state === 'closed') return;
        try {
            if (audioContext.state === 'suspended') {
                audioContext.resume().catch(() => {});
            }
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1320, audioContext.currentTime + 0.08);
            gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.18);
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch {}
    };

    useEffect(() => {
        const handleBeforeInstallPrompt = (event) => {
            event.preventDefault();
            setInstallPrompt(event);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const rows = await getNotifications(30);
                if (cancelled) return;
                setNotifications((previous) => mergeNotifications(rows, previous));
            } catch {
                if (!cancelled) {
                    // Keep existing notifications if refresh fails.
                    setNotifications((previous) => previous);
                }
            }
        };

        load();
        const poll = window.setInterval(load, 10000);
        return () => {
            cancelled = true;
            window.clearInterval(poll);
        };
    }, []);

    useEffect(() => {
        setUnreadCount(notifications.filter((row) => !row.isRead).length);
    }, [notifications]);

    useEffect(() => {
        const socket = createRealtimeSocket();
        if (!socket) return undefined;

        socket.on('connect', () => {
            setSocketConnected(true);
            setSocketError('');
        });
        socket.on('realtime:connected', () => {
            setSocketConnected(true);
            setSocketError('');
        });
        socket.on('disconnect', () => setSocketConnected(false));
        socket.on('connect_error', (error) => {
            setSocketConnected(false);
            setSocketError(error?.message || 'Socket connect error');
        });
        socket.on('notifications:new', (incoming) => {
            const normalizedIncoming = {
                ...incoming,
                id: incoming?.id || `local-${Date.now()}`,
                title: incoming?.title || 'Notifikacija',
                message: incoming?.message || '',
                createdAt: incoming?.createdAt || new Date().toISOString(),
                isRead: Boolean(incoming?.isRead),
            };
            setNotifications((previous) => {
                return mergeNotifications([normalizedIncoming], previous);
            });
            if (!normalizedIncoming.isRead) {
                playNotificationSound();
            }
        });

        if (isAdminUser) {
            const activeCompanyId = getActiveCompanyId();
            if (activeCompanyId) {
                socket.emit('notifications:join-company', activeCompanyId);
            }
        }

        return () => {
            socket.disconnect();
        };
    }, [isAdminUser]);

    useEffect(() => {
        let cancelled = false;
        ensurePushSubscription({ askPermission: false })
            .then((result) => {
                if (!cancelled) setPushState(result);
            })
            .catch(() => {
                if (!cancelled) setPushState({ subscribed: false, reason: 'error' });
            });
        return () => { cancelled = true; };
    }, []);

    const handleInstall = async () => {
        if (!installPrompt) {
            return;
        }
        installPrompt.prompt();
        await installPrompt.userChoice;
        setInstallPrompt(null);
    };

    const handleRoleChange = (event) => {
        if (!isAdminUser) return;
        const selectedRole = event.target.value;
        setRoleOverride(selectedRole);
        setRole(selectedRole);
        window.location.reload();
    };

    const handleLocationChange = (event) => {
        if (!isAdminUser) {
            return;
        }
        const nextLocation = event.target.value;
        setSelectedLocation(nextLocation);
        setActiveCompanyId(nextLocation);
        window.location.reload();
    };

    const handleLogout = () => {
        clearAuthSession();
        if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
        }
    };

    const handleEnablePush = async () => {
        try {
            const result = await ensurePushSubscription({ askPermission: true });
            setPushState(result);
        } catch {
            setPushState({ subscribed: false, reason: 'error' });
        }
    };

    const handleMarkAsRead = async (notificationId) => {
        try {
            await markNotificationRead(notificationId);
            setNotifications((previous) => previous.map((item) => (
                item.id === notificationId
                    ? { ...item, isRead: true, readAt: new Date().toISOString() }
                    : item
            )));
        } catch {}
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications((previous) => previous.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() })));
        } catch {}
    };

    return (
        <header style={{
            height: 'var(--header-height)',
            backgroundColor: '#0f172a',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isMobile ? '0 8px' : '0 16px',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            zIndex: 1000,
            borderBottom: '1px solid #1e293b',
        }}>
            {/* Left: Logo + Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', minWidth: 0 }}>
                <div style={{
                    width: '28px', height: '28px',
                    background: '#f59e0b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '14px', color: '#0f172a',
                }}>M</div>
                <span style={{ fontWeight: '700', fontSize: isMobile ? '12px' : '14px', letterSpacing: '0.08em', color: '#f8fafc', whiteSpace: 'nowrap' }}>
                    {isTiny ? 'MILKUS' : 'MILKUS ERP'}
                </span>
                {!isMobile && (
                    <span style={{ fontSize: '11px', color: '#475569', borderLeft: '1px solid #334155', paddingLeft: '12px', marginLeft: '4px' }}>
                        COMPAS CODES
                    </span>
                )}
            </div>

            {/* Center: LME Ticker */}
            {!isCompact && <div style={{
                flex: 1,
                overflow: 'hidden',
                margin: '0 24px',
                position: 'relative',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
            }}>
                <div style={{
                    display: 'flex',
                    gap: '24px',
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    animation: 'tickerScroll 30s linear infinite',
                }}>
                    <span>LME Cu: <span style={{ color: '#ef4444' }}>$8,450 ▼-1.2%</span></span>
                    <span>LME Al: <span style={{ color: '#10b981' }}>$2,180 ▲+0.5%</span></span>
                    <span>LME Zn: <span style={{ color: '#94a3b8' }}>$2,420 ➖0.0%</span></span>
                    <span>LME Ni: <span style={{ color: '#10b981' }}>$16,250 ▲+1.8%</span></span>
                    <span style={{ color: '#94a3b8' }}>│</span>
                    <span>BAM/EUR: 1.9558</span>
                    <span>EUR/USD: 1.0842</span>
                    <span style={{ color: '#94a3b8' }}>│</span>
                    <span>LME Cu: <span style={{ color: '#ef4444' }}>$8,450 ▼-1.2%</span></span>
                    <span>LME Al: <span style={{ color: '#10b981' }}>$2,180 ▲+0.5%</span></span>
                </div>
            </div>}

            {/* Right: Location + Alerts + User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px' }}>
                {
                    isAdminUser && isOwnerRole
                        ? (
                            <select
                                value={selectedLocation}
                                onChange={handleLocationChange}
                                style={{
                                    background: '#1e293b', color: '#e2e8f0', borderRadius: 30, border: '1px solid #334155',
                                    padding: '4px 8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                                }}
                            >
                                {(locations.length ? locations : [{ id: '', code: 'N/A', name: 'No locations' }]).map((location) => (
                                    <option key={location.id || location.code} value={location.id}>
                                        {isCompact ? location.code : location.code ? `${location.code} - ${location.name}` : location.name}
                                    </option>
                                ))}
                            </select>
                        )
                        : (
                            <div style={{
                                background: '#1e293b',
                                color: '#e2e8f0',
                                borderRadius: 30,
                                border: '1px solid #334155',
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: '600',
                                whiteSpace: 'nowrap',
                            }}>
                                {(locations.find((location) => location.id === selectedLocation)?.code && locations.find((location) => location.id === selectedLocation)?.name)
                                    ? `${locations.find((location) => location.id === selectedLocation)?.code} - ${locations.find((location) => location.id === selectedLocation)?.name}`
                                    : 'Lokacija automatski dodijeljena'}
                            </div>
                        )
                }

                {isAdminUser ? (
                    <select
                        value={role}
                        onChange={handleRoleChange}
                        style={{
                            background: '#1e293b', color: '#e2e8f0', borderRadius: 30, border: '1px solid #334155',
                            padding: isMobile ? '4px 6px' : '4px 8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', maxWidth: isTiny ? '96px' : 'none',
                        }}
                    >
                        <option value="owner">{isTiny ? 'Vlasnik' : 'Uloga: Vlasnik'}</option>
                        <option value="worker">{isTiny ? 'Radnik' : 'Uloga: Radnik'}</option>
                    </select>
                ) : null}

                <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowAlerts(!showAlerts)}>
                    <span style={{ fontSize: '16px' }}>🔔</span>
                    {unreadCount > 0 ? (
                        <span style={{
                            position: 'absolute', top: '-6px', right: '-8px',
                            background: '#ef4444', color: 'white', fontSize: '9px',
                            padding: '1px 4px', fontWeight: 'bold', minWidth: '14px', textAlign: 'center',
                        }}>{unreadCount}</span>
                    ) : null}
                </div>

                <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                        background: '#7f1d1d',
                        color: '#fee2e2',
                        border: '1px solid #b91c1c',
                        borderRadius: 30,
                        padding: isTiny ? '4px 6px' : '4px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {isTiny ? '⎋' : isMobile ? 'Logout' : 'Odjava'}
                </button>

                {installPrompt && (
                    <button
                        type="button"
                        onClick={handleInstall}
                        style={{
                            background: '#0ea5e9',
                            color: '#e0f2fe',
                            border: '1px solid #0284c7',
                            borderRadius: 30,
                            padding: isTiny ? '4px 6px' : '4px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        {isTiny ? '⬇' : isMobile ? 'Install' : 'Instaliraj App'}
                    </button>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid #334155', paddingLeft: isTiny ? '6px' : '10px' }}>
                    <div style={{
                        width: '24px', height: '24px', background: '#334155',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 'bold', color: '#e2e8f0',
                    }}>A</div>
                    <div style={{ lineHeight: '1.2', display: isTiny ? 'none' : 'block' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600' }}>{isCompact ? 'usr' : 'admin'}</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{getRoleLabel(role)}</div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes tickerScroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
            {showAlerts && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(var(--header-height) - 2px)',
                    right: '12px',
                    width: 'min(320px, calc(100vw - 20px))',
                    background: '#0b1220',
                    border: '1px solid #334155',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.45)',
                    padding: '8px',
                    zIndex: 1200,
                }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Notifikacije
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ fontSize: '11px', color: socketConnected ? '#10b981' : '#f59e0b' }}>
                            {socketConnected ? 'Realtime ukljucen' : 'Realtime reconnect (polling fallback)...'}
                        </div>
                        {unreadCount > 0 ? (
                            <button
                                type="button"
                                onClick={handleMarkAllRead}
                                style={{
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    color: '#cbd5e1',
                                    fontSize: '10px',
                                    padding: '4px 8px',
                                    cursor: 'pointer',
                                }}
                            >
                                Oznaci sve procitano
                            </button>
                        ) : null}
                    </div>
                    {!pushState.subscribed ? (
                        <button
                            type="button"
                            onClick={handleEnablePush}
                            style={{
                                width: '100%',
                                marginBottom: '8px',
                                background: '#0ea5e9',
                                border: '1px solid #0284c7',
                                color: '#e0f2fe',
                                fontSize: '11px',
                                padding: '6px 8px',
                                cursor: 'pointer',
                            }}
                        >
                            Omoguci push notifikacije
                        </button>
                    ) : null}
                    {!socketConnected && socketError ? (
                        <div style={{ fontSize: '10px', color: '#fda4af', marginBottom: '8px' }}>
                            Socket: {socketError}
                        </div>
                    ) : null}
                    {notifications.length === 0 ? (
                        <div style={{ padding: '7px 8px', border: '1px solid #1e293b', color: '#94a3b8', fontSize: '12px' }}>
                            Nema novih notifikacija.
                        </div>
                    ) : notifications.map((item) => (
                        <div key={item.id} style={{ padding: '7px 8px', border: '1px solid #1e293b', color: '#e2e8f0', fontSize: '12px', marginBottom: '6px', background: item.isRead ? 'transparent' : 'rgba(239, 68, 68, 0.08)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                                <div style={{ fontWeight: 700, color: '#f8fafc' }}>{item.title || 'Notifikacija'}</div>
                                <div style={{ color: '#94a3b8', fontSize: '10px' }}>{formatNotificationTime(item.createdAt)}</div>
                            </div>
                            <div style={{ color: '#cbd5e1' }}>{item.message}</div>
                            {!item.isRead ? (
                                <button
                                    type="button"
                                    onClick={() => handleMarkAsRead(item.id)}
                                    style={{
                                        marginTop: '6px',
                                        background: '#1e293b',
                                        border: '1px solid #334155',
                                        color: '#cbd5e1',
                                        fontSize: '10px',
                                        padding: '3px 6px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Oznaci procitano
                                </button>
                            ) : null}
                        </div>
                    ))}
                </div>
            )}
        </header>
    );
};

export default Header;
