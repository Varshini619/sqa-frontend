import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * PublicRoute - Ensures users stay in public view even if logged in
 * Prevents redirects to dashboard or internal routes
 * Completely isolates public routes from internal application
 */
const PublicRoute = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    // Mark that we're in public mode
    if (location.pathname.startsWith('/public/')) {
      sessionStorage.setItem('publicMode', 'true');
      sessionStorage.setItem('publicRoute', location.pathname);
      
      // Prevent any automatic redirects
      // Override any navigation attempts
      const handlePopState = (e) => {
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/public/')) {
          // User tried to navigate away, redirect back to public route
          const savedPublicRoute = sessionStorage.getItem('publicRoute');
          if (savedPublicRoute) {
            window.history.pushState(null, '', savedPublicRoute);
          }
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        // Only clear if actually leaving public routes
        if (!window.location.pathname.startsWith('/public/')) {
          sessionStorage.removeItem('publicMode');
          sessionStorage.removeItem('publicRoute');
        }
      };
    }
  }, [location]);

  return <>{children}</>;
};

export default PublicRoute;

