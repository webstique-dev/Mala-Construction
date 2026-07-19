import './FormField.css';

export default function FormField({ label, error, required, children, hint }) {
  return (
    <div className="form-field">
      {label && (
        <label className="form-field__label">
          {label}
          {required && <span className="form-field__required">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className="form-field__hint">{hint}</span>}
      {error && (
        <span className="form-field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
