import { useState } from 'react';
import { Plus, Pencil, Trash2, Printer, RotateCcw, ChevronLeft, ChevronRight, Inbox, DollarSign, CreditCard, Layers } from 'lucide-react';
import DataTable from '../../components/tables/DataTable';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import PaymentFormModal from './PaymentFormModal';
import FilterToolbar from '../../components/common/FilterToolbar';
import { usePayments, useDeletePayment, useRestorePayment } from '../../hooks/usePayments';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useSiteScope } from '../../hooks/useSiteScope';
import { useLookups } from '../../hooks/useLookups';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency, formatDate } from '../../utils/format';
import Card from '../../components/ui/Card';
import AccordionCard from '../../components/ui/AccordionCard';
import '../../styles/operational-page.css';
import '../sites/Sites.css';

export default function Payments() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [siteFilter, setSiteFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { type: 'delete' | 'restore', payment }

  const { isSuperAdmin, siteId } = useSiteScope(siteFilter || undefined);
  const debouncedSearch = useDebouncedValue(search);
  const { activeSites } = useLookups(siteId);
  const { data, isLoading, isError } = usePayments({
    page,
    limit: 10,
    search: debouncedSearch,
    siteId: isSuperAdmin ? siteFilter || undefined : siteId,
    status: statusFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    showDeleted,
  });
  const deletePayment = useDeletePayment();
  const restorePayment = useRestorePayment();
  const toast = useToast();

  const printReceipt = (row) => {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Payment Receipt</title></head><body style="font-family:sans-serif;padding:24px">
      <h2>Worker Payment Receipt</h2>
      <p><strong>Worker:</strong> ${row.worker?.name}</p>
      <p><strong>Site:</strong> ${row.site?.name}</p>
      <p><strong>Working Days:</strong> ${row.workingDays}</p>
      <p><strong>Daily Wage:</strong> ₹${row.dailyWage}</p>
      <p><strong>Net Amount:</strong> ₹${row.netSalary}</p>
      <p><strong>Date:</strong> ${formatDate(row.paidOn)}</p>
      <p><strong>Method:</strong> ${row.paymentMethod}</p>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.type === 'restore') {
        await restorePayment.mutateAsync(confirmTarget.payment._id);
        toast.success('Payment restored.');
      } else {
        await deletePayment.mutateAsync(confirmTarget.payment._id);
        toast.success('Payment deleted.');
      }
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    }
  };

  // Calculate sum of payments on this page
  const pageTotal = data?.items?.reduce((sum, item) => sum + (item.netSalary || 0), 0) || 0;

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
      key: 'status',
      label: 'Status',
      type: 'select',
      value: statusFilter,
      onChange: (val) => { setStatusFilter(val); setPage(1); },
      options: [
        { value: 'paid', label: 'Paid' },
        { value: 'pending', label: 'Pending' },
      ],
    },
  ];

  const handleReset = () => {
    setSearch('');
    setSiteFilter('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setShowDeleted(false);
    setPage(1);
  };

  return (
    <div className="module-page">
      <div className="module-page__header">
        <div>
          <h1>Labor Wage Disbursements</h1>
          <p>Supervise wage reports, advance balances, and print receipts.</p>
        </div>
        <Button onClick={() => { setEditing(null); setIsFormOpen(true); }}><Plus size={18} /> Record Payment</Button>
      </div>

      <div className="module-page__kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)' }}>
        <Card className="worker-kpi-card">
          <div className="worker-kpi-card__header">
            <span>Page Disbursements</span>
            <DollarSign size={16} className="worker-kpi-card__icon" />
          </div>
          <h3>{formatCurrency(pageTotal)}</h3>
        </Card>
        <Card className="worker-kpi-card">
          <div className="worker-kpi-card__header">
            <span>Disbursement Logs</span>
            <CreditCard size={16} className="worker-kpi-card__icon" style={{ color: 'var(--color-success-500)' }} />
          </div>
          <h3>{data?.total || 0} Invoices</h3>
        </Card>
      </div>

      <FilterToolbar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search payments..."
        filters={filterConfig}
        onReset={handleReset}
      />

      {isError && (
        <div className="sites-page__state sites-page__state--error" role="alert">
          Something went wrong loading payment statements.
        </div>
      )}

      {!isError && isLoading && (
        <div className="data-table__skeleton" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="data-table__skeleton-row" key={i} />
          ))}
        </div>
      )}

      {!isError && !isLoading && (data?.items ?? []).length === 0 && (
        <div className="sites-page__state sites-page__state--empty">
          <Inbox size={32} />
          <span>No payments logged. Record a new disbursement.</span>
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
                      <th>Worker File</th>
                      <th>Project Site</th>
                      <th>Days</th>
                      <th>Salary Rate</th>
                      <th>Net Amount</th>
                      <th>Date Paid</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((r) => (
                      <tr key={r._id} className={r.isDeleted ? 'row-deleted' : ''}>
                        <td>
                          <strong>{r.worker?.name ?? '—'}</strong>
                          {r.isDeleted && <span className="sites-page__unassigned" style={{ marginLeft: 8 }}>(Deleted)</span>}
                        </td>
                        <td>{r.site?.name ?? '—'}</td>
                        <td><strong>{r.workingDays} days</strong></td>
                        <td>{formatCurrency(r.dailyWage)} / day</td>
                        <td className="worker-payments-card__amount" style={{ color: 'var(--color-success-500)' }}>
                          {formatCurrency(r.netSalary)}
                        </td>
                        <td>{formatDate(r.paidOn)}</td>
                        <td style={{ textTransform: 'capitalize' }}>{r.paymentMethod}</td>
                        <td>
                          <span className={`status-badge status-badge--${r.status}`}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="module-page__row-actions">
                            {r.isDeleted ? (
                              <button
                                type="button"
                                className="icon-btn touch-target"
                                onClick={() => setConfirmTarget({ type: 'restore', payment: r })}
                                title="Restore Payment"
                              >
                                <RotateCcw size={15} />
                              </button>
                            ) : (
                              <>
                                <button type="button" className="icon-btn touch-target" onClick={() => printReceipt(r)} aria-label="Print Invoice"><Printer size={15} /></button>
                                <button type="button" className="icon-btn touch-target" onClick={() => { setEditing(r); setIsFormOpen(true); }} aria-label="Edit"><Pencil size={15} /></button>
                                <button type="button" className="icon-btn icon-btn--danger touch-target" onClick={() => setConfirmTarget({ type: 'delete', payment: r })} aria-label="Delete"><Trash2 size={15} /></button>
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
                  title: r.worker?.name ?? '—',
                  status: (
                    <span className={`status-badge status-badge--${r.status}`}>
                      {r.status}
                    </span>
                  ),
                  category: r.site?.name,
                  secondary: formatCurrency(r.netSalary)
                }}
                details={[
                  { label: 'Days Worked', value: `${r.workingDays} days` },
                  { label: 'Daily Wage', value: `${formatCurrency(r.dailyWage)} / day` },
                  { label: 'Payment Date', value: formatDate(r.paidOn) },
                  { label: 'Payment Method', value: r.paymentMethod }
                ]}
                actions={
                  r.isDeleted ? (
                    <Button
                      variant="secondary"
                      onClick={() => setConfirmTarget({ type: 'restore', payment: r })}
                    >
                      <RotateCcw size={14} /> Restore
                    </Button>
                  ) : (
                    <>
                      <Button variant="secondary" onClick={() => printReceipt(r)}>
                        <Printer size={14} /> Print
                      </Button>
                      <Button variant="secondary" onClick={() => { setEditing(r); setIsFormOpen(true); }}>
                        <Pencil size={14} /> Edit
                      </Button>
                      <Button variant="danger" onClick={() => setConfirmTarget({ type: 'delete', payment: r })}>
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

      <PaymentFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} payment={editing} defaultSiteId={siteId} />
      <ConfirmDialog
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirm}
        isLoading={deletePayment.isPending || restorePayment.isPending}
        title={confirmTarget?.type === 'restore' ? 'Restore payment?' : 'Delete payment?'}
        message={
          confirmTarget?.type === 'restore'
            ? 'Are you sure you want to restore this payment?'
            : 'Are you sure you want to delete this payment?'
        }
        confirmLabel={confirmTarget?.type === 'restore' ? 'Restore' : 'Delete'}
        isDestructive={confirmTarget?.type === 'delete'}
      />
    </div>
  );
}
