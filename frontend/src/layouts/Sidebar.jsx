import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, X, Settings } from 'lucide-react';
import { NAV_GROUPS } from '../constants/navigation';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, ChevronRight } from "lucide-react";
import './Sidebar.css';

/**
 * `isOpen`/`onClose` drive the off-canvas drawer behavior on mobile/tablet.
 * `isCollapsed` drives the icon-only rail behavior on desktop.
 */
export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const { role, requestLogout } = useAuth();

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);

  const sidebarContent = (
    <nav className="sidebar__nav" aria-label="Main navigation">
      {visibleGroups.map((group, idx) => (
        <div className="sidebar__group" key={group.label ?? `group-${idx}`}>
          {group.label && !isCollapsed && <span className="sidebar__group-label">{group.label}</span>}
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={20} strokeWidth={1.75} aria-hidden="true" />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop rail - collapses width, no overlay */}
      <aside className={`sidebar${isCollapsed ? ' sidebar--collapsed' : ''}`}>
        <div className="sidebar__header">
          {!isCollapsed && (
            <div className="sidebar__brand">
              {/* <div className="sidebar__brand-mark" aria-hidden="true" /> */}
              <h6 className='text-bold'>MALA <br /> CONSTRUCTIONS</h6>
            </div>
          )}
          <button
            type="button"
            className="sidebar__collapse-btn touch-target"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight size={18} strokeWidth={2.5} />
            ) : (
              <ChevronLeft size={18} strokeWidth={2.5} />
            )}
          </button>
        </div>
        {sidebarContent}

        {/* <div className="sidebar__tools">
          <NavLink to="/settings" className={({isActive}) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}>
            <Settings size={18} strokeWidth={1.5} />
            {!isCollapsed && <span>Settings</span>}
          </NavLink>
        </div> */}

        <button type="button" className="sidebar__logout touch-target" onClick={requestLogout}>
          <LogOut size={20} strokeWidth={1.75} aria-hidden="true" />
          {!isCollapsed && <span>Logout</span>}
        </button>

        {/* <div className="sidebar__cta" role="note">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.12)' }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Optimize operations</div>
          </div>
          <button type="button" className="btn btn--primary btn--sm">Upgrade</button>
        </div> */}
      </aside>

      {/* Mobile/tablet off-canvas drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="sidebar__scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
            <motion.aside
              className="sidebar sidebar--drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="sidebar__header">
                <span className="sidebar__brand">MALA CONSTR.</span>
                <button type="button" className="sidebar__collapse-btn touch-target" onClick={onClose} aria-label="Close menu">
                  <X size={20} />
                </button>
              </div>
              {sidebarContent}
              <button type="button" className="sidebar__logout touch-target" onClick={requestLogout}>
                <LogOut size={20} strokeWidth={1.75} aria-hidden="true" />
                <span>Logout</span>
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
