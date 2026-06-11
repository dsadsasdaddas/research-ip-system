import http from './http'

export default {
  listTemplates: (params) => http.get('/reports/templates', { params }),
  createTemplate: (data) => http.post('/reports/templates', data),
  updateTemplate: (id, data) => http.patch(`/reports/templates/${id}`, data),
  deleteTemplate: (id) => http.delete(`/reports/templates/${id}`),
  exportReport: (data) => http.post('/reports/export', data),
  listExportLogs: (params) => http.get('/reports/export-logs', { params }),
  downloadExport: (id) => http.get(`/reports/exports/${id}/download`),
  listScheduledTasks: (params) => http.get('/reports/scheduled-tasks', { params }),
  createScheduledTask: (data) => http.post('/reports/scheduled-tasks', data),
  updateScheduledTask: (id, data) => http.patch(`/reports/scheduled-tasks/${id}`, data),
  deleteScheduledTask: (id) => http.delete(`/reports/scheduled-tasks/${id}`),
}
