import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PlatformLogin from './features/platform/pages/PlatformLogin';
import PlatformDashboard from './features/platform/pages/PlatformDashboard';
import OwnerLogin from './features/owner/pages/OwnerLogin';
import CustomerLogin from './features/customer/pages/CustomerLogin';
import ProtectedRoute from './utils/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      {/* Customer */}
      <Route path="/" element={<CustomerLogin />} />
      <Route path="/login" element={<CustomerLogin />} />

      {/* Owner / Manager */}
      <Route path="/owner/login" element={<OwnerLogin />} />

      {/* Superadmin / Platform */}
      <Route path="/platform/login" element={<PlatformLogin />} />
      <Route
        path="/platform"
        element={
          <ProtectedRoute role="superadmin">
            <PlatformDashboard />
          </ProtectedRoute>
        }
      />

      {/* optional fallback */}
      <Route path="*" element={<div className="p-10 text-center">404 – Page Not Found</div>} />
    </Routes>
  );
}
