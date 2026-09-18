'use client';

const modules = [
  {
    title: 'TMS — Transport Management',
    desc: 'Planiranje ruta, dispatch, real-time tracking i ETA. Upravljaj svim pošiljkama iz jednog mjesta.',
    icon: '🚚',
  },
  {
    title: 'WMS — Warehouse Management',
    desc: 'Skladište, zone, RFID/Barcode skeniranje. Potpuna kontrola zaliha i kretanja robe.',
    icon: '📦',
  },
  {
    title: 'Fleet Management',
    desc: 'Vozila, vozači, planirano održavanje, gorivo. Praćenje stanja flote u realnom vremenu.',
    icon: '🚛',
  },
  {
    title: 'AI Route Optimizer',
    desc: 'Automatska optimizacija ruta, LTL/FTL clustering, učenje iz historije. Ušteda vremena i goriva.',
    icon: '🧭',
  },
  {
    title: 'AI Cargo Packing',
    desc: '3D pakovanje tereta, maksimalna popunjenost vozila. Pametno koristi svaki kubik.',
    icon: '📐',
  },
  {
    title: 'Predictive ETA',
    desc: 'Predviđanje kašnjenja na osnovu saobraćaja i historije. Upozorenja prije nego što se desi.',
    icon: '⏱',
  },
  {
    title: 'Dynamic Pricing',
    desc: 'Automatsko izračunavanje cijene transporta. Real-time ponude za klijente.',
    icon: '💰',
  },
  {
    title: 'Driver App',
    desc: 'Mobilna aplikacija za vozače — prijem naloga, status, navigacija. iOS i Android.',
    icon: '📱',
  },
  {
    title: 'Live View — GPS Tracking',
    desc: 'Interaktivna mapa sa svim vozilima u realnom vremenu. Praćenje lokacije i statusa.',
    icon: '🗺',
  },
  {
    title: 'Shipment Analytics',
    desc: 'Analitika pošiljki, trendovi, heatmap aktivnosti. Izvještaji u jednom kliku.',
    icon: '📊',
  },
  {
    title: 'Chats & AI Assistant',
    desc: 'Integrirani chat za komunikaciju. AI asistent za brze odgovore i automatizaciju.',
    icon: '💬',
  },
  {
    title: 'Compliance & Sustainability',
    desc: 'EU carina, EUR.1, CO2 tracking, green routing. Sve regulative na jednom mjestu.',
    icon: '🌍',
  },
];

export default function MoveLinkPage() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 64px' }}>
      {/* Hero */}
      <section style={{ padding: '48px 0 64px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.75rem', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>
          Next-gen logistički softver za Evropu
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#64748b', maxWidth: 600, margin: '0 auto 32px', lineHeight: 1.6 }}>
          MoveLink je sve-u-jednom platforma za transport, skladište i flotu. 
          AI optimizacija, real-time tracking i modularni SaaS — bez kompleksnih implementacija.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span style={{ padding: '8px 16px', background: '#fef3c7', color: '#b45309', borderRadius: '6px', fontSize: '14px' }}>
            300K+ paketa u dostavi
          </span>
          <span style={{ padding: '8px 16px', background: '#fef3c7', color: '#b45309', borderRadius: '6px', fontSize: '14px' }}>
            12K+ aktivnih ruta
          </span>
          <span style={{ padding: '8px 16px', background: '#fef3c7', color: '#b45309', borderRadius: '6px', fontSize: '14px' }}>
            235+ vozača
          </span>
        </div>
      </section>

      {/* Dashboard Preview — inspired by reference UI */}
      <section id="dashboard" style={{ marginBottom: 80 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', marginBottom: '24px' }}>
          Dashboard — sve na jednom mjestu
        </h2>
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          }}
        >
          {/* KPI bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '24px',
              padding: '20px 24px',
              background: '#fff',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <span style={{ color: '#f59e0b', fontWeight: '600', fontSize: '14px' }}>
              300,445 paketa u dostavi
            </span>
            <span style={{ color: '#f59e0b', fontWeight: '600', fontSize: '14px' }}>
              12,532 boards on track
            </span>
            <span style={{ color: '#f59e0b', fontWeight: '600', fontSize: '14px' }}>
              235 aktivnih vozača
            </span>
            <span style={{ color: '#f59e0b', fontWeight: '600', fontSize: '14px' }}>
              12,768 ruta u operaciji
            </span>
          </div>

          {/* Widget grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
              padding: '24px',
            }}
          >
            {/* Boards on track */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Boards on track</h3>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>04-09-2025 | 12:24</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>
                12 532
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                AX5678UA KYIV → LONDON
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                45467 KLT0056 passing Lviv (M456 - 234km)
              </div>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '500' }}>All boards LIVE now</span>
            </div>

            {/* Live view map placeholder */}
            <div
              style={{
                background: '#e2e8f0',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '20px',
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontSize: '14px',
              }}
            >
              🗺 Live View — mapa s GPS trackingom
            </div>

            {/* Shipment analytics */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '12px' }}>
                Shipment analytics
              </h3>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <span style={{ padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '12px' }}>All</span>
                <span style={{ padding: '4px 8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px' }}>International</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '4px', marginBottom: '12px' }}>
                {Array.from({ length: 48 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: 12,
                      background: `hsl(210, 40%, ${85 - (i % 4) * 15}%)`,
                      borderRadius: '2px',
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                In delivery · Delivered · Delayed · Returned
              </div>
            </div>

            {/* Drivers at work */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Drivers at work</h3>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>235</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <span style={{ padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '12px' }}>All</span>
                <span style={{ padding: '4px 8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px' }}>On route</span>
                <span style={{ padding: '4px 8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px' }}>Rest</span>
                <span style={{ padding: '4px 8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px' }}>At home</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#cbd5e1' }} />
                <span style={{ fontSize: '13px' }}>Jessie Wilson</span>
                <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>⋯</span>
              </div>
            </div>

            {/* Operating routes with status tags */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '20px',
                gridColumn: '1 / -1',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '12px' }}>
                Operating routes — 12 786
              </h3>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <span style={{ padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '12px' }}>All</span>
                <span style={{ padding: '4px 8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px' }}>International</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px' }}>KYIV → LONDON</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>04-04-2025 | 12:24</span>
                  <span style={{ padding: '2px 8px', background: '#fef3c7', color: '#b45309', borderRadius: '4px', fontSize: '11px' }}>Stuck in customs</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px' }}>BERLIN → MUNICH</span>
                  <span style={{ padding: '2px 8px', background: '#fee2e2', color: '#b91c1c', borderRadius: '4px', fontSize: '11px' }}>Delayed</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px' }}>HAMBURG → VIENNA</span>
                  <span style={{ padding: '2px 8px', background: '#d1fae5', color: '#047857', borderRadius: '4px', fontSize: '11px' }}>At time</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chats & Assistant */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '16px' }}>
            <span style={{ color: '#1e293b', fontWeight: '600', fontSize: '14px' }}>CHATS →</span>
            <span style={{ color: '#1e293b', fontWeight: '600', fontSize: '14px' }}>ASSISTANT →</span>
          </div>
        </div>
      </section>

      {/* AI Modules */}
      <section id="ai" style={{ marginBottom: 80 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', marginBottom: '24px' }}>
          AI moduli — šta konkurencija nema
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🧭</div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '4px' }}>AI Route Optimizer+</h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>Multi-stop optimizacija, LTL/FTL clustering, učenje iz historije.</p>
          </div>
          <div style={{ padding: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📐</div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '4px' }}>AI Cargo Packing</h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>3D pakovanje, maksimalna popunjenost vozila.</p>
          </div>
          <div style={{ padding: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⏱</div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '4px' }}>Predictive ETA</h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>Predviđanje kašnjenja, upozorenja u realnom vremenu.</p>
          </div>
          <div style={{ padding: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💰</div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '4px' }}>Dynamic Pricing</h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>Automatske ponude, real-time cijene.</p>
          </div>
        </div>
      </section>

      {/* All Modules */}
      <section id="moduli" style={{ marginBottom: 80 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', marginBottom: '24px' }}>
          Svi moduli
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {modules.map((m, i) => (
            <div
              key={i}
              style={{
                padding: '24px',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                transition: 'box-shadow 0.2s',
              }}
            >
              <div style={{ fontSize: '1.75rem', marginBottom: '12px' }}>{m.icon}</div>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                {m.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: '48px',
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: '12px',
          textAlign: 'center',
          color: '#fff',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '12px' }}>
          Spremni za modernu logistiku?
        </h2>
        <p style={{ marginBottom: '24px', opacity: 0.9 }}>
          Plug-and-play. Bez kompleksnih implementacija. Od Njemačke do cijele Evrope.
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#fff',
            color: '#1e293b',
            borderRadius: '8px',
            fontWeight: '600',
            textDecoration: 'none',
          }}
        >
          Započni demo →
        </a>
      </section>
    </div>
  );
}
