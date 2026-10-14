/**
 * Horizontalne trake za rangiranje (jedna serija → bez legende).
 * items: [{ key, label, value, sub? }]
 */
export default function BarList({ items = [], color = 'var(--series-1)', formatValue = (v) => v, emptyText = 'Nema podataka.' }) {
    const max = Math.max(0, ...items.map((i) => Number(i.value || 0)));
    if (!items.length) return <div className="muted" style={{ fontSize: 12.5, padding: '8px 0' }}>{emptyText}</div>;
    return (
        <div className="ui-barlist">
            {items.map((item) => {
                const pct = max > 0 ? (Number(item.value || 0) / max) * 100 : 0;
                return (
                    <div className="ui-barlist-row" key={item.key} title={`${item.label}: ${formatValue(item.value)}`}>
                        <div className="ui-barlist-head">
                            <span className="ui-barlist-name">{item.label}</span>
                            <span className="ui-barlist-val">
                                {formatValue(item.value)}
                                {item.sub && <span className="muted" style={{ marginLeft: 6 }}>{item.sub}</span>}
                            </span>
                        </div>
                        <div className="ui-barlist-track">
                            <div className="ui-barlist-fill" style={{ width: `${pct}%`, background: color }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
