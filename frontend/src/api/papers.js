import http from './http'

// 论文模块的接口封装:页面只管调这些函数,不用关心 URL 细节。
export const listPapers = (keyword) =>
  http.get('/papers', { params: keyword ? { keyword } : {} })

export const getPaper = (id) => http.get(`/papers/${id}`)

export const createPaper = (data) => http.post('/papers', data)

export const updatePaper = (id, data) => http.patch(`/papers/${id}`, data)

export const deletePaper = (id) => http.delete(`/papers/${id}`)
