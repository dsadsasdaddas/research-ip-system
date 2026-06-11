import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { CreateCopyrightDto } from './dto/create-copyright.dto';
import { UpdateCopyrightDto } from './dto/update-copyright.dto';
import { Copyright } from './entities/copyright.entity';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { getDeptFilter } from '../common/utils/dept-filter';
import { getSecretLevels } from '../common/utils/secret-filter';
import { escapeLike } from '../common/utils/escape-like';

/** 软著业务逻辑(套路和论文/专利一致)。 */
@Injectable()
export class CopyrightsService {
  constructor(
    @InjectRepository(Copyright)
    private readonly repo: Repository<Copyright>,
  ) {}

  create(dto: CreateCopyrightDto, user: AuthUser) {
    return this.repo.save(this.repo.create({
      ...dto,
      deptId: user.deptId ?? null,
      createUser: user.username,
    }));
  }

  /** 列表;部门隔离 + 密级过滤 + LIKE 转义 */
  findAll(keyword?: string, user?: AuthUser) {
    const deptId = user ? getDeptFilter(user) : undefined;
    const allowedLevels = user ? getSecretLevels(user) : ['公开'];
    const where: Record<string, unknown> = {};
    if (deptId != null) where.deptId = deptId;
    if (keyword) where.name = Like(`%${escapeLike(keyword)}%`);
    where.secretLevel = In(allowedLevels);
    return this.repo.find({ where, order: { createTime: 'DESC' }, take: 500 });
  }

  async findOne(id: number, user?: AuthUser) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`软著 #${id} 不存在`);
    }
    if (user) {
      const allowedLevels = getSecretLevels(user);
      const deptId = getDeptFilter(user);
      if (!allowedLevels.includes(item.secretLevel ?? '公开') || (deptId != null && item.deptId !== deptId)) {
        throw new NotFoundException(`软著 #${id} 不存在`);
      }
    }
    return item;
  }

  async update(id: number, dto: UpdateCopyrightDto, user?: AuthUser) {
    const item = await this.findOne(id, user);
    const { deptId: ignoredDeptId, createUser: ignoredCreateUser, ...safeDto } = dto;
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
