import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AppLayout from '../layouts/AppLayout';
import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import Sites from '../pages/sites/Sites';
import SiteAdmins from '../pages/siteAdmins/SiteAdmins';
import Materials from '../pages/materials/Materials';
import Workers from '../pages/workers/Workers';
import WorkerProfile from '../pages/workers/WorkerProfile';
import Attendance from '../pages/attendance/Attendance';
import Payments from '../pages/payments/Payments';
import Expenses from '../pages/expenses/Expenses';
import Reports from '../pages/reports/Reports';
import ActivityLogs from '../pages/activityLogs/ActivityLogs';
import Notifications from '../pages/notifications/Notifications';
import Settings from '../pages/settings/Settings';
import Profile from '../pages/settings/Profile';
import Unauthorized from '../pages/errors/Unauthorized';
import NotFound from '../pages/errors/NotFound';
import { ROLES } from '../constants';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: <Login /> },
  { path: '/unauthorized', element: <Unauthorized /> },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/materials', element: <Materials /> },
          { path: '/workers', element: <Navigate to="/attendance" replace /> },
          { path: '/attendance', element: <Attendance /> },
          { path: '/payments', element: <Payments /> },
          { path: '/expenses', element: <Expenses /> },
          { path: '/reports', element: <Reports /> },
          { path: '/activity-logs', element: <ActivityLogs /> },
          { path: '/notifications', element: <Notifications /> },
          { path: '/profile', element: <Profile /> },

          {
            element: <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />,
            children: [
              { path: '/sites', element: <Sites /> },
              { path: '/site-admins', element: <SiteAdmins /> },
              { path: '/settings', element: <Settings /> },
            ],
          },
        ],
      },
    ],
  },

  { path: '*', element: <NotFound /> },
]);
