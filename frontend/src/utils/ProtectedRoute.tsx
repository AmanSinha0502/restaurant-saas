// src/utils/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  role?: 'superadmin' | 'owner' | 'customer';
}

export default function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // wait for loading to complete before deciding
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg font-semibold">
        Checking session...
      </div>
    );
  }

  // if user not logged in → send to proper login
  if (!user) {
    if (role === 'superadmin') return <Navigate to="/platform/login" replace />;
    if (role === 'owner') return <Navigate to="/owner/login" replace />;
    return <Navigate to="/login" replace />;
  }

  // role check — allow superadmin everywhere
  if (role && user.role !== role && user.role !== 'superadmin') {
    return <Navigate to="/platform/login" replace />;
  }

  // ✅ authorized → show page
  return children;
}
