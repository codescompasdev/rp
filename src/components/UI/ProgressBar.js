/**
 * Traka napretka (npr. ispunjenost narudžbe).
 * value = ispunjeno, max = plan, pending = količina koja će se dodati (trenutno vaganje),
 * tolerancePct = dozvoljeno prekoračenje (marker na kraju plana).
 */
export default function ProgressBar({
    value = 0,
    max = 0,
    pending = 0,
    label,
    valueText,
    footLeft,
    footRight,
    size = 'md',
    tone,
    tolerancePct = 0,
}) {
    const safeMax = Number(max) > 0 ? Number(max) : 0;
    const done = Math.max(0, Number(value) || 0);
    const extra = Math.max(0, Number(pending) || 0);
    // skala obuhvata toleranciju kako bi prekoračenje bilo vidljivo
    const scaleMax = safeMax > 0 ? Math.max(safeMax * (1 + Math.max(0, tolerancePct) / 100), done + extra, safeMax) : Math.max(done + extra, 1);
    const donePct = Math.min(100, (done / scaleMax) * 100);
    const pendingPct = Math.min(100, ((done + extra) / scaleMax) * 100);
    const planPct = safeMax > 0 ? Math.min(100, (safeMax / scaleMax) * 100) : null;

    let resolvedTone = tone;
    if (!resolvedTone) {
        if (safeMax <= 0) resolvedTone = 'info';
        else if (done + extra > safeMax * (1 + Math.max(0, tolerancePct) / 100)) resolvedTone = 'danger';
        else if (done + extra > safeMax) resolvedTone = 'warning';
        else if (done >= safeMax) resolvedTone = 'success';
        else resolvedTone = 'info';
    }

    const ariaNow = safeMax > 0 ? Math.round((done / safeMax) * 100) : undefined;

    return (
        <div className={`ui-progress ${size === 'md' ? '' : size}`} data-tone={resolvedTone}>
            {(label || valueText) && (
                <div className="ui-progress-head">
                    {label && <span className="ui-progress-label">{label}</span>}
                    {valueText && <span className="ui-progress-value">{valueText}</span>}
                </div>
            )}
            <div
                className="ui-progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={ariaNow}
                aria-label={typeof label === 'string' ? label : undefined}
            >
                {extra > 0 && <div className="ui-progress-pending" style={{ width: `${pendingPct}%` }} />}
                <div className="ui-progress-fill" style={{ width: `${donePct}%` }} />
                {planPct !== null && planPct < 100 && <div className="ui-progress-marker" style={{ left: `calc(${planPct}% - 1px)` }} title="Plan" />}
            </div>
            {(footLeft || footRight) && (
                <div className="ui-progress-foot">
                    <span>{footLeft}</span>
                    <span>{footRight}</span>
                </div>
            )}
        </div>
    );
}
