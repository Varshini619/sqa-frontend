import axiosClient from './axiosClient';

export const login = (email, password) =>
  axiosClient.post('/api/auth/login', { email, password });

export const register = (email, password, name) =>
  axiosClient.post('/api/auth/register', { email, password, name });

export const forgotPassword = (email) =>
  axiosClient.post('/api/auth/forgot-password', { email });

export const resetPassword = (token, password) =>
  axiosClient.post('/api/auth/reset-password', { token, password });
