import './Button.css';

export default function Button({
  children,
  variant = 'primary', // primary | secondary | danger | ghost | outline | destructive
  size = 'md', // sm | md
  isLoading = false,
  disabled = false,
  type = 'button',
  onClick,
  leftIcon,
  rightIcon,
  className = '',
  ...rest
}) {
  const classes = [`btn`, `btn--${variant}`, `btn--${size}`, 'touch-target'];
  if (leftIcon || rightIcon) classes.push('btn--with-icon');
  if (className) classes.push(className);

  return (
    <button
      type={type}
      className={classes.join(' ').trim()}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...rest}
    >
      {isLoading ? <span className="btn__spinner" aria-hidden="true" /> : null}
      {leftIcon ? <span className="btn__icon btn__icon--left">{leftIcon}</span> : null}
      <span>{children}</span>
      {rightIcon ? <span className="btn__icon btn__icon--right">{rightIcon}</span> : null}
    </button>
  );
}
