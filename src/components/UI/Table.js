'use client';

import styles from './Table.module.css';

export default function Table({ columns, data, onRowClick }) {
    if (!data || data.length === 0) {
        return <div className={styles.emptyState}>Nema podataka za prikaz.</div>; // "No data to display"
    }

    return (
        <div className={styles.tableWrapper}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th className={styles.checkboxTh}><input type="checkbox" /></th>
                        {columns.map((col, idx) => (
                            <th key={idx}>{col.header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex} onClick={() => onRowClick && onRowClick(row)} className={onRowClick ? styles.clickable : ''}>
                            <td className={styles.checkboxTd}><input type="checkbox" onClick={e => e.stopPropagation()} /></td>
                            {columns.map((col, colIndex) => (
                                <td key={colIndex}>
                                    {col.render ? col.render(row) : (row[col.accessor] !== undefined ? row[col.accessor] : '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className={styles.footer}>
                <span className={styles.count}>{data.length} stavki</span>
                <div className={styles.pagination}>
                    <button disabled>&lt;</button>
                    <span>1 / 1</span>
                    <button disabled>&gt;</button>
                </div>
            </div>
        </div>
    );
}
