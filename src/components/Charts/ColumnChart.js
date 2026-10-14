'use client';

import { useMemo, useRef, useState } from 'react';
import { columnPath, niceTicks, useMeasuredWidth } from './chartUtils';

/**
 * Grupisani stupci kroz vrijeme.
 * data: [{ key, label, values: { [seriesKey]: number } }]
 * series: [{ key, label, color }]
 */
export default function ColumnChart({ data = [], series = [], height = 260, formatValue = (v) => v, formatAxis = (v) => v, ariaLabel }) {
    const wrapRef = useRef(null);
    const [hover, setHover] = useState(null);
    const width = useMeasuredWidth(wrapRef);
    const pad = { top: 12, right: 8, bottom: 28, left: 46 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    const maxValue = useMemo(
        () => Math.max(0, ...data.flatMap((d) => series.map((s) => Number(d.values?.[s.key] || 0)))),
        [data, series]
    );
    const ticks = niceTicks(maxValue);
    const top = ticks[ticks.length - 1] || 1;
    const band = data.length ? innerW / data.length : innerW;
    const gap = 2;
    const barW = Math.max(2, Math.min(24, (band * 0.72 - gap * (series.length - 1)) / Math.max(1, series.length)));
    const groupW = barW * series.length + gap * (series.length - 1);
    const labelEvery = Math.max(1, Math.ceil(data.length / 12));

    const y = (v) => pad.top + innerH - (Number(v || 0) / top) * innerH;

    const showTip = (index, event) => {
        const rect = wrapRef.current?.getBoundingClientRect();
        if (!rect) return;
        const cx = ((pad.left + band * index + band / 2) / width) * rect.width;
        setHover({ index, x: cx, y: Math.max(40, (event?.clientY ?? rect.top + 60) - rect.top) });
    };

    return (
        <div className="ui-chart" ref={wrapRef} onMouseLeave={() => setHover(null)}>
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} style={{ height }}>
                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)'} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                        <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-3)" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatAxis(t)}</text>
                    </g>
                ))}
                {data.map((d, i) => {
                    const gx = pad.left + band * i + (band - groupW) / 2;
                    const active = hover?.index === i;
                    return (
                        <g key={d.key}>
                            {active && <rect x={pad.left + band * i} y={pad.top} width={band} height={innerH} fill="var(--primary-50)" />}
                            {series.map((s, si) => {
                                const v = Number(d.values?.[s.key] || 0);
                                const h = (v / top) * innerH;
                                return (
                                    <path key={s.key} d={columnPath(gx + si * (barW + gap), pad.top + innerH - h, barW, h)} fill={s.color} opacity={hover && !active ? 0.55 : 1} />
                                );
                            })}
                            {i % labelEvery === 0 && (
                                <text x={pad.left + band * i + band / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--text-3)">{d.label}</text>
                            )}
                            <rect
                                x={pad.left + band * i}
                                y={pad.top}
                                width={band}
                                height={innerH}
                                fill="transparent"
                                tabIndex={0}
                                aria-label={`${d.label}: ${series.map((s) => `${s.label} ${formatValue(d.values?.[s.key] || 0)}`).join(', ')}`}
                                onMouseMove={(e) => showTip(i, e)}
                                onFocus={() => showTip(i)}
                                onBlur={() => setHover(null)}
                                style={{ outline: 'none' }}
                            />
                        </g>
                    );
                })}
            </svg>
            {hover && data[hover.index] && (
                <div className="ui-chart-tooltip" style={{ left: hover.x, top: hover.y }}>
                    <div className="ui-chart-tooltip-title">{data[hover.index].tooltipLabel || data[hover.index].label}</div>
                    {series.map((s) => (
                        <div className="ui-chart-tooltip-row" key={s.key}>
                            <span className="key"><i style={{ background: s.color }} />{s.label}</span>
                            <b>{formatValue(data[hover.index].values?.[s.key] || 0)}</b>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
