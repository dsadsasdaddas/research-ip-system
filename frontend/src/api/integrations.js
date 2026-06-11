import http from './http'

export const integrationsApi = {
  listConfigs() {
    return http.get('/integrations/configs')
  },
  getConfig(id) {
    return http.get(`/integrations/configs/${id}`)
  },
  createConfig(data) {
    return http.post('/integrations/configs', data)
  },
  updateConfig(id, data) {
    return http.patch(`/integrations/configs/${id}`, data)
  },
  testConfig(id) {
    return http.post(`/integrations/configs/${id}/test`)
  },
  removeConfig(id) {
    return http.delete(`/integrations/configs/${id}`)
  },
  listLogs(params) {
    return http.get('/integrations/logs', { params })
  },
}
