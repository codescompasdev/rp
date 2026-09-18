import styles from './Input.module.css';

const Input = ({ label, type = 'text', value, onChange, name, placeholder, required = false }) => {
    return (
        <div className={styles.wrapper}>
            {label && <label className={styles.label}>{label} {required && <span className={styles.required}>*</span>}</label>}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                className={styles.input}
                placeholder={placeholder}
            />
        </div>
    );
};

export default Input;
