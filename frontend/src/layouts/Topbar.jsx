import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu, Moon, Sun, Search, Bell, Mail, AlertTriangle, CreditCard,
  CheckCircle, XCircle, Info, Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  useNotifications, useUnreadNotificationsCount,
  useMarkNotificationRead, useMarkAllNotificationsRead
} from '../hooks/useNotifications';
import GlobalSearch from '../components/common/GlobalSearch';
import './Topbar.css';

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
  return date.toLocaleDateString();
}

const getNotificationIcon = (type) => {
  const props = { size: 16 };
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

export default function Topbar({ onOpenSidebar }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { data: unreadData } = useUnreadNotificationsCount();
  const { data: listData } = useNotifications({ limit: 5 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = unreadData?.unreadCount || 0;
  const notifications = listData?.items || [];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar__menu-btn touch-target"
        onClick={onOpenSidebar}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      <div className="topbar__search">
        <Search size={16} aria-hidden="true" />
        <GlobalSearch />
      </div>

      <div className="topbar__actions">
        <button
          type="button"
          className="topbar__icon-btn touch-target"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Bell dropdown container */}
        <div className="topbar__notifications-container" ref={dropdownRef}>
          <button
            type="button"
            className="topbar__icon-btn touch-target"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && <span className="topbar__badge">{unreadCount}</span>}
          </button>

          {dropdownOpen && (
            <div className="topbar__dropdown">
              <div className="topbar__dropdown-header">
                <span className="topbar__dropdown-title">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    className="topbar__dropdown-read-all"
                    onClick={() => markAllRead.mutate()}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="topbar__dropdown-items">
                {notifications.length === 0 ? (
                  <div className="topbar__dropdown-empty">
                    No new alerts
                  </div>
                ) : (
                  notifications.map((n) => {
                    const iconStyle = getNotificationIcon(n.type);
                    return (
                      <div
                        key={n._id}
                        className={`topbar__dropdown-item ${!n.isRead ? 'topbar__dropdown-item--unread' : ''}`}
                        onClick={() => {
                          if (!n.isRead) markRead.mutate(n._id);
                        }}
                      >
                        <div
                          className="topbar__dropdown-item-icon"
                          style={{ backgroundColor: iconStyle.bg, color: iconStyle.color }}
                        >
                          {iconStyle.icon}
                        </div>
                        <div className="topbar__dropdown-item-content">
                          <span className="topbar__dropdown-item-title">{n.title}</span>
                          <span className="topbar__dropdown-item-message">{n.message}</span>
                          <span className="topbar__dropdown-item-time">{formatRelativeTime(n.createdAt)}</span>
                        </div>
                        {!n.isRead && <span className="topbar__dropdown-item-dot"></span>}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="topbar__dropdown-footer">
                <Link
                  to="/notifications"
                  className="topbar__dropdown-link"
                  onClick={() => setDropdownOpen(false)}
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        <button type="button" className="topbar__icon-btn touch-target" aria-label="Messages">
          <Mail size={16} />
        </button>

        <div className="topbar__user">
          <div className="topbar__avatar">
            {user?.photo?.url ? (
              <img src={user.photo.url} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: 10, objectFit: 'cover' }} />
            ) : (
              user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('')
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
            <span className="topbar__user-name">{user?.name}</span>
            <span className="topbar__user-role">{user?.role === 'super_admin' ? 'Super Admin' : 'Site Admin'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
