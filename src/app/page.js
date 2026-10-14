'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeftRight,
    ArrowRight,
    BarChart3,
    Boxes,
    ClipboardList,
    HandCoins,
    LayoutDashboard,
    PackageCheck,
    Plus,
    Scale,
    SlidersHorizontal,
    Store,
} from 'lucide-react';
import { getCurrentRole, getRoleLabel } from '@/lib/userRole';
import { getAuthUser } from '@/lib/authStorage';
import Button from '@/components/UI/Button';
import { fmtDate } from '@/lib/format';

const COMMON = [
    { title: 'Ulaz i vaganje', text: 'Prvo i drugo mjerenje, zatvaranje i vagarski list', link: '/gate', icon: Scale, tone: 'info' },
    { title: 'Direktan otkup', text: 'Brza kupovina od fizičkih lica sa štampom', link: '/gate/walk-in', icon: HandCoins, tone: 'aqua' },
    { title: 'Prodaja na malo', text: 'Prodaja manjih količina bez vage, sa štampom', link: '/gate/retail', icon: Store, tone: 'orange' },
    { title: 'Analiza i knjiženje', text: 'Ulazi, izlazi, konverzije i sortiranja', link: '/inventory/transactions', icon: ArrowLeftRight, tone: 'warning' },
    { title: 'Stanje robe', text: 'Katalog materijala i stanje po lokaciji', link: '/inventory', icon: Boxes, tone: 'info' },
    { title: 'Narudžbe', text: 'Nabavka i prodaja sa praćenjem ispunjenosti', link: '/sourcing/contracts', icon: ClipboardList, tone: 'info' },
];

const OWNER = [
    { title: 'Pregled poslovanja', text: 'KPI, grafikoni i upozorenja iz stvarnih podataka', link: '/dashboard', icon: LayoutDashboard, tone: 'info' },
    ...COMMON,
    { title: 'Prodaja i izdavanje', text: 'Prodajni nalozi i izlaz robe', link: '/sales', icon: PackageCheck, tone: 'orange' },
    { title: 'Analitika ulaz/izlaz', text: 'Izvještaji po periodu, Excel i štampa', link: '/reports', icon: BarChart3, tone: 'info' },
    { title: 'Configure vage', text: 'Veza sa vagom i način rada', link: '/gate/configure', icon: SlidersHorizontal, tone: 'info' },
];

function greeting() {
    const h = new Date().getHours();
    if (h < 11) return 'Dobro jutro';
    if (h < 18) return 'Dobar dan';
    return 'Dobro veče';
}

export default function Home() {
    const [role, setRole] = useState('worker');
    const [welcome, setWelcome] = useState('');

    useEffect(() => {
        setRole(getCurrentRole());
        const name = String(getAuthUser()?.name || '').split(' ')[0];
        setWelcome(`${greeting()}${name ? `, ${name}` : ''}`);
    }, []);

    const cards = useMemo(() => (role === 'owner' ? OWNER : COMMON), [role]);

    return (
        <div className="ui-page">
            <div className="home-hero">
                <div>
                    <div className="home-date">{welcome ? fmtDate(new Date()) : ' '}</div>
                    <h1 className="ui-page-title" style={{ fontSize: 26 }}>{welcome || 'Dobrodošli'}</h1>
                    <div className="ui-page-subtitle">Aktivna uloga: <b>{getRoleLabel(role)}</b> · odaberi modul za rad</div>
                </div>
                <div className="ui-page-actions">
                    <Button variant="success" size="lg" icon={Plus} href="/gate">Novo vaganje</Button>
                    <Button variant="secondary" size="lg" icon={HandCoins} href="/gate/walk-in">Direktan otkup</Button>
                </div>
            </div>

            <div className="home-grid">
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Link key={card.link} href={card.link} className="home-card">
                            <span className={`ui-stat-icon ${card.tone}`} style={{ width: 42, height: 42, borderRadius: 12 }}>
                                <Icon size={20} />
                            </span>
                            <span className="home-card-title">{card.title}</span>
                            <span className="home-card-text">{card.text}</span>
                            <span className="home-card-link">Otvori <ArrowRight size={14} /></span>
                        </Link>
                    );
                })}
            </div>

            <style>{`
                .home-hero {
                    display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap;
                    padding: 24px; border-radius: var(--radius-xl); border: 1px solid var(--border);
                    background: linear-gradient(135deg, var(--surface) 0%, var(--primary-50) 100%);
                }
                .home-date { font-size: 12px; font-weight: 600; color: var(--primary-ink); letter-spacing: .04em; margin-bottom: 4px; }
                .home-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
                .home-card {
                    display: flex; flex-direction: column; gap: 8px; padding: 20px;
                    background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-xs); transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
                }
                .home-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--primary-200); }
                .home-card-title { font-weight: 700; font-size: 15px; margin-top: 6px; }
                .home-card-text { font-size: 12.5px; color: var(--text-3); flex: 1; }
                .home-card-link { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; font-weight: 600; color: var(--primary-ink); }
            `}</style>
        </div>
    );
}
