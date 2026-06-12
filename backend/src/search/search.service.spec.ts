import { SearchService, SearchResult } from './search.service';
import { RustSearchAdapter } from './rust-search-adapter';
import type { SearchLogsService } from '../search-logs/search-logs.service';
import type { CacheService } from '../cache/cache.service';
import {
  mockRepository,
  mockQueryBuilder,
  mockAuthUser,
  MockObject,
} from '../testing/mocks';
import type { Repository } from 'typeorm';
import type { Paper } from '../papers/entities/paper.entity';
import type { Patent } from '../patents/entities/patent.entity';
import type { Copyright } from '../copyrights/entities/copyright.entity';
import { UserRole } from '../users/entities/user.entity';

type SearchLogsLike = { log: jest.Mock };
type CacheLike = { get: jest.Mock; set: jest.Mock };

function makeRust(overrides: Partial<{ search: jest.Mock }> = {}): MockObject {
  return {
    search:
      overrides.search ??
      jest.fn().mockImplementation((docs: unknown[]) =>
        (docs as Array<{ id: number; type: string; title: string }>).map(
          (d) => ({
            id: d.id,
            type: d.type,
            title: d.title,
            score: 1,
          }),
        ),
      ),
    index: jest.fn(),
    build: jest.fn(),
  };
}

describe('SearchService', () => {
  let paperRepo: ReturnType<typeof mockRepository>;
  let patentRepo: ReturnType<typeof mockRepository>;
  let copyrightRepo: ReturnType<typeof mockRepository>;
  let rustSearch: MockObject;
  let searchLogs: SearchLogsLike;
  let cache: CacheLike;

  function makeService(
    opts: { logs?: boolean; cache?: boolean } = {},
  ): SearchService {
    return new SearchService(
      paperRepo as unknown as Repository<Paper>,
      patentRepo as unknown as Repository<Patent>,
      copyrightRepo as unknown as Repository<Copyright>,
      rustSearch as unknown as RustSearchAdapter,
      (opts.logs ? searchLogs : undefined) as unknown as SearchLogsService,
      (opts.cache ? cache : undefined) as unknown as CacheService,
    );
  }

  beforeEach(() => {
    paperRepo = mockRepository();
    patentRepo = mockRepository();
    copyrightRepo = mockRepository();
    rustSearch = makeRust();
    searchLogs = { log: jest.fn().mockResolvedValue(undefined) };
    cache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };
  });

  // 给某 repo 配一个返回行集的 qb mock
  function stubQb(repo: ReturnType<typeof mockRepository>, rows: unknown[]) {
    const qb = mockQueryBuilder({ getMany: jest.fn().mockResolvedValue(rows) });
    repo.createQueryBuilder = jest.fn().mockReturnValue(qb);
    return qb;
  }

  describe('search 入口', () => {
    it('空关键词 → 立即返回空结果(不走检索/缓存/日志)', async () => {
      const svc = makeService({ logs: true, cache: true });
      const res = await svc.search('   ', [], mockAuthUser());
      expect(res).toEqual({
        engine: 'rust',
        elapsedMs: 0,
        total: 0,
        items: [],
      });
      expect(cache.get).not.toHaveBeenCalled();
      expect(rustSearch.search).not.toHaveBeenCalled();
      expect(searchLogs.log).not.toHaveBeenCalled();
    });

    it('缓存命中 → 直接返回缓存值,不再检索/写日志', async () => {
      stubQb(paperRepo, []);
      const cached: SearchResult = {
        engine: 'rust',
        elapsedMs: 9,
        total: 1,
        items: [
          {
            type: 'paper',
            typeLabel: '论文',
            id: 7,
            title: '缓存',
            meta: '',
            createTime: new Date(),
            score: 5,
          },
        ],
      };
      cache.get.mockResolvedValue(cached);
      const svc = makeService({ logs: true, cache: true });
      const res = await svc.search('量子', [], mockAuthUser());
      expect(res).toBe(cached);
      expect(rustSearch.search).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
      expect(searchLogs.log).not.toHaveBeenCalled();
    });

    it('缓存未命中 + 无 cache 注入 → 检索并返回,不写缓存', async () => {
      stubQb(paperRepo, [
        { id: 1, title: 't', authors: 'a', journal: 'j', publishYear: 2020 },
      ]);
      const svc = makeService(); // 无 cache 无 logs
      const res = await svc.search('量子', ['paper'], mockAuthUser());
      expect(res.engine).toBe('rust');
      expect(res.total).toBe(1);
      expect(res.items[0]).toMatchObject({
        id: 1,
        score: 1,
        typeLabel: '论文',
      });
    });

    it('缓存未命中 + 注入 cache → 检索后写缓存 + 写日志', async () => {
      stubQb(paperRepo, [{ id: 1, title: 't' }]);
      const svc = makeService({ logs: true, cache: true });
      const res = await svc.search('量子', ['paper'], mockAuthUser());
      expect(cache.set).toHaveBeenCalledWith(
        expect.stringContaining('search:'),
        res,
        60,
      );
      expect(searchLogs.log).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: '量子',
          types: 'paper',
          resultCount: 1,
          engine: 'rust',
          username: 'test',
        }),
      );
    });

    it('searchLogs.log 抛错 → 被 .catch 吞掉,不影响返回', async () => {
      stubQb(paperRepo, [{ id: 1, title: 't' }]);
      searchLogs.log.mockRejectedValue(new Error('log db down'));
      const svc = makeService({ logs: true, cache: true });
      await expect(
        svc.search('量子', ['paper'], mockAuthUser()),
      ).resolves.toMatchObject({ total: 1 });
    });

    it('cacheKey 不含 types → 用 "all" 占位 dept,levels 排序', async () => {
      stubQb(paperRepo, []);
      const svc = makeService({ cache: true });
      await svc.search('量子', [], mockAuthUser(UserRole.RESEARCHER, 5));
      // RESEARCHER 仅公开 → levels='公开';dept=5
      expect(cache.set).toHaveBeenCalledWith(
        'search:5:公开::量子',
        expect.any(Object),
        60,
      );
    });
  });

  describe('loadIndexedItems 类型过滤 + 部门/密级条件', () => {
    it('paper 类型 + 部门隔离角色 → 加 dept_id 条件', async () => {
      const qb = stubQb(paperRepo, [{ id: 1, title: 't' }]);
      const svc = makeService();
      await svc.search('量子', ['paper'], mockAuthUser(UserRole.RESEARCHER, 5));
      expect(qb.andWhere).toHaveBeenCalledWith('p.dept_id = :did', { did: 5 });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'p.secret_level IN (:...levels)',
        { levels: ['公开'] },
      );
      expect(patentRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('patent 类型 + 全院角色 → 不加 dept_id 条件', async () => {
      const qb = stubQb(patentRepo, [{ id: 2, name: 'n', applicationNo: 'x' }]);
      const svc = makeService();
      await svc.search('量子', ['patent'], mockAuthUser(UserRole.SYS_ADMIN));
      // 全院角色 getDeptFilter 返回 undefined → 不调 dept_id 条件
      const calls = qb.andWhere.mock.calls.map((c) => c[0]);
      expect(calls).not.toContain('p.dept_id = :did');
      expect(qb.andWhere).toHaveBeenCalledWith(
        'p.secret_level IN (:...levels)',
        expect.anything(),
      );
    });

    it('copyright 类型 → c 别名 + register_date', async () => {
      const qb = stubQb(copyrightRepo, [
        { id: 3, name: '软著', registrationNo: 'r' },
      ]);
      const svc = makeService();
      await svc.search('量子', ['copyright'], mockAuthUser(UserRole.SYS_ADMIN));
      expect(copyrightRepo.createQueryBuilder).toHaveBeenCalledWith('c');
      expect(qb.orderBy).toHaveBeenCalledWith('c.register_date', 'DESC');
    });

    it('types 为空 → 三种类型全部索引', async () => {
      stubQb(paperRepo, [{ id: 1, title: 't' }]);
      stubQb(patentRepo, [{ id: 2, name: 'n' }]);
      stubQb(copyrightRepo, [{ id: 3, name: 'c' }]);
      const svc = makeService();
      const res = await svc.search(
        '量子',
        [],
        mockAuthUser(UserRole.SYS_ADMIN),
      );
      expect(res.total).toBe(3);
    });

    it('limit 上限 10000', async () => {
      const qb = stubQb(paperRepo, []);
      const svc = makeService();
      await svc.search('量子', ['paper'], mockAuthUser(UserRole.SYS_ADMIN));
      expect(qb.limit).toHaveBeenCalledWith(10000);
    });
  });

  describe('结果映射 index* + meta', () => {
    it('paper meta 拼接 authors/journal/publishYear', async () => {
      stubQb(paperRepo, [
        { id: 1, title: 'T', authors: 'A', journal: 'J', publishYear: 2020 },
      ]);
      const svc = makeService();
      const res = await svc.search(
        'x',
        ['paper'],
        mockAuthUser(UserRole.SYS_ADMIN),
      );
      expect(res.items[0].meta).toBe('A · J · 2020');
      expect(res.items[0].typeLabel).toBe('论文');
    });

    it('paper meta 为空(各字段缺失)→ 空串', async () => {
      stubQb(paperRepo, [
        {
          id: 1,
          title: 'T',
          authors: null,
          journal: undefined,
          publishYear: 0,
        },
      ]);
      const svc = makeService();
      const res = await svc.search(
        'x',
        ['paper'],
        mockAuthUser(UserRole.SYS_ADMIN),
      );
      expect(res.items[0].meta).toBe('');
    });

    it('patent meta 拼接 patentType/legalStatus/applicationNo', async () => {
      stubQb(patentRepo, [
        {
          id: 2,
          name: 'N',
          patentType: '发明',
          legalStatus: '有效',
          applicationNo: 'APP1',
        },
      ]);
      const svc = makeService();
      const res = await svc.search(
        'x',
        ['patent'],
        mockAuthUser(UserRole.SYS_ADMIN),
      );
      expect(res.items[0].meta).toBe('发明 · 有效 · APP1');
      expect(res.items[0].typeLabel).toBe('专利');
    });

    it('copyright meta 拼接 copyrightOwner/registrationNo', async () => {
      stubQb(copyrightRepo, [
        { id: 3, name: 'S', copyrightOwner: 'O', registrationNo: 'R' },
      ]);
      const svc = makeService();
      const res = await svc.search(
        'x',
        ['copyright'],
        mockAuthUser(UserRole.SYS_ADMIN),
      );
      expect(res.items[0].meta).toBe('O · R');
      expect(res.items[0].typeLabel).toBe('软著');
    });
  });

  describe('hit → item 映射 + 分页 slice', () => {
    it('hit 在 byKey 找不到 → 过滤为 null(被丢弃)', async () => {
      stubQb(paperRepo, [{ id: 1, title: 'T' }]);
      // rust 返回一个不存在的 id
      rustSearch = makeRust({
        search: jest
          .fn()
          .mockReturnValue([{ id: 999, type: 'paper', title: 'x', score: 1 }]),
      });
      const svc = makeService();
      const res = await svc.search(
        'x',
        ['paper'],
        mockAuthUser(UserRole.SYS_ADMIN),
      );
      expect(res.total).toBe(0);
    });

    it('超过 50 条 → slice(0,50)', async () => {
      const rows = Array.from({ length: 60 }, (_, i) => ({
        id: i + 1,
        title: `t${i}`,
      }));
      stubQb(paperRepo, rows);
      const svc = makeService();
      const res = await svc.search(
        'x',
        ['paper'],
        mockAuthUser(UserRole.SYS_ADMIN),
      );
      expect(res.total).toBe(50);
      expect(res.items).toHaveLength(50);
      expect(res.items[0].score).toBe(1);
    });
  });
});
