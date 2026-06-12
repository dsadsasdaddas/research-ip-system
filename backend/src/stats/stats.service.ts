import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Paper } from '../papers/entities/paper.entity';
import { Patent } from '../patents/entities/patent.entity';
import { Copyright } from '../copyrights/entities/copyright.entity';
import { Transform } from '../transforms/entities/transform.entity';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Paper) private paperRepo: Repository<Paper>,
    @InjectRepository(Patent) private patentRepo: Repository<Patent>,
    @InjectRepository(Copyright) private copyrightRepo: Repository<Copyright>,
    @InjectRepository(Transform) private transformRepo: Repository<Transform>,
    private readonly cache: CacheService,
  ) {}

  async getAll() {
    // 看板数据更新频率低,缓存 60s(未启用 Redis 时透传,直接回源)
    return this.cache.wrap('stats:getAll', 60, () => this.computeAll());
  }

  private async computeAll() {
    const [papers, patents, copyrights, transforms] = await Promise.all([
      this.paperRepo.find({ select: { publishYear: true, deptId: true } }),
      this.patentRepo.find({
        select: { legalStatus: true, deptId: true, createTime: true },
      }),
      this.copyrightRepo.find({ select: { deptId: true, createTime: true } }),
      this.transformRepo.find({
        select: {
          contractAmount: true,
          receivedAmount: true,
          finishStatus: true,
          createTime: true,
        },
      }),
    ]);

    // ---- 1. 统计卡 ----
    const totals = {
      papers: papers.length,
      patents: patents.length,
      copyrights: copyrights.length,
      transforms: transforms.length,
    };

    // ---- 2. 年度趋势(折线图) ----
    // 论文用 publishYear；专利/软著用 createTime 年份
    const yearRange = this.buildYearRange();
    const trend = {
      years: yearRange,
      papers: this.countByYear(
        papers
          .map((p) => p.publishYear?.toString())
          .filter(Boolean) as string[],
        yearRange,
      ),
      patents: this.countByYear(
        patents
          .map((p) => p.createTime?.getFullYear().toString())
          .filter(Boolean),
        yearRange,
      ),
      copyrights: this.countByYear(
        copyrights
          .map((c) => c.createTime?.getFullYear().toString())
          .filter(Boolean),
        yearRange,
      ),
    };

    // ---- 3. 成果类型分布(饼图) ----
    const typeDist = [
      { name: '论文', value: papers.length },
      { name: '专利', value: patents.length },
      { name: '软著', value: copyrights.length },
    ];

    // ---- 4. 部门排行(柱状图) —— 三张表合并，按 dept_id group ----
    const deptMap: Record<string, number> = {};
    [...papers, ...patents, ...copyrights].forEach(
      (r: { deptId: number | null }) => {
        const k = r.deptId ? `部门${r.deptId}` : '未分配';
        deptMap[k] = (deptMap[k] || 0) + 1;
      },
    );
    const deptRank = Object.entries(deptMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([dept, count]) => ({ dept, count }));

    // ---- 5. 专利法律状态(柱状图) ----
    const statusMap: Record<string, number> = {};
    patents.forEach((p) => {
      const k = p.legalStatus || '未知';
      statusMap[k] = (statusMap[k] || 0) + 1;
    });
    const patentStatus = Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
    }));

    // ---- 6. 转化合同金额 vs 到账金额(柱状图) ----
    const transformAmounts = {
      contract: transforms.reduce(
        (s, t) => s + Number(t.contractAmount || 0),
        0,
      ),
      received: transforms.reduce(
        (s, t) => s + Number(t.receivedAmount || 0),
        0,
      ),
    };

    // ---- 7. 转化漏斗 ----
    const funnelOrder = ['合同签订', '收款', '开票', '完成'];
    const funnelMap: Record<string, number> = {};
    transforms.forEach((t) => {
      const k = t.finishStatus || '合同签订';
      funnelMap[k] = (funnelMap[k] || 0) + 1;
    });
    // 漏斗：累计到达该节点及之后的数量（节点越靠后越少）
    const funnel = funnelOrder.map((stage) => ({
      stage,
      count: funnelMap[stage] || 0,
    }));

    return {
      totals,
      trend,
      typeDist,
      deptRank,
      patentStatus,
      transformAmounts,
      funnel,
    };
  }

  // 最近6年
  private buildYearRange(): string[] {
    const cur = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => String(cur - 5 + i));
  }

  private countByYear(years: string[], range: string[]): number[] {
    return range.map((y) => years.filter((v) => v === y).length);
  }
}
