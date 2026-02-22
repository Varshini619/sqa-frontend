import axiosClient from './axiosClient';

export const getObjective = (versionId) =>
  axiosClient.get(`/api/objective/${versionId}`);

export const uploadObjective = (formData) =>
  axiosClient.post('/api/objective/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteObjective = (reportId) =>
  axiosClient.delete(`/api/objective/${reportId}`);

export const getSubjective = (versionId) =>
  axiosClient.get(`/api/subjective/${versionId}`);

export const uploadSubjective = (formData) =>
  axiosClient.post('/api/subjective/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updateSubjective = (id, formData) =>
  axiosClient.put(`/api/subjective/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteSubjective = (resultId) =>
  axiosClient.delete(`/api/subjective/${resultId}`);

export const getReports = (versionId, type) =>
  axiosClient.get(`/api/sqa/reports/${versionId}`, { params: { type } });

export const uploadReport = (versionId, formData) =>
  axiosClient.post(`/api/sqa/reports/upload/${versionId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteReport = (reportId) =>
  axiosClient.delete(`/api/sqa/reports/${reportId}`);

export const filterSqa = (versionId, filters) =>
  axiosClient.post(`/api/sqa/${versionId}/filter`, filters);
