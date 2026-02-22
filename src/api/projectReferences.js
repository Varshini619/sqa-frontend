import axiosClient from './axiosClient';

export const getProjectReferences = (versionId, platform) => {
  const params = platform ? { platform } : {};
  return axiosClient.get(`/api/project-references/version/${versionId}`, { params });
};

export const uploadFolder = (formData) =>
  axiosClient.post('/api/project-references/upload-folder', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const uploadFile = (formData) =>
  axiosClient.post('/api/project-references/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const createReference = (data) =>
  axiosClient.post('/api/project-references', data);

export const updateReference = (id, data) =>
  axiosClient.put(`/api/project-references/${id}`, data);

export const deleteReference = (id) =>
  axiosClient.delete(`/api/project-references/${id}`);
