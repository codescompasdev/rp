export default function PageHeader({ title, subtitle, actions, children }) {
    return (
        <div className="ui-page-header">
            <div style={{ minWidth: 0 }}>
                <h1 className="ui-page-title">{title}</h1>
                {subtitle && <div className="ui-page-subtitle">{subtitle}</div>}
                {children}
            </div>
            {actions && <div className="ui-page-actions no-print">{actions}</div>}
        </div>
    );
}
