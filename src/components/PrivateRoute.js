import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { token, loading } = useContext(AuthContext);
  const location = useLocation();

  // Block access to private routes if user is in public mode
  if (location.pathname.startsWith('/public/')) {
    // This shouldn't happen, but as a safety measure
    return <Navigate to={location.pathname} replace />;
  }

  // Check if user is trying to access private route while in public mode
  const publicMode = sessionStorage.getItem('publicMode');
  if (publicMode === 'true' && !location.pathname.startsWith('/public/')) {
    // User is in public mode, block access to private routes
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Restricted</h2>
          <p className="text-gray-600">You are viewing a shared link. Full access is not available.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return token ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;

