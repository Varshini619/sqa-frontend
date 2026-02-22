import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Optionally fetch user data
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password
      });
      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return { success: true };
    } catch (error) {
      let message = 'Login failed';
      
      if (error.response) {
        // Server responded with error
        if (error.response.status === 503) {
          message = 'Database connection error. Please contact administrator.';
        } else {
          message = error.response.data?.message || 'Login failed';
        }
      } else if (error.request) {
        // Request made but no response
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
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        email,
        password,
        name
      });
      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return { success: true };
    } catch (error) {
      let message = 'Registration failed';
      
      if (error.response) {
        // Server responded with error
        if (error.response.status === 503) {
          message = 'Database connection error. Please contact administrator.';
        } else {
          message = error.response.data?.message || 'Registration failed';
        }
      } else if (error.request) {
        // Request made but no response
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
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, token }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

