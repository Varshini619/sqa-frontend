import axiosClient, { API_BASE_URL } from './axiosClient';

export const getUploadUrl = (path) => `${API_BASE_URL}/uploads/${path}`;

export const downloadUpload = (path, options = {}) =>
  axiosClient.get(`/uploads/${path}`, {
    responseType: options.responseType || 'blob',
    timeout: options.timeout || 30000,
  });
