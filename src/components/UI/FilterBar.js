'use client';

import { useState } from 'react';
import SearchInput from './SearchInput';

export default function FilterBar({ onSearch, filters = [] }) {
    // filters: [{ name: 'status', label: 'Status', type: 'select', options: [] }, ...]
    const [query, setQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState({});

    const handleFilterChange = (name, value) => {
        const newFilters = { ...activeFilters, [name]: value };
        setActiveFilters(newFilters);
        if (onSearch) onSearch(query, newFilters);
    };

    const handleQueryChange = (value) => {
        setQuery(value);
        if (onSearch) onSearch(value, activeFilters);
    };

    const clear = () => {
        setQuery('');
        setActiveFilters({});
        if (onSearch) onSearch('', {});
    };

    return (
        <div className="ui-card" style={{ padding: 12, marginBottom: 16 }}>
            <div className="ui-toolbar">
                <SearchInput className="grow" value={query} onChange={handleQueryChange} />
                {filters.map((filter) => (
                    filter.type === 'select' ? (
                        <select
                            key={filter.name}
                            className="ui-input"
                            style={{ width: 'auto', minWidth: 150 }}
                            value={activeFilters[filter.name] || ''}
                            onChange={(e) => handleFilterChange(filter.name, e.target.value)}
                            aria-label={filter.label}
                        >
                            <option value="">{filter.label}: sve</option>
                            {filter.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            key={filter.name}
                            type={filter.type}
                            className="ui-input"
                            style={{ width: 'auto' }}
                            aria-label={filter.label}
                            value={activeFilters[filter.name] || ''}
                            onChange={(e) => handleFilterChange(filter.name, e.target.value)}
                        />
                    )
                ))}
                <button type="button" className="ui-btn ghost" onClick={clear}>Očisti</button>
            </div>
        </div>
    );
}
