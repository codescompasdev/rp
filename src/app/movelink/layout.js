'use client';

import Link from 'next/link';

export default function MoveLinkLayout({ children }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: '#ffffff',
        overflowY: 'auto',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#fff',
        }}
      >
        <Link href="/" style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
          MoveLink
        </Link>
        <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <a href="#moduli" style={{ color: '#64748b', fontSize: '14px' }}>Moduli</a>
          <a href="#dashboard" style={{ color: '#64748b', fontSize: '14px' }}>Dashboard</a>
          <a href="#ai" style={{ color: '#64748b', fontSize: '14px' }}>AI</a>
          <Link href="/" style={{ padding: '8px 16px', background: '#1e293b', color: '#fff', borderRadius: '6px', fontSize: '14px' }}>
            Demo
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
