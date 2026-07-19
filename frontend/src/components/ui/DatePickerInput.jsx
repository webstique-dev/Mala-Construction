import { useMemo } from 'react';
import ReactDatePicker from 'react-datepicker';
import { parseDate, toInputDate } from '../../utils/format';
import 'react-datepicker/dist/react-datepicker.css';
import './DatePickerInput.css';

export default function DatePickerInput({
  id,
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  minDate,
  maxDate,
  error,
  className = '',
  label,
  ariaLabel = 'Choose date',
}) {
  const selected = useMemo(() => parseDate(value), [value]);
  const parsedMinDate = useMemo(() => parseDate(minDate), [minDate]);
  const parsedMaxDate = useMemo(() => parseDate(maxDate), [maxDate]);

  const handleChange = (date) => {
    if (!date) {
      onChange('');
      return;
    }
    onChange(toInputDate(date));
  };

  return (
    <div className={`date-picker ${className}`.trim()}>
      {label && <label htmlFor={id} className="date-picker__label">{label}</label>}
      <ReactDatePicker
        id={id}
        selected={selected}
        onChange={handleChange}
        placeholderText={placeholder}
        disabled={disabled}
        minDate={parsedMinDate}
        maxDate={parsedMaxDate}
        dateFormat="dd MMM yyyy"
        className={`date-picker__input${error ? ' date-picker__input--error' : ''}`}
        aria-label={ariaLabel}
        showPopperArrow={false}
        renderCustomHeader={({
          date,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div className="react-datepicker__header date-picker__header">
            <button
              type="button"
              className="date-picker__nav-btn"
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
              aria-label="Previous month"
            >
              ‹
            </button>
            <div className="date-picker__current-month">
              {date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </div>
            <button
              type="button"
              className="date-picker__nav-btn"
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
              aria-label="Next month"
            >
              ›
            </button>
          </div>
        )}
      />
      {error && <span className="date-picker__error">{error}</span>}
    </div>
  );
}
