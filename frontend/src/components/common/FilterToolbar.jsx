import { useState, useEffect } from 'react';
import { Search, X, Filter, RotateCcw } from 'lucide-react';
import Drawer from '../drawers/Drawer';
import DatePickerInput from '../ui/DatePickerInput';
import Button from './Button';
import './FilterToolbar.css';

export default function FilterToolbar({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  onReset,
}) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 1024; // Align layout switch with sidebar responsive breakpoints

  // Calculate number of active filters (excluding search)
  const activeChips = filters.filter((f) => {
    if (f.type === 'checkbox') return !!f.value;
    return f.value !== '' && f.value !== undefined && f.value !== null;
  });

  const activeCount = activeChips.length;

  const handleClearFilter = (f) => {
    if (f.type === 'checkbox') {
      f.onChange(false);
    } else {
      f.onChange('');
    }
  };

  const getChipLabel = (f) => {
    if (f.type === 'checkbox') {
      return f.label;
    }
    if (f.type === 'select') {
      const opt = f.options?.find((o) => String(o.value) === String(f.value));
      return opt ? opt.label : f.value;
    }
    if (f.type === 'date') {
      return new Date(f.value).toLocaleDateString();
    }
    return f.value;
  };

  const renderFilterField = (f) => {
    if (f.type === 'select') {
      return (
        <div className="filter-field" key={f.key}>
          <label htmlFor={`filter-${f.key}`} className="filter-field__label">{f.label}</label>
          <select
            id={`filter-${f.key}`}
            className="form-select filter-select"
            value={f.value || ''}
            onChange={(e) => f.onChange(e.target.value)}
          >
            <option value="">All {f.label.toLowerCase()}s</option>
            {f.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (f.type === 'text') {
      return (
        <div className="filter-field" key={f.key}>
          <label htmlFor={`filter-${f.key}`} className="filter-field__label">{f.label}</label>
          <input
            id={`filter-${f.key}`}
            type="text"
            className="filter-text-input"
            value={f.value || ''}
            onChange={(e) => f.onChange(e.target.value)}
            placeholder={f.placeholder || f.label}
          />
        </div>
      );
    }

    if (f.type === 'date') {
      return (
        <div className="filter-field" key={f.key}>
          <label htmlFor={`filter-${f.key}`} className="filter-field__label">{f.label}</label>
          <DatePickerInput
            id={`filter-${f.key}`}
            value={f.value || ''}
            onChange={(val) => f.onChange(val)}
            placeholder={f.placeholder || f.label}
          />
        </div>
      );
    }

    if (f.type === 'checkbox') {
      return (
        <div className="filter-field filter-field--checkbox" key={f.key}>
          <label className="checkbox-filter">
            <input
              type="checkbox"
              checked={!!f.value}
              onChange={(e) => f.onChange(e.target.checked)}
            />
            {f.label}
          </label>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="filter-toolbar-container">
      <div className="filter-toolbar">
        {/* Search Field */}
        {onSearchChange && (
          <div className="filter-field filter-toolbar__search-field">
            <label className="filter-field__label">Search</label>
            <div className="filter-toolbar__search">
              <Search size={16} className="filter-toolbar__search-icon" />
              <input
                type="search"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label="Search"
              />
              {search && (
                <button
                  type="button"
                  className="filter-toolbar__clear-search touch-target"
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filters Group - Desktop view */}
        {!isMobile ? (
          <div className="filter-toolbar__fields">
            {filters.map((f) => renderFilterField(f))}
            {onReset && (activeCount > 0 || search) && (
              <button
                type="button"
                className="filter-toolbar__reset-btn touch-target"
                onClick={onReset}
              >
                <RotateCcw size={14} />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        ) : (
          /* Filters Action - Mobile view drawer trigger */
          <div className="filter-toolbar__mobile-actions">
            <button
              type="button"
              className={`filter-mobile-trigger touch-target ${activeCount > 0 ? 'filter-mobile-trigger--active' : ''}`}
              onClick={() => setIsMobileDrawerOpen(true)}
            >
              <Filter size={16} />
              <span>Filters</span>
              {activeCount > 0 && <span className="filter-mobile-trigger__badge">{activeCount}</span>}
            </button>
          </div>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeCount > 0 && (
        <div className="filter-chips">
          <span className="filter-chips__title">Active filters:</span>
          <div className="filter-chips__list">
            {activeChips.map((f) => (
              <div className="filter-chip" key={f.key}>
                <span className="filter-chip__label">{f.label}:</span>
                <span className="filter-chip__value">{getChipLabel(f)}</span>
                <button
                  type="button"
                  className="filter-chip__remove touch-target"
                  onClick={() => handleClearFilter(f)}
                  aria-label={`Remove ${f.label} filter`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {onReset && (
              <button
                type="button"
                className="filter-chips__clear-all touch-target"
                onClick={onReset}
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Filters Drawer */}
      {isMobile && (
        <Drawer
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          title="Filter Results"
          size="sm"
          footer={
            <div className="filter-drawer-footer">
              {onReset && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    onReset();
                    setIsMobileDrawerOpen(false);
                  }}
                  disabled={activeCount === 0 && !search}
                >
                  Clear all
                </Button>
              )}
              <Button onClick={() => setIsMobileDrawerOpen(false)}>Apply Filters</Button>
            </div>
          }
        >
          <div className="filter-drawer-body">
            {filters.map((f) => renderFilterField(f))}
          </div>
        </Drawer>
      )}
    </div>
  );
}
