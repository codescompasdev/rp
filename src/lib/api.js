import axios from 'axios';
import { clearAuthSession, getAccessToken, getActiveCompanyId, getRefreshToken, saveAuthSession } from './authStorage';

const resolvedBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1').replace(/\/$/, '');

const api = axios.create({
    baseURL: resolvedBaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

const authClient = axios.create({
    baseURL: resolvedBaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        const activeCompanyId = getActiveCompanyId();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (activeCompanyId) {
            config.headers['X-Company-Id'] = activeCompanyId;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

let refreshPromise = null;

async function refreshTokens() {
    if (!refreshPromise) {
        refreshPromise = authClient.post('/auth/refresh', { refreshToken: getRefreshToken() })
            .then((res) => {
                saveAuthSession(res.data);
                return res.data.accessToken;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error?.response?.status;

        if (status === 401 && !originalRequest?._retry) {
            originalRequest._retry = true;
            try {
                const nextAccessToken = await refreshTokens();
                originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
                return api(originalRequest);
            } catch {
                clearAuthSession();
                if (typeof window !== 'undefined') {
                    window.location.href = '/auth/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
