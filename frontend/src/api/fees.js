import http from './http'

export const feesApi = {
  list:          (params) => http.get('/fees', { params }),
  get:           (id)     => http.get(`/fees/${id}`),
  create:        (data)   => http.post('/fees', data),
  update:        (id, data) => http.patch(`/fees/${id}`, data),
  remove:        (id)     => http.delete(`/fees/${id}`),
  alertSummary:  ()       => http.get('/fees/alert-summary'),
  generatePlans: (patents) => http.post('/fees/generate-plans', { patents }),
}
