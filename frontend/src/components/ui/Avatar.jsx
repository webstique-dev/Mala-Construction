import React from 'react';

export default function Avatar({ children, className = '', size = 40, ...props }) {
  const style = { width: size, height: size, borderRadius: 10 };
  return (
    <div className={`ui-avatar ${className}`} style={style} {...props}>
      {children}
    </div>
  );
}
