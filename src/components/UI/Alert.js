import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

const ICONS = {
    success: CheckCircle2,
    warning: AlertTriangle,
    danger: XCircle,
    info: Info,
};

export default function Alert({ tone = 'info', children, onClose, style }) {
    if (!children) return null;
    const Icon = ICONS[tone] || Info;
    return (
        <div className={`ui-alert ${tone}`} role={tone === 'danger' ? 'alert' : 'status'} style={style}>
            <Icon size={16} strokeWidth={2} />
            <div style={{ minWidth: 0, flex: 1 }}>{children}</div>
            {onClose && (
                <button type="button" className="ui-alert-close" onClick={onClose} aria-label="Zatvori poruku">
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
