'use client';

export default function Modal({ open, onClose, title, width, children, zIndex = 1200 }) {
    if (!open) return null;
    const resolvedWidth = typeof width === 'number' ? `${width}px` : (width || '700px');
    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px', paddingTop: '48px', overflowY: 'auto' }}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#fff',
                    border: '1px solid var(--border-color)',
                    width: `min(${resolvedWidth}, calc(100vw - 24px))`,
                    maxHeight: 'calc(100vh - 72px)',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.25)'
                }}
            >
                <div style={{ background: '#0f172a', color: 'white', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', flexShrink: 0 }}>
                    <span>{title}</span>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>✕</button>
                </div>
                <div style={{ padding: '14px', overflowY: 'auto', flex: 1 }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
