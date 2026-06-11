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

  create(dto: CreateCopyrightDto) {
    return this.repo.save(this.repo.create(dto));
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
      if (!allowedLevels.includes(item.secretLevel ?? '公开')) {
        throw new NotFoundException(`软著 #${id} 不存在`);
      }
    }
    return item;
  }

  async update(id: number, dto: UpdateCopyrightDto) {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    await this.repo.remove(item);
    return { deleted: true, id };
  }
}
