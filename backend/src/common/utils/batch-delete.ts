import { Repository } from 'typeorm';

/**
 * 通用批量软删除：将指定 ID 列表的 is_deleted 标记为 true。
 * 返回实际更新的行数。
 */
export async function batchSoftDelete(
  repo: Repository<any>,
  ids: number[],
): Promise<number> {
  if (!ids.length) return 0;
  const result = await repo.update(ids, { isDeleted: true });
  return result.affected ?? 0;
}

/**
 * 通用批量硬删除：直接删除指定 ID 列表的记录。
 * 返回实际删除的行数。
 */
export async function batchHardDelete(
  repo: Repository<any>,
  ids: number[],
): Promise<number> {
  if (!ids.length) return 0;
  const result = await repo.delete(ids);
  return result.affected ?? 0;
}
