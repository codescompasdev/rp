export function Badge({ tone = 'neutral', dot = false, children, title }) {
    return (
        <span className={`ui-badge ${tone === 'neutral' ? '' : tone}`} title={title}>
            {dot && <span className="dot" aria-hidden="true" />}
            {children}
        </span>
    );
}

const STATUS_TONES = {
    aktivan: 'success',
    'završen': 'info',
    zavrsen: 'info',
    otkazan: 'danger',
    zatvoren: 'success',
    completed: 'success',
    otvoren: 'info',
    storniran: 'danger',
    'knjiženo': 'success',
    knjizeno: 'success',
    najavljeno: 'info',
    stiglo: 'success',
    'čeka zatvaranje': 'warning',
    'bruto završeno': 'warning',
    'tara završena': 'warning',
    'inspekcija završena': 'warning',
    'na stanju': 'success',
    new: 'info',
    novo: 'info',
    read: 'neutral',
    procitano: 'neutral',
    'pročitano': 'neutral',
    archived: 'neutral',
    pending: 'warning',
    draft: 'neutral',
    nacrt: 'neutral',
    potvrđeno: 'success',
    potvrdjeno: 'success',
    isporuceno: 'success',
    isporučeno: 'success',
    blocked: 'danger',
    blokiran: 'danger',
    neaktivan: 'neutral',
};

export function statusTone(status) {
    return STATUS_TONES[String(status || '').trim().toLowerCase()] || 'neutral';
}

export function StatusBadge({ status, label }) {
    const text = label || status || '-';
    return <Badge tone={statusTone(status)} dot>{text}</Badge>;
}

export default Badge;
