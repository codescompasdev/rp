import Link from 'next/link';

const VARIANT_CLASS = {
    primary: 'primary',
    secondary: '',
    soft: 'soft',
    ghost: 'ghost',
    danger: 'danger',
    'danger-soft': 'danger-soft',
    success: 'success',
    warning: 'warning',
};

/**
 * Jedinstveno dugme sistema.
 * variant: primary | secondary | soft | ghost | danger | danger-soft | success | warning
 * size: sm | md | lg | xl
 */
const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    block = false,
    href,
    type = 'button',
    className = '',
    ...rest
}) => {
    const iconSize = size === 'sm' ? 14 : size === 'xl' ? 20 : 16;
    const classes = [
        'ui-btn',
        VARIANT_CLASS[variant] ?? '',
        size !== 'md' ? size : '',
        block ? 'block' : '',
        !children && Icon ? 'icon-only' : '',
        className,
    ].filter(Boolean).join(' ');

    const content = (
        <>
            {Icon && <Icon size={iconSize} strokeWidth={2} aria-hidden="true" />}
            {children}
            {IconRight && <IconRight size={iconSize} strokeWidth={2} aria-hidden="true" />}
        </>
    );

    if (href) {
        return <Link href={href} className={classes} {...rest}>{content}</Link>;
    }

    return (
        <button type={type} className={classes} {...rest}>
            {content}
        </button>
    );
};

export default Button;
