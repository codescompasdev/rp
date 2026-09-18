'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getCurrentRole } from '@/lib/userRole';

const menuGroups = [
    {
        title: 'VLASNIK PREGLED',
        icon: '◈',
        roles: ['owner'],
        items: [
            { name: 'Pregled poslovanja', path: '/dashboard' },
            { name: 'Analitika ulaz/izlaz', path: '/reports' },
        ]
    },
    {
        title: 'ULAZ I VAGA',
        icon: '⚖',
        roles: ['owner', 'worker'],
        items: [
            { name: 'Vaganje', path: '/gate' },
            { name: 'Direktan otkup', path: '/gate/walk-in' },
            { name: 'Narudžbe / najave', path: '/gate/announcements' },
            { name: 'Configure vage', path: '/gate/configure', roles: ['owner'] },
        ]
    },
    {
        title: 'STANJE I ANALIZA',
        icon: '⬡',
        roles: ['owner', 'worker'],
        items: [
            { name: 'Materijali (Katalog i Stanje)', path: '/inventory' },
            { name: 'Analiza i knjiženje', path: '/inventory/transactions' },
        ]
    },
    {
        title: 'NABAVA',
        icon: '⛁',
        roles: ['owner', 'worker'],
        items: [
            { name: 'Dobavljači', path: '/sourcing/suppliers' },
            { name: 'Ugovori', path: '/sourcing/contracts' },
        ]
    },
    {
        title: 'IZLAZ ROBE',
        icon: '▶',
        roles: ['owner'],
        items: [
            { name: 'Prodaja i izdavanje', path: '/sales' },
        ]
    },
    {
        title: 'SISTEM',
        icon: '⚙',
        roles: ['owner'],
        items: [
            { name: 'Korisnici', path: '/system/users' },
            { name: 'Kontakt poruke', path: '/system/messages' },
        ]
    },
];

const Sidebar = () => {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState({});
    const [role, setRole] = useState('worker');
    const [isMobile, setIsMobile] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setRole(getCurrentRole());
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const onResize = () => setIsMobile(window.innerWidth <= 880);
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (isMobile) {
            setMobileOpen(false);
        }
    }, [pathname, isMobile]);

    const visibleGroups = useMemo(() => {
        return menuGroups
            .filter((group) => !group.roles || group.roles.includes(role))
            .map((group) => ({
                ...group,
                items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
            }))
            .filter((group) => group.items.length > 0);
    }, [role]);

    const toggleGroup = (title) => {
        setCollapsed(prev => ({ ...prev, [title]: !prev[title] }));
    };

    return (
        <aside className={`app-sidebar ${isMobile ? 'is-mobile' : ''} ${mobileOpen ? 'open' : ''}`}>
            {isMobile && (
                <button
                    type="button"
                    className="app-mobile-menu-trigger"
                    onClick={() => setMobileOpen((prev) => !prev)}
                >
                    <span>☰ Meni</span>
                    <span>{mobileOpen ? 'Zatvori' : 'Otvori'}</span>
                </button>
            )}
            <div className="app-sidebar-scroll">
                {visibleGroups.map((group) => {
                    const isCollapsed = collapsed[group.title];
                    const hasActive = group.items.some(item =>
                        pathname === item.path || (item.path !== '/' && pathname?.startsWith(item.path))
                    );

                    return (
                        <div key={group.title} style={{ marginBottom: '2px' }}>
                            <div
                                onClick={() => toggleGroup(group.title)}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    color: hasActive ? 'var(--primary-color)' : '#94a3b8',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    userSelect: 'none',
                                }}
                            >
                                <span><span style={{ marginRight: '6px' }}>{group.icon}</span>{group.title}</span>
                                <span style={{ fontSize: '8px', color: '#94a3b8', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▼</span>
                            </div>
                            {!isCollapsed && (
                                <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                                    {group.items.map((item) => {
                                        const isActive = pathname === item.path || (item.path !== '/' && pathname?.startsWith(item.path));
                                        return (
                                            <li key={item.path}>
                                                <Link href={item.path} onClick={() => isMobile && setMobileOpen(false)} style={{
                                                    display: 'block',
                                                    padding: '5px 12px 5px 28px',
                                                    color: isActive ? 'var(--primary-color)' : '#475569',
                                                    backgroundColor: isActive ? '#f1f5f9' : 'transparent',
                                                    borderLeft: isActive ? '3px solid var(--primary-color)' : '3px solid transparent',
                                                    fontWeight: isActive ? '600' : '400',
                                                    fontSize: '12px',
                                                    textDecoration: 'none',
                                                    transition: 'background 0.1s',
                                                }}>
                                                    {item.name}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </div>
        </aside>
    );
};

export default Sidebar;
