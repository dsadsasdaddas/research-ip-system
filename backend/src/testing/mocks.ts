import type { ObjectLiteral } from 'typeorm';
import type { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { UserRole } from '../users/entities/user.entity';
import type { AuthUser } from '../auth/types/auth-user.interface';

/**
 * 单测用 mock 工厂集合。所有资源/服务单测复用,避免每个 spec 各自手搓 TypeORM mock。
 * 设计要点:
 *  - QueryBuilder 是「链式」mock:链方法返回自身,终止方法(getMany 等)可配置返回值;
 *  - Repository 的 createQueryBuilder 每次返回一个全新 qb,避免用例间状态串味;
 *  - 不使用 any 作参数类型(遵循项目约束);返回用索引签名类型,在 spec 里按需 as 具体类型。
 */

/** 任意 mock 对象:方法名 → jest.Mock。带字符串索引签名,便于 as Repository<T> 等。 */
export type MockObject = { [method: string]: jest.Mock };

// ──────────────────────────────────────────────────────────────────────────
// QueryBuilder
// ──────────────────────────────────────────────────────────────────────────

/**
 * 构造一个链式 SelectQueryBuilder / UpdateQueryBuilder / ... 通用 mock。
 * `overrides` 里的方法会覆盖默认终止方法(如 { getMany: jest.fn().mockResolvedValue([x]) })。
 */
export function mockQueryBuilder(
  overrides: Record<string, jest.Mock> = {},
): MockObject {
  const qb: MockObject = {};

  // 所有链式方法返回自身,支持 .where().andWhere().orderBy()... 任意嵌套
  const chain = [
    'select',
    'addSelect',
    'distinct',
    'distinctOn',
    'leftJoin',
    'leftJoinAndSelect',
    'leftJoinAndMapOne',
    'leftJoinAndMapMany',
    'innerJoin',
    'innerJoinAndSelect',
    'innerJoinAndMapOne',
    'innerJoinAndMapMany',
    'rightJoin',
    'join',
    'joinAndSelect',
    'where',
    'andWhere',
    'orWhere',
    'having',
    'andHaving',
    'orHaving',
    'orderBy',
    'addOrderBy',
    'groupBy',
    'addGroupBy',
    'skip',
    'take',
    'offset',
    'limit',
    'setParameters',
    'setParameter',
    'cache',
    'withDeleted',
    'from',
    'subQuery',
    'getQuery',
    'getSql',
  ];
  chain.forEach((m) => {
    qb[m] = jest.fn().mockReturnValue(qb);
  });

  // Update/Delete/Insert 链方法(同样返回自身,后接 .execute())
  [
    'update',
    'set',
    'whereEntity',
    'delete',
    'insert',
    'into',
    'values',
    'returning',
    'orUpdate',
    'onConflict',
    'orIgnore',
    'ignore',
  ].forEach((m) => {
    qb[m] = jest.fn().mockReturnValue(qb);
  });

  // 终止方法(返回数据,非链式)
  qb.getMany = jest.fn().mockResolvedValue([]);
  qb.getOne = jest.fn().mockResolvedValue(null);
  qb.getRawMany = jest.fn().mockResolvedValue([]);
  qb.getRawOne = jest.fn().mockResolvedValue(null);
  qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  qb.getCount = jest.fn().mockResolvedValue(0);
  qb.execute = jest
    .fn()
    .mockResolvedValue({ affected: 0, generatedMaps: [], raw: [] });

  Object.entries(overrides).forEach(([k, v]) => {
    qb[k] = v;
  });
  return qb;
}

// ──────────────────────────────────────────────────────────────────────────
// Repository
// ──────────────────────────────────────────────────────────────────────────

/**
 * 构造一个 TypeORM Repository mock。create() 透传 dto、save() resolve 入参,
 * 其余返回安全的空值。用 `overrides` 精确控制单个用例(如 findOne 返回某实体)。
 * 在 spec 里: `const repo = mockRepository<Paper>({ findOne: jest.fn().mockResolvedValue(paper) }) as unknown as Repository<Paper>;`
 */
export function mockRepository<T extends ObjectLiteral = ObjectLiteral>(
  overrides: Record<string, jest.Mock> = {},
): MockObject {
  const repo: MockObject = {
    find: jest.fn().mockResolvedValue([]),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    findBy: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
    findOneOrFail: jest.fn().mockResolvedValue(null),
    save: jest
      .fn()
      .mockImplementation((entity: unknown) => Promise.resolve(entity)),
    create: jest
      .fn()
      .mockImplementation((dto: unknown) => ({ ...(dto as object) })),
    preload: jest.fn().mockResolvedValue(null),
    merge: jest
      .fn()
      .mockImplementation((_into: unknown, ...sources: unknown[]) =>
        Object.assign({}, ...sources),
      ),
    remove: jest.fn().mockResolvedValue(undefined),
    softRemove: jest.fn().mockResolvedValue(undefined),
    recover: jest.fn().mockResolvedValue(undefined),
    delete: jest
      .fn()
      .mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] }),
    softDelete: jest
      .fn()
      .mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] }),
    update: jest
      .fn()
      .mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] }),
    insert: jest
      .fn()
      .mockResolvedValue({ identifiers: [], generatedMaps: [], raw: [] }),
    count: jest.fn().mockResolvedValue(0),
    countBy: jest.fn().mockResolvedValue(0),
    exist: jest.fn().mockResolvedValue(false),
    exists: jest.fn().mockResolvedValue(false),
    existsBy: jest.fn().mockResolvedValue(false),
    hasId: jest.fn().mockReturnValue(true),
    getId: jest.fn().mockReturnValue(undefined),
    query: jest.fn().mockResolvedValue([]),
    // 每次调用都给一个全新 qb,避免用例间共享链式状态
    createQueryBuilder: jest.fn().mockImplementation(() => mockQueryBuilder()),
  };
  Object.entries(overrides).forEach(([k, v]) => {
    repo[k] = v;
  });
  return repo;
}

// ──────────────────────────────────────────────────────────────────────────
// DataSource(原生 SQL / 事务,approvals 等用)
// ──────────────────────────────────────────────────────────────────────────

export function mockDataSource(
  overrides: Record<string, jest.Mock> = {},
): MockObject {
  // 仅提供 approvals/attachments 实际用到的成员:query / createQueryBuilder / manager。
  // 刻意不提供 createQueryRunner / transaction —— 之前那套"事务机器"无任何 spec 调用,
  // 且 manager={} 会把真实事务代码(em.save)绊成运行时崩溃却无人测,制造"事务已覆盖"假象。
  // 若未来服务真用事务,请在此补一个返回 mockRepository 的 manager + 显式事务测试。
  const ds: MockObject = {
    query: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn().mockImplementation(() => mockQueryBuilder()),
    manager: {} as never,
    options: {} as never,
  };
  Object.entries(overrides).forEach(([k, v]) => {
    ds[k] = v;
  });
  return ds;
}

// ──────────────────────────────────────────────────────────────────────────
// AuthUser / ExecutionContext / CallHandler(guard / interceptor / decorator 用)
// ──────────────────────────────────────────────────────────────────────────

/** 造一个 AuthUser。默认 sys_admin,无部门;常用: mockAuthUser(UserRole.DEPT_ADMIN, 5)。 */
export function mockAuthUser(
  role: UserRole = UserRole.SYS_ADMIN,
  deptId: number | null = null,
  extra: Partial<AuthUser> = {},
): AuthUser {
  return { id: 1, username: 'test', realName: null, role, deptId, ...extra };
}

export interface MockHttpContext {
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
  handler?: () => void;
  classType?: unknown;
  type?: string;
}

/**
 * 造一个 http 类型的 ExecutionContext(同时满足 ArgumentsHost)。
 * guard/interceptor/decorator/filter 的单测都可用。response 自带 status/json/end 桩。
 */
export function mockExecutionContext(
  opts: MockHttpContext = {},
): ExecutionContext {
  const response = opts.response ?? {
    statusCode: 200,
    headersSent: false,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn(),
  };
  const request = opts.request ?? {};
  const switchToHttp = {
    getRequest: jest.fn().mockReturnValue(request),
    getResponse: jest.fn().mockReturnValue(response),
    getNext: jest.fn().mockReturnValue(undefined),
  };
  return {
    getType: jest.fn().mockReturnValue(opts.type ?? 'http'),
    switchToHttp: jest.fn().mockReturnValue(switchToHttp),
    switchToRpc: jest
      .fn()
      .mockReturnValue({ getData: jest.fn(), getMessageHandler: jest.fn() }),
    switchToWs: jest
      .fn()
      .mockReturnValue({ getClient: jest.fn(), getData: jest.fn() }),
    getArgs: jest.fn().mockReturnValue([]),
    getArgByIndex: jest.fn().mockReturnValue(undefined),
    getClass: jest
      .fn()
      .mockReturnValue(opts.classType ?? function DummyHandler() {}),
    getHandler: jest.fn().mockReturnValue(opts.handler ?? (() => undefined)),
  };
}

/** CallHandler:正常情况 handle() 返回 of(value)。 */
export function mockCallHandler(value: unknown = undefined): CallHandler {
  return { handle: jest.fn().mockReturnValue(of(value as never)) };
}

/** CallHandler:handle() 抛错(测拦截器/过滤器的异常分支)。 */
export function mockCallHandlerError(error: unknown): CallHandler {
  return {
    handle: jest.fn().mockReturnValue(throwError(() => error as never)),
  };
}
