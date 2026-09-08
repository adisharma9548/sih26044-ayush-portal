import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, role, isCheckingAuth, token } = useAuth();

  // If checkAuth is currently verifying an existing token, show smooth loader instead of premature redirect
  if (isCheckingAuth && token) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <p className="text-xs text-slate-500 font-medium">Restoring authenticated session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles contains 'student', allow 'jobseeker' as well
  const effectiveRole = role === 'jobseeker' ? 'student' : role;

  if (allowedRoles && !allowedRoles.includes(role) && !allowedRoles.includes(effectiveRole)) {
    // Redirect to the user's role dashboard if they try to access another role's route
    switch (role) {
      case 'student':
      case 'jobseeker':
        return <Navigate to="/student/dashboard" replace />;
      case 'industry':
        return <Navigate to="/industry/dashboard" replace />;
      case 'academician':
        return <Navigate to="/academician/dashboard" replace />;
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};
