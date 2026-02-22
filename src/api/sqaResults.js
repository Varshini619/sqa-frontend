import axiosClient from './axiosClient';

export const getVersionMetrics = (versionId) =>
  axiosClient.get(`/api/sqa-results/version-metrics/${versionId}`);

export const getCommonMetrics = (data) =>
  axiosClient.post('/api/sqa-results/common-metrics', data);

export const getAverageMetrics = (data) =>
  axiosClient.post('/api/sqa-results/average-metrics', data);

export const compareResults = (data) =>
  axiosClient.post('/api/sqa-results/compare', data);
