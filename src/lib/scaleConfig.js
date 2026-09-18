export const SCALE_CONFIG_KEY = 'scale-config-v1';

export const defaultScaleConfig = {
    scaleName: 'VAGA 1',
    unit: 'KG',
    decimals: 2,
    mode: 'signal',
    signalSource: 'RS232',
    allowManualEntry: true,
    defaultLiveWeight: 0,
    tcpHost: '',
    tcpPort: 5000,
    rs232Path: '/dev/ttyUSB0',
    rs232BaudRate: 9600,
};

function clampDecimals(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return defaultScaleConfig.decimals;
    return Math.min(4, Math.max(0, Math.round(numeric)));
}

function sanitizeTcpHost(value) {
    return String(value || '').trim();
}

function sanitizeTcpPort(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return defaultScaleConfig.tcpPort;
    return Math.min(65535, Math.max(1, Math.round(numeric)));
}

function sanitizeRs232Path(value) {
    return String(value || '').trim();
}

function sanitizeRs232BaudRate(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return defaultScaleConfig.rs232BaudRate;
    return Math.max(1200, Math.round(numeric));
}

export function normalizeScaleConfig(config = {}) {
    const merged = {
        ...defaultScaleConfig,
        ...config,
    };
    return {
        ...merged,
        decimals: clampDecimals(merged.decimals),
        defaultLiveWeight: Number(merged.defaultLiveWeight || 0),
        tcpHost: sanitizeTcpHost(merged.tcpHost),
        tcpPort: sanitizeTcpPort(merged.tcpPort),
        rs232Path: sanitizeRs232Path(merged.rs232Path),
        rs232BaudRate: sanitizeRs232BaudRate(merged.rs232BaudRate),
        allowManualEntry: Boolean(merged.allowManualEntry),
    };
}

export function validateScaleConfig(config) {
    const normalized = normalizeScaleConfig(config);
    const errors = {};
    if (!normalized.scaleName) {
        errors.scaleName = 'Naziv vage je obavezan.';
    }
    if (normalized.signalSource === 'TCP/IP') {
        if (!normalized.tcpHost) {
            errors.tcpHost = 'TCP/IP host je obavezan.';
        }
        if (!Number.isInteger(normalized.tcpPort) || normalized.tcpPort < 1 || normalized.tcpPort > 65535) {
            errors.tcpPort = 'TCP/IP port mora biti između 1 i 65535.';
        }
    }
    if (normalized.signalSource === 'RS232') {
        if (!normalized.rs232Path) {
            errors.rs232Path = 'RS232 port putanja je obavezna.';
        }
        if (!Number.isInteger(normalized.rs232BaudRate) || normalized.rs232BaudRate < 1200) {
            errors.rs232BaudRate = 'RS232 baud rate mora biti 1200 ili više.';
        }
    }
    return {
        valid: Object.keys(errors).length === 0,
        errors,
        config: normalized,
    };
}

export function loadScaleConfig() {
    if (typeof window === 'undefined') {
        return defaultScaleConfig;
    }

    try {
        const raw = localStorage.getItem(SCALE_CONFIG_KEY);
        if (!raw) {
            return defaultScaleConfig;
        }

        const parsed = JSON.parse(raw);
        return normalizeScaleConfig(parsed);
    } catch {
        return defaultScaleConfig;
    }
}

export function saveScaleConfig(config) {
    if (typeof window === 'undefined') {
        return;
    }
    const normalized = normalizeScaleConfig(config);
    localStorage.setItem(SCALE_CONFIG_KEY, JSON.stringify(normalized));
}

export function formatWeight(value, config = defaultScaleConfig) {
    const numeric = Number(value || 0);
    const decimals = Number(config?.decimals ?? 2);
    const unit = config?.unit || 'KG';
    return `${numeric.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })} ${unit}`;
}
