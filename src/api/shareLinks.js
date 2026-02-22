import axiosClient from './axiosClient';

export const getShareLinks = (versionId, type) =>
  axiosClient.get(`/api/share-links/${versionId}/${type}`, {
    timeout: 10000,
  });

export const generateShareLink = (data) =>
  axiosClient.post('/api/share-links/generate', data, {
    timeout: 30000,
  });

export const deleteShareLink = (id) =>
  axiosClient.delete(`/api/share-links/${id}`);

export const getPublicShareLink = (token) =>
  axiosClient.get(`/api/share-links/public/${token}`, {
    timeout: 30000,
  });
