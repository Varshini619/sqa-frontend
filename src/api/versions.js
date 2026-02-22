import axiosClient from './axiosClient';

export const getVersion = (versionId) =>
  axiosClient.get(`/api/versions/${versionId}`);

export const createVersion = (data) =>
  axiosClient.post('/api/versions', data);

export const deleteVersion = (versionId) =>
  axiosClient.delete(`/api/versions/${versionId}`);
