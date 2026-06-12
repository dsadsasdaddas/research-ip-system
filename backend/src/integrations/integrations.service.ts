import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageResult } from '../common/types';
import { CreateIntegrationConfigDto } from './dto/create-integration-config.dto';
import { UpdateIntegrationConfigDto } from './dto/update-integration-config.dto';
import { CreateIntegrationMappingDto } from './dto/create-integration-mapping.dto';
import {
  CreateIntegrationAlertDto,
  HandleIntegrationAlertDto,
} from './dto/create-integration-alert.dto';
import {
  IntegrationConfig,
  IntegrationType,
} from './entities/integration-config.entity';
import { IntegrationLog } from './entities/integration-log.entity';
import { IntegrationMapping } from './entities/integration-mapping.entity';
import { IntegrationAlert } from './entities/integration-alert.entity';
import { paginate } from '../common/utils/pagination';
import type { AuthUser } from '../auth/types/auth-user.interface';

interface IntegrationLogInput {
  type: IntegrationType;
  action: string;
  requestUrl?: string | null;
  success: boolean;
  statusCode?: number | null;
  elapsedMs?: number | null;
  errorMessage?: string | null;
  fallbackUsed?: boolean;
  summary?: string | null;
}

export interface IntegrationTestResult {
  type: IntegrationType;
  enabled: boolean;
  success: boolean;
  elapsedMs: number;
  statusCode: number | null;
  fallbackMode: string;
  message: string;
}

interface IntegrationLogQuery {
  type?: IntegrationType;
  success?: boolean;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectRepository(IntegrationConfig)
    private readonly configRepo: Repository<IntegrationConfig>,
    @InjectRepository(IntegrationLog)
    private readonly logRepo: Repository<IntegrationLog>,
    @InjectRepository(IntegrationMapping)
    private readonly mappingRepo: Repository<IntegrationMapping>,
    @InjectRepository(IntegrationAlert)
    private readonly alertRepo: Repository<IntegrationAlert>,
  ) {}

  async seedDefaults(): Promise<void> {
    const defaults: Array<
      Pick<
        IntegrationConfig,
        | 'type'
        | 'name'
        | 'baseUrl'
        | 'apiKeyEnv'
        | 'isEnabled'
        | 'timeoutMs'
        | 'retryCount'
        | 'fallbackMode'
        | 'extra'
      >
    > = [
      {
        type: IntegrationType.CROSSREF,
        name: 'Crossref DOI 查询',
        baseUrl: 'https://api.crossref.org',
        apiKeyEnv: null,
        isEnabled: true,
        timeoutMs: 8000,
        retryCount: 3,
        fallbackMode: 'manual',
        extra: null,
      },
      {
        type: IntegrationType.SCOPUS,
        name: 'Scopus 论文数据',
        baseUrl: null,
        apiKeyEnv: 'SCOPUS_API_KEY',
        isEnabled: false,
        timeoutMs: 8000,
        retryCount: 3,
        fallbackMode: 'manual',
        extra: null,
      },
      {
        type: IntegrationType.OPENALEX,
        name: 'OpenAlex 论文数据',
        baseUrl: 'https://api.openalex.org',
        apiKeyEnv: null,
        isEnabled: false,
        timeoutMs: 8000,
        retryCount: 3,
        fallbackMode: 'manual',
        extra: null,
      },
      {
        type: IntegrationType.CNIPA,
        name: 'CNIPA 专利状态同步',
        baseUrl: null,
        apiKeyEnv: 'CNIPA_API_KEY',
        isEnabled: false,
        timeoutMs: 10000,
        retryCount: 3,
        fallbackMode: 'manual',
        extra: null,
      },
      {
        type: IntegrationType.HR_LDAP,
        name: 'HR/LDAP 人员部门同步',
        baseUrl: null,
        apiKeyEnv: 'LDAP_BIND_PASSWORD',
        isEnabled: false,
        timeoutMs: 8000,
        retryCount: 3,
        fallbackMode: 'manual',
        extra: null,
      },
      {
        type: IntegrationType.FINANCE,
        name: '财务系统凭证/对账',
        baseUrl: null,
        apiKeyEnv: 'FINANCE_API_KEY',
        isEnabled: false,
        timeoutMs: 10000,
        retryCount: 3,
        fallbackMode: 'manual',
        extra: null,
      },
      {
        type: IntegrationType.EMAIL,
        name: '邮件通知',
        baseUrl: null,
        apiKeyEnv: 'SMTP_PASS',
        isEnabled: false,
        timeoutMs: 8000,
        retryCount: 3,
        fallbackMode: 'manual',
        extra: null,
      },
      {
        type: IntegrationType.SMS,
        name: '短信通知',
        baseUrl: null,
        apiKeyEnv: 'SMS_API_KEY',
        isEnabled: false,
        timeoutMs: 8000,
        retryCount: 3,
        fallbackMode: 'manual',
        extra: null,
      },
    ];

    for (const item of defaults) {
      const exists = await this.configRepo.findOne({
        where: { type: item.type },
      });
      if (!exists) await this.configRepo.save(this.configRepo.create(item));
    }
  }

  findAll(): Promise<IntegrationConfig[]> {
    return this.configRepo.find({ order: { id: 'ASC' } });
  }

  async create(dto: CreateIntegrationConfigDto): Promise<IntegrationConfig> {
    const exists = await this.configRepo.findOne({ where: { type: dto.type } });
    if (exists) throw new ConflictException('接口类型已存在');
    return this.configRepo.save(this.configRepo.create(dto));
  }

  async update(
    id: number,
    dto: UpdateIntegrationConfigDto,
  ): Promise<IntegrationConfig> {
    const config = await this.findOne(id);
    Object.assign(config, dto);
    return this.configRepo.save(config);
  }

  async findOne(id: number): Promise<IntegrationConfig> {
    const config = await this.configRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException(`接口配置 #${id} 不存在`);
    return config;
  }

  async remove(id: number): Promise<{ deleted: true; id: number }> {
    const config = await this.findOne(id);
    await this.configRepo.remove(config);
    return { deleted: true, id };
  }

  async test(id: number): Promise<IntegrationTestResult> {
    const config = await this.findOne(id);
    const startedAt = Date.now();

    if (!config.isEnabled) {
      const elapsedMs = Date.now() - startedAt;
      await this.writeLog({
        type: config.type,
        action: 'test',
        success: false,
        elapsedMs,
        fallbackUsed: true,
        errorMessage: '接口未启用',
        summary: 'disabled',
      });
      return {
        type: config.type,
        enabled: false,
        success: false,
        elapsedMs,
        statusCode: null,
        fallbackMode: config.fallbackMode,
        message: '接口未启用，按降级方案处理',
      };
    }

    if (!config.baseUrl) {
      const elapsedMs = Date.now() - startedAt;
      await this.writeLog({
        type: config.type,
        action: 'test',
        success: false,
        elapsedMs,
        fallbackUsed: true,
        errorMessage: '未配置 baseUrl',
        summary: 'missing_base_url',
      });
      return {
        type: config.type,
        enabled: true,
        success: false,
        elapsedMs,
        statusCode: null,
        fallbackMode: config.fallbackMode,
        message: '未配置 baseUrl，按降级方案处理',
      };
    }

    try {
      const res = await this.fetchWithRetry(
        config.baseUrl,
        config.timeoutMs,
        config.retryCount,
      );
      const elapsedMs = Date.now() - startedAt;
      await this.writeLog({
        type: config.type,
        action: 'test',
        requestUrl: config.baseUrl,
        success: res.ok,
        statusCode: res.status,
        elapsedMs,
        fallbackUsed: !res.ok,
        errorMessage: res.ok ? null : `HTTP ${res.status}`,
        summary: 'http_test',
      });
      return {
        type: config.type,
        enabled: true,
        success: res.ok,
        elapsedMs,
        statusCode: res.status,
        fallbackMode: config.fallbackMode,
        message: res.ok ? '接口测试成功' : `接口测试失败：HTTP ${res.status}`,
      };
    } catch (err) {
      const elapsedMs = Date.now() - startedAt;
      const message = err instanceof Error ? err.message : '未知错误';
      await this.writeLog({
        type: config.type,
        action: 'test',
        requestUrl: config.baseUrl,
        success: false,
        statusCode: null,
        elapsedMs,
        fallbackUsed: true,
        errorMessage: message,
        summary: 'exception',
      });
      return {
        type: config.type,
        enabled: true,
        success: false,
        elapsedMs,
        statusCode: null,
        fallbackMode: config.fallbackMode,
        message: `接口测试异常：${message}`,
      };
    }
  }

  async findLogs(
    query: IntegrationLogQuery,
  ): Promise<PageResult<IntegrationLog>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const qb = this.logRepo
      .createQueryBuilder('l')
      .orderBy('l.create_time', 'DESC');
    if (query.type) qb.andWhere('l.type = :type', { type: query.type });
    if (query.success !== undefined)
      qb.andWhere('l.success = :success', { success: query.success });
    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { items, total, page, pageSize };
  }

  private async fetchWithRetry(
    url: string,
    timeoutMs: number,
    retryCount: number,
  ): Promise<Response> {
    // retryCount 实际来自配置(>=0),循环至少跑一次;初值兜底保证抛出的始终是 Error。
    let lastError: Error = new Error('接口调用失败');
    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        return await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('未知错误');
      }
    }
    throw lastError;
  }

  private writeLog(input: IntegrationLogInput): Promise<IntegrationLog> {
    return this.logRepo.save(
      this.logRepo.create({
        type: input.type,
        action: input.action,
        requestUrl: input.requestUrl ?? null,
        success: input.success,
        statusCode: input.statusCode ?? null,
        elapsedMs: input.elapsedMs ?? null,
        errorMessage: input.errorMessage ?? null,
        fallbackUsed: input.fallbackUsed ?? false,
        summary: input.summary ?? null,
      }),
    );
  }

  // ──── 字段映射 ────

  async createMapping(
    dto: CreateIntegrationMappingDto,
  ): Promise<IntegrationMapping> {
    const entity = this.mappingRepo.create(dto);
    return this.mappingRepo.save(entity);
  }

  async findMappings(
    integrationType?: string,
    businessModule?: string,
  ): Promise<IntegrationMapping[]> {
    const where: Record<string, string> = {};
    if (integrationType) where.integrationType = integrationType;
    if (businessModule) where.businessModule = businessModule;
    return this.mappingRepo.find({ where, order: { id: 'ASC' } });
  }

  async removeMapping(id: number): Promise<{ deleted: true; id: number }> {
    const mapping = await this.mappingRepo.findOneBy({ id });
    if (!mapping) throw new NotFoundException(`字段映射 #${id} 不存在`);
    await this.mappingRepo.delete(id);
    return { deleted: true, id };
  }

  // ──── 异常告警 ────

  async createAlert(dto: CreateIntegrationAlertDto): Promise<IntegrationAlert> {
    const entity = this.alertRepo.create(dto);
    return this.alertRepo.save(entity);
  }

  async findAlerts(
    integrationType?: string,
    status?: string,
    page?: number,
    pageSize?: number,
  ) {
    const qb = this.alertRepo
      .createQueryBuilder('a')
      .orderBy('a.create_time', 'DESC');
    if (integrationType)
      qb.andWhere('a.integration_type = :integrationType', { integrationType });
    if (status) qb.andWhere('a.status = :status', { status });
    return paginate(qb, page, pageSize);
  }

  async handleAlert(
    id: number,
    dto: HandleIntegrationAlertDto,
    user?: AuthUser,
  ): Promise<IntegrationAlert> {
    const alert = await this.alertRepo.findOneBy({ id });
    if (!alert) throw new NotFoundException(`告警 #${id} 不存在`);
    alert.status = dto.status || 'handled';
    alert.handlerName = dto.handlerName || user?.username || null;
    alert.handlerId = user?.id ?? null;
    alert.handledTime = new Date();
    return this.alertRepo.save(alert);
  }
}
