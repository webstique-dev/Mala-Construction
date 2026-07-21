import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, UserPlus, ChevronRight, Loader } from 'lucide-react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useWorkerSearch } from '../../hooks/useWorkers';
import WorkerFormModal from '../../pages/workers/WorkerFormModal';
import { formatCurrency } from '../../utils/format';

/**
 * WorkerPickerInput — reusable worker search/select/create component.
 *
 * Props:
 *   siteId         - site to scope the search to
 *   onSelect       - called with the full worker doc when a worker is chosen
 *   placeholder    - input placeholder text
 *   disabled       - disable the input
 *   existingIds    - Set of already-selected worker _id strings (duplicate warning)
 */
export default function WorkerPickerInput({
  siteId,
  onSelect,
  placeholder = 'Search by Worker ID, name or phone...',
  disabled = false,
  existingIds = new Set(),
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);
  const containerRef = useRef(null);

  const { data: results = [], isFetching } = useWorkerSearch(debouncedQuery, siteId, isOpen && debouncedQuery.length >= 1);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = useCallback((worker) => {
    onSelect(worker);
    setQuery('');
    setIsOpen(false);
  }, [onSelect]);

  // Called from WorkerFormModal after a new worker is successfully created
  const handleWorkerCreated = useCallback((newWorker) => {
    setIsFormOpen(false);
    if (newWorker) {
      onSelect(newWorker);
    }
    setQuery('');
    setIsOpen(false);
  }, [onSelect]);

  const showDropdown = isOpen && (query.trim().length >= 1 || isFormOpen === false);

  return (
    <div ref={containerRef} className="worker-picker-wrapper">
      <div className="worker-picker-input-row">
        <Search size={14} className="worker-picker-icon" />
        <input
          type="text"
          className="form-input worker-picker-input"
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          autoComplete="off"
        />
        {isFetching && <Loader size={14} className="worker-picker-spinner" />}
      </div>

      {isOpen && query.trim().length >= 1 && (
        <div className="worker-picker-dropdown">
          {results.length === 0 && !isFetching && (
            <div className="worker-picker-empty">
              No active worker found for &ldquo;{query}&rdquo;
            </div>
          )}

          {results.map((w) => {
            const isDuplicate =
              (w._id && existingIds.has(w._id.toString())) ||
              (w.workerId && existingIds.has(w.workerId.toString())) ||
              (w.name && existingIds.has(w.name.trim().toLowerCase())) ||
              (w.phone && w.phone.trim().length >= 5 && existingIds.has(w.phone.trim()));
            return (
              <button
                key={w._id}
                type="button"
                className={`worker-picker-item${isDuplicate ? ' worker-picker-item--duplicate' : ''}`}
                onClick={() => !isDuplicate && handleSelect(w)}
                disabled={isDuplicate}
                title={isDuplicate ? "Already added to today's attendance" : undefined}
              >
                <div className="worker-picker-item__main">
                  {w.workerId && (
                    <span className="worker-picker-item__id">{w.workerId}</span>
                  )}
                  <span className="worker-picker-item__name">{w.name}</span>
                  {isDuplicate && (
                    <span className="worker-picker-item__dup-badge">Already added</span>
                  )}
                </div>
                <div className="worker-picker-item__sub">
                  <span>{w.profession?.name || '—'}</span>
                  <span className="worker-picker-item__wage">{formatCurrency(w.dailyWage)}/day</span>
                  <span className="worker-picker-item__phone">{w.phone}</span>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            className="worker-picker-create-btn"
            onClick={() => { setIsOpen(false); setIsFormOpen(true); }}
          >
            <UserPlus size={14} />
            <span>Add &ldquo;{query}&rdquo; as a new worker</span>
            <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
          </button>
        </div>
      )}

      {/* Show add-new option even when query is empty */}
      {isOpen && query.trim().length === 0 && (
        <div className="worker-picker-dropdown">
          <button
            type="button"
            className="worker-picker-create-btn"
            onClick={() => { setIsOpen(false); setIsFormOpen(true); }}
          >
            <UserPlus size={14} />
            <span>Add a new worker</span>
            <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
          </button>
        </div>
      )}

      <WorkerFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        worker={null}
        defaultSiteId={siteId}
        onCreated={handleWorkerCreated}
      />
    </div>
  );
}
