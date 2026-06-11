import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransformDistribution } from './entities/transform-distribution.entity';
import { CreateTransformDistributionDto } from './dto/create-transform-distribution.dto';
import { UpdateTransformDistributionDto } from './dto/update-transform-distribution.dto';

@Injectable()
export class TransformDistributionsService {
  private readonly logger = new Logger(TransformDistributionsService.name);

  constructor(
    @InjectRepository(TransformDistribution)
    private readonly repo: Repository<TransformDistribution>,
  ) {}

  /**
   * 创建分配记录。
   * 校验比例之和 ≤ 100，超过时仅打印警告，不阻止保存。
   */
  async create(
    transformId: number,
    dto: CreateTransformDistributionDto,
  ): Promise<TransformDistribution> {
    const ratioSum =
      (dto.innerRatio ?? 0) + (dto.teamRatio ?? 0) + (dto.personalRatio ?? 0);
    if (ratioSum > 100) {
      this.logger.warn(
        `分配比例之和 ${ratioSum}% 超过 100%，transformId=${transformId}`,
      );
    }

    const entity = this.repo.create({ ...dto, transformId });
    return this.repo.save(entity);
  }

  /** 查询某转化项目的全部分配记录，按记录时间倒序 */
  findByTransform(transformId: number): Promise<TransformDistribution[]> {
    return this.repo.find({
      where: { transformId },
      order: { recordTime: 'DESC' },
    });
  }

  async update(
    id: number,
    dto: UpdateTransformDistributionDto,
  ): Promise<TransformDistribution> {
    const entity = await this.repo.findOneBy({ id });
    if (!entity) throw new NotFoundException(`分配记录 #${id} 不存在`);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: number): Promise<{ deleted: boolean; id: number }> {
    const entity = await this.repo.findOneBy({ id });
    if (!entity) throw new NotFoundException(`分配记录 #${id} 不存在`);
    await this.repo.remove(entity);
    return { deleted: true, id };
  }
}
