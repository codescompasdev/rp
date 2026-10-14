import { Search } from 'lucide-react';

export default function SearchInput({ value, onChange, placeholder = 'Pretraži...', className = '', style, ...rest }) {
    return (
        <div className={`ui-input-icon ${className}`} style={style}>
            <Search size={15} strokeWidth={2} />
            <input
                type="search"
                className="ui-input"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                {...rest}
            />
        </div>
    );
}
