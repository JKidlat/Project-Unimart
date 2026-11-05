/**
 * ==============================================================================
 * ROUTE SECURITY GUARD (ProtectedRoute.tsx)
 * ==============================================================================
 * This component acts as a security barrier around routes that require login
 * or specific privileges (e.g. Buyer, Seller, or Admin).
 *
 * How it works:
 * 1. Loading State:
 *    - While UserContext is verifying the stored JWT session, it displays a smooth
 *      spinner so users don't see brief flicker redirects.
 * 2. Admin Protection:
 *    - If `allowedRoles` includes 'Admin', it verifies that the user is an admin
 *      (`user.role === 'Admin'` or `user.is_staff`).
 *    - If unauthenticated, it redirects specifically to `/admin/login`.
 * 3. General Authentication Protection:
 *    - If user is not logged in, it alerts them with a toast message and redirects
 *      to `/signin`, storing the current URL in `location.state.from` so they return
 *      to the page they intended to visit after signing in.
 * 4. Role Hierarchy Protection:
 *    - If a Buyer tries to visit a Seller-only URL without being verified,
 *      it blocks access and redirects safely to the homepage.
 *
 * Example usage:
 * <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
 * <Route path="/admin" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
 * ==============================================================================
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useUser, type UserRole } from '../context/UserContext';
import { toast } from 'sonner';

// Props passed to ProtectedRoute
interface ProtectedRouteProps {
  children: React.ReactNode;   // The child component/page to render if authorized
  allowedRoles?: UserRole[];   // Optional whitelist of allowed roles (e.g. ['Seller'] or ['Admin'])
  requireAuth?: boolean;       // Defaults to true
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireAuth = true,
}) => {
  const { user, isLoggedIn, isLoading } = useUser();
  const location = useLocation();

  // 1. Show spinner while verifying user session on app startup
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-[#a14b58] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 2. Specific guard for Admin suite routes (/admin/*)
  if (allowedRoles?.includes('Admin')) {
    const isAdmin = Boolean(user && (user.is_staff || user.role === 'Admin' || (user.role as string) === 'Super Admin'));
    if (!isLoggedIn || !isAdmin) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    return <>{children}</>;
  }

  // 3. General user authentication check (must be logged in)
  if (requireAuth && !isLoggedIn) {
    toast.error("Please sign in to access this page");
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // 4. Role mismatch check (e.g. Buyer trying to open Seller Studio directly)
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    toast.error("Access denied. Insufficient privileges.");
    return <Navigate to="/" replace />;
  }

  // 5. User meets all security checks — render the requested page
  return <>{children}</>;
};
