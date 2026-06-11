import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchLog } from './entities/search-log.entity';
import { paginate } from '../common/utils/pagination';

@Injectable()
export class SearchLogsService {
  constructor(@InjectRepository(SearchLog) private repo: Repository<SearchLog>) {}

  /** 插入一条搜索日志 */
  async log(entry: {
    keyword: string;
    types?: string | null;
    resultCount: number;
    elapsedMs?: number | null;
    engine?: string;
    userId?: number | null;
    username?: string | null;
    deptId?: number | null;
    ip?: string | null;
  }) {
    const entity = this.repo.create({
      keyword: entry.keyword,
      types: entry.types ?? null,
      resultCount: entry.resultCount,
      elapsedMs: entry.elapsedMs ?? null,
      engine: entry.engine ?? 'rust',
      userId: entry.userId ?? null,
      username: entry.username ?? null,
      deptId: entry.deptId ?? null,
      ip: entry.ip ?? null,
    });
    await this.repo.save(entity);
  }

  /** 分页查询搜索日志（管理员） */
  async findAll(query: { keyword?: string; page?: number; pageSize?: number }) {
    const { keyword, page, pageSize } = query;
    const qb = this.repo.createQueryBuilder('l').orderBy('l.create_time', 'DESC');

    if (keyword) {
      qb.andWhere('l.keyword LIKE :kw', { kw: `%${keyword}%` });
    }

    return paginate(qb, page, pageSize);
  }

  /** 聚合热门搜索关键词 */
  async findHotKeywords(limit: number) {
    return this.repo
      .createQueryBuilder('l')
      .select('l.keyword', 'keyword')
      .addSelect('COUNT(*)', 'count')
      .groupBy('l.keyword')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  /** 查询最近搜索记录，可按用户筛选 */
  async findRecent(limit: number, userId?: number) {
    const qb = this.repo
      .createQueryBuilder('l')
      .orderBy('l.create_time', 'DESC')
      .limit(limit);

    if (userId) {
      qb.andWhere('l.user_id = :userId', { userId });
    }

    return qb.getMany();
  }
}
