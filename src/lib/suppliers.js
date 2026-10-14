export const SUPPLIER_TYPES = [
    { value: 'Industrija', label: 'Industrija (firma)' },
    { value: 'Sakupljač', label: 'Sakupljač' },
    { value: 'Komunalno', label: 'Komunalno' },
    { value: 'Fizičko Lice', label: 'Fizičko lice' },
    { value: 'Partner', label: 'Partner' },
];

export const BONITET_OPTIONS = [
    { value: 'A', label: 'A — Odličan' },
    { value: 'B', label: 'B — Prosječan' },
    { value: 'C', label: 'C — Rizičan' },
];

export const EMPTY_SUPPLIER_FORM = {
    name: '',
    jib: '',
    type: 'Industrija',
    pdv: true,
    city: '',
    address: '',
    phone: '',
    email: '',
    bonitet: 'B',
    paymentDays: 15,
};

/** Forma iz postojećeg dobavljača — sva polja, da uređivanje ne obriše ništa. */
export function supplierToForm(s) {
    return {
        name: s?.name || '',
        jib: s?.jib || '',
        type: s?.type || 'Industrija',
        pdv: Boolean(s?.pdv),
        city: s?.city || '',
        address: s?.address || '',
        phone: s?.phone || '',
        email: s?.email || '',
        bonitet: s?.bonitet || 'B',
        paymentDays: s?.paymentDays ?? 15,
    };
}

export function supplierFormToPayload(form) {
    const clean = (v) => String(v || '').trim() || null;
    return {
        name: String(form.name || '').trim(),
        jib: clean(form.jib),
        type: String(form.type || 'Industrija'),
        pdv: Boolean(form.pdv),
        bonitet: String(form.bonitet || 'B'),
        city: clean(form.city),
        address: clean(form.address),
        phone: clean(form.phone),
        email: clean(form.email),
        paymentDays: Number(form.paymentDays || 15),
    };
}

export function bonitetTone(bonitet) {
    if (bonitet === 'A') return 'success';
    if (bonitet === 'C') return 'danger';
    return 'warning';
}
