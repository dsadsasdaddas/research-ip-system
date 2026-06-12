import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { SecretAccessGrant } from './entities/secret-access-grant.entity';
import { SecretAccessLog } from './entities/secret-access-log.entity';
import { CreateSecretAccessGrantDto } from './dto/create-secret-access-grant.dto';
import { LogSecretAccessDto } from './dto/log-secret-access.dto';
import type { AuthUser } from '../auth/types/auth-user.interface';

@Injectable()
export class SecretAccessService {
  constructor(
    @InjectRepository(SecretAccessGrant)
    private grantRepo: Repository<SecretAccessGrant>,
    @InjectRepository(SecretAccessLog)
    private logRepo: Repository<SecretAccessLog>,
  ) {}

  /** 创建涉密访问授权 */
  async grantAccess(
    dto: CreateSecretAccessGrantDto,
    grantedBy: AuthUser,
  ): Promise<SecretAccessGrant> {
    const entity = this.grantRepo.create({
      ...dto,
      startTime: dto.startTime ? new Date(dto.startTime) : null,
      endTime: dto.endTime ? new Date(dto.endTime) : null,
      grantedBy: grantedBy.id,
      grantedByName: grantedBy.username,
    });
    return this.grantRepo.save(entity);
  }

  /** 撤销授权 */
  async revokeAccess(id: number): Promise<SecretAccessGrant> {
    const grant = await this.grantRepo.findOneBy({ id });
    if (!grant) throw new NotFoundException(`授权 #${id} 不存在`);
    grant.isActive = false;
    return this.grantRepo.save(grant);
  }

  /** 查询授权列表 */
  async findGrants(
    businessType?: string,
    businessId?: number,
  ): Promise<SecretAccessGrant[]> {
    const where: Record<string, unknown> = {};
    if (businessType) where.businessType = businessType;
    if (businessId !== undefined && !Number.isNaN(businessId))
      where.businessId = businessId;
    return this.grantRepo.find({ where, order: { createTime: 'DESC' } });
  }

  /** 检查用户是否有权限访问 */
  async checkAccess(
    businessType: string,
    businessId: number,
    userId: number,
    action: string,
  ): Promise<boolean> {
    const now = new Date();
    const grants = await this.grantRepo.find({
      where: {
        businessType,
        businessId,
        grantUserId: userId,
        isActive: true,
      },
    });

    return grants.some((g) => {
      // 检查时间范围
      if (g.startTime && new Date(g.startTime) > now) return false;
      if (g.endTime && new Date(g.endTime) < now) return false;
      // 检查权限范围
      if (g.grantScope === 'manage') return true;
      if (
        g.grantScope === 'download' &&
        (action === 'download' || action === 'view' || action === 'preview')
      )
        return true;
      if (
        g.grantScope === 'read' &&
        (action === 'view' || action === 'preview')
      )
        return true;
      return false;
    });
  }

  /** 记录涉密访问日志 */
  async logAccess(dto: LogSecretAccessDto): Promise<SecretAccessLog> {
    const entity = this.logRepo.create(dto);
    return this.logRepo.save(entity);
  }
}
