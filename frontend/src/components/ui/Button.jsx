import React from 'react';

export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const cls = `ui-btn ui-btn--${variant} ${className}`.trim();
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
