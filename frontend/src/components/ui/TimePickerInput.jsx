import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Clock, ChevronDown, Check, Sun, Moon, Sunrise, Sunset, Sparkles, X } from 'lucide-react';
import './TimePickerInput.css';

// Predefined Shift Time Slots for quick selection
const SHIFT_PRESETS = [
  { label: '07:00 AM', value: '07:00', tag: 'Early Morning' },
  { label: '08:00 AM', value: '08:00', tag: 'Morning Shift' },
  { label: '08:30 AM', value: '08:30', tag: 'Morning Shift' },
  { label: '09:00 AM', value: '09:00', tag: 'Standard Shift' },
  { label: '09:30 AM', value: '09:30', tag: 'Standard Shift' },
  { label: '10:00 AM', value: '10:00', tag: 'Late Start' },
  { label: '01:00 PM', value: '13:00', tag: 'Half Day / In' },
  { label: '02:00 PM', value: '14:00', tag: 'Afternoon' },
  { label: '05:00 PM', value: '17:00', tag: 'Early Out' },
  { label: '05:30 PM', value: '17:30', tag: 'Regular Out' },
  { label: '06:00 PM', value: '18:00', tag: 'Standard Out' },
  { label: '07:00 PM', value: '19:00', tag: 'Overtime Out' },
  { label: '08:00 PM', value: '20:00', tag: 'Late OT Out' },
  { label: '09:00 PM', value: '21:00', tag: 'Night Shift' },
];

const HOURS = Array.from({ length: 12 }, (_, i) => String(i === 0 ? 12 : i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

function parseTimeString(timeStr) {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
    return { hour12: '09', minute: '00', period: 'AM', hour24: '09:00' };
  }
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  let m = parseInt(mStr, 10);
  if (isNaN(h)) h = 9;
  if (isNaN(m)) m = 0;

  const period = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;

  const formattedH12 = String(h12).padStart(2, '0');
  const formattedM = String(m).padStart(2, '0');
  const formattedH24 = String(h).padStart(2, '0') + ':' + formattedM;

  return { hour12: formattedH12, minute: formattedM, period, hour24: formattedH24 };
}

function format24Hour(hour12, minute, period) {
  let h = parseInt(hour12, 10);
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${minute}`;
}

export default function TimePickerInput({
  id,
  value = '09:00',
  onChange,
  placeholder = 'Select time',
  disabled = false,
  error,
  className = '',
  label,
  ariaLabel = 'Select time',
  align = 'left', // 'left' | 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('picker'); // 'picker' | 'presets'
  const containerRef = useRef(null);

  const parsed = useMemo(() => parseTimeString(value), [value]);

  const [selectedHour, setSelectedHour] = useState(parsed.hour12);
  const [selectedMinute, setSelectedMinute] = useState(parsed.minute);
  const [selectedPeriod, setSelectedPeriod] = useState(parsed.period);

  // Sync internal state when external value changes
  useEffect(() => {
    const p = parseTimeString(value);
    setSelectedHour(p.hour12);
    setSelectedMinute(p.minute);
    setSelectedPeriod(p.period);
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const emitChange = (val24) => {
    if (disabled) return;
    if (onChange) {
      // Support both event-style handler e.target.value AND direct string value handler
      const syntheticEvent = {
        target: { id, name: id, value: val24 },
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      onChange(syntheticEvent);
    }
  };

  const handleSelectPreset = (presetVal) => {
    emitChange(presetVal);
    setIsOpen(false);
  };

  const handleHourSelect = (h) => {
    setSelectedHour(h);
    const new24 = format24Hour(h, selectedMinute, selectedPeriod);
    emitChange(new24);
  };

  const handleMinuteSelect = (m) => {
    setSelectedMinute(m);
    const new24 = format24Hour(selectedHour, m, selectedPeriod);
    emitChange(new24);
  };

  const handlePeriodSelect = (p) => {
    setSelectedPeriod(p);
    const new24 = format24Hour(selectedHour, selectedMinute, p);
    emitChange(new24);
  };

  const displayFormatted = useMemo(() => {
    return `${parsed.hour12}:${parsed.minute} ${parsed.period}`;
  }, [parsed]);

  return (
    <div className={`time-picker-wrapper ${className}`.trim()} ref={containerRef}>
      {label && <label htmlFor={id} className="time-picker-label">{label}</label>}

      <div
        className={`time-picker-trigger ${isOpen ? 'time-picker-trigger--open' : ''} ${error ? 'time-picker-trigger--error' : ''} ${disabled ? 'time-picker-trigger--disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        role="button"
      >
        <div className="time-picker-trigger__left">
          <div className="time-picker-trigger__icon-wrap">
            <Clock size={16} />
          </div>
          <span className="time-picker-trigger__display">
            {value ? displayFormatted : placeholder}
          </span>
        </div>

        <div className="time-picker-trigger__right">
          <span className="time-picker-trigger__period-pill">
            {parsed.period}
          </span>
          <ChevronDown size={14} className={`time-picker-trigger__chevron ${isOpen ? 'time-picker-trigger__chevron--rotated' : ''}`} />
        </div>
      </div>

      {error && <span className="time-picker-error">{error}</span>}

      {isOpen && (
        <div className={`time-picker-dropdown ${align === 'right' ? 'time-picker-dropdown--align-right' : ''}`}>
          {/* Dropdown Header Tabs */}
          <div className="time-picker-dropdown__header">
            <div className="time-picker-dropdown__tabs">
              <button
                type="button"
                className={`time-picker-tab ${activeTab === 'picker' ? 'time-picker-tab--active' : ''}`}
                onClick={() => setActiveTab('picker')}
              >
                Custom Time
              </button>
              <button
                type="button"
                className={`time-picker-tab ${activeTab === 'presets' ? 'time-picker-tab--active' : ''}`}
                onClick={() => setActiveTab('presets')}
              >
                Quick Shifts
              </button>
            </div>

            <button
              type="button"
              className="time-picker-dropdown__close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close time picker"
            >
              <X size={14} />
            </button>
          </div>

          {activeTab === 'picker' ? (
            <div className="time-picker-dropdown__body">
              {/* Selected Time Big Display */}
              <div className="time-picker-preview">
                <span className="time-picker-preview__digits">
                  {selectedHour}:{selectedMinute}
                </span>
                <span className="time-picker-preview__period">
                  {selectedPeriod}
                </span>
              </div>

              {/* Columns Grid */}
              <div className="time-picker-columns">
                {/* Hours Column */}
                <div className="time-picker-column">
                  <div className="time-picker-column__title">Hour</div>
                  <div className="time-picker-column__list custom-scrollbar">
                    {HOURS.map((h) => (
                      <button
                        key={h}
                        type="button"
                        className={`time-picker-item ${selectedHour === h ? 'time-picker-item--selected' : ''}`}
                        onClick={() => handleHourSelect(h)}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minutes Column */}
                <div className="time-picker-column">
                  <div className="time-picker-column__title">Minute</div>
                  <div className="time-picker-column__list custom-scrollbar">
                    {MINUTES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`time-picker-item ${selectedMinute === m ? 'time-picker-item--selected' : ''}`}
                        onClick={() => handleMinuteSelect(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AM / PM Column */}
                <div className="time-picker-column time-picker-column--period">
                  <div className="time-picker-column__title">Period</div>
                  <div className="time-picker-period-toggle">
                    <button
                      type="button"
                      className={`time-picker-period-btn ${selectedPeriod === 'AM' ? 'time-picker-period-btn--active' : ''}`}
                      onClick={() => handlePeriodSelect('AM')}
                    >
                      <Sun size={14} />
                      <span>AM</span>
                    </button>
                    <button
                      type="button"
                      className={`time-picker-period-btn ${selectedPeriod === 'PM' ? 'time-picker-period-btn--active' : ''}`}
                      onClick={() => handlePeriodSelect('PM')}
                    >
                      <Moon size={14} />
                      <span>PM</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="time-picker-presets-list custom-scrollbar">
              {SHIFT_PRESETS.map((preset) => {
                const isSelected = value === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    className={`time-picker-preset-item ${isSelected ? 'time-picker-preset-item--selected' : ''}`}
                    onClick={() => handleSelectPreset(preset.value)}
                  >
                    <div className="time-picker-preset-item__main">
                      <Clock size={14} className="time-picker-preset-item__icon" />
                      <span className="time-picker-preset-item__label">{preset.label}</span>
                    </div>
                    <div className="time-picker-preset-item__right">
                      <span className="time-picker-preset-item__tag">{preset.tag}</span>
                      {isSelected && <Check size={14} className="time-picker-preset-item__check" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer Action */}
          <div className="time-picker-dropdown__footer">
            <button
              type="button"
              className="time-picker-now-btn"
              onClick={() => {
                const now = new Date();
                const h24 = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
                emitChange(h24);
                setIsOpen(false);
              }}
            >
              Set Current Time
            </button>
            <button
              type="button"
              className="time-picker-done-btn"
              onClick={() => setIsOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
