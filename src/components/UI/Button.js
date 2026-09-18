import styles from './Button.module.css';

const Button = ({ children, variant = 'primary', onClick, type = 'button', className = '' }) => {
    return (
        <button
            type={type}
            className={`${styles.button} ${styles[variant]} ${className}`}
            onClick={onClick}
        >
            {children}
        </button>
    );
};

export default Button;
