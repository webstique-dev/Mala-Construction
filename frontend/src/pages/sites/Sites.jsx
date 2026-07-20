import { useMemo, useState } from 'react';
import { Plus, Pencil, Archive, Trash2, RotateCcw, MapPin, User, Calendar, Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import Button from '../../components/common/Button';
import FilterToolbar from '../../components/common/FilterToolbar';
import { useSites, useArchiveSite, useDeleteSite, useRestoreSite } from '../../hooks/useSites';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useToast } from '../../contexts/ToastContext';
import SiteFormModal from './SiteFormModal';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import Card from '../../components/ui/Card';
import { motion } from 'framer-motion';
import './Sites.css';

const STATUS_LABELS = { active: 'Active', completed: 'Completed', archived: 'Archived' };

import { GridCardSkeleton } from '../../components/ui/Skeleton';

export default function Sites() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showDeleted, setShowDeleted] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({
    siteName: '',
    siteCode: '',
    status: '',
    country: '',
    state: '',
    city: '',
    createdFrom: '',
    createdTo: '',
    lastUpdatedFrom: '',
    lastUpdatedTo: '',
    createdBy: '',
  });
  const [editingSite, setEditingSite] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { type: 'archive'|'delete'|'restore', site }

  const debouncedSearch = useDebouncedValue(search);
  const queryParams = useMemo(() => ({
    page,
    limit: 9,
    search: debouncedSearch || undefined,
    siteName: filters.siteName || undefined,
    siteCode: filters.siteCode || undefined,
    status: filters.status || undefined,
    country: filters.country || undefined,
    state: filters.state || undefined,
    city: filters.city || undefined,
    createdFrom: filters.createdFrom || undefined,
    createdTo: filters.createdTo || undefined,
    lastUpdatedFrom: filters.lastUpdatedFrom || undefined,
    lastUpdatedTo: filters.lastUpdatedTo || undefined,
    createdBy: filters.createdBy || undefined,
    sortBy,
    sortOrder,
    showDeleted,
  }), [page, debouncedSearch, filters, showDeleted, sortBy, sortOrder]);
  const { data, isLoading, isError, isFetching } = useSites(queryParams);
  const archiveSite = useArchiveSite();
  const deleteSite = useDeleteSite();
  const restoreSite = useRestoreSite();
  const toast = useToast();

  const openCreate = () => {
    setEditingSite(null);
    setIsFormOpen(true);
  };

  const openEdit = (site) => {
    setEditingSite(site);
    setIsFormOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.type === 'archive') {
        await archiveSite.mutateAsync(confirmTarget.site._id);
        toast.success(`${confirmTarget.site.name} archived.`);
      } else if (confirmTarget.type === 'restore') {
        await restoreSite.mutateAsync(confirmTarget.site._id);
        toast.success(`${confirmTarget.site.name} restored.`);
      } else {
        await deleteSite.mutateAsync(confirmTarget.site._id);
        toast.success(`${confirmTarget.site.name} deleted.`);
      }
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    }
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const filterConfig = [
    // { key: 'createdFrom', label: 'Created From', type: 'date', value: filters.createdFrom, onChange: (val) => updateFilter('createdFrom', val) },
    // { key: 'createdTo', label: 'Created To', type: 'date', value: filters.createdTo, onChange: (val) => updateFilter('createdTo', val) },
    // { key: 'lastUpdatedFrom', label: 'Updated From', type: 'date', value: filters.lastUpdatedFrom, onChange: (val) => updateFilter('lastUpdatedFrom', val) },
    // { key: 'lastUpdatedTo', label: 'Updated To', type: 'date', value: filters.lastUpdatedTo, onChange: (val) => updateFilter('lastUpdatedTo', val) },
    { key: 'siteName', label: 'Site Name', type: 'text', value: filters.siteName, onChange: (val) => updateFilter('siteName', val), placeholder: 'Filter by name' },
    // { key: 'siteCode', label: 'Site Code', type: 'text', value: filters.siteCode, onChange: (val) => updateFilter('siteCode', val), placeholder: 'Filter by code' },
    { key: 'status', label: 'Status', type: 'select', value: filters.status, onChange: (val) => updateFilter('status', val), options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'completed', label: 'Completed' }, { value: 'archived', label: 'Archived' }] },
    // { key: 'country', label: 'Country', type: 'text', value: filters.country, onChange: (val) => updateFilter('country', val), placeholder: 'Country' },
    // { key: 'state', label: 'State', type: 'text', value: filters.state, onChange: (val) => updateFilter('state', val), placeholder: 'State' },
    // { key: 'city', label: 'City', type: 'text', value: filters.city, onChange: (val) => updateFilter('city', val), placeholder: 'City' },
    // { key: 'createdBy', label: 'Created By', type: 'text', value: filters.createdBy, onChange: (val) => updateFilter('createdBy', val), placeholder: 'User id or name' },
  ];

  const handleReset = () => {
    setSearch('');
    setFilters({
      siteName: '',
      siteCode: '',
      status: '',
      country: '',
      state: '',
      city: '',
      createdFrom: '',
      createdTo: '',
      lastUpdatedFrom: '',
      lastUpdatedTo: '',
      createdBy: '',
    });
    setShowDeleted(false);
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters = !!search || Object.values(filters).some((value) => !!value) || showDeleted;
  const siteCount = data?.counts?.total ?? data?.total ?? 0;

  return (
    <div className="sites-page">
      <div className="sites-page__header-section">
        <div>
          <h1>Project Sites</h1>
          <p>Create and monitor active construction fields, supervisors, and timelines.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} /> New Project Site
        </Button>
      </div>

      <div className="sites-page__toolbar-inline">
        <FilterToolbar
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search sites by name, code, or address..."
          filters={filterConfig}
          onReset={handleReset}
        />
        {/* <div className="sites-page__sort-controls" role="group" aria-label="Sort sites">
          <label className="sites-page__sort-label" htmlFor="site-sort-by">Sort by</label>
          <select id="site-sort-by" className="sites-page__sort-select" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
            <option value="name">Name</option>
            <option value="code">Code</option>
            <option value="createdAt">Created Date</option>
            <option value="updatedAt">Last Updated</option>
            <option value="startDate">Start Date</option>
          </select>
          <select className="sites-page__sort-select" value={sortOrder} onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div> */}
      </div>

      <div className="sites-page__summary">
        <span>{siteCount} matching sites</span>
        <span>{data?.counts?.active ?? 0} active</span>
      </div>

      {isError && (
        <div className="sites-page__state sites-page__state--error" role="alert">
          Something went wrong loading the site directories. Please refresh.
        </div>
      )}

      {!isError && (isLoading || (isFetching && !data?.items?.length)) && (
        <div className="sites-page__grid">
          <GridCardSkeleton count={6} />
        </div>
      )}

      {!isError && !isLoading && (data?.items || []).length === 0 && (
        <div className="sites-page__state sites-page__state--empty">
          <Inbox size={32} />
          <span>{hasActiveFilters ? 'No project sites match the selected filters.' : 'No project sites found. Create a new site to get started.'}</span>
        </div>
      )}

      {!isError && !isLoading && (data?.items || []).length > 0 && (
        <>
          <div className="sites-page__grid">
            {data.items.map((site) => (
              <motion.div
                key={site._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={`site-card ${site.isDeleted ? 'site-card--deleted' : ''}`}>
                  <div className="site-card__header">
                    <div>
                      <h3 className="site-card__title">{site.name}</h3>
                      <span className="site-card__code">{site.code}</span>
                    </div>
                    {site.isDeleted ? (
                      <span className="status-badge status-badge--suspended">Deleted</span>
                    ) : (
                      <span className={`status-badge status-badge--${site.status}`}>
                        {STATUS_LABELS[site.status]}
                      </span>
                    )}
                  </div>

                  <div className="site-card__body">
                    <div className="site-card__info-row">
                      <MapPin size={16} className="site-card__icon" />
                      <span>{site.address || 'No Address'}, {site.state || '—'}</span>
                    </div>
                    <div className="site-card__info-row">
                      <User size={16} className="site-card__icon" />
                      <span>
                        {site.assignedSiteAdmin ? (
                          <strong>{site.assignedSiteAdmin.name}</strong>
                        ) : (
                          <span className="site-card__unassigned">Unassigned Supervisor</span>
                        )}
                      </span>
                    </div>
                    {site.startDate && (
                      <div className="site-card__info-row">
                        <Calendar size={16} className="site-card__icon" />
                        <span>Started {new Date(site.startDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="site-card__actions">
                    {site.isDeleted ? (
                      <button
                        type="button"
                        className="site-card__btn site-card__btn--restore touch-target"
                        onClick={() => setConfirmTarget({ type: 'restore', site })}
                        title="Restore Project Site"
                      >
                        <RotateCcw size={16} /> Restore
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="site-card__btn touch-target"
                          onClick={() => openEdit(site)}
                          title="Edit details"
                        >
                          <Pencil size={16} /> Edit
                        </button>
                        {site.status !== 'archived' && (
                          <button
                            type="button"
                            className="site-card__btn touch-target"
                            onClick={() => setConfirmTarget({ type: 'archive', site })}
                            title="Archive Project Site"
                          >
                            <Archive size={16} /> Archive
                          </button>
                        )}
                        <button
                          type="button"
                          className="site-card__btn site-card__btn--danger touch-target"
                          onClick={() => setConfirmTarget({ type: 'delete', site })}
                          title="Delete Project Site"
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

      <SiteFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} site={editingSite} />

      <ConfirmDialog
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirm}
        isLoading={archiveSite.isPending || deleteSite.isPending || restoreSite.isPending}
        title={
          confirmTarget?.type === 'restore'
            ? 'Restore Project Site?'
            : confirmTarget?.type === 'archive'
              ? 'Archive Project Site?'
              : 'Delete Project Site permanently?'
        }
        description={
          confirmTarget?.type === 'restore'
            ? `Are you sure you want to restore ${confirmTarget?.site?.name}?`
            : confirmTarget?.type === 'archive'
              ? `${confirmTarget?.site?.name} will be marked archived. Its historical data stays intact and it will no longer accept new entries.`
              : `${confirmTarget?.site?.name} will be permanently deleted. This only succeeds if the site has no materials, workers, or expenses recorded against it.`
        }
        confirmLabel={
          confirmTarget?.type === 'restore'
            ? 'Restore'
            : confirmTarget?.type === 'archive'
              ? 'Archive'
              : 'Delete'
        }
        danger={confirmTarget?.type === 'delete'}
      />
    </div>
  );
}
