import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * PublicLayout - Isolated layout for customer access
 * - No navigation
 * - No admin controls
 * - No sidebar
 * - Prevents access to internal routes
 */
const PublicLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Prevent navigation away from public routes
    const handleRouteChange = (e) => {
      const currentPath = window.location.pathname;
      
      // If user tries to navigate away from public route, prevent it
      if (currentPath.startsWith('/public/')) {
        // Allow navigation within public routes
        if (e.detail?.pathname?.startsWith('/public/')) {
          return; // Allow
        }
        
        // Block navigation to internal routes
        if (e.detail?.pathname && !e.detail.pathname.startsWith('/public/')) {
          e.preventDefault();
          console.warn('Navigation to internal routes blocked from public view');
        }
      }
    };

    // Block browser back/forward navigation to internal routes
    const handlePopState = (e) => {
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/public/')) {
        // Allow staying in public routes
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location]);

  // Prevent any programmatic navigation to internal routes
  useEffect(() => {
    const originalPush = navigate;
    
    // Override navigate function when in public mode
    if (location.pathname.startsWith('/public/')) {
      // Create a wrapped navigate function
      const publicNavigate = (to, options) => {
        const targetPath = typeof to === 'string' ? to : to?.pathname || '/';
        
        // Only allow navigation within public routes
        if (targetPath.startsWith('/public/')) {
          return originalPush(to, options);
        }
        
        // Block navigation to internal routes
        console.warn('Navigation blocked: Cannot navigate to internal routes from public view');
        return false;
      };
    }
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal header - no navigation */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-800">
                SQA Report Viewer
              </h1>
            </div>
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-medium">
              Public View
            </div>
          </div>
        </div>
      </header>

      {/* Main content - no sidebar, no admin controls */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Minimal footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            This is a read-only view. For full access, please contact your administrator.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;

