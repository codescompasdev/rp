'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { getCurrentRole, getRoleLabel } from '@/lib/userRole';

export default function Home() {
  const router = useRouter();
  const [role, setRole] = useState('worker');

  useEffect(() => {
    setRole(getCurrentRole());
  }, []);

  const cards = useMemo(() => {
    const common = [
      { title: 'Ulaz i vaganje', color: '#1e40af', link: '/gate' },
      { title: 'Direktan otkup', color: '#0f766e', link: '/gate/walk-in' },
      { title: 'Analiza i knjiženje', color: '#b45309', link: '/inventory/transactions' },
      { title: 'Stanje robe', color: '#6d28d9', link: '/warehouse' },
    ];

    if (role === 'owner') {
      return [
        { title: 'Vlasnički pregled', color: '#1d4ed8', link: '/dashboard' },
        ...common,
        { title: 'Izlaz robe', color: '#b91c1c', link: '/sales' },
        { title: 'Izvještaji i istorija', color: '#334155', link: '/reports' },
        { title: 'Configure vage', color: '#0369a1', link: '/gate/configure' },
      ];
    }

    return common;
  }, [role]);

  return (
    <div className={styles.container}>
      <h1 style={{ marginBottom: '0.5rem', color: '#333' }}>Operativna kontrolna tabla</h1>
      <p style={{ marginBottom: '2rem', color: '#64748b' }}>Aktivna uloga: <strong>{getRoleLabel(role)}</strong></p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        {cards.map((card) => (
          <Link key={card.title} href={card.link} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '8px',
              borderTop: `4px solid ${card.color}`,
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              transition: 'transform 0.2s'
            }}>
              <h3 style={{ color: '#555', fontSize: '1.2rem' }}>{card.title}</h3>
              <p style={{ color: card.color, fontWeight: 'bold', marginTop: '0.5rem' }}>Otvori &rarr;</p>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ marginTop: '3rem', background: 'white', padding: '2rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
        <h2>Brzi Linkovi</h2>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button onClick={() => router.push('/gate')} style={{ padding: '0.8rem 1.5rem', border: '1px solid #ddd', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>+ Novi tiket ulaza</button>
          <button onClick={() => router.push('/inventory/transactions')} style={{ padding: '0.8rem 1.5rem', border: '1px solid #ddd', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>+ Unos analize</button>
          {role === 'owner' && (
            <button onClick={() => router.push('/gate/configure')} style={{ padding: '0.8rem 1.5rem', border: '1px solid #ddd', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>+ Configure vage</button>
          )}
        </div>
      </div>
    </div>
  );
}
