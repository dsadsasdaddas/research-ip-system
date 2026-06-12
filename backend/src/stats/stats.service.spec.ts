import { StatsService } from './stats.service';
import type { CacheService } from '../cache/cache.service';
import { mockRepository } from '../testing/mocks';
import type { MockObject } from '../testing/mocks';
import type { Repository } from 'typeorm';
import type { Paper } from '../papers/entities/paper.entity';
import type { Patent } from '../patents/entities/patent.entity';
import type { Copyright } from '../copyrights/entities/copyright.entity';
import type { Transform } from '../transforms/entities/transform.entity';

const YEAR = new Date().getFullYear();
const YEAR_STR = String(YEAR);
const PREV_YEAR_STR = String(YEAR - 1);

/** 造一个会真正执行 loader 的 cache mock(模拟未命中回源)。 */
function cacheExecLoader(): MockObject {
  return {
    wrap: jest
      .fn()
      .mockImplementation(
        (_key: string, _ttl: number, loader: () => Promise<unknown>) =>
          loader(),
      ),
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    isEnabled: jest.fn().mockReturnValue(false),
  };
}

describe('StatsService', () => {
  let service: StatsService;
  let paperRepo: ReturnType<typeof mockRepository>;
  let patentRepo: ReturnType<typeof mockRepository>;
  let copyrightRepo: ReturnType<typeof mockRepository>;
  let transformRepo: ReturnType<typeof mockRepository>;
  let cache: MockObject;

  function build(): StatsService {
    return new StatsService(
      paperRepo as unknown as Repository<Paper>,
      patentRepo as unknown as Repository<Patent>,
      copyrightRepo as unknown as Repository<Copyright>,
      transformRepo as unknown as Repository<Transform>,
      cache as unknown as CacheService,
    );
  }

  beforeEach(() => {
    paperRepo = mockRepository();
    patentRepo = mockRepository();
    copyrightRepo = mockRepository();
    transformRepo = mockRepository();
    cache = cacheExecLoader();
    service = build();
  });

  describe('getAll (缓存层)', () => {
    it('未命中 → 执行 loader 并回源计算', async () => {
      paperRepo.find.mockResolvedValue([]);
      const res = await service.getAll();
      expect(cache.wrap).toHaveBeenCalledWith(
        'stats:getAll',
        60,
        expect.any(Function),
      );
      expect(res.totals).toEqual({
        papers: 0,
        patents: 0,
        copyrights: 0,
        transforms: 0,
      });
    });

    it('命中缓存 → 不执行 loader,直接返回缓存值', async () => {
      const cached = {
        totals: { papers: 99, patents: 0, copyrights: 0, transforms: 0 },
        cached: true,
      };
      cache.wrap = jest.fn().mockResolvedValue(cached);
      const res = await service.getAll();
      expect(res).toEqual(cached);
      expect(paperRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('computeAll (经 getAll 触发 loader)', () => {
    function seedAll() {
      paperRepo.find.mockResolvedValue([
        { publishYear: YEAR, deptId: 1 } as Paper,
        { publishYear: YEAR - 1, deptId: 2 } as Paper,
        { publishYear: null, deptId: 1 } as Paper, // publishYear 缺失 → 不计入趋势
        { publishYear: YEAR, deptId: null } as Paper, // deptId null → 未分配
      ]);
      patentRepo.find.mockResolvedValue([
        {
          legalStatus: '授权',
          deptId: 1,
          createTime: new Date(YEAR, 0, 1),
        } as Patent,
        {
          legalStatus: null,
          deptId: 2,
          createTime: new Date(YEAR - 1, 0, 1),
        } as Patent, // legalStatus 缺失 → 未知;createTime 用于趋势
        { legalStatus: '授权', deptId: null, createTime: null }, // createTime null → 不计入趋势
      ]);
      copyrightRepo.find.mockResolvedValue([
        { deptId: 1, createTime: new Date(YEAR, 0, 1) } as Copyright,
        { deptId: null, createTime: null }, // createTime null
      ]);
      transformRepo.find.mockResolvedValue([
        {
          contractAmount: 100,
          receivedAmount: 50,
          finishStatus: '完成',
          createTime: new Date(),
        } as Transform,
        {
          contractAmount: null,
          receivedAmount: null,
          finishStatus: '',
          createTime: new Date(),
        }, // 金额 null → 0;finishStatus 空 → 合同签订
      ]);
    }

    it('totals 统计正确', async () => {
      seedAll();
      const res = await service.getAll();
      expect(res.totals).toEqual({
        papers: 4,
        patents: 3,
        copyrights: 2,
        transforms: 2,
      });
    });

    it('typeDist 类型分布', async () => {
      seedAll();
      const res = await service.getAll();
      expect(res.typeDist).toEqual([
        { name: '论文', value: 4 },
        { name: '专利', value: 3 },
        { name: '软著', value: 2 },
      ]);
    });

    it('trend 年度趋势(最近 6 年数组,按年份计数;缺失年份填 0)', async () => {
      seedAll();
      const res = await service.getAll();
      // 趋势数组长度恒为 6
      expect(res.trend.years).toHaveLength(6);
      expect(res.trend.years[5]).toBe(YEAR_STR); // 最后一项是当前年
      // 论文:YEAR 2 篇(dept1 + 未分配),YEAR-1 1 篇,null 那篇被过滤
      const yi = res.trend.years.indexOf(YEAR_STR);
      const pi = res.trend.years.indexOf(PREV_YEAR_STR);
      expect(res.trend.papers[yi]).toBe(2);
      expect(res.trend.papers[pi]).toBe(1);
      // 专利:YEAR 1(授权),YEAR-1 1(legalStatus=null 的那条 createTime=YEAR-1);createTime=null 被过滤
      expect(res.trend.patents[yi]).toBe(1);
      expect(res.trend.patents[pi]).toBe(1);
      // 软著:YEAR 1,createTime=null 被过滤
      expect(res.trend.copyrights[yi]).toBe(1);
      // 全空数据的年份填 0
      const zeros = res.trend.papers.filter((n: number) => n === 0);
      expect(zeros.length).toBeGreaterThan(0);
    });

    it('deptRank 部门排行(按计数降序,top8;未分配归类)', async () => {
      seedAll();
      const res = await service.getAll();
      // 部门1: 论文2 + 专利1 + 软著1 = 4;部门2: 论文1 + 专利1 = 2;未分配: 论文1 + 专利1 + 软著1 = 3
      const map = Object.fromEntries(
        res.deptRank.map((d: { dept: string; count: number }) => [
          d.dept,
          d.count,
        ]),
      );
      expect(map['部门1']).toBe(4);
      expect(map['部门2']).toBe(2);
      expect(map['未分配']).toBe(3);
      // 降序
      const counts = res.deptRank.map((d: { count: number }) => d.count);
      const sorted = [...counts].sort((a, b) => b - a);
      expect(counts).toEqual(sorted);
    });

    it('patentStatus 专利法律状态(legalStatus 缺失归"未知")', async () => {
      seedAll();
      const res = await service.getAll();
      const map = Object.fromEntries(
        res.patentStatus.map((s: { status: string; count: number }) => [
          s.status,
          s.count,
        ]),
      );
      expect(map['授权']).toBe(2);
      expect(map['未知']).toBe(1);
    });

    it('transformAmounts 合同 vs 到账金额(null 按 0)', async () => {
      seedAll();
      const res = await service.getAll();
      expect(res.transformAmounts).toEqual({ contract: 100, received: 50 });
    });

    it('funnel 转化漏斗(finishStatus 缺失归"合同签订";4 个固定阶段)', async () => {
      seedAll();
      const res = await service.getAll();
      expect(res.funnel.map((f: { stage: string }) => f.stage)).toEqual([
        '合同签订',
        '收款',
        '开票',
        '完成',
      ]);
      const map = Object.fromEntries(
        res.funnel.map((f: { stage: string; count: number }) => [
          f.stage,
          f.count,
        ]),
      );
      expect(map['完成']).toBe(1);
      expect(map['合同签订']).toBe(1); // finishStatus='' 的那条归到合同签订
      expect(map['收款']).toBe(0); // 无数据阶段填 0
    });

    it('全部仓库为空 → 所有计数为 0,数组结构完整', async () => {
      // repos 默认返回 []
      const res = await service.getAll();
      expect(res.totals).toEqual({
        papers: 0,
        patents: 0,
        copyrights: 0,
        transforms: 0,
      });
      expect(res.deptRank).toEqual([]);
      expect(res.patentStatus).toEqual([]);
      expect(res.transformAmounts).toEqual({ contract: 0, received: 0 });
      expect(res.funnel).toEqual([
        { stage: '合同签订', count: 0 },
        { stage: '收款', count: 0 },
        { stage: '开票', count: 0 },
        { stage: '完成', count: 0 },
      ]);
      expect(res.trend.papers.every((n: number) => n === 0)).toBe(true);
    });
  });
});
