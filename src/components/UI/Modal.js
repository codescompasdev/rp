'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, subtitle, width, children, zIndex = 3000 }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (event) => {
            if (event.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;
    const resolvedWidth = typeof width === 'number' ? `${width}px` : (width || '700px');

    return (
        <div className="ui-modal-backdrop" style={{ zIndex }} onMouseDown={onClose}>
            <div
                className="ui-modal"
                role="dialog"
                aria-modal="true"
                aria-label={typeof title === 'string' ? title : undefined}
                style={{ width: `min(${resolvedWidth}, calc(100vw - 24px))` }}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="ui-modal-header">
                    <div style={{ minWidth: 0 }}>
                        <div className="ui-modal-title">{title}</div>
                        {subtitle && <div className="ui-card-subtitle">{subtitle}</div>}
                    </div>
                    <button type="button" className="ui-btn ghost icon-only sm" onClick={onClose} aria-label="Zatvori">
                        <X size={16} />
                    </button>
                </div>
                <div className="ui-modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
}
