import axiosClient from './axiosClient';

export const getProjects = () =>
  axiosClient.get('/api/projects');

export const getProject = (projectId) =>
  axiosClient.get(`/api/projects/${projectId}`);

export const createProject = (data) =>
  axiosClient.post('/api/projects', data);

export const deleteProject = (projectId) =>
  axiosClient.delete(`/api/projects/${projectId}`);
