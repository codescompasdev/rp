'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronRight, Download, LogOut, MapPin, Menu } from 'lucide-react';
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
import { buildBreadcrumb } from './navConfig';

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

function initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'U';
    return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

const Header = ({ onOpenMenu }) => {
    const pathname = usePathname();
    const [showAlerts, setShowAlerts] = useState(false);
    const [role, setRole] = useState('worker');
    const [installPrompt, setInstallPrompt] = useState(null);
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [pushState, setPushState] = useState({ subscribed: false, reason: null });
    const [socketConnected, setSocketConnected] = useState(false);
    const [socketError, setSocketError] = useState('');
    const [lmeRows, setLmeRows] = useState([]);
    const [authUser, setAuthUser] = useState(null);
    const audioContextRef = useRef(null);
    const popoverRef = useRef(null);
    const isAdminUser = String(authUser?.role || '').toLowerCase() === 'admin';
    const isOwnerRole = role === 'owner';
    const crumbs = buildBreadcrumb(pathname);

    useEffect(() => {
        setRole(getCurrentRole());
        setAuthUser(getAuthUser());
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
        const storedUser = getAuthUser();
        const loadLocations = async () => {
            try {
                const res = await api.get('/locations');
                const rows = res?.data?.data || [];
                if (cancelled) return;
                setLocations(rows);

                const stored = getActiveCompanyId();
                const preferred = [stored, storedUser?.activeCompanyId, storedUser?.companyId].filter(Boolean);
                const validPreferred = preferred.find((id) => rows.some((row) => row.id === id));
                const isAdmin = String(storedUser?.role || '').toLowerCase() === 'admin';
                const ownCompanyValid = storedUser?.companyId && rows.some((row) => row.id === storedUser.companyId);
                // admin zadržava izabranu lokaciju; ostali su uvijek na svojoj
                const fallback = !isAdmin && ownCompanyValid
                    ? storedUser.companyId
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

    // LME cijene samo ako postoje u bazi (nema izmišljenih vrijednosti)
    useEffect(() => {
        let cancelled = false;
        api.get('/market/lme')
            .then((res) => {
                if (!cancelled) setLmeRows(Array.isArray(res?.data?.data) ? res.data.data : []);
            })
            .catch(() => {
                if (!cancelled) setLmeRows([]);
            });
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

    useEffect(() => {
        if (!showAlerts) return undefined;
        const onDown = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) setShowAlerts(false);
        };
        const onKey = (event) => {
            if (event.key === 'Escape') setShowAlerts(false);
        };
        window.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [showAlerts]);

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

    const currentLocation = locations.find((location) => location.id === selectedLocation);
    const userName = authUser?.name || authUser?.email || 'Korisnik';

    return (
        <header className="app-header">
            <div className="hd-left">
                <button type="button" className="hd-icon-btn hd-menu-btn" onClick={onOpenMenu} aria-label="Otvori meni">
                    <Menu size={18} />
                </button>
                <nav className="hd-crumbs" aria-label="Putanja">
                    {crumbs.length === 0 && <span className="hd-crumb-current">MILKUS ERP</span>}
                    {crumbs.map((crumb, index) => {
                        const isLast = index === crumbs.length - 1;
                        return (
                            <Fragment key={`${crumb.label}-${index}`}>
                                {index > 0 && <ChevronRight className={isLast ? '' : 'hd-crumb-sep'} size={14} />}
                                {isLast ? (
                                    <span className="hd-crumb-current" aria-current="page">{crumb.label}</span>
                                ) : crumb.href ? (
                                    <Link href={crumb.href} className="hd-crumb-parent">{crumb.label}</Link>
                                ) : (
                                    <span className="hd-crumb-parent">{crumb.label}</span>
                                )}
                            </Fragment>
                        );
                    })}
                </nav>
            </div>

            <div className="hd-right">
                {lmeRows.length > 0 && (
                    <div className="hd-ticker" title="LME cijene iz baze">
                        {lmeRows.slice(0, 4).map((row) => {
                            const change = Number(row.change || 0);
                            return (
                                <span key={row.metal}>
                                    LME {row.metal}: <b>${Number(row.price || 0).toLocaleString('de-DE')}</b>{' '}
                                    <span style={{ color: change > 0 ? 'var(--success-ink)' : change < 0 ? 'var(--danger-ink)' : 'var(--text-3)' }}>
                                        {change > 0 ? '+' : ''}{change}%
                                    </span>
                                </span>
                            );
                        })}
                    </div>
                )}

                {isAdminUser && isOwnerRole ? (
                    <select
                        className="hd-select"
                        value={selectedLocation}
                        onChange={handleLocationChange}
                        aria-label="Lokacija"
                    >
                        {(locations.length ? locations : [{ id: '', code: 'N/A', name: 'Nema lokacija' }]).map((location) => (
                            <option key={location.id || location.code} value={location.id}>
                                {location.code ? `${location.code} · ${location.name}` : location.name}
                            </option>
                        ))}
                    </select>
                ) : (
                    <span className="hd-chip hd-hide-mobile" title="Lokacija">
                        <MapPin size={14} />
                        {currentLocation ? `${currentLocation.code} · ${currentLocation.name}` : 'Lokacija automatski dodijeljena'}
                    </span>
                )}

                {isAdminUser ? (
                    <select className="hd-select" value={role} onChange={handleRoleChange} aria-label="Uloga">
                        <option value="owner">Uloga: Vlasnik</option>
                        <option value="worker">Uloga: Radnik</option>
                    </select>
                ) : null}

                {installPrompt && (
                    <button type="button" className="ui-btn soft sm hd-hide-mobile" onClick={handleInstall}>
                        <Download size={14} /> Instaliraj app
                    </button>
                )}

                <div ref={popoverRef} style={{ position: 'static' }}>
                    <button
                        type="button"
                        className="hd-icon-btn"
                        onClick={() => setShowAlerts((prev) => !prev)}
                        aria-label={`Notifikacije${unreadCount ? ` (${unreadCount} nepročitanih)` : ''}`}
                        aria-expanded={showAlerts}
                    >
                        <Bell size={17} />
                        {unreadCount > 0 ? <span className="hd-badge">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
                    </button>

                    {showAlerts && (
                        <div className="hd-popover" role="dialog" aria-label="Notifikacije">
                            <div className="row-between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 14 }}>Notifikacije</div>
                                    <div style={{ fontSize: 11.5, color: socketConnected ? 'var(--success-ink)' : 'var(--warning-ink)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                        <span style={{ width: 7, height: 7, borderRadius: 99, background: socketConnected ? 'var(--success)' : 'var(--warning)' }} />
                                        {socketConnected ? 'Realtime uključen' : 'Ponovno povezivanje (polling)...'}
                                    </div>
                                </div>
                                {unreadCount > 0 ? (
                                    <button type="button" className="ui-btn ghost sm" onClick={handleMarkAllRead}>
                                        Označi sve pročitano
                                    </button>
                                ) : null}
                            </div>
                            <div style={{ padding: 12, display: 'grid', gap: 8 }}>
                                {!pushState.subscribed ? (
                                    <button type="button" className="ui-btn soft sm block" onClick={handleEnablePush}>
                                        Omogući push notifikacije
                                    </button>
                                ) : null}
                                {!socketConnected && socketError ? (
                                    <div style={{ fontSize: 11, color: 'var(--danger-ink)' }}>Socket: {socketError}</div>
                                ) : null}
                                {notifications.length === 0 ? (
                                    <div className="ui-empty" style={{ padding: '24px 8px' }}>
                                        <div className="ui-empty-icon"><Bell size={18} /></div>
                                        <div className="ui-empty-text">Nema novih notifikacija.</div>
                                    </div>
                                ) : notifications.map((item) => (
                                    <div
                                        key={item.id}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: 10,
                                            border: '1px solid var(--border)',
                                            background: item.isRead ? 'var(--surface)' : 'var(--primary-50)',
                                        }}
                                    >
                                        <div className="row-between" style={{ alignItems: 'flex-start' }}>
                                            <div style={{ fontWeight: 600, fontSize: 12.5 }}>{item.title || 'Notifikacija'}</div>
                                            <div style={{ color: 'var(--text-3)', fontSize: 11, flexShrink: 0 }}>{formatNotificationTime(item.createdAt)}</div>
                                        </div>
                                        <div style={{ color: 'var(--text-2)', fontSize: 12.5, marginTop: 2 }}>{item.message}</div>
                                        {!item.isRead ? (
                                            <button type="button" className="ui-btn ghost sm" style={{ marginTop: 6, paddingLeft: 0 }} onClick={() => handleMarkAsRead(item.id)}>
                                                Označi pročitano
                                            </button>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="hd-user">
                    <div className="hd-avatar" aria-hidden="true">{initials(userName)}</div>
                    <div className="hd-user-text">
                        <div className="hd-user-name">{userName}</div>
                        <div className="hd-user-role">{getRoleLabel(role)}</div>
                    </div>
                    <button type="button" className="ui-btn ghost sm icon-only" onClick={handleLogout} aria-label="Odjava" title="Odjava">
                        <LogOut size={15} />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
