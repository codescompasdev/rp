import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'Nema podataka', text, action }) {
    return (
        <div className="ui-empty">
            <div className="ui-empty-icon"><Icon size={20} strokeWidth={1.8} /></div>
            <div className="ui-empty-title">{title}</div>
            {text && <div className="ui-empty-text">{text}</div>}
            {action && <div style={{ marginTop: 6 }}>{action}</div>}
        </div>
    );
}
