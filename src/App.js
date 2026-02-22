import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import ProjectPage from './pages/ProjectPage';
import VersionPage from './pages/VersionPage';
import SQAPage from './pages/SQAPage';
import DevelopmentPage from './pages/DevelopmentPage';
import PublicSQAPage from './pages/PublicSQAPage';
import PublicRoute from './components/PublicRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* Public routes - completely isolated, no auth required */}
          <Route 
            path="/public/sqa/:token" 
            element={
              <PublicRoute>
                <PublicSQAPage />
              </PublicRoute>
            } 
          />
          <Route
            path="/home"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />
          <Route
            path="/project/:projectId"
            element={
              <PrivateRoute>
                <ProjectPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/version/:versionId"
            element={
              <PrivateRoute>
                <VersionPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/version/:versionId/sqa"
            element={
              <PrivateRoute>
                <SQAPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/version/:versionId/development"
            element={
              <PrivateRoute>
                <DevelopmentPage />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

