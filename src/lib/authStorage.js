const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const USER_KEY = 'authUser';
const ACTIVE_COMPANY_KEY = 'activeCompanyId';

function setCookie(name, value, days = 7) {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function clearCookie(name) {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function saveAuthSession({ accessToken, refreshToken, user }) {
    if (typeof window === 'undefined') return;
    if (accessToken) {
        localStorage.setItem(ACCESS_KEY, accessToken);
        localStorage.setItem('token', accessToken);
        setCookie(ACCESS_KEY, accessToken, 7);
    }
    if (refreshToken) {
        localStorage.setItem(REFRESH_KEY, refreshToken);
        setCookie(REFRESH_KEY, refreshToken, 30);
    }
    if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        const nextActiveCompanyId = user.activeCompanyId || user.companyId || '';
        if (nextActiveCompanyId) {
            localStorage.setItem(ACTIVE_COMPANY_KEY, nextActiveCompanyId);
        } else {
            localStorage.removeItem(ACTIVE_COMPANY_KEY);
        }
    }
}

export function clearAuthSession() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACTIVE_COMPANY_KEY);
    clearCookie(ACCESS_KEY);
    clearCookie(REFRESH_KEY);
}

export function getAccessToken() {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(ACCESS_KEY) || localStorage.getItem('token') || '';
}

export function getRefreshToken() {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(REFRESH_KEY) || '';
}

export function isAuthenticated() {
    return Boolean(getAccessToken());
}

export function getAuthUser() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function getActiveCompanyId() {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(ACTIVE_COMPANY_KEY) || '';
}

export function setActiveCompanyId(companyId) {
    if (typeof window === 'undefined') return;
    if (!companyId) {
        localStorage.removeItem(ACTIVE_COMPANY_KEY);
        return;
    }
    localStorage.setItem(ACTIVE_COMPANY_KEY, String(companyId));
}
