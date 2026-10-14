import { useEffect, useState } from 'react';

/** Zaokružene vrijednosti ose (0 / 1K / 2K ...). */
export function niceTicks(maxValue, count = 4) {
    const max = Math.max(0, Number(maxValue) || 0);
    if (max === 0) return [0, 1];
    const rough = max / count;
    const pow = 10 ** Math.floor(Math.log10(rough));
    const norm = rough / pow;
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * pow;
    const top = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
    return ticks;
}

/** Putanja stupca: zaobljen gornji kraj (4px), ravna baza. */
export function columnPath(x, y, width, height, radius = 4) {
    if (height <= 0) return '';
    const r = Math.min(radius, width / 2, height);
    return [
        `M${x},${y + height}`,
        `V${y + r}`,
        `Q${x},${y} ${x + r},${y}`,
        `H${x + width - r}`,
        `Q${x + width},${y} ${x + width},${y + r}`,
        `V${y + height}`,
        'Z',
    ].join(' ');
}


/** Stvarna širina kontejnera (px) da tekst na osama ne bude razvučen. */
export function useMeasuredWidth(ref, fallback = 760) {
    const [width, setWidth] = useState(fallback);
    useEffect(() => {
        const node = ref.current;
        if (!node || typeof ResizeObserver === 'undefined') return undefined;
        const update = () => {
            const w = Math.round(node.getBoundingClientRect().width);
            if (w > 0) setWidth(w);
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(node);
        return () => observer.disconnect();
    }, [ref]);
    return width;
}
