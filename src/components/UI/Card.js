export default function Card({
    title,
    subtitle,
    actions,
    icon: Icon,
    children,
    flush = false,
    className = '',
    bodyClassName = '',
    style,
    bodyStyle,
}) {
    const hasHeader = title || actions;
    return (
        <section className={`ui-card ${className}`} style={style}>
            {hasHeader && (
                <div className="ui-card-header">
                    <div className="row" style={{ minWidth: 0, gap: 10 }}>
                        {Icon && (
                            <span className="ui-stat-icon" style={{ width: 28, height: 28, borderRadius: 8 }}>
                                <Icon size={15} strokeWidth={2} />
                            </span>
                        )}
                        <div style={{ minWidth: 0 }}>
                            {title && <div className="ui-card-title">{title}</div>}
                            {subtitle && <div className="ui-card-subtitle">{subtitle}</div>}
                        </div>
                    </div>
                    {actions && <div className="row" style={{ flexShrink: 0 }}>{actions}</div>}
                </div>
            )}
            <div className={`ui-card-body ${flush ? 'flush' : ''} ${bodyClassName}`} style={bodyStyle}>
                {children}
            </div>
        </section>
    );
}
