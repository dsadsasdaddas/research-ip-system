import { AuditChangeSubscriber } from './audit-change.subscriber';
import { mockRepository, mockQueryBuilder } from '../../testing/mocks';
import type { UpdateEvent, RemoveEvent } from 'typeorm';

type AnyEvent = {
  metadata?: { name?: string };
  databaseEntity?: Record<string, unknown> | null;
  entity?: Record<string, unknown> | null;
  manager: { getRepository: jest.Mock };
};

function makeManager(
  repo: ReturnType<typeof mockRepository> = mockRepository(),
) {
  return { getRepository: jest.fn().mockReturnValue(repo) };
}

describe('AuditChangeSubscriber', () => {
  let sub: AuditChangeSubscriber;

  beforeEach(() => {
    sub = new AuditChangeSubscriber();
  });

  it('listenTo 返回 Object(监听所有实体)', () => {
    expect(sub.listenTo()).toBe(Object);
  });

  describe('afterUpdate', () => {
    it('监听实体(数字 id)写入 update 日志', () => {
      const repo = mockRepository();
      const event: AnyEvent = {
        metadata: { name: 'Paper' },
        databaseEntity: { id: 5, title: 'old' },
        entity: { id: 5, title: 'new' },
        manager: makeManager(repo),
      };
      sub.afterUpdate(event as unknown as UpdateEvent<Record<string, unknown>>);
      expect(repo.createQueryBuilder).toHaveBeenCalled();
    });

    it('非监听实体直接返回,不写日志', () => {
      const repo = mockRepository();
      const event: AnyEvent = {
        metadata: { name: 'User' },
        databaseEntity: { id: 1 },
        entity: { id: 1 },
        manager: makeManager(repo),
      };
      sub.afterUpdate(event as unknown as UpdateEvent<Record<string, unknown>>);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('metadata 缺失时直接返回', () => {
      const repo = mockRepository();
      const event: AnyEvent = {
        databaseEntity: { id: 1 },
        entity: { id: 1 },
        manager: makeManager(repo),
      };
      sub.afterUpdate(event as unknown as UpdateEvent<Record<string, unknown>>);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('数字字符串 id 也被识别', () => {
      const repo = mockRepository();
      const event: AnyEvent = {
        metadata: { name: 'Patent' },
        databaseEntity: { id: '42' },
        entity: { id: '42' },
        manager: makeManager(repo),
      };
      sub.afterUpdate(event as unknown as UpdateEvent<Record<string, unknown>>);
      expect(repo.createQueryBuilder).toHaveBeenCalled();
    });

    it('非数字 id 返回不写日志', () => {
      const repo = mockRepository();
      const event: AnyEvent = {
        metadata: { name: 'Copyright' },
        databaseEntity: { id: 'abc' },
        entity: { id: 'abc' },
        manager: makeManager(repo),
      };
      sub.afterUpdate(event as unknown as UpdateEvent<Record<string, unknown>>);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('databaseEntity 缺失时回退 entity 取 id', () => {
      const repo = mockRepository();
      const event: AnyEvent = {
        metadata: { name: 'Transform' },
        databaseEntity: null,
        entity: { id: 9 },
        manager: makeManager(repo),
      };
      sub.afterUpdate(event as unknown as UpdateEvent<Record<string, unknown>>);
      expect(repo.createQueryBuilder).toHaveBeenCalled();
    });

    it('databaseEntity 与 entity 均空时 idOf 走非对象分支并返回', () => {
      const repo = mockRepository();
      const event: AnyEvent = {
        metadata: { name: 'Paper' },
        databaseEntity: null,
        entity: null,
        manager: makeManager(repo),
      };
      sub.afterUpdate(event as unknown as UpdateEvent<Record<string, unknown>>);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('serialize 处理 Date/Buffer/函数', () => {
      const repo = mockRepository();
      const event: AnyEvent = {
        metadata: { name: 'Paper' },
        databaseEntity: {
          id: 1,
          d: new Date('2024-01-01T00:00:00Z'),
          b: Buffer.from('x'),
          fn: () => 1,
          k: 'v',
        },
        entity: {
          id: 1,
          d: new Date('2024-01-01T00:00:00Z'),
          b: Buffer.from('y'),
          k: 'v2',
        },
        manager: makeManager(repo),
      };
      sub.afterUpdate(event as unknown as UpdateEvent<Record<string, unknown>>);
      expect(repo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('afterRemove', () => {
    it('监听实体写入 delete 日志(newValue=null)', () => {
      const repo = mockRepository();
      const event: AnyEvent = {
        metadata: { name: 'Patent' },
        databaseEntity: { id: 7, name: 'p' },
        entity: null,
        manager: makeManager(repo),
      };
      sub.afterRemove(event as unknown as RemoveEvent<Record<string, unknown>>);
      expect(repo.createQueryBuilder).toHaveBeenCalled();
    });

    it('非监听实体不写日志', () => {
      const repo = mockRepository();
      const event: AnyEvent = {
        metadata: { name: 'SomethingElse' },
        databaseEntity: { id: 7 },
        entity: null,
        manager: makeManager(repo),
      };
      sub.afterRemove(event as unknown as RemoveEvent<Record<string, unknown>>);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('databaseEntity 缺失时回退 entity 取 id', () => {
      const repo = mockRepository();
      const event: AnyEvent = {
        metadata: { name: 'Patent' },
        databaseEntity: null,
        entity: { id: 11 },
        manager: makeManager(repo),
      };
      sub.afterRemove(event as unknown as RemoveEvent<Record<string, unknown>>);
      expect(repo.createQueryBuilder).toHaveBeenCalled();
    });

    it('非数字 id 返回不写日志', () => {
      const repo = mockRepository();
      const event: AnyEvent = {
        metadata: { name: 'Copyright' },
        databaseEntity: { id: 'abc' },
        entity: null,
        manager: makeManager(repo),
      };
      sub.afterRemove(event as unknown as RemoveEvent<Record<string, unknown>>);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('writeLog 失败容错', () => {
    it('insert 失败时仅记日志,不影响主流程', async () => {
      const failingQb = mockQueryBuilder({
        execute: jest.fn().mockRejectedValue(new Error('insert boom')),
      });
      const repo = mockRepository({
        createQueryBuilder: jest.fn().mockReturnValue(failingQb),
      });
      const spy = jest
        .spyOn(sub['logger'], 'error')
        .mockImplementation(() => undefined);
      const event: AnyEvent = {
        metadata: { name: 'Paper' },
        databaseEntity: { id: 5, title: 'old' },
        entity: { id: 5, title: 'new' },
        manager: makeManager(repo),
      };
      expect(() =>
        sub.afterUpdate(
          event as unknown as UpdateEvent<Record<string, unknown>>,
        ),
      ).not.toThrow();
      // writeLog 是 async 且被 void 调用,flush 微任务让 catch 内的 logger.error 落地
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('insert 失败为非 Error 时走 String(err) 分支', async () => {
      const failingQb = mockQueryBuilder({
        execute: jest.fn().mockRejectedValue('plain string err'),
      });
      const repo = mockRepository({
        createQueryBuilder: jest.fn().mockReturnValue(failingQb),
      });
      const spy = jest
        .spyOn(sub['logger'], 'error')
        .mockImplementation(() => undefined);
      const event: AnyEvent = {
        metadata: { name: 'Paper' },
        databaseEntity: { id: 5 },
        entity: { id: 5 },
        manager: makeManager(repo),
      };
      sub.afterUpdate(event as unknown as UpdateEvent<Record<string, unknown>>);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
