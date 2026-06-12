import http from './http'

/**
 * 统计看板接口。
 * get 拉取全部聚合数据(totals / trend / typeDist / deptRank / patentStatus / transformAmounts / funnel)。
 */
export const statsApi = {
  get() {
    return http.get('/stats')
  },
}

export default statsApi
