import {
    ArrowLeftRight,
    BarChart3,
    Boxes,
    CalendarClock,
    ClipboardList,
    Factory,
    HandCoins,
    LayoutDashboard,
    Mail,
    PackageCheck,
    Scale,
    Store,
    SlidersHorizontal,
    Users,
} from 'lucide-react';

/**
 * Navigacija aplikacije. roles: ko vidi grupu/stavku (owner = vlasnik/admin/manager, worker = radnik).
 * Pravila vidljivosti su ista kao ranije; middleware i backend i dalje provjeravaju pristup.
 */
export const NAV_GROUPS = [
    {
        id: 'owner',
        title: 'Vlasnik pregled',
        roles: ['owner'],
        items: [
            { name: 'Pregled poslovanja', path: '/dashboard', icon: LayoutDashboard },
            { name: 'Analitika ulaz/izlaz', path: '/reports', icon: BarChart3 },
        ],
    },
    {
        id: 'gate',
        title: 'Ulaz i vaga',
        roles: ['owner', 'worker'],
        items: [
            { name: 'Vaganje', path: '/gate', icon: Scale },
            { name: 'Direktan otkup', path: '/gate/walk-in', icon: HandCoins },
            { name: 'Najave prijema', path: '/gate/announcements', icon: CalendarClock },
            { name: 'Configure vage', path: '/gate/configure', icon: SlidersHorizontal, roles: ['owner'] },
        ],
    },
    {
        id: 'stock',
        title: 'Stanje i analiza',
        roles: ['owner', 'worker'],
        items: [
            { name: 'Materijali (Katalog i Stanje)', path: '/inventory', icon: Boxes },
            { name: 'Analiza i knjiženje', path: '/inventory/transactions', icon: ArrowLeftRight },
        ],
    },
    {
        id: 'sourcing',
        title: 'Nabava',
        roles: ['owner', 'worker'],
        items: [
            { name: 'Dobavljači', path: '/sourcing/suppliers', icon: Factory },
            { name: 'Narudžbe', path: '/sourcing/contracts', icon: ClipboardList },
        ],
    },
    {
        id: 'sales',
        title: 'Izlaz robe',
        roles: ['owner', 'worker'],
        items: [
            { name: 'Prodaja na malo', path: '/gate/retail', icon: Store },
            { name: 'Prodaja i izdavanje', path: '/sales', icon: PackageCheck, roles: ['owner'] },
        ],
    },
    {
        id: 'system',
        title: 'Sistem',
        roles: ['owner'],
        items: [
            { name: 'Korisnici', path: '/system/users', icon: Users },
            { name: 'Kontakt poruke', path: '/system/messages', icon: Mail },
        ],
    },
];

export function visibleNavGroups(role) {
    return NAV_GROUPS
        .filter((group) => !group.roles || group.roles.includes(role))
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
        }))
        .filter((group) => group.items.length > 0);
}

/** Najduže poklapanje putanje → aktivna stavka (npr. /gate/walk-in ne aktivira i /gate). */
export function findActiveNav(pathname) {
    const path = String(pathname || '');
    let best = null;
    NAV_GROUPS.forEach((group) => {
        group.items.forEach((item) => {
            const matches = path === item.path || path.startsWith(`${item.path}/`);
            if (matches && (!best || item.path.length > best.item.path.length)) {
                best = { group, item };
            }
        });
    });
    return best;
}

const SUB_PAGE_LABELS = {
    new: 'Novo',
};

/** Breadcrumb: grupa › stranica › podstranica */
export function buildBreadcrumb(pathname) {
    const active = findActiveNav(pathname);
    if (!active) return [];
    const crumbs = [
        { label: active.group.title },
        { label: active.item.name, href: active.item.path },
    ];
    const rest = String(pathname || '').slice(active.item.path.length).split('/').filter(Boolean);
    if (rest.length) {
        const last = rest[rest.length - 1];
        crumbs.push({ label: SUB_PAGE_LABELS[last] || 'Detalji' });
    }
    return crumbs;
}
