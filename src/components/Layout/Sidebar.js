'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { getCurrentRole } from '@/lib/userRole';
import { findActiveNav, visibleNavGroups } from './navConfig';

const GROUPS_KEY = 'sidebar-closed-groups';

function readClosedGroups() {
    try {
        return JSON.parse(localStorage.getItem(GROUPS_KEY) || '{}') || {};
    } catch {
        return {};
    }
}

export default function Sidebar({ collapsed, onToggleCollapsed, onNavigate }) {
    const pathname = usePathname();
    const [role, setRole] = useState('worker');
    const [closedGroups, setClosedGroups] = useState({});

    useEffect(() => {
        setRole(getCurrentRole());
        setClosedGroups(readClosedGroups());
    }, []);

    const groups = useMemo(() => visibleNavGroups(role), [role]);
    const active = findActiveNav(pathname);

    const toggleGroup = (id) => {
        setClosedGroups((prev) => {
            const next = { ...prev, [id]: !prev[id] };
            try { localStorage.setItem(GROUPS_KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    };

    return (
        <aside className="app-sidebar" aria-label="Glavna navigacija">
            <div className="sb-brand">
                <div className="sb-logo" aria-hidden="true">M</div>
                <div className="sb-brand-text">
                    <div className="sb-brand-name">MILKUS ERP</div>
                    <div className="sb-brand-sub">Compas Codes</div>
                </div>
            </div>

            <nav className="sb-scroll">
                {groups.map((group) => {
                    // u sažetom prikazu sve grupe su otvorene (vide se samo ikone)
                    const isOpen = collapsed ? true : !closedGroups[group.id];
                    const groupActive = active?.group.id === group.id;
                    const listId = `sb-group-${group.id}`;
                    return (
                        <div className="sb-group" key={group.id}>
                            <button
                                type="button"
                                className="sb-group-btn"
                                data-active={groupActive}
                                aria-expanded={isOpen}
                                aria-controls={listId}
                                onClick={() => !collapsed && toggleGroup(group.id)}
                                tabIndex={collapsed ? -1 : 0}
                            >
                                <span className="sb-group-label">{group.title}</span>
                                <ChevronDown className="sb-chevron" size={14} strokeWidth={2} />
                            </button>
                            {isOpen && (
                                <ul className="sb-items" id={listId}>
                                    {group.items.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = active?.item.path === item.path;
                                        return (
                                            <li key={item.path}>
                                                <Link
                                                    href={item.path}
                                                    className="sb-link"
                                                    aria-current={isActive ? 'page' : undefined}
                                                    title={collapsed ? item.name : undefined}
                                                    onClick={onNavigate}
                                                >
                                                    <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
                                                    <span className="sb-link-label">{item.name}</span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className="sb-footer">
                <button
                    type="button"
                    className="sb-collapse-btn"
                    onClick={onToggleCollapsed}
                    aria-label={collapsed ? 'Proširi meni' : 'Sažmi meni'}
                    title={collapsed ? 'Proširi meni' : undefined}
                >
                    {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.9} /> : <PanelLeftClose size={18} strokeWidth={1.9} />}
                    <span className="sb-collapse-label">Sažmi meni</span>
                </button>
            </div>
        </aside>
    );
}
