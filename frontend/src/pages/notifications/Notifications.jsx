import React, { useState } from 'react';
import {
  Bell, AlertTriangle, CreditCard, CheckCircle, XCircle, Info, Shield,
  Search, Trash2, CheckSquare, Calendar, ChevronLeft, ChevronRight, Inbox
} from 'lucide-react';
import {
  useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead,
  useDeleteNotification, useDeleteAllNotifications
} from '../../hooks/useNotifications';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/common/Button';
import Card from '../../components/ui/Card';
import DatePickerInput from '../../components/ui/DatePickerInput';
import './Notifications.css';

const NOTIFICATION_TYPES = [
  { value: '', label: 'All Event Categories' },
  { value: 'low_stock', label: 'Low Stock Alerts' },
  { value: 'worker_payment', label: 'Worker Wages' },
  { value: 'expense_added', label: 'Expense Requests' },
  { value: 'expense_approved', label: 'Expense Approvals' },
  { value: 'expense_rejected', label: 'Expense Rejections' },
  { value: 'login_alert', label: 'Session Logins' },
  { value: 'security_alert', label: 'Security & Password Changes' },
];

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleString();
}

const getNotificationIcon = (type) => {
  const props = { size: 18 };
  switch (type) {
    case 'low_stock':
    case 'stock_out':
      return { icon: <AlertTriangle {...props} />, bg: '#fee2e2', color: '#ef4444' };
    case 'worker_payment':
      return { icon: <CreditCard {...props} />, bg: '#dcfce7', color: '#22c55e' };
    case 'expense_added':
      return { icon: <Info {...props} />, bg: '#eff6ff', color: '#3b82f6' };
    case 'expense_approved':
      return { icon: <CheckCircle {...props} />, bg: '#dcfce7', color: '#22c55e' };
    case 'expense_rejected':
      return { icon: <XCircle {...props} />, bg: '#fee2e2', color: '#ef4444' };
    case 'login_alert':
    case 'security_alert':
      return { icon: <Shield {...props} />, bg: '#fef3c7', color: '#f59e0b' };
    default:
      return { icon: <Bell {...props} />, bg: '#f3f4f6', color: '#6b7280' };
  }
};

export default function Notifications() {
  const [filterRead, setFilterRead] = useState('');
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const toast = useToast();

  const queryParams = {
    isRead: filterRead === '' ? undefined : filterRead,
    type: filterType || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: search || undefined,
    page,
    limit
  };

  const { data, isLoading } = useNotifications(queryParams);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();
  const deleteAll = useDeleteAllNotifications();

  const items = data?.items || [];
  const total = data?.total || 0;
  const unreadCount = data?.unreadCount || 0;
  const totalPages = Math.ceil(total / limit);

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
      toast.success('All notifications marked as read.');
    } catch (err) {
      toast.error('Failed to mark all as read.');
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm('Are you sure you want to delete all notifications?')) {
      try {
        await deleteAll.mutateAsync();
        toast.success('All notifications deleted.');
        setPage(1);
      } catch (err) {
        toast.error('Failed to delete all notifications.');
      }
    }
  };

  return (
    <div className="notifications-page">
      <div className="notifications-page__header">
        <div className="notifications-page__header-text">
          <h1>Notifications Center</h1>
          <p>You have {unreadCount} unread system notifications</p>
        </div>
        <div className="notifications-page__header-actions">
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllRead} variant="secondary">
              <CheckSquare size={16} style={{ marginRight: 8 }} /> Mark All Read
            </Button>
          )}
          {items.length > 0 && (
            <Button onClick={handleDeleteAll} variant="danger">
              <Trash2 size={16} style={{ marginRight: 8 }} /> Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      <Card className="reports-page__filter-card" style={{ padding: 'var(--space-md)' }}>
        <div className="notifications-page__filters">
          <div className="notifications-page__field">
            <label htmlFor="filter-read">Read / Unread</label>
            <select
              id="filter-read"
              className="form-select"
              value={filterRead}
              onChange={(e) => { setFilterRead(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="false">Unread</option>
              <option value="true">Read</option>
            </select>
          </div>

          <div className="notifications-page__field">
            <label htmlFor="filter-type">Event Category</label>
            <select
              id="filter-type"
              className="form-select"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            >
              {NOTIFICATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="notifications-page__field">
            <label>Start Date</label>
            <DatePickerInput value={startDate} onChange={(val) => { setStartDate(val); setPage(1); }} placeholder="From Date" />
          </div>

          <div className="notifications-page__field">
            <label>End Date</label>
            <DatePickerInput value={endDate} onChange={(val) => { setEndDate(val); setPage(1); }} placeholder="To Date" />
          </div>

          <div className="notifications-page__field" style={{ flex: 1 }}>
            <label htmlFor="search">Search Alerts</label>
            <div style={{ position: 'relative' }}>
              <input
                id="search"
                type="text"
                className="form-input"
                placeholder="Search alerts title or body..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{ paddingRight: 32 }}
              />
              <Search size={16} style={{ position: 'absolute', right: 10, top: 12, opacity: 0.4 }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Notifications feed */}
      {isLoading ? (
        <div className="notifications-page__empty">
          <p>Loading notification archives...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="notifications-page__empty">
          <Inbox size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p>Your notification inbox is clean!</p>
        </div>
      ) : (
        <div className="notifications-page__list">
          {items.map((n) => {
            const iconStyle = getNotificationIcon(n.type);
            return (
              <div
                key={n._id}
                className={`notifications-page__item ${!n.isRead ? 'notifications-page__item--unread' : ''}`}
              >
                <div
                  className="notifications-page__item-icon-container"
                  style={{ backgroundColor: iconStyle.bg, color: iconStyle.color }}
                >
                  {iconStyle.icon}
                </div>

                <div className="notifications-page__item-content">
                  <div className="notifications-page__item-meta">
                    <span className="notifications-page__item-title">{n.title}</span>
                    {n.site && <span className="notifications-page__item-site">{n.site.name}</span>}
                    <span className="notifications-page__item-time">{formatRelativeTime(n.createdAt)}</span>
                  </div>
                  <span className="notifications-page__item-message">{n.message}</span>
                </div>

                <div className="notifications-page__item-actions">
                  {!n.isRead && (
                    <button
                      className="topbar__icon-btn touch-target"
                      onClick={() => markRead.mutate(n._id)}
                      title="Mark as Read"
                    >
                      <CheckSquare size={16} />
                    </button>
                  )}
                  <button
                    className="topbar__icon-btn touch-target text-danger"
                    onClick={() => deleteNotif.mutate(n._id)}
                    title="Delete Notification"
                  >
                    <Trash2 size={16} style={{ color: 'var(--color-danger-500)' }} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="notifications-page__pagination">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={16} style={{ marginRight: 4 }} /> Previous
              </Button>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next <ChevronRight size={16} style={{ marginLeft: 4 }} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
