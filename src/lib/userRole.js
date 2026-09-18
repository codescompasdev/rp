const OWNER_ROLES = new Set(['admin', 'manager', 'owner']);
const VALID_APP_ROLES = new Set(['owner', 'worker']);
const ROLE_OVERRIDE_KEY = 'app-role-override';

function decodePayload(token) {
    if (!token || typeof token !== 'string') {
        return null;
    }

    const parts = token.split('.');
    if (parts.length < 2) {
        return null;
    }

    try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = atob(base64);
        return JSON.parse(json);
    } catch {
        return null;
    }
}

export function getCurrentRole() {
    if (typeof window === 'undefined') {
        return 'worker';
    }

    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const payload = decodePayload(token);
    const backendRole = String(payload?.role || '').toLowerCase();

    const override = localStorage.getItem(ROLE_OVERRIDE_KEY);
    if (backendRole === 'admin' && VALID_APP_ROLES.has(override)) {
        return override;
    }

    return OWNER_ROLES.has(backendRole) ? 'owner' : 'worker';
}

export function getRoleLabel(role) {
    return role === 'owner' ? 'Vlasnik' : 'Radnik';
}

export function setRoleOverride(role) {
    if (typeof window === 'undefined') {
        return;
    }
    if (!VALID_APP_ROLES.has(role)) {
        localStorage.removeItem(ROLE_OVERRIDE_KEY);
        return;
    }
    localStorage.setItem(ROLE_OVERRIDE_KEY, role);
}
