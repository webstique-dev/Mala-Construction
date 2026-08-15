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
  showChips = true,
  extraActions,
}) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 1024;

  const activeChips = filters.filter((f) => {
    if (f.type === 'checkbox') return !!f.value;
    return f.value !== '' && f.value !== undefined && f.value !== null;
  });

  const activeCount = activeChips.length;

  const handleClearFilter = (filter) => {
    if (filter.type === 'checkbox') {
      filter.onChange(false);
    } else {
      filter.onChange('');
    }
  };

  const getChipLabel = (f) => {
    if (f.options) {
      const option = f.options.find((o) => o.value === f.value);
      return option ? option.label : f.value;
    }
    if (f.type === 'date') {
      return new Date(f.value).toLocaleDateString();
    }
    return String(f.value);
  };

  const renderFilterField = (f) => {
    if (f.type === 'select') {
      return (
        <div className="filter-field" key={f.key}>
          {f.label && <label className="filter-label">{f.label}</label>}
          <select
            className="filter-select touch-target"
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
          >
            {f.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (f.type === 'date') {
      return (
        <div className="filter-field" key={f.key}>
          {f.label && <label className="filter-label">{f.label}</label>}
          <DatePickerInput
            value={f.value}
            onChange={f.onChange}
            placeholder={f.placeholder || 'Select date'}
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
            <span>{f.label}</span>
          </label>
        </div>
      );
    }

    return (
      <div className="filter-field" key={f.key}>
        {f.label && <label className="filter-label">{f.label}</label>}
        <input
          type="text"
          className="filter-text-input touch-target"
          placeholder={f.placeholder || ''}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
        />
      </div>
    );
  };

  return (
    <div className="filter-toolbar-container">
      <div className="filter-toolbar">
        {onSearchChange && (
          <div className="filter-toolbar__search-field">
            <div className="filter-toolbar__search">
              <Search size={16} className="filter-toolbar__search-icon" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                style={{ outline: 'none' }}
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
            {extraActions}
          </div>
        ) : (
          <div className="filter-toolbar__mobile-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`filter-mobile-trigger touch-target ${activeCount > 0 ? 'filter-mobile-trigger--active' : ''}`}
              onClick={() => setIsMobileDrawerOpen(true)}
            >
              <Filter size={16} />
              <span>Filters</span>
              {activeCount > 0 && <span className="filter-mobile-trigger__badge">{activeCount}</span>}
            </button>
            {extraActions}
          </div>
        )}
      </div>

      {showChips && activeCount > 0 && (
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
