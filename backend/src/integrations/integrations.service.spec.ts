import { ConflictException, NotFoundException } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationType } from './entities/integration-config.entity';
import type { IntegrationConfig } from './entities/integration-config.entity';
import type { IntegrationLog } from './entities/integration-log.entity';
import type { IntegrationMapping } from './entities/integration-mapping.entity';
import type { IntegrationAlert } from './entities/integration-alert.entity';
import { mockRepository } from '../testing/mocks';
import type { Repository } from 'typeorm';

const originalFetch = global.fetch;

describe('IntegrationsService', () => {
  let service: IntegrationsService;
  let configRepo: ReturnType<typeof mockRepository>;
  let logRepo: ReturnType<typeof mockRepository>;
  let mappingRepo: ReturnType<typeof mockRepository>;
  let alertRepo: ReturnType<typeof mockRepository>;

  beforeEach(() => {
    configRepo = mockRepository();
    logRepo = mockRepository();
    mappingRepo = mockRepository();
    alertRepo = mockRepository();
    service = new IntegrationsService(
      configRepo as unknown as Repository<IntegrationConfig>,
      logRepo as unknown as Repository<IntegrationLog>,
      mappingRepo as unknown as Repository<IntegrationMapping>,
      alertRepo as unknown as Repository<IntegrationAlert>,
    );
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  /** 构造一个已存在配置,可选覆盖字段。 */
  function makeConfig(
    overrides: Partial<IntegrationConfig> = {},
  ): IntegrationConfig {
    return {
      id: 1,
      type: IntegrationType.CROSSREF,
      name: 'Crossref',
      baseUrl: 'https://api.crossref.org',
      apiKeyEnv: null,
      isEnabled: true,
      timeoutMs: 8000,
      retryCount: 2,
      fallbackMode: 'manual',
      extra: null,
      ...overrides,
    } as IntegrationConfig;
  }

  describe('seedDefaults', () => {
    it('对每个默认项:不存在则保存,存在则跳过', async () => {
      // 第 3 个(OPENALEX)已存在 → 跳过;其余 save
      configRepo.findOne.mockImplementation(
        async (opts?: { where?: { type?: IntegrationType } }) => {
          return opts?.where?.type === IntegrationType.OPENALEX
            ? ({ id: 3 } as IntegrationConfig)
            : null;
        },
      );
      configRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.seedDefaults();
      // 8 个默认项,只有 1 个已存在 → save 调用 7 次
      expect(configRepo.save).toHaveBeenCalledTimes(7);
    });

    it('全部已存在 → 不保存', async () => {
      configRepo.findOne.mockResolvedValue({ id: 1 });
      await service.seedDefaults();
      expect(configRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll / findOne', () => {
    it('findAll → find order by id', async () => {
      configRepo.find.mockResolvedValue([{ id: 1 }]);
      const res = await service.findAll();
      expect(res).toEqual([{ id: 1 }]);
      expect(configRepo.find).toHaveBeenCalledWith({ order: { id: 'ASC' } });
    });

    it('findOne 不存在 → 404', async () => {
      configRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(9)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('findOne 存在 → 返回', async () => {
      const cfg = makeConfig();
      configRepo.findOne.mockResolvedValue(cfg);
      await expect(service.findOne(1)).resolves.toBe(cfg);
      expect(configRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('create', () => {
    it('类型已存在 → 409', async () => {
      configRepo.findOne.mockResolvedValue({ id: 1 });
      await expect(
        service.create({ type: IntegrationType.CROSSREF, name: 'x' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('不存在 → create + save', async () => {
      configRepo.findOne.mockResolvedValue(null);
      configRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const out = await service.create({
        type: IntegrationType.SMS,
        name: 'sms',
      });
      expect(configRepo.save).toHaveBeenCalled();
      expect(out).toMatchObject({ type: IntegrationType.SMS, name: 'sms' });
    });
  });

  describe('update', () => {
    it('存在 → Object.assign 后保存', async () => {
      const cfg = makeConfig({ name: 'old' });
      configRepo.findOne.mockResolvedValue(cfg);
      configRepo.save.mockImplementation(async (e: unknown) => e);
      const out = await service.update(1, { name: 'new' });
      expect(out.name).toBe('new');
      expect(configRepo.save).toHaveBeenCalledWith(cfg);
    });
  });

  describe('remove', () => {
    it('存在 → remove 并返回 {deleted:true,id}', async () => {
      configRepo.findOne.mockResolvedValue(makeConfig());
      const out = await service.remove(1);
      expect(configRepo.remove).toHaveBeenCalled();
      expect(out).toEqual({ deleted: true, id: 1 });
    });
  });

  describe('test (fetchWithRetry 各分支)', () => {
    it('接口未启用 → 降级,写 disabled 日志', async () => {
      configRepo.findOne.mockResolvedValue(makeConfig({ isEnabled: false }));
      const out = await service.test(1);
      expect(out).toMatchObject({
        enabled: false,
        success: false,
        fallbackMode: 'manual',
      });
      expect(logRepo.save).toHaveBeenCalled();
    });

    it('已启用但无 baseUrl → 降级 missing_base_url', async () => {
      configRepo.findOne.mockResolvedValue(
        makeConfig({ isEnabled: true, baseUrl: null }),
      );
      const out = await service.test(1);
      expect(out.success).toBe(false);
      expect(out.message).toContain('baseUrl');
    });

    it('fetch 首次成功 → ok', async () => {
      configRepo.findOne.mockResolvedValue(makeConfig({ retryCount: 2 }));
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 200 }) as never;
      const out = await service.test(1);
      expect(out).toMatchObject({ success: true, statusCode: 200 });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('fetch 首次失败后重试成功(最后一次 ok)', async () => {
      configRepo.findOne.mockResolvedValue(makeConfig({ retryCount: 2 }));
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce({ ok: true, status: 200 }) as never;
      const out = await service.test(1);
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(out.success).toBe(true);
    });

    it('fetch 全部失败 → 最终抛错进入 catch,fallback', async () => {
      configRepo.findOne.mockResolvedValue(makeConfig({ retryCount: 1 }));
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error('network down')) as never;
      const out = await service.test(1);
      // retryCount=1 → 共 2 次尝试
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(out.success).toBe(false);
      expect(out.message).toContain('network down');
      expect(out.fallbackMode).toBe('manual');
    });

    it('fetch 抛非 Error 对象 → 取 "未知错误"', async () => {
      configRepo.findOne.mockResolvedValue(makeConfig({ retryCount: 0 }));
      global.fetch = jest.fn().mockRejectedValue('str-err') as never;
      const out = await service.test(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(out.success).toBe(false);
      expect(out.message).toContain('未知错误');
    });

    it('HTTP 非 2xx(ok:false) → success=false,记录 HTTP 状态', async () => {
      configRepo.findOne.mockResolvedValue(makeConfig({ retryCount: 0 }));
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 500 }) as never;
      const out = await service.test(1);
      expect(out.success).toBe(false);
      expect(out.statusCode).toBe(500);
      expect(out.message).toContain('500');
    });

    it('日志写入:成功路径带 statusCode、失败路径带 errorMessage', async () => {
      // 成功
      configRepo.findOne.mockResolvedValue(makeConfig({ retryCount: 0 }));
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 200 }) as never;
      logRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.test(1);
      const okLog = logRepo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(okLog.success).toBe(true);
      expect(okLog.statusCode).toBe(200);

      // 失败
      logRepo.create.mockClear();
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 503 }) as never;
      await service.test(1);
      const failLog = logRepo.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(failLog.success).toBe(false);
      expect(failLog.fallbackUsed).toBe(true);
      expect(failLog.errorMessage).toBe('HTTP 503');
    });
  });

  describe('findLogs', () => {
    function withQb() {
      const qb = configRepo.createQueryBuilder(); // 复用 mockQueryBuilder
      logRepo = mockRepository({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });
      service = new IntegrationsService(
        configRepo as unknown as Repository<IntegrationConfig>,
        logRepo as unknown as Repository<IntegrationLog>,
        mappingRepo as unknown as Repository<IntegrationMapping>,
        alertRepo as unknown as Repository<IntegrationAlert>,
      );
      return qb;
    }

    it('带 type+success 过滤 + 分页', async () => {
      const qb = withQb();
      qb.getManyAndCount = jest.fn().mockResolvedValue([[{ id: 1 }], 1]);
      const res = await service.findLogs({
        type: IntegrationType.CROSSREF,
        success: true,
        page: 2,
        pageSize: 10,
      });
      expect(res.items).toHaveLength(1);
      expect(qb.andWhere).toHaveBeenCalledWith('l.type = :type', {
        type: IntegrationType.CROSSREF,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('l.success = :success', {
        success: true,
      });
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('无 type/success → 不加 where,默认 page=1/pageSize=50', async () => {
      const qb = withQb();
      qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
      const res = await service.findLogs({});
      expect(res.page).toBe(1);
      expect(res.pageSize).toBe(50);
      // 只有 orderBy,无 andWhere
      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('字段映射', () => {
    it('createMapping → create + save', async () => {
      mappingRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const out = await service.createMapping({
        integrationType: 'crossref',
        businessModule: 'paper',
      } as never);
      expect(mappingRepo.save).toHaveBeenCalled();
      expect(out).toMatchObject({ integrationType: 'crossref' });
    });

    it('findMappings:两个过滤都有', async () => {
      mappingRepo.find.mockResolvedValue([{ id: 1 }]);
      await service.findMappings('crossref', 'paper');
      expect(mappingRepo.find).toHaveBeenCalledWith({
        where: { integrationType: 'crossref', businessModule: 'paper' },
        order: { id: 'ASC' },
      });
    });

    it('findMappings:无过滤 → where 空', async () => {
      mappingRepo.find.mockResolvedValue([]);
      await service.findMappings();
      expect(mappingRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { id: 'ASC' },
      });
    });

    it('removeMapping 不存在 → 404', async () => {
      mappingRepo.findOneBy.mockResolvedValue(null);
      await expect(service.removeMapping(9)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('removeMapping 存在 → delete + 返回', async () => {
      mappingRepo.findOneBy.mockResolvedValue({ id: 1 });
      const out = await service.removeMapping(1);
      expect(mappingRepo.delete).toHaveBeenCalledWith(1);
      expect(out).toEqual({ deleted: true, id: 1 });
    });
  });

  describe('异常告警', () => {
    it('createAlert → create + save', async () => {
      alertRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const out = await service.createAlert({
        integrationType: 'sms',
        title: 't',
      });
      expect(alertRepo.save).toHaveBeenCalled();
      expect(out).toMatchObject({ integrationType: 'sms' });
    });

    describe('findAlerts', () => {
      function withQb() {
        const qb = alertRepo.createQueryBuilder();
        alertRepo = mockRepository({
          createQueryBuilder: jest.fn().mockReturnValue(qb),
        });
        service = new IntegrationsService(
          configRepo as unknown as Repository<IntegrationConfig>,
          logRepo as unknown as Repository<IntegrationLog>,
          mappingRepo as unknown as Repository<IntegrationMapping>,
          alertRepo as unknown as Repository<IntegrationAlert>,
        );
        return qb;
      }
      it('带 integrationType+status+分页', async () => {
        const qb = withQb();
        qb.getManyAndCount = jest.fn().mockResolvedValue([[{ id: 1 }], 1]);
        await service.findAlerts('sms', 'open', 2, 10);
        expect(qb.andWhere).toHaveBeenCalledWith(
          'a.integration_type = :integrationType',
          { integrationType: 'sms' },
        );
        expect(qb.andWhere).toHaveBeenCalledWith('a.status = :status', {
          status: 'open',
        });
        expect(qb.skip).toHaveBeenCalled();
      });
      it('无过滤 → 默认分页', async () => {
        const qb = withQb();
        qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
        const res = await service.findAlerts(
          undefined,
          undefined,
          undefined,
          undefined,
        );
        expect(qb.andWhere).not.toHaveBeenCalled();
        expect(res.page).toBe(1);
      });
    });

    describe('handleAlert', () => {
      it('不存在 → 404', async () => {
        alertRepo.findOneBy.mockResolvedValue(null);
        await expect(service.handleAlert(9, {})).rejects.toBeInstanceOf(
          NotFoundException,
        );
      });

      it('dto.status/handlerName 都给 → 写入', async () => {
        const alert = { id: 1, status: 'open' } as IntegrationAlert;
        alertRepo.findOneBy.mockResolvedValue(alert);
        alertRepo.save.mockImplementation(async (e: unknown) => e);
        await service.handleAlert(
          1,
          { status: 'handled', handlerName: 'bob' },
          { id: 5 } as never,
        );
        expect(alert.status).toBe('handled');
        expect(alert.handlerName).toBe('bob');
        expect(alert.handlerId).toBe(5);
        expect(alert.handledTime).toBeInstanceOf(Date);
      });

      it('dto 字段为空 → status 默认 handled,handlerName 取 user.username', async () => {
        const alert = { id: 1 } as IntegrationAlert;
        alertRepo.findOneBy.mockResolvedValue(alert);
        alertRepo.save.mockImplementation(async (e: unknown) => e);
        await service.handleAlert(1, {}, { id: 8, username: 'sysop' } as never);
        expect(alert.status).toBe('handled');
        expect(alert.handlerName).toBe('sysop');
        expect(alert.handlerId).toBe(8);
      });

      it('无 user 且 dto 字段为空 → handlerName/handlerId 取 null', async () => {
        const alert = { id: 1 } as IntegrationAlert;
        alertRepo.findOneBy.mockResolvedValue(alert);
        alertRepo.save.mockImplementation(async (e: unknown) => e);
        await service.handleAlert(1, {});
        expect(alert.handlerName).toBeNull();
        expect(alert.handlerId).toBeNull();
      });
    });
  });
});
