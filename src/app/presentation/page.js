export default function PresentationPage() {
    const S = {
        page: { background: '#0a0f1a', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh' },
        hero: { textAlign: 'center', padding: '80px 40px', background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', borderBottom: '2px solid #334155' },
        heroTitle: { fontSize: '56px', fontWeight: 900, color: '#fff', letterSpacing: '-2px', marginBottom: '8px' },
        heroSub: { fontSize: '22px', color: '#94a3b8', fontWeight: 300 },
        container: { maxWidth: '1100px', margin: '0 auto', padding: '0 40px' },
        section: { padding: '60px 0', borderBottom: '1px solid #1e293b' },
        sectionTitle: { fontSize: '32px', fontWeight: 800, color: '#fff', marginBottom: '8px' },
        sectionDesc: { fontSize: '16px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '24px', maxWidth: '800px' },
        img: { width: '100%', border: '2px solid #334155', display: 'block' },
        badge: { display: 'inline-block', background: '#1e40af', color: 'white', padding: '4px 12px', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' },
        stat: { textAlign: 'center', padding: '16px' },
        statNum: { fontSize: '36px', fontWeight: 900, color: '#fff', fontFamily: '"JetBrains Mono", monospace' },
        statLabel: { fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginTop: '4px' },
        grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' },
        stepNum: { width: '40px', height: '40px', background: '#1e40af', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900, flexShrink: 0 },
        stepBox: { display: 'flex', gap: '16px', padding: '16px', background: '#111827', border: '1px solid #1e293b', marginBottom: '12px' },
        tbl: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
        th: { textAlign: 'left', padding: '10px 12px', background: '#1e293b', color: '#94a3b8', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #334155' },
        td: { padding: '10px 12px', borderBottom: '1px solid #1e293b', color: '#e2e8f0' },
        footer: { textAlign: 'center', padding: '40px', color: '#475569', fontSize: '14px' },
    };

    return (
        <div style={S.page}>
            {/* HERO */}
            <div style={S.hero}>
                <div style={{ fontSize: '14px', color: '#64748b', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '16px' }}>INVESTOR DECK — FEBRUAR 2026</div>
                <div style={S.heroTitle}>MILKUS CORE</div>
                <div style={S.heroSub}>Vertikalno Integrisani ERP za Industriju Reciklaže</div>
                <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center', gap: '40px' }}>
                    <div style={S.stat}><div style={S.statNum}>11</div><div style={S.statLabel}>Modula</div></div>
                    <div style={S.stat}><div style={S.statNum}>50+</div><div style={S.statLabel}>Ekrana</div></div>
                    <div style={S.stat}><div style={S.statNum}>40+</div><div style={S.statLabel}>Varijanti Materijala</div></div>
                    <div style={S.stat}><div style={S.statNum}>0</div><div style={S.statLabel}>Konkurenata (SCADA)</div></div>
                </div>
            </div>

            <div style={S.container}>

                {/* PROBLEM */}
                <div style={S.section}>
                    <span style={S.badge}>Problem</span>
                    <div style={S.sectionTitle}>Industrija reciklaže radi na Excelu i papiru</div>
                    <div style={S.sectionDesc}>200+ reciklažnih postrojenja u BiH koristi nepovezane procese. Gubitak 3-5% inventara godišnje. Nemoguć EU export bez LOT sljedivosti. LME fluktuacija od 1% na bakru = €85,000 razlika.</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        {[
                            { icon: '❌', title: 'Fantomski Inventar', desc: '3-5% materijala "nestaje" bez traga — nema masenog bilansa' },
                            { icon: '❌', title: 'Manipulacija Vagom', desc: 'Ručno kalo, nema kontrole — gubitak 50,000+ BAM/god' },
                            { icon: '❌', title: 'Nema LOT Sljedivosti', desc: 'EU zahtijeva Annex VII — bez sistema, nema exporta' },
                        ].map((item, i) => (
                            <div key={i} style={{ padding: '20px', background: '#111827', border: '1px solid #1e293b' }}>
                                <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
                                <div style={{ fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{item.title}</div>
                                <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>{item.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DASHBOARD */}
                <div style={S.section}>
                    <span style={S.badge}>Kontrolna Tabla</span>
                    <div style={S.sectionTitle}>Direktorski Pregled — Real-Time</div>
                    <div style={S.sectionDesc}>Cashflow, LME berza, kamioni u krugu, dospjele obaveze, tonaža ulaz/izlaz, i sistemski događaji — sve na jednom ekranu.</div>
                    <img src="/deck/01_dashboard.png" alt="Dashboard" style={S.img} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginTop: '24px' }}>
                        <div style={S.stat}><div style={{ ...S.statNum, color: '#10b981' }}>+342K</div><div style={S.statLabel}>Cashflow (BAM)</div></div>
                        <div style={S.stat}><div style={{ ...S.statNum, color: '#f59e0b' }}>124.5T</div><div style={S.statLabel}>Ulaz Danas</div></div>
                        <div style={S.stat}><div style={S.statNum}>80T</div><div style={S.statLabel}>Izlaz Danas</div></div>
                        <div style={S.stat}><div style={{ ...S.statNum, color: '#ef4444' }}>-34.8K</div><div style={S.statLabel}>Dospjele Obaveze</div></div>
                    </div>
                </div>

                {/* GATE WEIGHBRIDGE */}
                <div style={S.section}>
                    <span style={S.badge}>Kapija & Vaga</span>
                    <div style={S.sectionTitle}>SCADA Vaganje — Live RS232 Integracija</div>
                    <div style={S.sectionDesc}>Industrijska vaga direktno u ERP-u. Live očitanje, 4 CCTV kamere, ANPR prepoznavanje tablica. Kompletna procedura od registracije do isplate u 6 koraka.</div>
                    <img src="/deck/02_gate.png" alt="Gate Weighbridge" style={S.img} />
                </div>

                {/* PROCESS FLOW */}
                <div style={S.section}>
                    <span style={{ ...S.badge, background: '#7c3aed' }}>Proces</span>
                    <div style={S.sectionTitle}>End-to-End: Registracija → Vaganje → Isplata</div>
                    <div style={S.sectionDesc}>Svaki kamion prolazi strukturiranu proceduru sa potpunom digital evidencijom. Nema papira, nema manipulacije.</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Step 1 */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <div style={S.stepNum}>1</div>
                                <div><div style={{ fontWeight: 700, color: '#fff' }}>Registracija Ulaza</div><div style={{ fontSize: '13px', color: '#94a3b8' }}>Portir registruje kamion — ANPR, dobavljač, materijal, ugovor</div></div>
                            </div>
                            <img src="/deck/03_ticket.png" alt="New Ticket" style={S.img} />
                        </div>

                        {/* Steps 2-4 */}
                        <div style={S.grid2}>
                            <div style={S.stepBox}>
                                <div style={S.stepNum}>2</div>
                                <div><div style={{ fontWeight: 700, color: '#fff', marginBottom: '4px' }}>1. Vaganje (Bruto)</div><div style={{ fontSize: '13px', color: '#94a3b8' }}>Kamion na vagi → live očitanje → odobri bruto masu</div></div>
                            </div>
                            <div style={S.stepBox}>
                                <div style={{ ...S.stepNum, background: '#b45309' }}>3</div>
                                <div><div style={{ fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Inspekcija Materijala</div><div style={{ fontSize: '13px', color: '#94a3b8' }}>Kontrolor provjerava kvalitet, kalo, reklasifikacija</div></div>
                            </div>
                            <div style={S.stepBox}>
                                <div style={{ ...S.stepNum, background: '#7c3aed' }}>4</div>
                                <div><div style={{ fontWeight: 700, color: '#fff', marginBottom: '4px' }}>XRF Hemijska Analiza</div><div style={{ fontSize: '13px', color: '#94a3b8' }}>Opciono — hemijski sastav za obojene metale</div></div>
                            </div>
                            <div style={S.stepBox}>
                                <div style={{ ...S.stepNum, background: '#0f766e' }}>5</div>
                                <div><div style={{ fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Istovar & LOT Kreiranje</div><div style={{ fontSize: '13px', color: '#94a3b8' }}>LOT automatski dodijeljen skladišnoj lokaciji</div></div>
                            </div>
                        </div>

                        {/* Step 6 */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <div style={{ ...S.stepNum, background: '#15803d' }}>6</div>
                                <div><div style={{ fontWeight: 700, color: '#fff' }}>2. Vaganje (Tara) + Obračun</div><div style={{ fontSize: '13px', color: '#94a3b8' }}>Prazan kamion → auto-izračun neto/kalo/cijena → isplata</div></div>
                            </div>
                            <img src="/deck/04_tara.png" alt="Tara Weighing" style={S.img} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '1px', marginTop: '16px', background: '#334155' }}>
                                <div style={{ background: '#111827', padding: '12px', textAlign: 'center' }}><div style={{ fontSize: '10px', color: '#64748b' }}>BRUTO</div><div style={{ fontWeight: 900, color: '#fff', fontFamily: 'monospace', fontSize: '18px' }}>24,560</div></div>
                                <div style={{ background: '#111827', padding: '12px', textAlign: 'center' }}><div style={{ fontSize: '10px', color: '#64748b' }}>TARA</div><div style={{ fontWeight: 900, color: '#fff', fontFamily: 'monospace', fontSize: '18px' }}>12,100</div></div>
                                <div style={{ background: '#111827', padding: '12px', textAlign: 'center' }}><div style={{ fontSize: '10px', color: '#f59e0b' }}>KALO (2.5%)</div><div style={{ fontWeight: 900, color: '#f59e0b', fontFamily: 'monospace', fontSize: '18px' }}>-311</div></div>
                                <div style={{ background: '#111827', padding: '12px', textAlign: 'center' }}><div style={{ fontSize: '10px', color: '#10b981' }}>NETO (KG)</div><div style={{ fontWeight: 900, color: '#10b981', fontFamily: 'monospace', fontSize: '18px' }}>12,149</div></div>
                                <div style={{ background: '#1e293b', padding: '12px', textAlign: 'center' }}><div style={{ fontSize: '10px', color: '#ef4444' }}>ZA ISPLATU</div><div style={{ fontWeight: 900, color: '#ef4444', fontFamily: 'monospace', fontSize: '18px' }}>3,644 BAM</div></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* XRF */}
                <div style={S.section}>
                    <span style={S.badge}>Kvalitet</span>
                    <div style={S.sectionTitle}>XRF Hemijska Analiza — Ručni Unos</div>
                    <div style={S.sectionDesc}>Kontrolor skenira XRF pištoljem, čita rezultate, i unosi u sistem. Grafički prikaz hemijskog sastava sa live validacijom zbira (99-101%).</div>
                    <img src="/deck/05_xrf.png" alt="XRF" style={S.img} />
                </div>

                {/* MATERIALS */}
                <div style={S.section}>
                    <span style={S.badge}>Katalog</span>
                    <div style={S.sectionTitle}>Materijali & Varijante — Kompletni Katalog</div>
                    <div style={S.sectionDesc}>3 kategorije (Obojeni, Crni, Specijalni), 16 baznih materijala, 40+ varijanti. Svaka varijanta sa kvalitetom, stanjem, min. čistoćom i otkupnom cijenom.</div>
                    <img src="/deck/06_materials.png" alt="Materials" style={S.img} />
                </div>

                {/* LOT */}
                <div style={S.section}>
                    <span style={{ ...S.badge, background: '#0f766e' }}>Sljedivost</span>
                    <div style={S.sectionTitle}>LOT Genealogija — Od Dobavljača do Skladišta</div>
                    <div style={S.sectionDesc}>Potpuna sljedivost svakog LOT-a u 6 koraka. Kritično za Annex VII compliance i EU export. Svaki kilogram je sljediv.</div>
                    <img src="/deck/07_lot.png" alt="LOT Traceability" style={S.img} />
                </div>

                {/* MODULES GRID */}
                <div style={S.section}>
                    <span style={S.badge}>Ostali Moduli</span>
                    <div style={S.sectionTitle}>Kompletni ERP — 11 Modula</div>
                    <div style={S.grid2}>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '8px', letterSpacing: '1px' }}>NABAVKA & CRM</div>
                            <img src="/deck/08_suppliers.png" alt="Suppliers" style={S.img} />
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '8px', letterSpacing: '1px' }}>LOGISTIKA & FLOTA</div>
                            <img src="/deck/09_vehicles.png" alt="Vehicles" style={S.img} />
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '8px', letterSpacing: '1px' }}>PROIZVODNJA & YIELD</div>
                            <img src="/deck/10_production.png" alt="Production" style={S.img} />
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '8px', letterSpacing: '1px' }}>PRODAJA & EXPORT</div>
                            <img src="/deck/11_sales.png" alt="Sales" style={S.img} />
                        </div>
                    </div>
                </div>

                {/* MARKET */}
                <div style={S.section}>
                    <span style={{ ...S.badge, background: '#15803d' }}>Tržište</span>
                    <div style={S.sectionTitle}>Tržišni Potencijal</div>
                    <table style={S.tbl}>
                        <thead><tr><th style={S.th}>Metrika</th><th style={S.th}>Vrijednost</th></tr></thead>
                        <tbody>
                            <tr><td style={S.td}>Reciklažnih postrojenja u BiH</td><td style={{ ...S.td, fontWeight: 700, fontFamily: 'monospace' }}>200+</td></tr>
                            <tr><td style={S.td}>Cijena licence (mjesečno)</td><td style={{ ...S.td, fontWeight: 700, fontFamily: 'monospace' }}>500 — 2,000 BAM</td></tr>
                            <tr><td style={S.td}>TAM (godišnje, BiH)</td><td style={{ ...S.td, fontWeight: 700, fontFamily: 'monospace', color: '#10b981' }}>2.4M BAM</td></tr>
                            <tr><td style={S.td}>TAM (godišnje, region — HR/RS/MK/AL)</td><td style={{ ...S.td, fontWeight: 700, fontFamily: 'monospace', color: '#10b981' }}>15M+ BAM</td></tr>
                            <tr><td style={S.td}>Direktni konkurenti sa SCADA integracijom</td><td style={{ ...S.td, fontWeight: 900, fontFamily: 'monospace', color: '#f59e0b', fontSize: '20px' }}>0</td></tr>
                        </tbody>
                    </table>
                </div>

                {/* ROADMAP */}
                <div style={S.section}>
                    <span style={S.badge}>Roadmap</span>
                    <div style={S.sectionTitle}>Status & Plan</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '24px' }}>
                        <div style={{ padding: '24px', background: '#111827', border: '2px solid #15803d' }}>
                            <div style={{ color: '#10b981', fontWeight: 700, fontSize: '12px', marginBottom: '12px' }}>✅ GOTOVO — MVP</div>
                            <ul style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 2, paddingLeft: '16px' }}>
                                <li>11 modula, 50+ ekrana</li>
                                <li>SCADA vaga + CCTV mock</li>
                                <li>LOT sljedivost</li>
                                <li>LME live berza + FX</li>
                                <li>Kompletna lokalizacija</li>
                            </ul>
                        </div>
                        <div style={{ padding: '24px', background: '#111827', border: '1px solid #1e293b' }}>
                            <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '12px', marginBottom: '12px' }}>🔜 Q2 2026</div>
                            <ul style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 2, paddingLeft: '16px' }}>
                                <li>RS232 ↔ vaga hardware</li>
                                <li>ANPR kamera integracija</li>
                                <li>Mobile app (kontrolori)</li>
                                <li>API → Pantheon/SAOP</li>
                            </ul>
                        </div>
                        <div style={{ padding: '24px', background: '#111827', border: '1px solid #1e293b' }}>
                            <div style={{ color: '#8b5cf6', fontWeight: 700, fontSize: '12px', marginBottom: '12px' }}>🔜 Q3-Q4 2026</div>
                            <ul style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 2, paddingLeft: '16px' }}>
                                <li>AI predikcija LME cijena</li>
                                <li>Multi-lokacija</li>
                                <li>Annex VII auto-gen</li>
                                <li>SaaS / Cloud verzija</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div style={S.footer}>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>Compas Codes</div>
                    <div>Software za industriju — info@compascodes.com</div>
                </div>

            </div>
        </div>
    );
}
