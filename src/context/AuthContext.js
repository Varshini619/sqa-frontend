import React, { createContext, useState, useEffect } from 'react';
import { login as loginApi, register as registerApi } from '../api/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await loginApi(email, password);
      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      return { success: true };
    } catch (error) {
      let message = 'Login failed';
      
      if (error.response) {
        if (error.response.status === 503) {
          message = 'Database connection error. Please contact administrator.';
        } else {
          message = error.response.data?.message || 'Login failed';
        }
      } else if (error.request) {
        message = 'Cannot connect to server. Please check if the backend is running.';
      }
      
      return {
        success: false,
        message
      };
    }
  };

  const register = async (email, password, name) => {
    try {
      const response = await registerApi(email, password, name);
      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      return { success: true };
    } catch (error) {
      let message = 'Registration failed';
      
      if (error.response) {
        if (error.response.status === 503) {
          message = 'Database connection error. Please contact administrator.';
        } else {
          message = error.response.data?.message || 'Registration failed';
        }
      } else if (error.request) {
        message = 'Cannot connect to server. Please check if the backend is running.';
      }
      
      return {
        success: false,
        message
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, token }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
