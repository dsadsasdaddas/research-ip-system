import http from './http'

export default {
  listTemplates: (params) => http.get('/reports/templates', { params }),
  createTemplate: (data) => http.post('/reports/templates', data),
  updateTemplate: (id, data) => http.patch(`/reports/templates/${id}`, data),
  deleteTemplate: (id) => http.delete(`/reports/templates/${id}`),
  exportReport: (data) => http.post('/reports/export', data),
  listExportLogs: (params) => http.get('/reports/export-logs', { params }),
  // 下载必须走 axios(自动带 Authorization 头)+ responseType:blob;
  // 不能用 <a href>(浏览器导航不带 JWT → 401),也不能让 axios 把二进制当 JSON 解析。
  downloadExport: (id) => http.get(`/reports/exports/${id}/download`, { responseType: 'blob' }),
  listScheduledTasks: (params) => http.get('/reports/scheduled-tasks', { params }),
  createScheduledTask: (data) => http.post('/reports/scheduled-tasks', data),
  updateScheduledTask: (id, data) => http.patch(`/reports/scheduled-tasks/${id}`, data),
  deleteScheduledTask: (id) => http.delete(`/reports/scheduled-tasks/${id}`),
}
