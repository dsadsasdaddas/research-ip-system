import http from './http'

export const dictionariesApi = {
  listTypes() {
    return http.get('/dictionaries/types')
  },
  getType(code) {
    return http.get(`/dictionaries/types/${code}`)
  },
  createType(data) {
    return http.post('/dictionaries/types', data)
  },
  updateType(id, data) {
    return http.patch(`/dictionaries/types/${id}`, data)
  },
  removeType(id) {
    return http.delete(`/dictionaries/types/${id}`)
  },
  listItems(params) {
    return http.get('/dictionaries/items', { params })
  },
  getItem(id) {
    return http.get(`/dictionaries/items/${id}`)
  },
  createItem(data) {
    return http.post('/dictionaries/items', data)
  },
  updateItem(id, data) {
    return http.patch(`/dictionaries/items/${id}`, data)
  },
  removeItem(id) {
    return http.delete(`/dictionaries/items/${id}`)
  },
}
