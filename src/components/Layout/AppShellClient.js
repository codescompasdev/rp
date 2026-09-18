'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import { isAuthenticated } from '@/lib/authStorage';

const PUBLIC_ROUTES = ['/auth/login', '/auth/register'];

export default function AppShellClient({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const isPublic = PUBLIC_ROUTES.includes(pathname || '');

    useEffect(() => {
        const authed = isAuthenticated();
        if (!authed && !isPublic) {
            router.replace('/auth/login');
        }
        if (authed && isPublic) {
            router.replace('/');
        }
    }, [isPublic, router]);

    if (isPublic) {
        return <>{children}</>;
    }

    return (
        <>
            <Header />
            <div className="app-shell">
                <Sidebar />
                <main className="app-main">
                    {children}
                </main>
            </div>
        </>
    );
}
