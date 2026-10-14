'use client';

import { useMemo, useRef, useState } from 'react';
import { niceTicks, useMeasuredWidth } from './chartUtils';

/**
 * Jedna serija kroz vrijeme (linija 2px + blaga površina), crosshair tooltip.
 * data: [{ key, label, tooltipLabel?, value }]
 */
export default function AreaChart({ data = [], color = 'var(--series-1)', height = 220, formatValue = (v) => v, formatAxis = (v) => v, seriesLabel = '', ariaLabel }) {
    const wrapRef = useRef(null);
    const [hover, setHover] = useState(null);
    const width = useMeasuredWidth(wrapRef);
    const pad = { top: 14, right: 12, bottom: 28, left: 52 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    const maxValue = useMemo(() => Math.max(0, ...data.map((d) => Number(d.value || 0))), [data]);
    const ticks = niceTicks(maxValue);
    const top = ticks[ticks.length - 1] || 1;
    const step = data.length > 1 ? innerW / (data.length - 1) : 0;
    const x = (i) => (data.length > 1 ? pad.left + step * i : pad.left + innerW / 2);
    const y = (v) => pad.top + innerH - (Number(v || 0) / top) * innerH;
    const labelEvery = Math.max(1, Math.ceil(data.length / 10));

    const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.value)}`).join(' ');
    const area = data.length ? `${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : '';

    const onMove = (event) => {
        const rect = wrapRef.current?.getBoundingClientRect();
        if (!rect || !data.length) return;
        const px = ((event.clientX - rect.left) / rect.width) * width;
        const index = data.length > 1 ? Math.round((px - pad.left) / step) : 0;
        const clamped = Math.max(0, Math.min(data.length - 1, index));
        setHover({ index: clamped, x: (x(clamped) / width) * rect.width, y: (y(data[clamped].value) / height) * height });
    };

    const last = data.length ? data[data.length - 1] : null;

    return (
        <div className="ui-chart" ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} style={{ height }}>
                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)'} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                        <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-3)" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatAxis(t)}</text>
                    </g>
                ))}
                {area && <path d={area} fill={color} opacity="0.1" />}
                {line && <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
                {data.map((d, i) => (i % labelEvery === 0 ? (
                    <text key={d.key} x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--text-3)">{d.label}</text>
                ) : null))}
                {last && !hover && (
                    <circle cx={x(data.length - 1)} cy={y(last.value)} r="4" fill={color} stroke="var(--surface)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                )}
                {hover && (
                    <g>
                        <line x1={x(hover.index)} x2={x(hover.index)} y1={pad.top} y2={pad.top + innerH} stroke="var(--chart-axis)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                        <circle cx={x(hover.index)} cy={y(data[hover.index].value)} r="4" fill={color} stroke="var(--surface)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    </g>
                )}
            </svg>
            {hover && data[hover.index] && (
                <div className="ui-chart-tooltip" style={{ left: hover.x, top: Math.max(44, hover.y) }}>
                    <div className="ui-chart-tooltip-title">{data[hover.index].tooltipLabel || data[hover.index].label}</div>
                    <div className="ui-chart-tooltip-row">
                        <span className="key"><i style={{ background: color }} />{seriesLabel}</span>
                        <b>{formatValue(data[hover.index].value)}</b>
                    </div>
                </div>
            )}
        </div>
    );
}
