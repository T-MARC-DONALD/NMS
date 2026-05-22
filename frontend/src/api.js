import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

// Device API
export const deviceAPI = {
  getAll: (page = 1, perPage = 10, status = null, query = '') => {
    const params = { page, per_page: perPage };
    if (status) params.status = status;
    if (query) params.q = query;
    return api.get('/devices', { params });
  },
  
  getById: (id) => api.get(`/devices/${id}`),
  
  probe: (data) => api.post('/devices/probe', data),

  create: (data) => api.post('/devices', data),
  
  update: (id, data) => api.put(`/devices/${id}`, data),
  
  delete: (id) => api.delete(`/devices/${id}`)
};

// Event API
export const eventAPI = {
  getAll: (page = 1, perPage = 20, filters = {}) => {
    const params = { page, per_page: perPage, ...filters };
    return api.get('/events', { params });
  },
  
  resolve: (id) => api.put(`/events/${id}/resolve`)
};

// Statistics API
export const statsAPI = {
  getSummary: () => api.get('/stats/summary'),
  getEventsBySeverity: () => api.get('/stats/events-by-severity'),
  getOverview: () => api.get('/monitoring/overview'),
  getTopology: () => api.get('/monitoring/topology'),
  getSensors: (deviceId = null) => api.get('/monitoring/sensors', { params: deviceId ? { device_id: deviceId } : {} }),
  getReports: (days = 7) => api.get('/monitoring/reports', { params: { days } })
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;
