import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTransformDto } from './dto/create-transform.dto';
import { UpdateTransformDto } from './dto/update-transform.dto';
import { Transform } from './entities/transform.entity';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { getDeptFilter } from '../common/utils/dept-filter';
import { escapeLike } from '../common/utils/escape-like';
import { paginate, type PageResult } from '../common/utils/pagination';
import type { BaseListQuery } from '../common/types/index';

@Injectable()
export class TransformsService {
  constructor(
    @InjectRepository(Transform)
    private readonly repo: Repository<Transform>,
  ) {}

  create(dto: CreateTransformDto, user: AuthUser) {
    return this.repo.save(
      this.repo.create({
        ...dto,
        deptId: user.deptId ?? null,
        createUser: user.username,
      }),
    );
  }

  /** 列表/导出共用的过滤条件(部门隔离 + keyword 按交易对方) */
  private listQuery(query: BaseListQuery, user?: AuthUser) {
    const deptId = user ? getDeptFilter(user) : undefined;
    const qb = this.repo.createQueryBuilder('t');
    if (deptId != null) qb.andWhere('t.deptId = :deptId', { deptId });
    if (query.keyword)
      qb.andWhere('t.partner LIKE :kw', {
        kw: `%${escapeLike(query.keyword)}%`,
      });
    return qb;
  }

  /** 列表(分页) */
  findAll(
    query: BaseListQuery,
    user?: AuthUser,
  ): Promise<PageResult<Transform>> {
    return paginate(
      this.listQuery(query, user).orderBy('t.createTime', 'DESC'),
      query.page,
      query.pageSize,
    );
  }

  /** 导出:与列表同样的过滤,但不分页、最多取 10000 行 */
  async exportResource(
    query: BaseListQuery,
    user?: AuthUser,
  ): Promise<Transform[]> {
    return this.listQuery(query, user)
      .orderBy('t.createTime', 'DESC')
      .take(10000)
      .getMany();
  }

  async findOne(id: number, user?: AuthUser) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`转化项目 #${id} 不存在`);
    const deptId = user ? getDeptFilter(user) : undefined;
    if (deptId != null && item.deptId !== deptId) {
      throw new NotFoundException(`转化项目 #${id} 不存在`);
    }
    return item;
  }

  async update(id: number, dto: UpdateTransformDto, user?: AuthUser) {
    const item = await this.findOne(id, user);
    const {
      deptId: ignoredDeptId,
      createUser: ignoredCreateUser,
      ...safeDto
    } = dto;
    void ignoredDeptId;
    void ignoredCreateUser;
    Object.assign(item, safeDto);
    return this.repo.save(item);
  }

  async remove(id: number, user?: AuthUser) {
    const item = await this.findOne(id, user);
    await this.repo.remove(item);
    return { deleted: true, id };
  }
}
