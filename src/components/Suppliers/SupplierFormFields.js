import Field from '@/components/UI/Field';
import { BONITET_OPTIONS, SUPPLIER_TYPES } from '@/lib/suppliers';

export default function SupplierFormFields({ form, setForm }) {
    const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));
    return (
        <div className="stack" style={{ gap: 20 }}>
            <section>
                <div className="ui-section-title">Osnovni podaci</div>
                <div className="ui-form-grid">
                    <Field label="Naziv firme / ime" required span="all">
                        <input className="ui-input" placeholder="npr. Zenica Steelworks d.o.o." value={form.name} onChange={(e) => update({ name: e.target.value })} required autoFocus />
                    </Field>
                    <Field label="JIB">
                        <input className="ui-input font-code" placeholder="4218109230004" value={form.jib} onChange={(e) => update({ jib: e.target.value })} />
                    </Field>
                    <Field label="Tip partnera">
                        <select className="ui-input" value={form.type} onChange={(e) => update({ type: e.target.value })}>
                            {SUPPLIER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </Field>
                    <Field label="PDV obveznik">
                        <select className="ui-input" value={form.pdv ? 'DA' : 'NE'} onChange={(e) => update({ pdv: e.target.value === 'DA' })}>
                            <option value="DA">Da</option>
                            <option value="NE">Ne</option>
                        </select>
                    </Field>
                </div>
            </section>
            <section>
                <div className="ui-section-title">Kontakt i adresa</div>
                <div className="ui-form-grid">
                    <Field label="Grad">
                        <input className="ui-input" value={form.city} onChange={(e) => update({ city: e.target.value })} />
                    </Field>
                    <Field label="Adresa">
                        <input className="ui-input" value={form.address} onChange={(e) => update({ address: e.target.value })} />
                    </Field>
                    <Field label="Telefon">
                        <input className="ui-input font-code" placeholder="+387 xx xxx xxx" value={form.phone} onChange={(e) => update({ phone: e.target.value })} />
                    </Field>
                    <Field label="Email">
                        <input type="email" className="ui-input" value={form.email} onChange={(e) => update({ email: e.target.value })} />
                    </Field>
                </div>
            </section>
            <section>
                <div className="ui-section-title">Bonitet i uslovi</div>
                <div className="ui-form-grid">
                    <Field label="Bonitet">
                        <select className="ui-input" value={form.bonitet} onChange={(e) => update({ bonitet: e.target.value })}>
                            {BONITET_OPTIONS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Rok plaćanja (dana)">
                        <input type="number" min="0" className="ui-input font-mono" value={form.paymentDays} onChange={(e) => update({ paymentDays: e.target.value })} />
                    </Field>
                </div>
            </section>
        </div>
    );
}
