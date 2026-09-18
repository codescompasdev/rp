function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

const defaultScaleRuntimeConfig = {
  mode: 'signal',
  signalSource: 'RS232',
  unit: 'KG',
  decimals: 2,
  defaultLiveWeight: 0,
  allowManualEntry: true,
  tcpHost: '',
  tcpPort: 5000,
  rs232Path: '/dev/ttyUSB0',
  rs232BaudRate: 9600,
  staleAfterMs: 15000,
};

class ScaleSignalService {
  constructor() {
    const hasRs232PathEnv = Object.prototype.hasOwnProperty.call(process.env, 'RS232_PATH');
    this.config = {
      ...defaultScaleRuntimeConfig,
      defaultLiveWeight: toNumber(process.env.SCALE_DEFAULT_LIVE_WEIGHT, defaultScaleRuntimeConfig.defaultLiveWeight),
      rs232Path: hasRs232PathEnv ? String(process.env.RS232_PATH || '').trim() : defaultScaleRuntimeConfig.rs232Path,
      rs232BaudRate: toNumber(process.env.RS232_BAUD_RATE, defaultScaleRuntimeConfig.rs232BaudRate),
      staleAfterMs: toNumber(process.env.SCALE_SIGNAL_STALE_AFTER_MS, defaultScaleRuntimeConfig.staleAfterMs),
    };
    this.defaultChannelKey = 'global';
    this.snapshots = new Map();
    this.snapshot = this.createEmptySnapshot('Signal not initialized');
    this.snapshots.set(this.defaultChannelKey, this.snapshot);
    this.port = null;
    this.started = false;
  }

  createEmptySnapshot(message = 'Signal not initialized') {
    return {
      signalAvailable: false,
      signalConnected: false,
      liveWeight: toNumber(this.config.defaultLiveWeight, 0),
      source: this.config.signalSource,
      mode: this.config.mode,
      lastUpdatedAt: null,
      message,
    };
  }

  composeChannelKey(channel, scaleId) {
    const normalizedChannel = normalizeKey(channel) || this.defaultChannelKey;
    const normalizedScaleId = normalizeKey(scaleId);
    if (!normalizedScaleId) return normalizedChannel;
    return `${normalizedChannel}::${normalizedScaleId}`;
  }

  setSnapshotByKey(channelKey, patch) {
    const key = normalizeKey(channelKey) || this.defaultChannelKey;
    const previous = this.snapshots.get(key) || this.createEmptySnapshot();
    const next = {
      ...previous,
      ...patch,
      mode: this.config.mode,
    };
    this.snapshots.set(key, next);
    return next;
  }

  resolveSnapshotByKey(channelKey) {
    const key = normalizeKey(channelKey) || this.defaultChannelKey;
    return this.snapshots.get(key) || null;
  }

  getConfig() {
    return { ...this.config };
  }

  updateConfig(nextConfig = {}) {
    this.config = {
      ...this.config,
      ...nextConfig,
      rs232BaudRate: toNumber(nextConfig.rs232BaudRate ?? this.config.rs232BaudRate, this.config.rs232BaudRate),
      defaultLiveWeight: toNumber(nextConfig.defaultLiveWeight ?? this.config.defaultLiveWeight, this.config.defaultLiveWeight),
      staleAfterMs: toNumber(nextConfig.staleAfterMs ?? this.config.staleAfterMs, this.config.staleAfterMs),
    };
    for (const [key, existing] of this.snapshots.entries()) {
      this.snapshots.set(key, {
        ...existing,
        source: this.config.signalSource,
        mode: this.config.mode,
      });
    }
    this.snapshot = this.resolveSnapshotByKey(this.defaultChannelKey) || this.createEmptySnapshot();
    if (this.started) {
      this.reconnect().catch(() => null);
    }
    return this.getConfig();
  }

  getSnapshot({ channel, scaleId } = {}) {
    const channelKey = this.composeChannelKey(channel, scaleId);
    const fallbackChannelKey = this.composeChannelKey(channel);
    const resolvedSnapshot = this.resolveSnapshotByKey(channelKey)
      || (scaleId ? this.resolveSnapshotByKey(fallbackChannelKey) : null)
      || (!channel ? this.resolveSnapshotByKey(this.defaultChannelKey) : null)
      || this.createEmptySnapshot(channel ? 'No signal for this location/scale yet' : 'Signal not initialized');
    const snapshot = { ...resolvedSnapshot };
    const staleAfterMs = toNumber(this.config.staleAfterMs, defaultScaleRuntimeConfig.staleAfterMs);
    if (snapshot.lastUpdatedAt && staleAfterMs > 0) {
      const ageMs = Date.now() - new Date(snapshot.lastUpdatedAt).getTime();
      if (Number.isFinite(ageMs) && ageMs > staleAfterMs) {
        snapshot.signalAvailable = false;
        snapshot.message = 'Signal stale';
      }
    }
    return snapshot;
  }

  async start() {
    if (this.started) return;
    this.started = true;
    await this.reconnect();
  }

  async reconnect() {
    await this.disconnectPort();
    if (this.config.mode !== 'signal') {
      this.snapshot = this.setSnapshotByKey(this.defaultChannelKey, {
        signalAvailable: false,
        signalConnected: false,
        message: 'Signal mode disabled',
      });
      return;
    }
    if (this.config.signalSource !== 'RS232') {
      this.snapshot = this.setSnapshotByKey(this.defaultChannelKey, {
        signalAvailable: false,
        signalConnected: false,
        message: `Signal source ${this.config.signalSource} is not implemented`,
      });
      return;
    }
    if (!this.config.rs232Path) {
      this.snapshot = this.setSnapshotByKey(this.defaultChannelKey, {
        signalAvailable: false,
        signalConnected: false,
        message: 'RS232 path is not configured',
      });
      return;
    }

    try {
      const serialModule = await import('serialport');
      const SerialPort = serialModule?.SerialPort;
      if (!SerialPort) {
        throw new Error('serialport module not available');
      }

      this.port = new SerialPort({
        path: this.config.rs232Path,
        baudRate: toNumber(this.config.rs232BaudRate, 9600),
        autoOpen: false,
      });

      this.port.on('data', (chunk) => {
        const text = String(chunk || '').trim();
        const match = text.match(/-?\d+([.,]\d+)?/);
        if (!match) return;
        const value = Number(String(match[0]).replace(',', '.'));
        if (!Number.isFinite(value)) return;
        this.snapshot = this.setSnapshotByKey(this.defaultChannelKey, {
          signalAvailable: true,
          signalConnected: true,
          liveWeight: value,
          lastUpdatedAt: new Date().toISOString(),
          message: 'RS232 signal active',
        });
      });

      this.port.on('error', (error) => {
        this.snapshot = this.setSnapshotByKey(this.defaultChannelKey, {
          signalAvailable: false,
          signalConnected: false,
          message: error?.message || 'RS232 error',
        });
      });

      await new Promise((resolve, reject) => {
        this.port.open((error) => (error ? reject(error) : resolve()));
      });

      this.snapshot = this.setSnapshotByKey(this.defaultChannelKey, {
        signalAvailable: false,
        signalConnected: true,
        message: 'RS232 connected, waiting for data',
      });
    } catch (error) {
      this.snapshot = this.setSnapshotByKey(this.defaultChannelKey, {
        signalAvailable: false,
        signalConnected: false,
        message: error?.message || 'RS232 unavailable',
      });
    }
  }

  async disconnectPort() {
    if (!this.port) return;
    await new Promise((resolve) => {
      this.port.close(() => resolve());
    });
    this.port = null;
  }

  ingestWeight({ weight, source = 'INGEST', channel, scaleId } = {}) {
    const numericWeight = toNumber(weight, NaN);
    if (!Number.isFinite(numericWeight)) {
      throw new Error('Invalid weight payload');
    }
    const channelKey = this.composeChannelKey(channel);
    const detailedKey = this.composeChannelKey(channel, scaleId);
    const patch = {
      signalAvailable: true,
      signalConnected: true,
      liveWeight: numericWeight,
      source,
      lastUpdatedAt: new Date().toISOString(),
      message: 'Remote scale ingest active',
    };
    this.setSnapshotByKey(channelKey, patch);
    if (detailedKey !== channelKey) {
      this.setSnapshotByKey(detailedKey, patch);
    }
    this.snapshot = this.setSnapshotByKey(this.defaultChannelKey, patch);
    return this.getSnapshot({ channel, scaleId });
  }
}

const scaleSignalService = new ScaleSignalService();
export default scaleSignalService;
