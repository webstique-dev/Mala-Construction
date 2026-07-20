import { useState } from 'react';
import { Plus, Pencil, Trash2, RotateCcw, Search, ChevronLeft, ChevronRight, Inbox, DollarSign, Layers, Receipt, Check, X } from 'lucide-react';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import DatePickerInput from '../../components/ui/DatePickerInput';
import AccordionCard from '../../components/ui/AccordionCard';
import ExpenseFormModal from './ExpenseFormModal';
import FilterToolbar from '../../components/common/FilterToolbar';
import { useExpenses, useDeleteExpense, useRestoreExpense, useApproveExpense, useRejectExpense } from '../../hooks/useExpenses';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useSiteScope } from '../../hooks/useSiteScope';
import { useLookups } from '../../hooks/useLookups';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency, formatDate } from '../../utils/format';
import Card from '../../components/ui/Card';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { ImageThumbnail } from '../../components/common/ImagePreviewModal';
import '../../styles/operational-page.css';
import '../sites/Sites.css';

export default function Expenses() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [siteFilter, setSiteFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { type: 'delete' | 'restore' | 'approve' | 'reject', expense }

  const { isSuperAdmin, siteId } = useSiteScope(siteFilter || undefined);
  const debouncedSearch = useDebouncedValue(search);
  const { expenseCategories, activeSites } = useLookups(siteId);
  const { data, isLoading, isError, isFetching } = useExpenses({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
    siteId: isSuperAdmin ? siteFilter || undefined : siteId,
    category: categoryFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    showDeleted,
  });
  const deleteExpense = useDeleteExpense();
  const restoreExpense = useRestoreExpense();
  const approveExpense = useApproveExpense();
  const rejectExpense = useRejectExpense();
  const toast = useToast();

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.type === 'restore') {
        await restoreExpense.mutateAsync(confirmTarget.expense._id);
        toast.success('Expense restored.');
      } else if (confirmTarget.type === 'delete') {
        await deleteExpense.mutateAsync(confirmTarget.expense._id);
        toast.success('Expense deleted.');
      } else if (confirmTarget.type === 'approve') {
        await approveExpense.mutateAsync(confirmTarget.expense._id);
        toast.success('Expense approved.');
      } else if (confirmTarget.type === 'reject') {
        await rejectExpense.mutateAsync(confirmTarget.expense._id);
        toast.success('Expense rejected.');
      }
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    }
  };

  // Sum page expenses
  const pageTotal = data?.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

  const filterConfig = [
    {
      key: 'startDate',
      label: 'Start Date',
      type: 'date',
      value: startDate,
      onChange: (val) => { setStartDate(val); setPage(1); },
    },
    {
      key: 'endDate',
      label: 'End Date',
      type: 'date',
      value: endDate,
      onChange: (val) => { setEndDate(val); setPage(1); },
    },
    ...(isSuperAdmin ? [{
      key: 'siteId',
      label: 'Site',
      type: 'select',
      value: siteFilter,
      onChange: (val) => { setSiteFilter(val); setPage(1); },
      options: activeSites.data?.map((s) => ({ value: s._id, label: s.name })) || [],
    }] : []),
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      value: categoryFilter,
      onChange: (val) => { setCategoryFilter(val); setPage(1); },
      options: expenseCategories.data?.map((c) => ({ value: c._id, label: c.name })) || [],
    },
  ];

  const handleReset = () => {
    setSearch('');
    setSiteFilter('');
    setCategoryFilter('');
    setStartDate('');
    setEndDate('');
    setShowDeleted(false);
    setPage(1);
  };

  return (
    <div className="module-page">
      <div className="module-page__header">
        <div>
          <h1>Other Site Expenses</h1>
          <p>Track utilities, local transportation, fuel, machinery rentals, and other site overheads.</p>
        </div>
        <Button onClick={() => { setEditing(null); setIsFormOpen(true); }}><Plus size={18} /> Add Expense</Button>
      </div>

      <div className="module-page__kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)' }}>
        <Card className="worker-kpi-card">
          <div className="worker-kpi-card__header">
            <span>Page Expenditure</span>
            <DollarSign size={16} className="worker-kpi-card__icon" />
          </div>
          <h3>{formatCurrency(pageTotal)}</h3>
        </Card>
        <Card className="worker-kpi-card">
          <div className="worker-kpi-card__header">
            <span>Logged Expenses</span>
            <Layers size={16} className="worker-kpi-card__icon" style={{ color: 'var(--color-success-500)' }} />
          </div>
          <h3>{data?.total || 0} Invoices</h3>
        </Card>
      </div>

      <FilterToolbar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search expenses..."
        filters={filterConfig}
        onReset={handleReset}
      />

      {isError && (
        <div className="sites-page__state sites-page__state--error" role="alert">
          Something went wrong loading expenses statements.
        </div>
      )}

      {!isError && (isLoading || (isFetching && !data?.items?.length)) && (
        <TableSkeleton rows={8} columns={8} />
      )}

      {!isError && !isLoading && (data?.items ?? []).length === 0 && (
        <div className="sites-page__state sites-page__state--empty">
          <Inbox size={32} />
          <span>No expenses recorded. Log a new expense overhead.</span>
        </div>
      )}

      {!isError && !isLoading && (data?.items ?? []).length > 0 && (
        <>
          <div className="desktop-only">
            <Card style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="worker-payments-card__table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Overhead Title</th>
                      <th>Project Site</th>
                      <th>Category</th>
                      <th>Net Amount</th>
                      <th>Vendor</th>
                      <th>Overhead Date</th>
                      <th>Payment Method</th>
                      <th>Receipt</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((r) => (
                      <tr key={r._id} className={r.isDeleted ? 'row-deleted' : ''}>
                        <td>
                          <strong>{r.title}</strong>
                          {r.isDeleted && <span className="sites-page__unassigned" style={{ marginLeft: 8 }}>(Deleted)</span>}
                        </td>
                        <td>{r.site?.name ?? '—'}</td>
                        <td>
                          <span className="status-badge" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                            {r.category?.name ?? 'Uncategorized'}
                          </span>
                        </td>
                        <td className="worker-payments-card__amount" style={{ color: 'var(--color-danger-500)' }}>
                          {formatCurrency(r.amount)}
                        </td>
                        <td>{r.vendor || '—'}</td>
                        <td>{formatDate(r.date)}</td>
                        <td style={{ textTransform: 'capitalize' }}>{r.paymentMethod}</td>
                        <td>
                          <ImageThumbnail
                            imageUrl={r.receiptUpload?.url}
                            title={`Receipt - ${r.title}`}
                            label="Receipt"
                          />
                        </td>
                        <td>
                          <span className={`status-badge status-badge--${r.status === 'approved' ? 'active' : r.status === 'rejected' ? 'suspended' : 'pending'}`}>
                            {r.status || 'pending'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="module-page__row-actions">
                            {r.isDeleted ? (
                              <button
                                type="button"
                                className="icon-btn touch-target"
                                onClick={() => setConfirmTarget({ type: 'restore', expense: r })}
                                title="Restore overhead"
                              >
                                <RotateCcw size={15} />
                              </button>
                            ) : (
                              <>
                                {isSuperAdmin && (r.status === 'pending' || !r.status) && (
                                  <>
                                    <button
                                      type="button"
                                      className="icon-btn touch-target"
                                      onClick={() => setConfirmTarget({ type: 'approve', expense: r })}
                                      title="Approve overhead"
                                      style={{ color: 'var(--color-success-600)' }}
                                    >
                                      <Check size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      className="icon-btn touch-target"
                                      onClick={() => setConfirmTarget({ type: 'reject', expense: r })}
                                      title="Reject overhead"
                                      style={{ color: 'var(--color-danger-600)' }}
                                    >
                                      <X size={15} />
                                    </button>
                                  </>
                                )}
                                <button type="button" className="icon-btn touch-target" onClick={() => { setEditing(r); setIsFormOpen(true); }} aria-label="Edit"><Pencil size={15} /></button>
                                <button type="button" className="icon-btn icon-btn--danger touch-target" onClick={() => setConfirmTarget({ type: 'delete', expense: r })} aria-label="Delete"><Trash2 size={15} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="mobile-only">
            {data.items.map((r) => (
              <AccordionCard
                key={r._id}
                isDeleted={r.isDeleted}
                header={{
                  title: r.title,
                  status: (
                    <span className={`status-badge status-badge--${r.status === 'approved' ? 'active' : r.status === 'rejected' ? 'suspended' : 'pending'}`}>
                      {r.status || 'pending'}
                    </span>
                  ),
                  category: r.category?.name ?? 'Uncategorized',
                  secondary: formatCurrency(r.amount)
                }}
                details={[
                  { label: 'Project Site', value: r.site?.name ?? '—' },
                  { label: 'Supplier / Vendor', value: r.vendor || '—' },
                  { label: 'Expense Date', value: formatDate(r.date) },
                  { label: 'Payment Method', value: r.paymentMethod },
                  {
                    label: 'Receipt',
                    value: r.receiptUpload?.url ? (
                      <a href={r.receiptUpload.url} target="_blank" rel="noreferrer" className="site-card__btn touch-target" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Receipt size={14} style={{ color: 'var(--color-primary-500)' }} /> View Receipt
                      </a>
                    ) : '—'
                  }
                ]}
                actions={
                  r.isDeleted ? (
                    <Button
                      variant="secondary"
                      onClick={() => setConfirmTarget({ type: 'restore', expense: r })}
                    >
                      <RotateCcw size={14} /> Restore
                    </Button>
                  ) : (
                    <>
                      {isSuperAdmin && (r.status === 'pending' || !r.status) && (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => setConfirmTarget({ type: 'approve', expense: r })}
                            style={{ color: 'var(--color-success-600)' }}
                          >
                            <Check size={14} /> Approve
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setConfirmTarget({ type: 'reject', expense: r })}
                            style={{ color: 'var(--color-danger-600)' }}
                          >
                            <X size={14} /> Reject
                          </Button>
                        </>
                      )}
                      <Button variant="secondary" onClick={() => { setEditing(r); setIsFormOpen(true); }}>
                        <Pencil size={14} /> Edit
                      </Button>
                      <Button variant="danger" onClick={() => setConfirmTarget({ type: 'delete', expense: r })}>
                        <Trash2 size={14} /> Delete
                      </Button>
                    </>
                  )
                }
              />
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="sites-page__pagination">
              <button
                type="button"
                className="pagination-btn touch-target"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="pagination-label">
                Page {page} of {data.totalPages}
              </span>
              <button
                type="button"
                className="pagination-btn touch-target"
                onClick={() => setPage(page + 1)}
                disabled={page >= data.totalPages}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      <ExpenseFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} expense={editing} defaultSiteId={siteId} />
      <ConfirmDialog
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirm}
        isLoading={deleteExpense.isPending || restoreExpense.isPending || approveExpense.isPending || rejectExpense.isPending}
        title={
          confirmTarget?.type === 'restore'
            ? 'Restore expense?'
            : confirmTarget?.type === 'delete'
              ? 'Delete expense?'
              : confirmTarget?.type === 'approve'
                ? 'Approve expense?'
                : 'Reject expense?'
        }
        message={
          confirmTarget?.type === 'restore'
            ? `Are you sure you want to restore "${confirmTarget?.expense?.title}"?`
            : confirmTarget?.type === 'delete'
              ? `Are you sure you want to delete "${confirmTarget?.expense?.title}"?`
              : confirmTarget?.type === 'approve'
                ? `Are you sure you want to approve the expense overhead "${confirmTarget?.expense?.title}" for ₹${confirmTarget?.expense?.amount}?`
                : `Are you sure you want to reject the expense overhead "${confirmTarget?.expense?.title}"?`
        }
        confirmLabel={
          confirmTarget?.type === 'restore'
            ? 'Restore'
            : confirmTarget?.type === 'delete'
              ? 'Delete'
              : confirmTarget?.type === 'approve'
                ? 'Approve'
                : 'Reject'
        }
        isDestructive={confirmTarget?.type === 'delete' || confirmTarget?.type === 'reject'}
      />
    </div>
  );
}
