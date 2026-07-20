import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FullScreenLoader from '../components/common/FullScreenLoader';

/**
 * Guards a route subtree. Mirrors the backend's check order:
 * is authenticated -> has correct role. Site-ownership is enforced
 * server-side and via query scoping, not here.
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullScreenLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
