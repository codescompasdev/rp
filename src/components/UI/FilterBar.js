'use client';

import { useState } from 'react';
import styles from './FilterBar.module.css';

export default function FilterBar({ onSearch, filters = [] }) {
    // filters: [{ name: 'status', label: 'Status', type: 'select', options: [] }, ...]
    const [query, setQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState({});

    const handleFilterChange = (name, value) => {
        const newFilters = { ...activeFilters, [name]: value };
        setActiveFilters(newFilters);
        if (onSearch) onSearch(query, newFilters);
    };

    const handleSearch = () => {
        if (onSearch) onSearch(query, activeFilters);
    };

    return (
        <div className={styles.filterBar}>
            <div className={styles.searchSection}>
                <div className={styles.searchBox}>
                    <input
                        type="text"
                        placeholder="Pretraži..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                    <button onClick={handleSearch} className={styles.searchBtn}>🔍</button>
                </div>
            </div>

            <div className={styles.filtersSection}>
                {filters.map(filter => (
                    <div key={filter.name} className={styles.filterItem}>
                        <label>{filter.label}</label>
                        {filter.type === 'select' ? (
                            <select onChange={(e) => handleFilterChange(filter.name, e.target.value)} className={styles.select}>
                                <option value="">Sve</option>
                                {filter.options.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        ) : (
                            <input type={filter.type} className={styles.input} />
                        )}
                    </div>
                ))}
            </div>

            <div className={styles.actions}>
                <button className={styles.actionBtn} onClick={() => { setQuery(''); setActiveFilters({}); }}>Očisti</button>
            </div>
        </div>
    );
}
