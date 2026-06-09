import http from './http'

export const attachmentsApi = {
  list:     (relationType, relationId) =>
    http.get('/attachments', { params: { relationType, relationId } }),

  upload:   (file, relationType, relationId, remark = '') => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('relationType', relationType)
    fd.append('relationId', String(relationId))
    fd.append('remark', remark)
    return http.post('/attachments/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  download: (id) => `${http.defaults.baseURL || '/api'}/attachments/${id}/download`,

  remove:   (id) => http.delete(`/attachments/${id}`),
}
