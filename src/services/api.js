import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5555/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Activity endpoints
export const createActivity = async (activityData) => {
  const response = await api.post('/activities', activityData);
  return response.data;
};

export const getActivities = async (params = {}) => {
  const response = await api.get('/activities', { params });
  return response.data;
};

export const getActivityById = async (id) => {
  const response = await api.get(`/activities/${id}`);
  return response.data;
};

export const updateActivity = async (id, activityData) => {
  const response = await api.put(`/activities/${id}`, activityData);
  return response.data;
};

export const deleteActivity = async (id) => {
  const response = await api.delete(`/activities/${id}`);
  return response.data;
};

// Emission endpoints
export const calculateEmissions = async (activityData) => {
  const response = await api.post('/emissions/calculate', activityData);
  return response.data;
};

export const getTotalEmissions = async (params = {}) => {
  const response = await api.get('/emissions/total', { params });
  return response.data;
};

export const getEmissionsByPeriod = async (period = 'day', days = 7) => {
  const response = await api.get('/emissions/period', {
    params: { period, days },
  });
  return response.data;
};

export default api;

