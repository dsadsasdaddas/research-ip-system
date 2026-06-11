import http from './http'

export default {
  listFlows: (params) => http.get('/approvals/flows', { params }),
  getFlow: (id) => http.get(`/approvals/flows/${id}`),
  createFlow: (data) => http.post('/approvals/flows', data),
  updateFlow: (id, data) => http.patch(`/approvals/flows/${id}`, data),
  deleteFlow: (id) => http.delete(`/approvals/flows/${id}`),
  addNode: (flowId, data) => http.post(`/approvals/flows/${flowId}/nodes`, data),
  submit: (data) => http.post('/approvals/submit', data),
  myPending: (params) => http.get('/approvals/my-pending', { params }),
  mySubmitted: (params) => http.get('/approvals/my-submitted', { params }),
  getInstance: (id) => http.get(`/approvals/instances/${id}`),
  approve: (id, data) => http.post(`/approvals/instances/${id}/approve`, data),
  reject: (id, data) => http.post(`/approvals/instances/${id}/reject`, data),
  return: (id, data) => http.post(`/approvals/instances/${id}/return`, data),
  cancel: (id) => http.post(`/approvals/instances/${id}/cancel`),
}
