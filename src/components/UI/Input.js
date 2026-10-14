import Field from './Field';

const Input = ({ label, type = 'text', value, onChange, name, placeholder, required = false, ...rest }) => {
    return (
        <Field label={label} required={required} style={{ marginBottom: 14 }}>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                className="ui-input"
                placeholder={placeholder}
                required={required}
                {...rest}
            />
        </Field>
    );
};

export default Input;
