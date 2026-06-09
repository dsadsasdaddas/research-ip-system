import http from './http'

export const auditLogsApi = {
  list: (p) => http.get('/audit-logs', { params: p }),
}
