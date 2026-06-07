import http from './http'

export const searchApi = {
  search: (q, types = []) =>
    http.get('/search', { params: { q, types: types.join(',') } }),
}
