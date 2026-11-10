/**
 * ==============================================================================
 * ROUTE SECURITY GUARD (ProtectedRoute.tsx)
 * ==============================================================================
 * Enforces strict client-side route protection matching backend authorization:
 * - Shows loading state while verifying JWT session against `/auth/me/` (prevents
 *   rendering any protected/admin UI prior to role verification).
 * - Unauthenticated access to `/admin*` redirects to `/admin/login`.
 * - Authenticated Buyer/Seller attempting to open `/admin*` is denied and
 *   redirected to their appropriate dashboard (`'/'` or `'/seller'`).
 * - Unauthenticated access to Buyer/Seller routes redirects to `/signin`.
 * ==============================================================================
 */

import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useUser, type UserRole } from '../context/UserContext';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

const DeniedRedirect: React.FC<{ to: string; message: string; state?: any }> = ({
  to,
  message,
  state,
}) => {
  useEffect(() => {
    toast.error(message);
  }, [message]);
  return <Navigate to={to} state={state} replace />;
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireAuth = true,
}) => {
  const { user, isLoggedIn, isLoading } = useUser();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-[#a14b58] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (allowedRoles?.includes('Admin')) {
    if (!isLoggedIn || !user) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    const isAdmin = Boolean(user.is_staff || user.is_superuser || user.role === 'Admin');
    if (!isAdmin) {
      const destination = user.role === 'Seller' ? '/seller' : '/';
      return (
        <DeniedRedirect
          to={destination}
          message="Access denied. Administrator privileges are required."
        />
      );
    }
    return <>{children}</>;
  }

  if (requireAuth && !isLoggedIn) {
    return (
      <DeniedRedirect
        to="/signin"
        state={{ from: location }}
        message="Please sign in to access this page."
      />
    );
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const destination = user.is_staff || user.role === 'Admin' ? '/admin' : user.role === 'Seller' ? '/seller' : '/';
    return (
      <DeniedRedirect
        to={destination}
        message="Access denied. Insufficient privileges."
      />
    );
  }

  return <>{children}</>;
};
