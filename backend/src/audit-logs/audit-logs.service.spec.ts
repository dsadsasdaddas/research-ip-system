import { AuditLogsService } from './audit-logs.service';
import { mockRepository, mockQueryBuilder } from '../testing/mocks';
import type { Repository } from 'typeorm';
import type { AuditLog } from './audit-log.entity';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let repo: ReturnType<typeof mockRepository>;

  function withQb(terminal: Record<string, jest.Mock>) {
    const qb = mockQueryBuilder(terminal);
    repo = mockRepository({
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    });
    service = new AuditLogsService(repo as unknown as Repository<AuditLog>);
    return qb;
  }

  describe('findAll', () => {
    it('无任何过滤 → 仅 orderBy,不加 andWhere', async () => {
      const qb = withQb({
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1]),
      });
      const out = await service.findAll({ page: 1, pageSize: 50 });
      expect(qb.orderBy).toHaveBeenCalledWith('l.create_time', 'DESC');
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(out).toEqual({
        items: [{ id: 1 }],
        total: 1,
        page: 1,
        pageSize: 50,
      });
    });

    it('所有过滤条件全给 → 加 4 个 andWhere', async () => {
      const qb = withQb({
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });
      await service.findAll({
        keyword: 'kw',
        module: 'papers',
        action: 'create',
        username: 'bob',
      });
      expect(qb.andWhere).toHaveBeenCalledTimes(4);
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(l.path LIKE :kw OR l.request_body LIKE :kw)',
        { kw: '%kw%' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('l.module = :module', {
        module: 'papers',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('l.action = :action', {
        action: 'create',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('l.username LIKE :u', {
        u: '%bob%',
      });
    });

    it('部分过滤:仅 keyword + username', async () => {
      const qb = withQb({
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });
      await service.findAll({ keyword: 'kw', username: 'bob' });
      expect(qb.andWhere).toHaveBeenCalledTimes(2);
    });

    it('默认 page=1/pageSize=50', async () => {
      const qb = withQb({
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });
      const out = await service.findAll({});
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(50);
      expect(out.page).toBe(1);
      expect(out.pageSize).toBe(50);
    });

    it('自定义 page/pageSize → skip/take 计算', async () => {
      const qb = withQb({
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });
      const out = await service.findAll({ page: 3, pageSize: 20 });
      expect(qb.skip).toHaveBeenCalledWith(40);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(out).toEqual({ items: [], total: 0, page: 3, pageSize: 20 });
    });
  });
});
