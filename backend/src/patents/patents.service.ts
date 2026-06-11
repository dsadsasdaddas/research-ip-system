import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { CreatePatentDto } from './dto/create-patent.dto';
import { UpdatePatentDto } from './dto/update-patent.dto';
import { Patent } from './entities/patent.entity';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { getDeptFilter } from '../common/utils/dept-filter';
import { getSecretLevels } from '../common/utils/secret-filter';
import { escapeLike } from '../common/utils/escape-like';

/** 专利业务逻辑:真正读写数据库的地方(套路和论文模块一致)。 */
@Injectable()
export class PatentsService {
  constructor(
    @InjectRepository(Patent)
    private readonly repo: Repository<Patent>,
  ) {}

  /** 新增 */
  create(dto: CreatePatentDto) {
    return this.repo.save(this.repo.create(dto));
  }

  /** 列表;传了 keyword 就按专利名称模糊搜；部门隔离 + 密级过滤 */
  findAll(keyword?: string, user?: AuthUser) {
    const deptId = user ? getDeptFilter(user) : undefined;
    const allowedLevels = user ? getSecretLevels(user) : ['公开'];
    const where: Record<string, unknown> = {};
    if (deptId != null) where.deptId = deptId;
    if (keyword) where.name = Like(`%${escapeLike(keyword)}%`);
    where.secretLevel = In(allowedLevels);
    return this.repo.find({ where, order: { createTime: 'DESC' }, take: 500 });
  }

  /** 查单条;不存在抛 404；检查密级权限 */
  async findOne(id: number, user?: AuthUser) {
    const patent = await this.repo.findOne({ where: { id } });
    if (!patent) {
      throw new NotFoundException(`专利 #${id} 不存在`);
    }
    if (user) {
      const allowedLevels = getSecretLevels(user);
      if (!allowedLevels.includes(patent.secretLevel ?? '公开')) {
        throw new NotFoundException(`专利 #${id} 不存在`);
      }
    }
    return patent;
  }

  /** 更新 */
  async update(id: number, dto: UpdatePatentDto) {
    const patent = await this.findOne(id);
    Object.assign(patent, dto);
    return this.repo.save(patent);
  }

  /** 删除 */
  async remove(id: number) {
    const patent = await this.findOne(id);
    await this.repo.remove(patent);
    return { deleted: true, id };
  }
}
