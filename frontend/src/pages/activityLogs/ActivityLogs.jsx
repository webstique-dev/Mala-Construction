import { useState } from 'react';
import { Plus, Pencil, Trash2, LogIn, LogOut, Key, Check, Activity, Search, ChevronLeft, ChevronRight, Inbox, Clock, User, ShieldAlert, Monitor } from 'lucide-react';
import DatePickerInput from '../../components/ui/DatePickerInput';
import FilterToolbar from '../../components/common/FilterToolbar';
import { useActivityLogs } from '../../hooks/useActivityLogs';
import { useSiteScope } from '../../hooks/useSiteScope';
import { useLookups } from '../../hooks/useLookups';
import { formatDateTime } from '../../utils/format';
import Card from '../../components/ui/Card';
import '../../styles/operational-page.css';
import '../sites/Sites.css';
import './ActivityLogs.css';

const ACTION_LABELS = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  login: 'Logged In',
  logout: 'Logged Out',
  passwordReset: 'Password reset',
  approve: 'Approved',
  other: 'Other Activity',
};

const ACTION_ICONS = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  login: LogIn,
  logout: LogOut,
  passwordReset: Key,
  approve: Check,
  other: Activity,
};

import { Skeleton } from '../../components/ui/Skeleton';

function ActivityItemSkeleton() {
  return (
    <div className="activity-timeline__item-skeleton">
      <Skeleton width="36px" height="36px" circle style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton width="40%" height="14px" />
        <Skeleton width="80%" height="12px" />
      </div>
    </div>
  );
}

export default function ActivityLogs() {
  const [page, setPage] = useState(1);
  const [siteFilter, setSiteFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { isSuperAdmin, siteId } = useSiteScope(siteFilter || undefined);
  const { activeSites } = useLookups(siteId);
  const { data, isLoading, isError, isFetching } = useActivityLogs({
    page,
    limit: 10,
    siteId: isSuperAdmin ? siteFilter || undefined : siteId,
    action: actionFilter || undefined,
    entityType: entityFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const resetFilters = () => {
    setSiteFilter('');
    setActionFilter('');
    setEntityFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

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
      key: 'entityType',
      label: 'Entity',
      type: 'select',
      value: entityFilter,
      onChange: (val) => { setEntityFilter(val); setPage(1); },
      options: ['Site', 'User', 'Material', 'Worker', 'WorkerPayment', 'Expense'].map((e) => ({ value: e, label: e })),
    },
    {
      key: 'action',
      label: 'Action',
      type: 'select',
      value: actionFilter,
      onChange: (val) => { setActionFilter(val); setPage(1); },
      options: Object.entries(ACTION_LABELS).map(([k, v]) => ({ value: k, label: v })),
    },
  ];

  const handleReset = () => {
    setSiteFilter('');
    setActionFilter('');
    setEntityFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="activity-logs-page module-page">
      <div className="module-page__header">
        <div>
          <h1>Activity Logs</h1>
          <p>Chronological audit log tracking administrative and supervisor operations.</p>
        </div>
      </div>

      <FilterToolbar
        filters={filterConfig}
        onReset={handleReset}
      />

      {isError && (
        <div className="sites-page__state sites-page__state--error" role="alert">
          Something went wrong loading system trails. Please refresh.
        </div>
      )}

      {!isError && (isLoading || (isFetching && !data?.items?.length)) && (
        <Card className="activity-timeline">
          {Array.from({ length: 6 }).map((_, i) => (
            <ActivityItemSkeleton key={i} />
          ))}
        </Card>
      )}

      {!isError && !isLoading && (data?.items ?? []).length === 0 && (
        <div className="sites-page__state sites-page__state--empty">
          <Inbox size={32} />
          <span>No activity logs matched your filter selections.</span>
        </div>
      )}

      {!isError && !isLoading && (data?.items ?? []).length > 0 && (
        <>
          <Card className="activity-timeline">
            {data.items.map((log) => {
              const ActionIcon = ACTION_ICONS[log.action] || Activity;
              return (
                <div key={log._id} className="activity-timeline__item">
                  <div className="activity-timeline__line" />
                  <div className={`activity-timeline__icon activity-timeline__icon--${log.action}`}>
                    <ActionIcon size={16} />
                  </div>
                  <div className="activity-timeline__content">
                    <div className="activity-timeline__meta">
                      <div className="activity-timeline__actor">
                        <div className="ui-avatar ui-avatar--sm" style={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                          {log.actor?.name?.[0] ?? 'U'}
                        </div>
                        <strong>{log.actor?.name ?? 'Unknown Actor'}</strong>
                        <span className="activity-timeline__role">
                          ({log.actorRole === 'super_admin' ? 'Super Admin' : 'Site Admin'})
                        </span>
                      </div>
                      <div className="activity-timeline__time-wrap">
                        <Clock size={12} />
                        <span className="activity-timeline__time">{formatDateTime(log.createdAt)}</span>
                      </div>
                    </div>
                    <p className="activity-timeline__desc">
                      Performed action <span className={`activity-log__action activity-log__action--${log.action}`}>{ACTION_LABELS[log.action] ?? log.action}</span> on entity <strong>{log.entityType}</strong>
                    </p>
                    <div className="activity-timeline__footer-tags">
                      {log.site?.name && (
                        <div className="activity-timeline__tag">
                          <User size={12} />
                          <span>{log.site.name}</span>
                        </div>
                      )}
                      {log.ipAddress && (
                        <div className="activity-timeline__tag">
                          <Monitor size={12} />
                          <span>IP: {log.ipAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>

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
    </div>
  );
}
