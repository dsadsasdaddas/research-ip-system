import http from './http'

/**
 * 给定资源名(如 'papers' / 'patents' / 'copyrights'),
 * 生成一套标准的增删改查接口函数。三类成果共用,避免重复写。
 * list 接收 { keyword, page, pageSize },后端返回分页结构 { items, total, page, pageSize }。
 */
export function createCrudApi(resource) {
  return {
    list: (params = {}) => {
      const query = {}
      if (params.keyword) query.keyword = params.keyword
      if (params.page) query.page = params.page
      if (params.pageSize) query.pageSize = params.pageSize
      return http.get(`/${resource}`, { params: query })
    },
    get: (id) => http.get(`/${resource}/${id}`),
    create: (data) => http.post(`/${resource}`, data),
    update: (id, data) => http.patch(`/${resource}/${id}`, data),
    remove: (id) => http.delete(`/${resource}/${id}`),
  }
}
