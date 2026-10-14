/**
 * Polje forme: labela + kontrola + hint/greška.
 * span="all" da zauzme cijeli red u ui-form-grid.
 */
export default function Field({ label, required = false, hint, error, children, span, className = '', htmlFor, style }) {
    return (
        <div className={`ui-field ${span === 'all' ? 'span-all' : ''} ${className}`} style={style}>
            {label && (
                <label className="ui-label" htmlFor={htmlFor}>
                    {label}
                    {required && <span className="req">*</span>}
                </label>
            )}
            {children}
            {error ? <span className="ui-error-text">{error}</span> : hint ? <span className="ui-hint">{hint}</span> : null}
        </div>
    );
}
