import http from './http'

/**
 * 给定资源名(如 'papers' / 'patents' / 'copyrights'),
 * 生成一套标准的增删改查接口函数。三类成果共用,避免重复写。
 */
export function createCrudApi(resource) {
  return {
    list: (keyword) =>
      http.get(`/${resource}`, { params: keyword ? { keyword } : {} }),
    get: (id) => http.get(`/${resource}/${id}`),
    create: (data) => http.post(`/${resource}`, data),
    update: (id, data) => http.patch(`/${resource}/${id}`, data),
    remove: (id) => http.delete(`/${resource}/${id}`),
  }
}
