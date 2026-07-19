import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, User, RotateCcw, Search, ChevronLeft, ChevronRight, Inbox, Phone, Briefcase, Calendar, DollarSign, MapPin } from 'lucide-react';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import WorkerFormModal from './WorkerFormModal';
import FilterToolbar from '../../components/common/FilterToolbar';
import { useWorkers, useDeleteWorker, useRestoreWorker } from '../../hooks/useWorkers';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useSiteScope } from '../../hooks/useSiteScope';
import { useLookups } from '../../hooks/useLookups';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency, formatDate } from '../../utils/format';
import Card from '../../components/ui/Card';
import { motion } from 'framer-motion';
import '../../styles/operational-page.css';
import '../sites/Sites.css';

function WorkerCardSkeleton() {
  return (
    <div className="site-card-skeleton">
      <div className="site-card-skeleton__header" style={{ display: 'flex', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'var(--color-border)', flexShrink: 0 }} className="skeleton-line" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton-line" style={{ width: '70%', height: 16 }} />
          <div className="skeleton-line" style={{ width: '40%', height: 12 }} />
        </div>
      </div>
      <div className="site-card-skeleton__body">
        <div className="skeleton-line" style={{ width: '100%', height: 12 }} />
        <div className="skeleton-line" style={{ width: '80%', height: 12 }} />
      </div>
      <div className="site-card-skeleton__footer" />
    </div>
  );
}

export default function Workers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [siteFilter, setSiteFilter] = useState('');
  const [professionFilter, setProfessionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { type: 'delete' | 'restore', worker }

  const { isSuperAdmin, siteId } = useSiteScope(siteFilter || undefined);
  const debouncedSearch = useDebouncedValue(search);
  const { professions, activeSites } = useLookups(siteId);
  const { data, isLoading, isError } = useWorkers({
    page,
    limit: 9,
    search: debouncedSearch || undefined,
    siteId: isSuperAdmin ? siteFilter || undefined : siteId,
    profession: professionFilter || undefined,
    status: statusFilter || undefined,
    showDeleted,
  });
  const deleteWorker = useDeleteWorker();
  const restoreWorker = useRestoreWorker();
  const toast = useToast();

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.type === 'restore') {
        await restoreWorker.mutateAsync(confirmTarget.worker._id);
        toast.success('Worker restored.');
      } else {
        await deleteWorker.mutateAsync(confirmTarget.worker._id);
        toast.success('Worker deleted.');
      }
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    }
  };

  const filterConfig = [
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
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
    {
      key: 'profession',
      label: 'Profession',
      type: 'select',
      value: professionFilter,
      onChange: (val) => { setProfessionFilter(val); setPage(1); },
      options: professions.data?.map((p) => ({ value: p._id, label: p.name })) || [],
    },
  ];

  const handleReset = () => {
    setSearch('');
    setSiteFilter('');
    setProfessionFilter('');
    setStatusFilter('');
    setShowDeleted(false);
    setPage(1);
  };

  return (
    <div className="module-page">
      <div className="module-page__header">
        <div>
          <h1>Workers Registry</h1>
          <p>Supervise active labor forces, professions, and daily wage structures.</p>
        </div>
        <Button onClick={() => { setEditing(null); setIsFormOpen(true); }}>
          <Plus size={18} /> Add Worker
        </Button>
      </div>

      <FilterToolbar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search workers..."
        filters={filterConfig}
        onReset={handleReset}
      />

      {isError && (
        <div className="sites-page__state sites-page__state--error" role="alert">
          Failed to load workers database. Please try reloading.
        </div>
      )}

      {!isError && isLoading && (
        <div className="sites-page__grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <WorkerCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isError && !isLoading && (data?.items ?? []).length === 0 && (
        <div className="sites-page__state sites-page__state--empty">
          <Inbox size={32} />
          <span>No workers registered. Add worker files to view items.</span>
        </div>
      )}

      {!isError && !isLoading && (data?.items ?? []).length > 0 && (
        <>
          <div className="sites-page__grid">
            {data.items.map((w) => (
              <motion.div
                key={w._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={`site-card ${w.isDeleted ? 'site-card--deleted' : ''}`}>
                  <div className="site-card__header" style={{ display: 'flex', gap: 12, alignItems: 'center', margin: 0 }}>
                    {w.photo?.url ? (
                      <img
                        src={w.photo.url}
                        alt={w.name}
                        style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className="ui-avatar"
                        style={{ width: 44, height: 44, borderRadius: 12 }}
                      >
                        {w.name[0]}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="site-card__title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {w.isDeleted ? (
                          <span>{w.name}</span>
                        ) : (
                          <Link to={`/workers/${w._id}`} className="link-btn" style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                            {w.name}
                          </Link>
                        )}
                      </h3>
                      <span className="site-card__code" style={{ textTransform: 'capitalize' }}>
                        {w.profession?.name || 'Worker'}
                      </span>
                    </div>
                    {w.isDeleted ? (
                      <span className="status-badge status-badge--suspended">Deleted</span>
                    ) : (
                      <span className={`status-badge status-badge--${w.status === 'active' ? 'active' : 'inactive'}`}>
                        {w.status}
                      </span>
                    )}
                  </div>

                  <div className="site-card__body" style={{ marginTop: 'var(--space-md)' }}>
                    <div className="site-card__info-row">
                      <MapPin size={15} className="site-card__icon" />
                      <span>{w.site?.name ?? 'No site assignment'}</span>
                    </div>
                    <div className="site-card__info-row">
                      <Phone size={15} className="site-card__icon" />
                      <span>{w.phone}</span>
                    </div>
                    <div className="site-card__info-row">
                      <DollarSign size={15} className="site-card__icon" />
                      <span>{formatCurrency(w.dailyWage)} / day</span>
                    </div>
                    <div className="site-card__info-row">
                      <Calendar size={15} className="site-card__icon" />
                      <span>Joined {formatDate(w.joiningDate)}</span>
                    </div>
                  </div>

                  <div className="site-card__actions">
                    {w.isDeleted ? (
                      <button
                        type="button"
                        className="site-card__btn site-card__btn--restore touch-target"
                        onClick={() => setConfirmTarget({ type: 'restore', worker: w })}
                        title="Restore worker"
                      >
                        <RotateCcw size={16} /> Restore
                      </button>
                    ) : (
                      <>
                        <Link
                          to={`/workers/${w._id}`}
                          className="site-card__btn touch-target"
                          title="View Profile Dashboard"
                        >
                          <User size={16} /> Profile
                        </Link>
                        <button
                          type="button"
                          className="site-card__btn touch-target"
                          onClick={() => { setEditing(w); setIsFormOpen(true); }}
                          title="Edit details"
                        >
                          <Pencil size={16} /> Edit
                        </button>
                        <button
                          type="button"
                          className="site-card__btn site-card__btn--danger touch-target"
                          onClick={() => setConfirmTarget({ type: 'delete', worker: w })}
                          title="Delete worker"
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </Card>
              </motion.div>
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

      <WorkerFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} worker={editing} defaultSiteId={siteId} />
      <ConfirmDialog
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirm}
        isLoading={deleteWorker.isPending || restoreWorker.isPending}
        title={confirmTarget?.type === 'restore' ? 'Restore worker account?' : 'Delete worker account?'}
        message={
          confirmTarget?.type === 'restore'
            ? `Are you sure you want to restore ${confirmTarget?.worker?.name}?`
            : `Are you sure you want to delete ${confirmTarget?.worker?.name}?`
        }
        confirmLabel={confirmTarget?.type === 'restore' ? 'Restore' : 'Delete'}
        isDestructive={confirmTarget?.type === 'delete'}
      />
    </div>
  );
}
