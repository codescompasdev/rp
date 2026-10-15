// de-DE daje isti format kao kod nas (1.234,5) i podržan je u svim preglednicima; bs-BA nije.
const NUMBER_LOCALE = 'de-DE';

function pad2(n) {
    return String(n).padStart(2, '0');
}

function toDate(value) {
    if (!value) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, day] = value.split('-').map(Number);
        return new Date(y, m - 1, day);
    }
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function toNum(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

export function fmtNum(value, digits = 0) {
    return toNum(value).toLocaleString(NUMBER_LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function fmtKg(value, digits = 0) {
    return `${fmtNum(value, digits)} kg`;
}

/** Tone za velike količine: 12.450 kg → "12,45 t" */
export function fmtWeight(value) {
    const kg = toNum(value);
    if (Math.abs(kg) >= 10000) return `${fmtNum(kg / 1000, 1)} t`;
    return `${fmtNum(kg, 0)} kg`;
}

/** Narudžbe se vode u tonama: 1.975.000 kg → "1.975 t", 25.340 kg → "25,34 t" */
export function fmtTons(kg, digits = 3) {
    return `${fmtNum(toNum(kg) / 1000, digits)} t`;
}

/** Unos u tonama → kg za backend (2 decimale kao u bazi) */
export function tonsToKg(tons) {
    return Math.round(toNum(String(tons ?? '').replace(',', '.')) * 100000) / 100;
}

/** kg iz baze → vrijednost za input u tonama */
export function kgToTonsInput(kg) {
    if (kg === null || kg === undefined || kg === '') return '';
    return String(Math.round(toNum(kg) * 1000) / 1e6);
}

export function fmtMoney(value, digits = 2) {
    return `${toNum(value).toLocaleString(NUMBER_LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits })} KM`;
}

export function fmtCompact(value) {
    const n = toNum(value);
    const abs = Math.abs(n);
    if (abs >= 1e6) return `${fmtNum(n / 1e6, 1)}M`;
    if (abs >= 1e3) return `${fmtNum(n / 1e3, abs >= 1e4 ? 0 : 1)}K`;
    return fmtNum(n, 0);
}

export function fmtDate(value) {
    const d = toDate(value);
    if (!d) return '-';
    return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}.`;
}

export function fmtTime(value) {
    const d = toDate(value);
    if (!d) return '-';
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function fmtDateTime(value) {
    const d = toDate(value);
    if (!d) return '-';
    return `${fmtDate(d)} ${fmtTime(d)}`;
}

/** "2026-10-14" → "14.10." */
export function fmtDayShort(ymd) {
    const [, m, d] = String(ymd || '').split('-');
    if (!m || !d) return String(ymd || '');
    return `${d}.${m}.`;
}

export function localYmd(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function addDaysYmd(ymd, days) {
    const [y, m, d] = String(ymd).split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    return localYmd(dt);
}

/** Procentualna promjena; null kad nema baze za poređenje. */
export function pctChange(current, previous) {
    const c = toNum(current);
    const p = toNum(previous);
    if (p === 0) return c === 0 ? 0 : null;
    return ((c - p) / Math.abs(p)) * 100;
}
