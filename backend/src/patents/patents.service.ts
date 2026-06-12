import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePatentDto } from './dto/create-patent.dto';
import { UpdatePatentDto } from './dto/update-patent.dto';
import { Patent } from './entities/patent.entity';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { getDeptFilter } from '../common/utils/dept-filter';
import { getSecretLevels } from '../common/utils/secret-filter';
import { escapeLike } from '../common/utils/escape-like';
import { paginate, type PageResult } from '../common/utils/pagination';
import type { BaseListQuery } from '../common/types/index';

/** 专利业务逻辑:真正读写数据库的地方(套路和论文模块一致)。 */
@Injectable()
export class PatentsService {
  constructor(
    @InjectRepository(Patent)
    private readonly repo: Repository<Patent>,
  ) {}

  /** 新增 */
  create(dto: CreatePatentDto, user: AuthUser) {
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
    const qb = this.repo.createQueryBuilder('p');
    if (deptId != null) qb.andWhere('p.deptId = :deptId', { deptId });
    qb.andWhere('p.secretLevel IN (:...levels)', { levels: allowedLevels });
    if (query.keyword)
      qb.andWhere('p.name LIKE :kw', { kw: `%${escapeLike(query.keyword)}%` });
    return qb;
  }

  /** 列表(分页) */
  findAll(query: BaseListQuery, user?: AuthUser): Promise<PageResult<Patent>> {
    return paginate(
      this.listQuery(query, user).orderBy('p.createTime', 'DESC'),
      query.page,
      query.pageSize,
    );
  }

  /** 导出:与列表同样的过滤,但不分页、最多取 10000 行 */
  async exportResource(
    query: BaseListQuery,
    user?: AuthUser,
  ): Promise<Patent[]> {
    return this.listQuery(query, user)
      .orderBy('p.createTime', 'DESC')
      .take(10000)
      .getMany();
  }

  /** 查单条;不存在抛 404；检查密级权限 */
  async findOne(id: number, user?: AuthUser) {
    const patent = await this.repo.findOne({ where: { id } });
    if (!patent) {
      throw new NotFoundException(`专利 #${id} 不存在`);
    }
    if (user) {
      const allowedLevels = getSecretLevels(user);
      const deptId = getDeptFilter(user);
      if (
        !allowedLevels.includes(patent.secretLevel ?? '公开') ||
        (deptId != null && patent.deptId !== deptId)
      ) {
        throw new NotFoundException(`专利 #${id} 不存在`);
      }
    }
    return patent;
  }

  /** 更新 */
  async update(id: number, dto: UpdatePatentDto, user?: AuthUser) {
    const patent = await this.findOne(id, user);
    const {
      deptId: ignoredDeptId,
      createUser: ignoredCreateUser,
      ...safeDto
    } = dto;
    void ignoredDeptId;
    void ignoredCreateUser;
    Object.assign(patent, safeDto);
    return this.repo.save(patent);
  }

  /** 删除 */
  async remove(id: number, user?: AuthUser) {
    const patent = await this.findOne(id, user);
    await this.repo.remove(patent);
    return { deleted: true, id };
  }
}
