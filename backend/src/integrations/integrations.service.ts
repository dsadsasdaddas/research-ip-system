import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageResult } from '../common/types';
import { CreateIntegrationConfigDto } from './dto/create-integration-config.dto';
import { UpdateIntegrationConfigDto } from './dto/update-integration-config.dto';
import { IntegrationConfig, IntegrationType } from './entities/integration-config.entity';
import { IntegrationLog } from './entities/integration-log.entity';

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
    @InjectRepository(IntegrationConfig) private readonly configRepo: Repository<IntegrationConfig>,
    @InjectRepository(IntegrationLog) private readonly logRepo: Repository<IntegrationLog>,
  ) {}

  async seedDefaults(): Promise<void> {
    const defaults: Array<Pick<IntegrationConfig, 'type' | 'name' | 'baseUrl' | 'apiKeyEnv' | 'isEnabled' | 'timeoutMs' | 'retryCount' | 'fallbackMode' | 'extra'>> = [
      { type: IntegrationType.CROSSREF, name: 'Crossref DOI 查询', baseUrl: 'https://api.crossref.org', apiKeyEnv: null, isEnabled: true, timeoutMs: 8000, retryCount: 3, fallbackMode: 'manual', extra: null },
      { type: IntegrationType.SCOPUS, name: 'Scopus 论文数据', baseUrl: null, apiKeyEnv: 'SCOPUS_API_KEY', isEnabled: false, timeoutMs: 8000, retryCount: 3, fallbackMode: 'manual', extra: null },
      { type: IntegrationType.OPENALEX, name: 'OpenAlex 论文数据', baseUrl: 'https://api.openalex.org', apiKeyEnv: null, isEnabled: false, timeoutMs: 8000, retryCount: 3, fallbackMode: 'manual', extra: null },
      { type: IntegrationType.CNIPA, name: 'CNIPA 专利状态同步', baseUrl: null, apiKeyEnv: 'CNIPA_API_KEY', isEnabled: false, timeoutMs: 10000, retryCount: 3, fallbackMode: 'manual', extra: null },
      { type: IntegrationType.HR_LDAP, name: 'HR/LDAP 人员部门同步', baseUrl: null, apiKeyEnv: 'LDAP_BIND_PASSWORD', isEnabled: false, timeoutMs: 8000, retryCount: 3, fallbackMode: 'manual', extra: null },
      { type: IntegrationType.FINANCE, name: '财务系统凭证/对账', baseUrl: null, apiKeyEnv: 'FINANCE_API_KEY', isEnabled: false, timeoutMs: 10000, retryCount: 3, fallbackMode: 'manual', extra: null },
      { type: IntegrationType.EMAIL, name: '邮件通知', baseUrl: null, apiKeyEnv: 'SMTP_PASS', isEnabled: false, timeoutMs: 8000, retryCount: 3, fallbackMode: 'manual', extra: null },
      { type: IntegrationType.SMS, name: '短信通知', baseUrl: null, apiKeyEnv: 'SMS_API_KEY', isEnabled: false, timeoutMs: 8000, retryCount: 3, fallbackMode: 'manual', extra: null },
    ];

    for (const item of defaults) {
      const exists = await this.configRepo.findOne({ where: { type: item.type } });
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

  async update(id: number, dto: UpdateIntegrationConfigDto): Promise<IntegrationConfig> {
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
      await this.writeLog({ type: config.type, action: 'test', success: false, elapsedMs, fallbackUsed: true, errorMessage: '接口未启用', summary: 'disabled' });
      return { type: config.type, enabled: false, success: false, elapsedMs, statusCode: null, fallbackMode: config.fallbackMode, message: '接口未启用，按降级方案处理' };
    }

    if (!config.baseUrl) {
      const elapsedMs = Date.now() - startedAt;
      await this.writeLog({ type: config.type, action: 'test', success: false, elapsedMs, fallbackUsed: true, errorMessage: '未配置 baseUrl', summary: 'missing_base_url' });
      return { type: config.type, enabled: true, success: false, elapsedMs, statusCode: null, fallbackMode: config.fallbackMode, message: '未配置 baseUrl，按降级方案处理' };
    }

    try {
      const res = await this.fetchWithRetry(config.baseUrl, config.timeoutMs, config.retryCount);
      const elapsedMs = Date.now() - startedAt;
      await this.writeLog({ type: config.type, action: 'test', requestUrl: config.baseUrl, success: res.ok, statusCode: res.status, elapsedMs, fallbackUsed: !res.ok, errorMessage: res.ok ? null : `HTTP ${res.status}`, summary: 'http_test' });
      return { type: config.type, enabled: true, success: res.ok, elapsedMs, statusCode: res.status, fallbackMode: config.fallbackMode, message: res.ok ? '接口测试成功' : `接口测试失败：HTTP ${res.status}` };
    } catch (err) {
      const elapsedMs = Date.now() - startedAt;
      const message = err instanceof Error ? err.message : '未知错误';
      await this.writeLog({ type: config.type, action: 'test', requestUrl: config.baseUrl, success: false, statusCode: null, elapsedMs, fallbackUsed: true, errorMessage: message, summary: 'exception' });
      return { type: config.type, enabled: true, success: false, elapsedMs, statusCode: null, fallbackMode: config.fallbackMode, message: `接口测试异常：${message}` };
    }
  }

  async findLogs(query: IntegrationLogQuery): Promise<PageResult<IntegrationLog>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const qb = this.logRepo.createQueryBuilder('l').orderBy('l.create_time', 'DESC');
    if (query.type) qb.andWhere('l.type = :type', { type: query.type });
    if (query.success !== undefined) qb.andWhere('l.success = :success', { success: query.success });
    const [items, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items, total, page, pageSize };
  }

  private async fetchWithRetry(url: string, timeoutMs: number, retryCount: number): Promise<Response> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        return await fetch(url, { method: 'GET', signal: AbortSignal.timeout(timeoutMs) });
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('未知错误');
      }
    }
    throw lastError ?? new Error('接口调用失败');
  }

  private writeLog(input: IntegrationLogInput): Promise<IntegrationLog> {
    return this.logRepo.save(this.logRepo.create({
      type: input.type,
      action: input.action,
      requestUrl: input.requestUrl ?? null,
      success: input.success,
      statusCode: input.statusCode ?? null,
      elapsedMs: input.elapsedMs ?? null,
      errorMessage: input.errorMessage ?? null,
      fallbackUsed: input.fallbackUsed ?? false,
      summary: input.summary ?? null,
    }));
  }
}
