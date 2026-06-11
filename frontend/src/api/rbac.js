import http from './http'

export default {
  listRoles: () => http.get('/rbac/roles'),
  createRole: (data) => http.post('/rbac/roles', data),
  updateRole: (id, data) => http.patch(`/rbac/roles/${id}`, data),
  listPermissions: (params) => http.get('/rbac/permissions', { params }),
  createPermission: (data) => http.post('/rbac/permissions', data),
  getRolePermissions: (roleCode) => http.get(`/rbac/roles/${roleCode}/permissions`),
  assignPermissions: (roleCode, permissionCodes) => http.post(`/rbac/roles/${roleCode}/permissions`, { permissionCodes }),
}
