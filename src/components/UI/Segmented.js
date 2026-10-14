/** Grupa dugmadi za izbor jedne opcije (filteri, periodi). */
export default function Segmented({ options, value, onChange, ariaLabel }) {
    return (
        <div className="ui-segmented" role="group" aria-label={ariaLabel}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={value === option.value}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
