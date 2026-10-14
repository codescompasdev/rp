export default function Legend({ series = [] }) {
    if (series.length < 2) return null;
    return (
        <div className="ui-chart-legend">
            {series.map((s) => (
                <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>
            ))}
        </div>
    );
}
