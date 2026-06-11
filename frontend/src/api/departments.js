import http from './http'

export const departmentsApi = {
  list(keyword) {
    return http.get('/departments', { params: keyword ? { keyword } : {} })
  },
  get(id) {
    return http.get(`/departments/${id}`)
  },
  create(data) {
    return http.post('/departments', data)
  },
  update(id, data) {
    return http.patch(`/departments/${id}`, data)
  },
  remove(id) {
    return http.delete(`/departments/${id}`)
  },
}
