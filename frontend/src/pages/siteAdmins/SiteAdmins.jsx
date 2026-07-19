import { useState } from 'react';
import { Plus, Pencil, Trash2, Mail, Phone, MapPin, RotateCcw, Search, ChevronLeft, ChevronRight, Inbox, KeyRound, ShieldAlert, ShieldX, ShieldCheck } from 'lucide-react';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import SiteAdminFormModal from './SiteAdminFormModal';
import TempPasswordModal from './TempPasswordModal';
import FilterToolbar from '../../components/common/FilterToolbar';
import { useSiteAdmins, useDeleteSiteAdmin, useRestoreSiteAdmin, useResetSiteAdminPassword, useSetSiteAdminStatus } from '../../hooks/useSiteAdmins';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useToast } from '../../contexts/ToastContext';
import Card from '../../components/ui/Card';
import { motion } from 'framer-motion';
import '../../styles/operational-page.css';
import '../sites/Sites.css';

function AdminCardSkeleton() {
  return (
    <div className="site-card-skeleton" style={{ height: 200 }}>
      <div className="site-card-skeleton__header" style={{ display: 'flex', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--color-border)', flexShrink: 0 }} className="skeleton-line" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton-line" style={{ width: '80%', height: 16 }} />
          <div className="skeleton-line" style={{ width: '50%', height: 12 }} />
        </div>
      </div>
      <div className="site-card-skeleton__body">
        <div className="skeleton-line" style={{ width: '100%', height: 12 }} />
        <div className="skeleton-line" style={{ width: '90%', height: 12 }} />
      </div>
      <div className="site-card-skeleton__footer" />
    </div>
  );
}

export default function SiteAdmins() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newAdminCreds, setNewAdminCreds] = useState(null);
  const [resetCreds, setResetCreds] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // { type: 'delete' | 'restore' | 'suspend' | 'activate' | 'resetPassword', admin }

  const debouncedSearch = useDebouncedValue(search);
  const { data, isLoading, isError } = useSiteAdmins({
    page,
    limit: 9,
    search: debouncedSearch || undefined,
    showDeleted,
  });
  const deleteAdmin = useDeleteSiteAdmin();
  const restoreAdmin = useRestoreSiteAdmin();
  const resetPassword = useResetSiteAdminPassword();
  const setStatus = useSetSiteAdminStatus();
  const toast = useToast();

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.type === 'restore') {
        await restoreAdmin.mutateAsync(confirmTarget.admin._id);
        toast.success(`${confirmTarget.admin.name} restored.`);
      } else if (confirmTarget.type === 'delete') {
        await deleteAdmin.mutateAsync(confirmTarget.admin._id);
        toast.success(`${confirmTarget.admin.name} deleted.`);
      } else if (confirmTarget.type === 'suspend') {
        await setStatus.mutateAsync({ id: confirmTarget.admin._id, status: 'suspended' });
        toast.success(`${confirmTarget.admin.name} suspended.`);
      } else if (confirmTarget.type === 'activate') {
        await setStatus.mutateAsync({ id: confirmTarget.admin._id, status: 'active' });
        toast.success(`${confirmTarget.admin.name} activated.`);
      } else if (confirmTarget.type === 'resetPassword') {
        const res = await resetPassword.mutateAsync(confirmTarget.admin._id);
        toast.success(`Password reset for ${confirmTarget.admin.name}.`);
        setResetCreds({ name: confirmTarget.admin.name, password: res.tempPassword });
      }
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    }
  };

  const filterConfig = [
    {
      key: 'showDeleted',
      label: 'Show Deleted',
      type: 'checkbox',
      value: showDeleted,
      onChange: (val) => { setShowDeleted(val); setPage(1); },
    },
  ];

  const handleReset = () => {
    setSearch('');
    setShowDeleted(false);
    setPage(1);
  };

  return (
    <div className="module-page">
      <div className="module-page__header">
        <div>
          <h1>Site Supervisors</h1>
          <p>Register and oversee supervisors assigned to project fields.</p>
        </div>
        <Button onClick={() => { setEditing(null); setNewAdminCreds(null); setIsFormOpen(true); }}>
          <Plus size={18} /> New Supervisor
        </Button>
      </div>

      <FilterToolbar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search supervisors..."
        filters={filterConfig}
        onReset={handleReset}
      />

      {newAdminCreds && (
        <Card style={{ backgroundColor: 'var(--color-primary-50)', border: '1px solid var(--color-primary-300)', padding: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
          <h4 style={{ color: 'var(--color-primary-800)', marginBottom: 6 }}>Supervisor Profile Generated!</h4>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary-700)' }}>
            Credential packet for <strong>{newAdminCreds.name}</strong>. Share these details to allow login:
          </p>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm)', marginTop: 8, fontFamily: 'monospace', fontSize: 'var(--font-size-sm)', userSelect: 'all' }}>
            Temporary Password: {newAdminCreds.password}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setNewAdminCreds(null)} style={{ marginTop: 8 }}>Dismiss credentials banner</Button>
        </Card>
      )}

      {isError && (
        <div className="sites-page__state sites-page__state--error" role="alert">
          Something went wrong loading the supervisors list. Please refresh.
        </div>
      )}

      {!isError && isLoading && (
        <div className="sites-page__grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <AdminCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isError && !isLoading && (data?.items ?? []).length === 0 && (
        <div className="sites-page__state sites-page__state--empty">
          <Inbox size={32} />
          <span>No supervisors listed. Create a new supervisor file.</span>
        </div>
      )}

      {!isError && !isLoading && (data?.items ?? []).length > 0 && (
        <>
          <div className="sites-page__grid">
            {data.items.map((admin) => (
              <motion.div
                key={admin._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={`site-card ${admin.isDeleted ? 'site-card--deleted' : ''}`}>
                  <div className="site-card__header" style={{ display: 'flex', gap: 12, alignItems: 'center', margin: 0 }}>
                    {admin.photo?.url ? (
                      <img
                        src={admin.photo.url}
                        alt={admin.name}
                        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className="ui-avatar"
                        style={{ width: 44, height: 44, borderRadius: '50%' }}
                      >
                        {admin.name[0]}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="site-card__title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {admin.name}
                      </h3>
                      <span className="site-card__code">Supervisor</span>
                    </div>
                    {admin.isDeleted ? (
                      <span className="status-badge status-badge--suspended">Deleted</span>
                    ) : admin.status === 'suspended' ? (
                      <span className="status-badge status-badge--suspended">Suspended</span>
                    ) : (
                      <span className="status-badge status-badge--active">Active</span>
                    )}
                  </div>

                  <div className="site-card__body" style={{ marginTop: 'var(--space-md)' }}>
                    <div className="site-card__info-row">
                      <Mail size={15} className="site-card__icon" />
                      <a href={`mailto:${admin.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{admin.email}</a>
                    </div>
                    <div className="site-card__info-row">
                      <Phone size={15} className="site-card__icon" />
                      <span>{admin.phone}</span>
                    </div>
                    <div className="site-card__info-row">
                      <MapPin size={15} className="site-card__icon" />
                      <span>
                        {admin.assignedSite ? (
                          <strong>{admin.assignedSite.name} ({admin.assignedSite.code})</strong>
                        ) : (
                          <span className="site-card__unassigned">No project site assigned</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="site-card__actions">
                    {admin.isDeleted ? (
                      <button
                        type="button"
                        className="site-card__btn site-card__btn--restore touch-target"
                        onClick={() => setConfirmTarget({ type: 'restore', admin })}
                        title="Restore supervisor account"
                      >
                        <RotateCcw size={16} /> Restore
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="site-card__btn touch-target"
                          onClick={() => { setEditing(admin); setIsFormOpen(true); }}
                          title="Edit details"
                        >
                          <Pencil size={16} /> Edit
                        </button>
                        {admin.status === 'suspended' ? (
                          <button
                            type="button"
                            className="site-card__btn touch-target"
                            onClick={() => setConfirmTarget({ type: 'activate', admin })}
                            title="Activate account"
                          >
                            <ShieldCheck size={16} /> Activate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="site-card__btn touch-target"
                            onClick={() => setConfirmTarget({ type: 'suspend', admin })}
                            title="Suspend account"
                          >
                            <ShieldX size={16} /> Suspend
                          </button>
                        )}
                        <button
                          type="button"
                          className="site-card__btn touch-target"
                          onClick={() => setConfirmTarget({ type: 'resetPassword', admin })}
                          title="Reset Password"
                        >
                          <KeyRound size={16} /> Reset
                        </button>
                        <button
                          type="button"
                          className="site-card__btn site-card__btn--danger touch-target"
                          onClick={() => setConfirmTarget({ type: 'delete', admin })}
                          title="Delete supervisor"
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

      <SiteAdminFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} admin={editing} onCreated={setNewAdminCreds} />
      {resetCreds && (
        <TempPasswordModal tempPassword={resetCreds} onClose={() => setResetCreds(null)} />
      )}
      <ConfirmDialog
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirm}
        isLoading={deleteAdmin.isPending || restoreAdmin.isPending || resetPassword.isPending || setStatus.isPending}
        title={
          confirmTarget?.type === 'restore'
            ? 'Restore supervisor account?'
            : confirmTarget?.type === 'delete'
              ? 'Delete supervisor account?'
              : confirmTarget?.type === 'suspend'
                ? 'Suspend supervisor account?'
                : confirmTarget?.type === 'activate'
                  ? 'Activate supervisor account?'
                  : 'Reset supervisor password?'
        }
        message={
          confirmTarget?.type === 'restore'
            ? `Are you sure you want to restore access for ${confirmTarget?.admin?.name}?`
            : confirmTarget?.type === 'delete'
              ? `Are you sure you want to delete ${confirmTarget?.admin?.name}? This action soft-deletes their user profile.`
              : confirmTarget?.type === 'suspend'
                ? `Are you sure you want to suspend ${confirmTarget?.admin?.name}? This supervisor will be logged out and will not be able to log in to their account.`
                : confirmTarget?.type === 'activate'
                  ? `Are you sure you want to activate ${confirmTarget?.admin?.name}'s account?`
                  : `Are you sure you want to reset the password for ${confirmTarget?.admin?.name}? A new temporary password will be generated.`
        }
        confirmLabel={
          confirmTarget?.type === 'restore'
            ? 'Restore'
            : confirmTarget?.type === 'delete'
              ? 'Delete'
              : confirmTarget?.type === 'suspend'
                ? 'Suspend'
                : confirmTarget?.type === 'activate'
                  ? 'Activate'
                  : 'Reset Password'
        }
        isDestructive={confirmTarget?.type === 'delete' || confirmTarget?.type === 'suspend'}
      />
    </div>
  );
}
