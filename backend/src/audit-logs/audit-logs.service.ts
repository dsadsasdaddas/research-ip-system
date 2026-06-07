import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

@Injectable()
export class AuditLogsService {
  constructor(@InjectRepository(AuditLog) private repo: Repository<AuditLog>) {}

  async findAll(query: {
    keyword?: string;
    module?: string;
    action?: string;
    username?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { keyword, module, action, username, page = 1, pageSize = 50 } = query;
    const qb = this.repo.createQueryBuilder('l').orderBy('l.create_time', 'DESC');

    if (keyword)  qb.andWhere('(l.path LIKE :kw OR l.request_body LIKE :kw)', { kw: `%${keyword}%` });
    if (module)   qb.andWhere('l.module = :module', { module });
    if (action)   qb.andWhere('l.action = :action', { action });
    if (username) qb.andWhere('l.username LIKE :u', { u: `%${username}%` });

    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { items, total, page, pageSize };
  }
}
