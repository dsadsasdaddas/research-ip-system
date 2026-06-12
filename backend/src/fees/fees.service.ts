import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fee } from './entities/fee.entity';
import { CreateFeeDto } from './dto/create-fee.dto';
import { UpdateFeeDto } from './dto/update-fee.dto';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { getDeptFilter } from '../common/utils/dept-filter';

export interface FeeWithAlert extends Fee {
  alertLevel: number;
}

export interface AlertSummary {
  normal: number;
  day30: number;
  day15: number;
  day7: number;
  overdue: number;
  total: number;
}

export interface FeeListQuery {
  keyword?: string;
  relationType?: string;
  payStatus?: string;
  alertLevel?: string;
  deptId?: number | null;
}

export interface PatentForPlan {
  id: number;
  name: string;
  nextFeeDate: string;
  feeAmount: number;
  deptId: number;
}

/** 预警等级：根据截止日与今天的天差 */
function calcAlertLevel(dueDateStr: string | null, payStatus: string): number {
  if (!dueDateStr || payStatus === 'paid' || payStatus === 'cancelled')
    return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return 4;
  if (diffDays <= 7) return 3;
  if (diffDays <= 15) return 2;
  if (diffDays <= 30) return 1;
  return 0;
}

function withAlert(fee: Fee): FeeWithAlert {
  return { ...fee, alertLevel: calcAlertLevel(fee.dueDate, fee.payStatus) };
}

@Injectable()
export class FeesService {
  constructor(@InjectRepository(Fee) private repo: Repository<Fee>) {}

  async create(dto: CreateFeeDto, user: AuthUser): Promise<FeeWithAlert> {
    const { deptId: ignoredDeptId, ...safeDto } = dto;
    void ignoredDeptId;
    const fee = this.repo.create({
      ...safeDto,
      payStatus: dto.payStatus ?? 'pending',
      createUser: user.username,
      deptId: user.deptId ?? null,
    });
    return withAlert(await this.repo.save(fee));
  }

  async findAll(query: FeeListQuery): Promise<FeeWithAlert[]> {
    const qb = this.repo.createQueryBuilder('f').orderBy('f.due_date', 'ASC');

    if (query.keyword)
      qb.andWhere('f.relation_name LIKE :kw', { kw: `%${query.keyword}%` });
    if (query.relationType)
      qb.andWhere('f.relation_type = :rt', { rt: query.relationType });
    if (query.payStatus)
      qb.andWhere('f.pay_status = :ps', { ps: query.payStatus });
    if (query.deptId != null)
      qb.andWhere('f.dept_id = :did', { did: query.deptId });

    const rows = await qb.getMany();
    const withAlerts = rows.map(withAlert);

    if (query.alertLevel !== undefined && query.alertLevel !== '') {
      const lvl = Number(query.alertLevel);
      return withAlerts.filter((r) => r.alertLevel === lvl);
    }
    return withAlerts;
  }

  async findOne(id: number): Promise<FeeWithAlert | null> {
    const fee = await this.repo.findOneBy({ id });
    return fee ? withAlert(fee) : null;
  }

  async update(id: number, dto: UpdateFeeDto): Promise<FeeWithAlert | null> {
    const { deptId: ignoredDeptId, ...safeDto } = dto;
    void ignoredDeptId;
    await this.repo.update(id, safeDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    await this.repo.delete(id);
    return { success: true };
  }

  async alertSummary(user: AuthUser): Promise<AlertSummary> {
    const deptId = getDeptFilter(user);
    const qb = this.repo
      .createQueryBuilder('f')
      .where("f.pay_status NOT IN ('paid','cancelled')");
    if (deptId != null) qb.andWhere('f.dept_id = :did', { did: deptId });
    const rows = await qb.getMany();
    const counts = [0, 0, 0, 0, 0];
    rows.forEach((r) => {
      counts[calcAlertLevel(r.dueDate, r.payStatus)]++;
    });
    return {
      normal: counts[0],
      day30: counts[1],
      day15: counts[2],
      day7: counts[3],
      overdue: counts[4],
      total: counts.reduce((a, b) => a + b, 0),
    };
  }

  async generatePlansFromPatents(
    patents: PatentForPlan[],
    user: AuthUser,
  ): Promise<{ generated: number }> {
    const userDeptId = getDeptFilter(user);
    let created = 0;
    for (const p of patents) {
      if (!p.nextFeeDate) continue;
      // 部门隔离：非全院用户只能为本部门专利生成缴费计划
      if (userDeptId != null && p.deptId !== userDeptId) continue;
      const exists = await this.repo.findOne({
        where: {
          relationType: 'patent',
          relationId: p.id,
          dueDate: p.nextFeeDate,
        },
      });
      if (exists) continue;
      const fee = this.repo.create({
        relationType: 'patent',
        relationId: p.id,
        relationName: p.name,
        feeType: '年费',
        amount: p.feeAmount,
        dueDate: p.nextFeeDate,
        payStatus: 'pending',
        deptId: p.deptId,
      });
      await this.repo.save(fee);
      created++;
    }
    return { generated: created };
  }
}
