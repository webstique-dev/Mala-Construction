import {
  LayoutDashboard,
  Building2,
  UserCog,
  Boxes,
  HardHat,
  CalendarCheck,
  Wallet,
  Receipt,
  FileBarChart2,
  ScrollText,
  Bell,
  Settings,
  User,
} from 'lucide-react';
import { ROLES } from '../constants';

/**
 * Single source of truth for sidebar structure. `roles: null` means visible to everyone.
 */
export const NAV_GROUPS = [
  {
    label: null,
    items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, roles: null }],
  },
  {
    label: 'Site Management',
    roles: [ROLES.SUPER_ADMIN],
    items: [
      { label: 'Sites', to: '/sites', icon: Building2, roles: [ROLES.SUPER_ADMIN] },
      { label: 'Site Admins', to: '/site-admins', icon: UserCog, roles: [ROLES.SUPER_ADMIN] },
    ],
  },
  {
    label: 'Operations',
    roles: null,
    items: [
      { label: 'Materials', to: '/materials', icon: Boxes, roles: null },
      { label: 'Labour Attendance', to: '/attendance', icon: CalendarCheck, roles: null },
      // { label: 'Payments', to: '/payments', icon: Wallet, roles: null },
      { label: 'Expenses', to: '/expenses', icon: Receipt, roles: null },
    ],
  },
  {
    label: null,
    items: [
      { label: 'Reports', to: '/reports', icon: FileBarChart2, roles: null },
      { label: 'Activity Logs', to: '/activity-logs', icon: ScrollText, roles: null },
      // { label: 'Notifications', to: '/notifications', icon: Bell, roles: null },
    ],
  },
  {
    label: null,
    items: [
      // { label: 'Settings', to: '/settings', icon: Settings, roles: [ROLES.SUPER_ADMIN] },
      { label: 'Profile', to: '/profile', icon: User, roles: null },
    ],
  },
];
