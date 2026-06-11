import http from './http'

export default {
  list: (params) => http.get('/search-logs', { params }),
  hotKeywords: (limit = 10) => http.get('/search-logs/hot-keywords', { params: { limit } }),
}
