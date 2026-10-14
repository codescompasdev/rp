import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { fmtNum } from '@/lib/format';

/**
 * KPI kartica. delta = procentualna promjena vs prethodni period (broj ili null).
 * upIsGood određuje boju strelice.
 */
export default function StatCard({ label, value, unit, icon: Icon, tone = 'info', delta = null, deltaLabel, upIsGood = true, hint, loading = false }) {
    let deltaNode = null;
    if (delta !== null && delta !== undefined && Number.isFinite(delta)) {
        const rounded = Math.round(delta * 10) / 10;
        const dir = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat';
        const good = dir === 'flat' ? 'flat' : ((dir === 'up') === upIsGood ? 'up' : 'down');
        const DeltaIcon = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : Minus;
        deltaNode = (
            <span className={`ui-delta ${good}`}>
                <DeltaIcon size={13} strokeWidth={2.4} />
                {Math.abs(rounded) > 999
                    ? `${rounded > 0 ? '>+' : '<-'}999%`
                    : `${rounded > 0 ? '+' : ''}${fmtNum(rounded, 1)}%`}
            </span>
        );
    }

    return (
        <div className="ui-stat">
            <div className="ui-stat-top">
                <span className="ui-stat-label">{label}</span>
                {Icon && (
                    <span className={`ui-stat-icon ${tone}`}>
                        <Icon size={16} strokeWidth={2} />
                    </span>
                )}
            </div>
            {loading ? (
                <div className="ui-skeleton" style={{ height: 28, width: '60%' }} />
            ) : (
                <div className="ui-stat-value">
                    {value}
                    {unit && <span className="ui-stat-unit">{unit}</span>}
                </div>
            )}
            {(deltaNode || hint) && (
                <div className="ui-stat-foot">
                    {deltaNode}
                    {deltaNode && deltaLabel && <span>{deltaLabel}</span>}
                    {hint && <span>{hint}</span>}
                </div>
            )}
        </div>
    );
}
