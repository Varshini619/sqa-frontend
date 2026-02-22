import axiosClient from './axiosClient';

export const getDevelopment = (versionId) =>
  axiosClient.get(`/api/development/${versionId}`);

export const updateDevelopment = (versionId, data) =>
  axiosClient.put(`/api/development/${versionId}`, data);

export const uploadFiles = (versionId, formData) =>
  axiosClient.post(`/api/development/${versionId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const uploadFolders = (versionId, formData) =>
  axiosClient.post(`/api/development/${versionId}/folders`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteFile = (versionId, fileId) =>
  axiosClient.delete(`/api/development/${versionId}/files/${fileId}`);

export const deleteFolder = (versionId, folderId) =>
  axiosClient.delete(`/api/development/${versionId}/folders/${folderId}`);
