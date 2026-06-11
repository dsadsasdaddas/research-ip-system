import http from './http'

export default {
  trigger: () => http.post('/backup/trigger'),
  restore: (id) => http.post(`/backup/${id}/restore`),
  listLogs: (params) => http.get('/backup/logs', { params }),
}
