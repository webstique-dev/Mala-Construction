import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, User, Users, RotateCcw, Search, ChevronLeft, ChevronRight, Inbox, Phone, Briefcase, Calendar, DollarSign, MapPin } from 'lucide-react';
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
import './WorkerProfile.css';

import { GridCardSkeleton } from '../../components/ui/Skeleton';

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
  const activeSiteId = isSuperAdmin ? siteFilter || undefined : siteId;
  const debouncedSearch = useDebouncedValue(search);
  const { professions, activeSites } = useLookups(activeSiteId);
  const selectedSite = activeSites.data?.find((s) => s._id === activeSiteId);
  const selectedProfession = professions.data?.find((p) => p._id === professionFilter);

  const totalWorkersQuery = useWorkers({
    siteId: activeSiteId,
    limit: 1,
  });
  const totalWorkersCount = totalWorkersQuery.data?.total ?? 0;

  const professionWorkersQuery = useWorkers({
    siteId: activeSiteId,
    profession: professionFilter || undefined,
    limit: 1,
  });
  const professionWorkersCount = professionWorkersQuery.data?.total ?? 0;

  const { data, isLoading, isError, isFetching } = useWorkers({
    page,
    limit: 9,
    search: debouncedSearch || undefined,
    siteId: activeSiteId,
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
          <h1>Worker Leaders</h1>
          <p>Supervise Worker Leaders, team worker counts, professions, and daily wage structures.</p>
        </div>
        <Button onClick={() => { setEditing(null); setIsFormOpen(true); }}>
          <Plus size={18} /> Add Worker Leader
        </Button>
      </div>

      <div className="module-page__kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)' }}>
        <Card className="worker-kpi-card">
          <div className="worker-kpi-card__header">
            <span>{selectedSite ? `Total Leaders (${selectedSite.name})` : 'Total Leaders (All Sites)'}</span>
            <Users size={18} className="worker-kpi-card__icon" />
          </div>
          <h3>{totalWorkersQuery.isLoading ? '...' : totalWorkersCount}</h3>
        </Card>

        {selectedProfession && (
          <Card className="worker-kpi-card">
            <div className="worker-kpi-card__header">
              <span>
                {selectedSite
                  ? `Total ${selectedProfession.name} Leaders (${selectedSite.name})`
                  : `Total ${selectedProfession.name} Leaders (All Sites)`}
              </span>
              <Briefcase size={18} className="worker-kpi-card__icon" style={{ color: 'var(--color-success-600, #16a34a)' }} />
            </div>
            <h3>{professionWorkersQuery.isLoading ? '...' : professionWorkersCount}</h3>
          </Card>
        )}
      </div>

      <FilterToolbar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search leaders by name..."
        filters={filterConfig}
        onReset={handleReset}
      />

      {isError && (
        <div className="sites-page__state sites-page__state--error" role="alert">
          Failed to load worker leaders database. Please try reloading.
        </div>
      )}

      {!isError && (isLoading || (isFetching && !data?.items?.length)) && (
        <div className="sites-page__grid">
          <GridCardSkeleton count={6} />
        </div>
      )}

      {!isError && !isLoading && (data?.items ?? []).length === 0 && (
        <div className="sites-page__state sites-page__state--empty">
          <Inbox size={32} />
          <span>No worker leaders registered. Click "Add Worker Leader" to create one.</span>
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
                        style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-primary-100)', color: 'var(--color-primary-700)', fontWeight: 700 }}
                      >
                        {w.name[0]}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="site-card__title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                        <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                          {w.name}
                        </span>
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        <span className="site-card__code" style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                          {w.profession?.name || 'Mason'}
                        </span>
                        {w.workerId && (
                          <span style={{ fontSize: 'var(--font-size-xs)', fontFamily: 'monospace', background: 'var(--color-primary-50)', color: 'var(--color-primary-700)', border: '1px solid var(--color-primary-200)', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>
                            {w.workerId}
                          </span>
                        )}
                      </div>
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
                    <div className="site-card__info-row" style={{ fontWeight: 600, color: 'var(--color-primary-800)', background: 'var(--color-primary-50)', padding: '6px 10px', borderRadius: 6 }}>
                      <Users size={16} className="site-card__icon" style={{ color: 'var(--color-primary-600)' }} />
                      <span>Workers Under Leader: <strong>{w.workerCount ?? 1}</strong></span>
                    </div>
                    <div className="site-card__info-row">
                      <DollarSign size={15} className="site-card__icon" />
                      <span>Daily Wage: <strong>{formatCurrency(w.dailyWage)}</strong> / worker</span>
                    </div>
                    {(w.phone || w.emergencyContact?.phone) && (
                      <div className="site-card__info-row">
                        <Phone size={15} className="site-card__icon" />
                        <span>{w.phone || w.emergencyContact?.phone}</span>
                      </div>
                    )}
                    <div className="site-card__info-row">
                      <MapPin size={15} className="site-card__icon" />
                      <span>{w.site?.name ?? 'Assigned Site'}</span>
                    </div>
                  </div>

                  <div className="site-card__actions" style={{ display: 'flex', gap: 8, marginTop: 'var(--space-md)' }}>
                    {w.isDeleted ? (
                      <button
                        type="button"
                        className="site-card__btn site-card__btn--restore touch-target"
                        onClick={() => setConfirmTarget({ type: 'restore', worker: w })}
                        title="Restore worker leader"
                      >
                        <RotateCcw size={16} /> Restore
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="site-card__btn touch-target"
                          onClick={() => { setEditing(w); setIsFormOpen(true); }}
                          title="Edit details"
                          style={{ flex: 1 }}
                        >
                          <Pencil size={16} /> Edit Leader
                        </button>
                        <button
                          type="button"
                          className="site-card__btn site-card__btn--danger touch-target"
                          onClick={() => setConfirmTarget({ type: 'delete', worker: w })}
                          title="Delete worker leader"
                        >
                          <Trash2 size={16} />
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
