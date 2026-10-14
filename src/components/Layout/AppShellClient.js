'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import { isAuthenticated } from '@/lib/authStorage';

const PUBLIC_ROUTES = ['/auth/login', '/auth/register'];
const COLLAPSED_KEY = 'sidebar-collapsed';

export default function AppShellClient({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const isPublic = PUBLIC_ROUTES.includes(pathname || '');
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const authed = isAuthenticated();
        if (!authed && !isPublic) {
            router.replace('/auth/login');
        }
        if (authed && isPublic) {
            router.replace('/');
        }
    }, [isPublic, router]);

    useEffect(() => {
        try { setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1'); } catch {}
    }, []);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!mobileOpen) return undefined;
        const onKey = (event) => {
            if (event.key === 'Escape') setMobileOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [mobileOpen]);

    const toggleCollapsed = useCallback(() => {
        setCollapsed((prev) => {
            const next = !prev;
            try { localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0'); } catch {}
            return next;
        });
    }, []);

    if (isPublic) {
        return <>{children}</>;
    }

    return (
        <div className="app-shell" data-collapsed={collapsed} data-mobile-open={mobileOpen}>
            <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} onNavigate={() => setMobileOpen(false)} />
            <div className="sb-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <div className="app-body">
                <Header onOpenMenu={() => setMobileOpen(true)} />
                <main className="app-main" id="main-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
