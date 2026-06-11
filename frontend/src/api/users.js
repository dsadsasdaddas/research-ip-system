import http from './http'

export const usersApi = {
  list() {
    return http.get('/users')
  },
  get(id) {
    return http.get(`/users/${id}`)
  },
  create(data) {
    return http.post('/users', data)
  },
  update(id, data) {
    return http.patch(`/users/${id}`, data)
  },
  remove(id) {
    return http.delete(`/users/${id}`)
  },
}
