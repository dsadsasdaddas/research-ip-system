import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/** 通用分页结果 */
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 通用分页查询参数 */
export interface PageQuery {
  page?: number;
  pageSize?: number;
}

/**
 * 对任意 TypeORM QueryBuilder 应用分页，返回标准 PageResult。
 * 用法: const result = await paginate(qb, 1, 20);
 */
export async function paginate<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  page?: number,
  pageSize?: number,
): Promise<PageResult<T>> {
  const p = Math.max(1, page ?? 1);
  const ps = Math.min(500, Math.max(1, pageSize ?? 20));
  const [items, total] = await qb
    .skip((p - 1) * ps)
    .take(ps)
    .getManyAndCount();
  return {
    items,
    total,
    page: p,
    pageSize: ps,
    totalPages: Math.ceil(total / ps),
  };
}
