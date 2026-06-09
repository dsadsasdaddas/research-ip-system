/** 分页结果通用类型 */
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 列表查询基类 */
export interface BaseListQuery {
  keyword?: string;
  page?: number;
  pageSize?: number;
}
