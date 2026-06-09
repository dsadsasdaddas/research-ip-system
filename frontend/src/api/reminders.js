import http from './http'

export const remindersApi = {
  // 任务
  listTasks:       (p) => http.get('/reminders/tasks', { params: p }),
  createTask:      (d) => http.post('/reminders/tasks', d),
  updateTask:      (id, d) => http.patch(`/reminders/tasks/${id}`, d),
  deleteTask:      (id) => http.delete(`/reminders/tasks/${id}`),
  confirmTask:     (id) => http.post(`/reminders/tasks/${id}/confirm`),
  checkSecond:     () => http.post('/reminders/tasks/check-second-remind'),
  summary:         () => http.get('/reminders/tasks/summary'),
  // 规则
  listRules:  () => http.get('/reminders/rules'),
  createRule: (d) => http.post('/reminders/rules', d),
  updateRule: (id, d) => http.patch(`/reminders/rules/${id}`, d),
  deleteRule: (id) => http.delete(`/reminders/rules/${id}`),
}
