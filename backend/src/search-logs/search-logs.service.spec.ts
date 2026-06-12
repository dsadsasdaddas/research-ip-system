import { SearchLogsService } from './search-logs.service';
import { mockRepository, mockQueryBuilder } from '../testing/mocks';
import type { Repository } from 'typeorm';
import type { SearchLog } from './entities/search-log.entity';

describe('SearchLogsService', () => {
  let service: SearchLogsService;
  let repo: ReturnType<typeof mockRepository>;

  beforeEach(() => {
    repo = mockRepository();
    service = new SearchLogsService(repo as unknown as Repository<SearchLog>);
  });

  describe('log', () => {
    it('完整字段 → create 注入所有字段并保存', async () => {
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.log({
        keyword: 'kw',
        types: 'paper,patent',
        resultCount: 5,
        elapsedMs: 12.5,
        engine: 'tantivy',
        userId: 7,
        username: 'alice',
        deptId: 3,
        ip: '10.0.0.1',
      });
      expect(repo.create).toHaveBeenCalledWith({
        keyword: 'kw',
        types: 'paper,patent',
        resultCount: 5,
        elapsedMs: 12.5,
        engine: 'tantivy',
        userId: 7,
        username: 'alice',
        deptId: 3,
        ip: '10.0.0.1',
      });
      expect(repo.save).toHaveBeenCalled();
    });

    it('仅必填字段 → 其余走默认值(types/elapsedMs/userId/username/deptId/ip = null, engine = rust)', async () => {
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.log({ keyword: 'kw', resultCount: 0 });
      expect(repo.create).toHaveBeenCalledWith({
        keyword: 'kw',
        types: null,
        resultCount: 0,
        elapsedMs: null,
        engine: 'rust',
        userId: null,
        username: null,
        deptId: null,
        ip: null,
      });
      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    function withQb(terminal: Record<string, jest.Mock>) {
      const qb = mockQueryBuilder(terminal);
      repo = mockRepository({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });
      service = new SearchLogsService(repo as unknown as Repository<SearchLog>);
      return qb;
    }

    it('有 keyword → 加 LIKE 条件', async () => {
      const qb = withQb({
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1]),
      });
      const res = await service.findAll({
        keyword: 'kw',
        page: 1,
        pageSize: 10,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('l.keyword LIKE :kw', {
        kw: '%kw%',
      });
      expect(qb.orderBy).toHaveBeenCalledWith('l.create_time', 'DESC');
      expect(res.items).toEqual([{ id: 1 }]);
      expect(res.total).toBe(1);
    });

    it('无 keyword → 不加 LIKE 条件', async () => {
      const qb = withQb({
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });
      await service.findAll({ keyword: undefined, page: 2, pageSize: 20 });
      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('findHotKeywords', () => {
    it('聚合查询 + limit', async () => {
      const qb = mockQueryBuilder({
        getRawMany: jest.fn().mockResolvedValue([{ keyword: 'kw', count: 3 }]),
      });
      repo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      const res = await service.findHotKeywords(5);
      expect(repo.createQueryBuilder).toHaveBeenCalledWith('l');
      expect(qb.select).toHaveBeenCalledWith('l.keyword', 'keyword');
      expect(qb.addSelect).toHaveBeenCalledWith('COUNT(*)', 'count');
      expect(qb.groupBy).toHaveBeenCalledWith('l.keyword');
      expect(qb.orderBy).toHaveBeenCalledWith('count', 'DESC');
      expect(qb.limit).toHaveBeenCalledWith(5);
      expect(res).toEqual([{ keyword: 'kw', count: 3 }]);
    });
  });

  describe('findRecent', () => {
    it('无 userId → 不加用户条件', async () => {
      const qb = mockQueryBuilder({
        getMany: jest.fn().mockResolvedValue([{ id: 1 }]),
      });
      repo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      const res = await service.findRecent(10, undefined);
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.limit).toHaveBeenCalledWith(10);
      expect(qb.orderBy).toHaveBeenCalledWith('l.create_time', 'DESC');
      expect(res).toEqual([{ id: 1 }]);
    });

    it('有 userId → 加 user_id 条件', async () => {
      const qb = mockQueryBuilder({ getMany: jest.fn().mockResolvedValue([]) });
      repo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      await service.findRecent(20, 7);
      expect(qb.andWhere).toHaveBeenCalledWith('l.user_id = :userId', {
        userId: 7,
      });
    });
  });
});
