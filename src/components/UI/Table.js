'use client';

import EmptyState from './EmptyState';

export default function Table({ columns, data, onRowClick, emptyText = 'Nema podataka za prikaz.' }) {
    if (!data || data.length === 0) {
        return (
            <div className="ui-card">
                <EmptyState title={emptyText} />
            </div>
        );
    }

    return (
        <div className="ui-card" style={{ overflow: 'hidden' }}>
            <div className="ui-table-wrap">
                <table>
                    <thead>
                        <tr>
                            {columns.map((col, idx) => (
                                <th key={idx} style={col.align === 'right' ? { textAlign: 'right' } : undefined}>{col.header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => (
                            <tr
                                key={row.id || rowIndex}
                                onClick={() => onRowClick && onRowClick(row)}
                                style={onRowClick ? { cursor: 'pointer' } : undefined}
                            >
                                {columns.map((col, colIndex) => (
                                    <td key={colIndex} style={col.align === 'right' ? { textAlign: 'right' } : undefined}>
                                        {col.render ? col.render(row) : (row[col.accessor] !== undefined ? row[col.accessor] : '')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="row-between" style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)' }}>
                <span>{data.length} stavki</span>
            </div>
        </div>
    );
}
