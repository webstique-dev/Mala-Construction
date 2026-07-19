import { Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import './DataTable.css';

/**
 * columns: [{ key, header, render?: (row) => node }]
 * Search/pagination are controlled from the parent (server-side), so this
 * component stays a pure renderer - the parent owns the TanStack Query call.
 */
export default function DataTable({
  columns,
  rows,
  isLoading,
  isError,
  errorMessage,
  emptyMessage = 'No records found.',
  searchValue,
  onSearchChange,
  page,
  totalPages,
  onPageChange,
  rowKey = (row) => row._id,
  actions, // (row) => node - rendered in a trailing column/card row
}) {
  return (
    <div className="data-table">
      {onSearchChange && (
        <div className="data-table__toolbar">
          <div className="data-table__search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              className="form-input"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search table"
            />
          </div>
        </div>
      )}

      {isError && (
        <div className="data-table__state data-table__state--error" role="alert">
          {errorMessage || 'Something went wrong loading this data.'}
        </div>
      )}

      {!isError && isLoading && (
        <div className="data-table__skeleton" aria-busy="true" aria-live="polite">
          {Array.from({ length: 5 }).map((_, i) => (
            <div className="data-table__skeleton-row" key={i} />
          ))}
        </div>
      )}

      {!isError && !isLoading && rows.length === 0 && (
        <div className="data-table__state data-table__state--empty">
          <Inbox size={28} aria-hidden="true" />
          <span>{emptyMessage}</span>
        </div>
      )}

      {!isError && !isLoading && rows.length > 0 && (
        <>
          {/* Desktop/tablet: real table */}
          <table className="data-table__table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.header}</th>
                ))}
                {actions && <th className="data-table__actions-col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={rowKey(row)} className={row.isDeleted ? 'row-deleted' : ''}>
                  {columns.map((col) => (
                    <td key={col.key} data-label={col.header}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                  {actions && <td className="data-table__actions-col">{actions(row)}</td>}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile: stacked cards, same data */}
          <div className="data-table__cards">
            {rows.map((row) => (
              <div className={`data-table__card ${row.isDeleted ? 'row-deleted' : ''}`} key={rowKey(row)}>
                {columns.map((col) => (
                  <div className="data-table__card-row" key={col.key}>
                    <span className="data-table__card-label">{col.header}</span>
                    <span className="data-table__card-value">{col.render ? col.render(row) : row[col.key]}</span>
                  </div>
                ))}
                {actions && <div className="data-table__card-actions">{actions(row)}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {onPageChange && totalPages > 1 && (
        <div className="data-table__pagination">
          <button
            type="button"
            className="data-table__page-btn touch-target"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="data-table__page-label">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="data-table__page-btn touch-target"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
