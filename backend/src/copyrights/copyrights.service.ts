import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCopyrightDto } from './dto/create-copyright.dto';
import { UpdateCopyrightDto } from './dto/update-copyright.dto';
import { Copyright } from './entities/copyright.entity';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { getDeptFilter } from '../common/utils/dept-filter';
import { getSecretLevels } from '../common/utils/secret-filter';
import { escapeLike } from '../common/utils/escape-like';
import { paginate, type PageResult } from '../common/utils/pagination';
import type { BaseListQuery } from '../common/types/index';

/** 软著业务逻辑(套路和论文/专利一致)。 */
@Injectable()
export class CopyrightsService {
  constructor(
    @InjectRepository(Copyright)
    private readonly repo: Repository<Copyright>,
  ) {}

  create(dto: CreateCopyrightDto, user: AuthUser) {
    return this.repo.save(
      this.repo.create({
        ...dto,
        deptId: user.deptId ?? null,
        createUser: user.username,
      }),
    );
  }

  /** 列表/导出共用的过滤条件(部门隔离 + 密级 + keyword 按名称) */
  private listQuery(query: BaseListQuery, user?: AuthUser) {
    const deptId = user ? getDeptFilter(user) : undefined;
    const allowedLevels = user ? getSecretLevels(user) : ['公开'];
    const qb = this.repo.createQueryBuilder('c');
    if (deptId != null) qb.andWhere('c.deptId = :deptId', { deptId });
    qb.andWhere('c.secretLevel IN (:...levels)', { levels: allowedLevels });
    if (query.keyword)
      qb.andWhere('c.name LIKE :kw', { kw: `%${escapeLike(query.keyword)}%` });
    return qb;
  }

  /** 列表(分页) */
  findAll(
    query: BaseListQuery,
    user?: AuthUser,
  ): Promise<PageResult<Copyright>> {
    return paginate(
      this.listQuery(query, user).orderBy('c.createTime', 'DESC'),
      query.page,
      query.pageSize,
    );
  }

  /** 导出:与列表同样的过滤,但不分页、最多取 10000 行 */
  async exportResource(
    query: BaseListQuery,
    user?: AuthUser,
  ): Promise<Copyright[]> {
    return this.listQuery(query, user)
      .orderBy('c.createTime', 'DESC')
      .take(10000)
      .getMany();
  }

  async findOne(id: number, user?: AuthUser) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`软著 #${id} 不存在`);
    }
    if (user) {
      const allowedLevels = getSecretLevels(user);
      const deptId = getDeptFilter(user);
      if (
        !allowedLevels.includes(item.secretLevel ?? '公开') ||
        (deptId != null && item.deptId !== deptId)
      ) {
        throw new NotFoundException(`软著 #${id} 不存在`);
      }
    }
    return item;
  }

  async update(id: number, dto: UpdateCopyrightDto, user?: AuthUser) {
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
