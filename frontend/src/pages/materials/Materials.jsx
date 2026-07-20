import { useState } from 'react';
import { Plus, Pencil, Trash2, ExternalLink, RotateCcw, Search, ChevronLeft, ChevronRight, Inbox, Filter, ShieldCheck, ShoppingBag, Receipt } from 'lucide-react';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import DatePickerInput from '../../components/ui/DatePickerInput';
import AccordionCard from '../../components/ui/AccordionCard';
import MaterialFormModal from './MaterialFormModal';
import FilterToolbar from '../../components/common/FilterToolbar';
import { useMaterials, useDeleteMaterial, useRestoreMaterial } from '../../hooks/useMaterials';
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

export default function Materials() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [siteFilter, setSiteFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { type: 'delete' | 'restore', material }

  const { isSuperAdmin, siteId } = useSiteScope(siteFilter || undefined);
  const debouncedSearch = useDebouncedValue(search);
  const { materialCategories, activeSites } = useLookups(siteId);
  const { data, isLoading, isError, isFetching } = useMaterials({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
    siteId: isSuperAdmin ? siteFilter || undefined : siteId,
    category: categoryFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    showDeleted,
  });
  const deleteMaterial = useDeleteMaterial();
  const restoreMaterial = useRestoreMaterial();
  const toast = useToast();

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.type === 'restore') {
        await restoreMaterial.mutateAsync(confirmTarget.material._id);
        toast.success('Material restored.');
      } else {
        await deleteMaterial.mutateAsync(confirmTarget.material._id);
        toast.success('Material deleted.');
      }
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    }
  };

  // Sum page totals for visual preview
  const pageTotal = data?.items?.reduce((sum, item) => sum + (item.totalAmount || 0), 0) || 0;

  const filterConfig = [
    // {
    //   key: 'startDate',
    //   label: 'Start Date',
    //   type: 'date',
    //   value: startDate,
    //   onChange: (val) => { setStartDate(val); setPage(1); },
    // },
    // {
    //   key: 'endDate',
    //   label: 'End Date',
    //   type: 'date',
    //   value: endDate,
    //   onChange: (val) => { setEndDate(val); setPage(1); },
    // },
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
      options: materialCategories.data?.map((c) => ({ value: c._id, label: c.name })) || [],
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
          <h1>Material Logistics</h1>
          <p>Supervise supply logs, invoices, and material costs across projects.</p>
        </div>
        <Button onClick={() => { setEditing(null); setIsFormOpen(true); }}><Plus size={18} /> Log Purchase</Button>
      </div>

      <div className="module-page__kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)' }}>
        <Card className="worker-kpi-card">
          <div className="worker-kpi-card__header">
            <span>Page Expenditure</span>
            <ShoppingBag size={16} className="worker-kpi-card__icon" />
          </div>
          <h3>{formatCurrency(pageTotal)}</h3>
        </Card>
        <Card className="worker-kpi-card">
          <div className="worker-kpi-card__header">
            <span>Active Site Logs</span>
            <ShieldCheck size={16} className="worker-kpi-card__icon" style={{ color: 'var(--color-success-500)' }} />
          </div>
          <h3>{data?.total || 0} Records</h3>
        </Card>
      </div>

      <FilterToolbar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search material entries..."
        filters={filterConfig}
        onReset={handleReset}
      />

      {isError && (
        <div className="sites-page__state sites-page__state--error" role="alert">
          Something went wrong loading material logs. Please refresh.
        </div>
      )}

      {!isError && (isLoading || (isFetching && !data?.items?.length)) && (
        <TableSkeleton rows={8} columns={8} />
      )}

      {!isError && !isLoading && (data?.items ?? []).length === 0 && (
        <div className="sites-page__state sites-page__state--empty">
          <Inbox size={32} />
          <span>No material log files found. Register a new entry.</span>
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
                      <th>Material</th>
                      <th>Project Site</th>
                      <th>Supplier</th>
                      <th>Category</th>
                      <th>Qty / Volume</th>
                      <th>Invoice Cost</th>
                      <th>Date logged</th>
                      <th>Image</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((r) => (
                      <tr key={r._id} className={r.isDeleted ? 'row-deleted' : ''}>
                        <td>
                          <strong>{r.materialName}</strong>
                          {r.isDeleted && <span className="sites-page__unassigned" style={{ marginLeft: 8 }}>(Deleted)</span>}
                        </td>
                        <td>{r.site?.name ?? '—'}</td>
                        <td>{r.supplier?.name ?? '—'}</td>
                        <td>
                          <span className="status-badge" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                            {r.category?.name ?? 'Unclassified'}
                          </span>
                        </td>
                        <td><strong>{r.quantity}/{r.unit}</strong></td>
                        <td className="worker-payments-card__amount">{formatCurrency(r.totalAmount)}</td>
                        <td>{formatDate(r.date)}</td>
                        <td>
                          <ImageThumbnail
                            imageUrl={r.invoiceUpload?.url}
                            title={`Material Image - ${r.materialName} (${r.invoiceNumber})`}
                            label="View"
                          />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="module-page__row-actions">
                            {r.isDeleted ? (
                              <button
                                type="button"
                                className="icon-btn touch-target"
                                onClick={() => setConfirmTarget({ type: 'restore', material: r })}
                                title="Restore entry"
                              >
                                <RotateCcw size={15} />
                              </button>
                            ) : (
                              <>
                                <button type="button" className="icon-btn touch-target" onClick={() => { setEditing(r); setIsFormOpen(true); }} aria-label="Edit"><Pencil size={15} /></button>
                                <button type="button" className="icon-btn icon-btn--danger touch-target" onClick={() => setConfirmTarget({ type: 'delete', material: r })} aria-label="Delete"><Trash2 size={15} /></button>
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
                  title: r.materialName,
                  status: (
                    <span className="status-badge" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                      {r.category?.name ?? 'Unclassified'}
                    </span>
                  ),
                  category: r.site?.name,
                  secondary: formatCurrency(r.totalAmount)
                }}
                details={[
                  { label: 'Supplier / Vendor', value: r.supplier?.name ?? '—' },
                  { label: 'Qty / Volume', value: `${r.quantity} ${r.unit}` },
                  { label: 'Date Logged', value: formatDate(r.date) },
                  {
                    label: 'Receipt',
                    value: r.invoiceUpload?.url ? (
                      <a href={r.invoiceUpload.url} target="_blank" rel="noreferrer" className="site-card__btn touch-target" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Receipt size={14} style={{ color: 'var(--color-primary-500)' }} /> View Receipt
                      </a>
                    ) : '—'
                  }
                ]}
                actions={
                  r.isDeleted ? (
                    <Button
                      variant="secondary"
                      onClick={() => setConfirmTarget({ type: 'restore', material: r })}
                    >
                      <RotateCcw size={14} /> Restore
                    </Button>
                  ) : (
                    <>
                      <Button variant="secondary" onClick={() => { setEditing(r); setIsFormOpen(true); }}>
                        <Pencil size={14} /> Edit
                      </Button>
                      <Button variant="danger" onClick={() => setConfirmTarget({ type: 'delete', material: r })}>
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

      <MaterialFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} material={editing} defaultSiteId={siteId} />
      <ConfirmDialog
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirm}
        isLoading={deleteMaterial.isPending || restoreMaterial.isPending}
        title={confirmTarget?.type === 'restore' ? 'Restore material entry?' : 'Delete material entry?'}
        message={
          confirmTarget?.type === 'restore'
            ? `Are you sure you want to restore "${confirmTarget?.material?.materialName}"?`
            : `Are you sure you want to delete "${confirmTarget?.material?.materialName}"?`
        }
        confirmLabel={confirmTarget?.type === 'restore' ? 'Restore' : 'Delete'}
        isDestructive={confirmTarget?.type === 'delete'}
      />
    </div>
  );
}
