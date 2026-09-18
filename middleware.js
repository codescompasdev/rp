import { NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/auth/login', '/auth/register'];
const OWNER_ONLY_PREFIXES = ['/sales', '/reports', '/gate/configure', '/system/users', '/system/messages'];

function decodeRoleFromToken(token) {
    if (!token) return '';
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return String(payload?.role || '').toLowerCase();
    } catch {
        return '';
    }
}

export function middleware(request) {
    const { pathname } = request.nextUrl;
    const accessToken = request.cookies.get('accessToken')?.value;
    const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

    if (!accessToken && !isPublic) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    if (accessToken && isPublic) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    if (accessToken) {
        const role = decodeRoleFromToken(accessToken);
        const isOwnerRoute = OWNER_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
        const isOwner = role === 'admin' || role === 'manager' || role === 'owner';
        if (isOwnerRoute && !isOwner) {
            return NextResponse.redirect(new URL('/gate', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|pwa-icon.svg).*)'],
};
