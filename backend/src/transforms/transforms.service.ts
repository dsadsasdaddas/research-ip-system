import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CreateTransformDto } from './dto/create-transform.dto';
import { UpdateTransformDto } from './dto/update-transform.dto';
import { Transform } from './entities/transform.entity';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { getDeptFilter } from '../common/utils/dept-filter';
import { escapeLike } from '../common/utils/escape-like';

@Injectable()
export class TransformsService {
  constructor(
    @InjectRepository(Transform)
    private readonly repo: Repository<Transform>,
  ) {}

  create(dto: CreateTransformDto, user: AuthUser) {
    return this.repo.save(this.repo.create({
      ...dto,
      deptId: user.deptId ?? null,
      createUser: user.username,
    }));
  }

  /** 列表;部门隔离 + LIKE 转义 */
  findAll(keyword?: string, user?: AuthUser) {
    const deptId = user ? getDeptFilter(user) : undefined;
    const where: Record<string, unknown> = {};
    if (deptId != null) where.deptId = deptId;
    if (keyword) where.partner = Like(`%${escapeLike(keyword)}%`);
    return this.repo.find({ where, order: { createTime: 'DESC' }, take: 500 });
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
