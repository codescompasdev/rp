'use client';

import { ArrowDownToLine, ArrowUpFromLine, Package, Plus, X } from 'lucide-react';
import Field from '@/components/UI/Field';
import Button from '@/components/UI/Button';
import Alert from '@/components/UI/Alert';
import { ORDER_STATUSES, PAYMENT_TERMS } from '@/lib/orders';

/**
 * Polja forme narudžbe — dijele ih modal na listi narudžbi i stranica "Nova narudžba".
 * Logika (validacija, slanje) ostaje u stranici; ovdje je samo prikaz i unos.
 */
export default function OrderFormFields({
    form,
    setForm,
    items,
    setItems,
    isEdit = false,
    partners = [],
    partnerQuery,
    onPartnerQueryChange,
    onOpenMaterialPicker,
    onOpenCreatePartner,
    error,
    datalistId = 'order-partners',
}) {
    const isBuy = form.direction === 'BUY';
    const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

    return (
        <div className="stack" style={{ gap: 22 }}>
            <section>
                <div className="ui-section-title">Strane narudžbe</div>
                <div className="ui-form-grid">
                    <Field label="Vrsta narudžbe" span="all">
                        <div className="of-dir" role="radiogroup" aria-label="Vrsta narudžbe">
                            {[
                                { value: 'BUY', title: 'Nabavka', text: 'Mi kupujemo od dobavljača · vaganje ULAZ', icon: ArrowDownToLine },
                                { value: 'SELL', title: 'Prodaja', text: 'Mi prodajemo kupcu · vaganje IZLAZ', icon: ArrowUpFromLine },
                            ].map((opt) => {
                                const Icon = opt.icon;
                                const checked = form.direction === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={checked}
                                        disabled={isEdit}
                                        className="of-dir-opt"
                                        data-checked={checked}
                                        onClick={() => {
                                            if (isEdit || checked) return;
                                            setForm((prev) => ({ ...prev, direction: opt.value, partnerId: '' }));
                                            onPartnerQueryChange?.('', { reset: true });
                                        }}
                                    >
                                        <span className="of-dir-icon"><Icon size={18} /></span>
                                        <span>
                                            <span className="of-dir-title">{opt.title}</span>
                                            <span className="of-dir-text">{opt.text}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </Field>
                    <Field label={isBuy ? 'Dobavljač' : 'Kupac'} required span="all" hint={isEdit ? 'Partner se ne mijenja nakon kreiranja.' : undefined}>
                        <div className="ui-input-group">
                            <input
                                className="ui-input"
                                list={datalistId}
                                value={partnerQuery}
                                disabled={isEdit}
                                placeholder={isBuy ? 'Počni kucati naziv dobavljača...' : 'Počni kucati naziv kupca...'}
                                onChange={(e) => onPartnerQueryChange?.(e.target.value)}
                            />
                            {!isEdit && (
                                <Button variant="secondary" icon={Plus} onClick={onOpenCreatePartner}>Novi</Button>
                            )}
                        </div>
                        <datalist id={datalistId}>
                            {partners.map((p) => <option key={p.id} value={p.name} />)}
                        </datalist>
                    </Field>
                </div>
            </section>

            <section>
                <div className="ui-section-title">Roba i količina</div>
                <div className="ui-form-grid">
                    <Field label="Način zadavanja količine">
                        <select className="ui-input" value={form.qtyMode} onChange={(e) => update({ qtyMode: e.target.value })}>
                            <option value="PER_MATERIAL">Količina po materijalu</option>
                            <option value="TOTAL">Ukupna količina cijele narudžbe</option>
                        </select>
                    </Field>
                    {form.qtyMode === 'TOTAL' ? (
                        <Field label="Ukupno (t)" required>
                            <input type="number" min="0" step="any" className="ui-input font-mono" value={form.totalQtyT} onChange={(e) => update({ totalQtyT: e.target.value })} />
                        </Field>
                    ) : <div className="hide-mobile" />}

                    <Field label="Materijali" required span="all">
                        <div className="of-items">
                            {items.map((it, idx) => (
                                <div className="of-item" key={it.materialId}>
                                    <span className="of-item-icon"><Package size={15} /></span>
                                    <span className="of-item-label">{it.label}</span>
                                    {form.qtyMode === 'PER_MATERIAL' ? (
                                        <div className="of-item-qty">
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                className="ui-input font-mono"
                                                placeholder="0"
                                                value={it.qtyT}
                                                aria-label={`Količina (t) za ${it.label}`}
                                                onChange={(e) => setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, qtyT: e.target.value } : x)))}
                                            />
                                            <span className="muted">t</span>
                                        </div>
                                    ) : (
                                        <span className="muted" style={{ fontSize: 12 }}>dio ukupne količine</span>
                                    )}
                                    <button
                                        type="button"
                                        className="ui-btn ghost sm icon-only"
                                        aria-label={`Ukloni ${it.label}`}
                                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                            ))}
                            {!items.length && (
                                <div className="of-items-empty">Nema dodanih materijala.</div>
                            )}
                            <div>
                                <Button variant="soft" icon={Plus} onClick={onOpenMaterialPicker}>Dodaj materijal</Button>
                            </div>
                        </div>
                    </Field>
                </div>
            </section>

            <section>
                <div className="ui-section-title">Cijena i isporuka</div>
                <div className="ui-form-grid">
                    <Field label="Formula cijene" required>
                        <select className="ui-input" value={form.formula} onChange={(e) => update({ formula: e.target.value })}>
                            <option value="LME">LME Cash Settlement − X%</option>
                            <option value="Fiksno">Fiksna cijena (KM/kg)</option>
                        </select>
                    </Field>
                    <Field label={form.formula === 'LME' ? 'Odbitak (%)' : 'Cijena (KM/kg)'}>
                        <input type="text" className="ui-input font-mono" placeholder={form.formula === 'LME' ? '15' : '0.30'} value={form.formulaValue} onChange={(e) => update({ formulaValue: e.target.value })} />
                    </Field>
                    <Field label="Tolerancija (%)" hint="Dozvoljeno prekoračenje plana">
                        <input type="number" min="0" className="ui-input font-mono" value={form.tolerance} onChange={(e) => update({ tolerance: e.target.value })} />
                    </Field>
                    <Field label="Paritet" required>
                        <select className="ui-input" value={form.paymentTerms} onChange={(e) => update({ paymentTerms: e.target.value })}>
                            {PAYMENT_TERMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Početak">
                        <input type="date" className="ui-input" value={form.startDate} onChange={(e) => update({ startDate: e.target.value })} />
                    </Field>
                    <Field label="Kraj">
                        <input type="date" className="ui-input" value={form.endDate} min={form.startDate || undefined} onChange={(e) => update({ endDate: e.target.value })} />
                    </Field>
                    {isEdit && (
                        <Field label="Status">
                            <select className="ui-input" value={form.status} onChange={(e) => update({ status: e.target.value })}>
                                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </Field>
                    )}
                </div>
            </section>

            {error && <Alert tone="danger">{error}</Alert>}

            <style>{`
                .of-dir { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
                .of-dir-opt {
                    display: flex; align-items: center; gap: 12px; text-align: left;
                    padding: 12px 14px; border-radius: var(--radius-lg);
                    border: 1px solid var(--border-strong); background: var(--surface);
                }
                .of-dir-opt[data-checked='true'] {
                    border-color: var(--primary); background: var(--primary-50);
                    box-shadow: inset 0 0 0 1px var(--primary);
                }
                .of-dir-opt:disabled { opacity: 1; cursor: default; }
                .of-dir-opt:disabled[data-checked='false'] { opacity: .45; }
                .of-dir-icon {
                    width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
                    display: grid; place-items: center; background: var(--surface-3); color: var(--text-2);
                }
                .of-dir-opt[data-checked='true'] .of-dir-icon { background: var(--primary); color: #fff; }
                .of-dir-title { display: block; font-weight: 700; font-size: 13.5px; color: var(--text); }
                .of-dir-text { display: block; font-size: 11.5px; color: var(--text-3); margin-top: 1px; }
                .of-items { display: grid; gap: 8px; }
                .of-item {
                    display: flex; align-items: center; gap: 10px;
                    padding: 8px 8px 8px 12px; border: 1px solid var(--border); border-radius: var(--radius);
                    background: var(--surface-2);
                }
                .of-item-icon { color: var(--primary); display: grid; place-items: center; }
                .of-item-label { flex: 1; min-width: 0; font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .of-item-qty { display: flex; align-items: center; gap: 6px; }
                .of-item-qty .ui-input { width: 130px; height: 34px; text-align: right; }
                .of-items-empty {
                    padding: 14px; text-align: center; font-size: 12.5px; color: var(--text-3);
                    border: 1px dashed var(--border-strong); border-radius: var(--radius);
                }
                @media (max-width: 640px) {
                    .of-dir { grid-template-columns: minmax(0, 1fr); }
                    .of-item { flex-wrap: wrap; }
                    .of-item-label { flex-basis: calc(100% - 70px); }
                    .hide-mobile { display: none; }
                }
            `}</style>
        </div>
    );
}
