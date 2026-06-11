import http from './http'

export default {
  list: (params) => http.get('/notifications', { params }),
  unreadCount: () => http.get('/notifications/unread-count'),
  markRead: (id) => http.patch(`/notifications/${id}/read`),
  markAllRead: () => http.post('/notifications/mark-all-read'),
}
